const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const client = require('prom-client');
require('dotenv').config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

// Setup Prometheus Metrics Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'hrm_' });

const httpRequestCounter = new client.Counter({
    name: 'hrm_http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDuration = new client.Histogram({
    name: 'hrm_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
});

// PostgreSQL Connection Pool
const pool = new Pool({
    host: process.env.DB_HOST || 'hrm-postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'hrm_user',
    password: process.env.POSTGRES_PASSWORD || 'HrmSecureP@ss2026!',
    database: process.env.POSTGRES_DB || 'hrm_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const durationSec = diff[0] + diff[1] / 1e9;
        const route = req.route ? req.route.path : req.path;
        httpRequestCounter.inc({ method: req.method, route, status_code: res.statusCode });
        httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, durationSec);
    });
    next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// MONITORING & HEALTH CHECK ENDPOINTS
// ==========================================

app.get('/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT 1 AS alive');
        res.status(200).json({
            status: 'UP',
            service: 'HRM Core System',
            student_id: 'DTC245200377',
            database: dbResult.rows[0].alive === 1 ? 'CONNECTED' : 'UNKNOWN',
            timestamp: new Date().toISOString(),
            uptime_seconds: process.uptime()
        });
    } catch (err) {
        res.status(503).json({
            status: 'DOWN',
            service: 'HRM Core System',
            database: 'DISCONNECTED',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// ==========================================
// BUSINESS API ENDPOINTS
// ==========================================

// Dashboard summary statistics
app.get('/api/stats', async (req, res) => {
    try {
        const empCount = await pool.query("SELECT COUNT(*) AS total FROM employees WHERE status = 'active'");
        const deptCount = await pool.query("SELECT COUNT(*) AS total FROM departments");
        const attStats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'present') AS present_count,
                COUNT(*) FILTER (WHERE status = 'late') AS late_count,
                COUNT(*) FILTER (WHERE status = 'excused_leave' OR status = 'unexcused_leave') AS leave_count
            FROM attendance 
            WHERE work_date = CURRENT_DATE
        `);
        const deptDistribution = await pool.query(`
            SELECT d.name, COUNT(e.id) AS count
            FROM departments d
            LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
            GROUP BY d.name
            ORDER BY count DESC
        `);

        res.json({
            total_employees: parseInt(empCount.rows[0].total, 10),
            total_departments: parseInt(deptCount.rows[0].total, 10),
            present_today: parseInt(attStats.rows[0].present_count || 0, 10),
            late_today: parseInt(attStats.rows[0].late_count || 0, 10),
            leave_today: parseInt(attStats.rows[0].leave_count || 0, 10),
            department_distribution: deptDistribution.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Departments CRUD
app.get('/api/departments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, COUNT(e.id) AS employee_count 
            FROM departments d
            LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
            GROUP BY d.id
            ORDER BY d.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/departments', async (req, res) => {
    const { code, name, manager_name, description } = req.body;
    if (!code || !name) {
        return res.status(400).json({ error: 'Mã phòng và tên phòng là bắt buộc' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO departments (code, name, manager_name, description) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [code.trim().toUpperCase(), name.trim(), manager_name || '', description || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/departments/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa phòng ban' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Employees CRUD
app.get('/api/employees', async (req, res) => {
    try {
        const { search, department_id, status } = req.query;
        let query = `
            SELECT e.*, d.name AS department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            params.push(`%${search.trim()}%`);
            query += ` AND (e.full_name ILIKE $${params.length} OR e.emp_code ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
        }
        if (department_id) {
            params.push(department_id);
            query += ` AND e.department_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND e.status = $${params.length}`;
        }

        query += ` ORDER BY e.id DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', async (req, res) => {
    const { emp_code, full_name, email, phone, department_id, position, salary, hire_date } = req.body;
    if (!emp_code || !full_name || !email || !position) {
        return res.status(400).json({ error: 'Mã NV, Họ tên, Email và Vị trí là bắt buộc' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO employees (emp_code, full_name, email, phone, department_id, position, salary, hire_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING *`,
            [
                emp_code.trim().toUpperCase(),
                full_name.trim(),
                email.trim().toLowerCase(),
                phone || '',
                department_id || null,
                position.trim(),
                salary || 10000000,
                hire_date || new Date().toISOString().split('T')[0]
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/employees/:id', async (req, res) => {
    const { full_name, email, phone, department_id, position, salary, status } = req.body;
    try {
        const result = await pool.query(
            `UPDATE employees 
             SET full_name = $1, email = $2, phone = $3, department_id = $4, position = $5, salary = $6, status = $7
             WHERE id = $8 RETURNING *`,
            [full_name, email, phone, department_id || null, position, salary, status || 'active', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa nhân viên' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Attendance Management
app.get('/api/attendance', async (req, res) => {
    try {
        const work_date = req.query.date || new Date().toISOString().split('T')[0];
        const result = await pool.query(`
            SELECT 
                e.id AS employee_id,
                e.emp_code,
                e.full_name,
                e.position,
                d.name AS department_name,
                COALESCE(a.work_date, $1::date) AS work_date,
                a.check_in,
                a.check_out,
                COALESCE(a.status, 'unrecorded') AS status,
                a.notes
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN attendance a ON e.id = a.employee_id AND a.work_date = $1::date
            WHERE e.status = 'active'
            ORDER BY e.emp_code ASC
        `, [work_date]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/attendance/check-in', async (req, res) => {
    const { employee_id, work_date, check_in_time } = req.body;
    const date = work_date || new Date().toISOString().split('T')[0];
    const time = check_in_time || new Date().toTimeString().split(' ')[0];

    // Determine status (check-in after 08:15 is considered 'late')
    const [hours, minutes] = time.split(':').map(Number);
    const isLate = (hours > 8) || (hours === 8 && minutes > 15);
    const status = isLate ? 'late' : 'present';
    const notes = isLate ? 'Chấm công vào muộn' : 'Chấm công đúng giờ';

    try {
        const result = await pool.query(`
            INSERT INTO attendance (employee_id, work_date, check_in, status, notes)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (employee_id, work_date)
            DO UPDATE SET check_in = EXCLUDED.check_in, status = EXCLUDED.status, notes = EXCLUDED.notes
            RETURNING *
        `, [employee_id, date, time, status, notes]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/attendance/check-out', async (req, res) => {
    const { employee_id, work_date, check_out_time } = req.body;
    const date = work_date || new Date().toISOString().split('T')[0];
    const time = check_out_time || new Date().toTimeString().split(' ')[0];

    try {
        const result = await pool.query(`
            UPDATE attendance 
            SET check_out = $1 
            WHERE employee_id = $2 AND work_date = $3
            RETURNING *
        `, [time, employee_id, date]);
        res.json(result.rows[0] || { message: 'Cần check-in trước khi check-out' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HRM Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[HRM Server] Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`[HRM Server] Prometheus metrics: http://0.0.0.0:${PORT}/metrics`);
});

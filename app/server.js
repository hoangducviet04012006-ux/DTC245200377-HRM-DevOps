const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const client = require('prom-client');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
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

// Middlewares
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Metrics collection middleware
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

// Timezone Helpers (Asia/Ho_Chi_Minh)
function getVietnamDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function getVietnamTime() {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date());
}

// ==========================================
// AUTHENTICATION & SESSION MANAGEMENT
// ==========================================
// In-memory session store (key: session token -> user info)
const sessions = new Map();

function createSession(user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    sessions.set(token, {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        expiresAt
    });
    return token;
}

function getSessionUser(req) {
    const token = req.cookies?.hrm_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
        sessions.delete(token);
        return null;
    }
    return { token, ...session };
}

function requireAuth(req, res, next) {
    const user = getSessionUser(req);
    if (!user) {
        return res.status(401).json({
            error: 'Yêu cầu đăng nhập quản trị hệ thống để truy cập tài nguyên này'
        });
    }
    req.user = user;
    next();
}

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
// AUTHENTICATION API ENDPOINTS
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu không được để trống' });
    }

    try {
        const result = await pool.query(
            'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE username = $1',
            [username.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
        }

        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(403).json({ error: 'Tài khoản đã bị tạm khóa' });
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
        }

        const token = createSession(user);
        res.cookie('hrm_session', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xác thực hệ thống: ' + err.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const user = getSessionUser(req);
    if (user && user.token) {
        sessions.delete(user.token);
    }
    res.clearCookie('hrm_session', { path: '/' });
    res.json({ success: true, message: 'Đã đăng xuất khỏi hệ thống' });
});

app.get('/api/auth/me', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
        return res.status(401).json({ authenticated: false });
    }
    res.json({
        authenticated: true,
        user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        }
    });
});

// ==========================================
// BUSINESS API ENDPOINTS (PROTECTED)
// ==========================================

// Dashboard summary statistics
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const empCount = await pool.query("SELECT COUNT(*) AS total FROM employees WHERE status = 'active'");
        const deptCount = await pool.query("SELECT COUNT(*) AS total FROM departments");
        const today = getVietnamDate();
        const attStats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'present') AS present_count,
                COUNT(*) FILTER (WHERE status = 'late') AS late_count,
                COUNT(*) FILTER (WHERE status = 'excused_leave' OR status = 'unexcused_leave') AS leave_count
            FROM attendance 
            WHERE work_date = $1::date
        `, [today]);
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
app.get('/api/departments', requireAuth, async (req, res) => {
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

app.post('/api/departments', requireAuth, async (req, res) => {
    const { code, name, manager_name, description } = req.body;
    if (!code || !name) {
        return res.status(400).json({ error: 'Mã phòng ban và tên phòng ban là bắt buộc' });
    }
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    try {
        // Kiểm tra trùng mã phòng ban
        const existing = await pool.query('SELECT id FROM departments WHERE UPPER(code) = $1', [cleanCode]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: `Mã phòng ban "${cleanCode}" đã tồn tại trong hệ thống` });
        }

        const result = await pool.query(
            `INSERT INTO departments (code, name, manager_name, description) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [cleanCode, cleanName, manager_name?.trim() || '', description?.trim() || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/departments/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { code, name, manager_name, description } = req.body;
    if (!code || !name) {
        return res.status(400).json({ error: 'Mã phòng ban và tên phòng ban là bắt buộc' });
    }
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    try {
        // Kiểm tra trùng mã phòng ban khác
        const dupCheck = await pool.query('SELECT id FROM departments WHERE UPPER(code) = $1 AND id <> $2', [cleanCode, id]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ error: `Mã phòng ban "${cleanCode}" đã được sử dụng bởi phòng ban khác` });
        }

        const result = await pool.query(
            `UPDATE departments 
             SET code = $1, name = $2, manager_name = $3, description = $4
             WHERE id = $5 RETURNING *`,
            [cleanCode, cleanName, manager_name?.trim() || '', description?.trim() || '', id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy phòng ban cần sửa' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/departments/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        // Ràng buộc bảo vệ dữ liệu: Ngăn xóa phòng ban nếu còn nhân viên
        const checkEmp = await pool.query(
            'SELECT COUNT(*) AS count FROM employees WHERE department_id = $1',
            [id]
        );
        const count = parseInt(checkEmp.rows[0].count, 10);
        if (count > 0) {
            return res.status(400).json({
                error: `Không thể xóa phòng ban đang có ${count} nhân viên. Vui lòng chuyển nhân viên sang phòng ban khác trước.`
            });
        }

        const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy phòng ban cần xóa' });
        }
        res.json({ success: true, message: 'Đã xóa phòng ban thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Employees CRUD
app.get('/api/employees', requireAuth, async (req, res) => {
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

app.post('/api/employees', requireAuth, async (req, res) => {
    const { emp_code, full_name, email, phone, department_id, position, salary, hire_date } = req.body;
    if (!emp_code || !full_name || !email || !position) {
        return res.status(400).json({ error: 'Mã NV, Họ tên, Email và Vị trí là bắt buộc' });
    }
    const cleanCode = emp_code.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    try {
        // Kiểm tra trùng mã nhân viên
        const codeCheck = await pool.query('SELECT id FROM employees WHERE UPPER(emp_code) = $1', [cleanCode]);
        if (codeCheck.rows.length > 0) {
            return res.status(400).json({ error: `Mã nhân viên "${cleanCode}" đã tồn tại trong hệ thống` });
        }

        // Kiểm tra trùng email
        const emailCheck = await pool.query('SELECT id FROM employees WHERE LOWER(email) = $1', [cleanEmail]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: `Email "${cleanEmail}" đã được sử dụng bởi nhân viên khác` });
        }

        // Kiểm tra phòng ban hợp lệ nếu có
        if (department_id) {
            const deptCheck = await pool.query('SELECT id FROM departments WHERE id = $1', [department_id]);
            if (deptCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Phòng ban được chọn không tồn tại' });
            }
        }

        const today = getVietnamDate();
        const result = await pool.query(
            `INSERT INTO employees (emp_code, full_name, email, phone, department_id, position, salary, hire_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING *`,
            [
                cleanCode,
                full_name.trim(),
                cleanEmail,
                phone?.trim() || '',
                department_id || null,
                position.trim(),
                parseFloat(salary) || 12000000,
                hire_date || today
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/employees/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone, department_id, position, salary, status } = req.body;
    if (!full_name || !email || !position) {
        return res.status(400).json({ error: 'Họ tên, Email và Vị trí là bắt buộc' });
    }
    const cleanEmail = email.trim().toLowerCase();

    try {
        // Kiểm tra trùng email với nhân viên khác
        const dupEmail = await pool.query('SELECT id FROM employees WHERE LOWER(email) = $1 AND id <> $2', [cleanEmail, id]);
        if (dupEmail.rows.length > 0) {
            return res.status(400).json({ error: `Email "${cleanEmail}" đã được sử dụng bởi nhân viên khác` });
        }

        const result = await pool.query(
            `UPDATE employees 
             SET full_name = $1, email = $2, phone = $3, department_id = $4, position = $5, salary = $6, status = $7
             WHERE id = $8 RETURNING *`,
            [full_name.trim(), cleanEmail, phone?.trim() || '', department_id || null, position.trim(), parseFloat(salary) || 12000000, status || 'active', id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy nhân viên cần sửa' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/employees/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy nhân viên cần xóa' });
        }
        res.json({ success: true, message: 'Đã xóa nhân viên và bản ghi chấm công liên quan thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Attendance Management
app.get('/api/attendance', requireAuth, async (req, res) => {
    try {
        const work_date = req.query.date || getVietnamDate();
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

app.post('/api/attendance/check-in', requireAuth, async (req, res) => {
    const { employee_id, work_date, check_in_time } = req.body;
    if (!employee_id) {
        return res.status(400).json({ error: 'Mã định danh nhân viên là bắt buộc' });
    }

    const date = work_date || getVietnamDate();
    const time = check_in_time || getVietnamTime();

    try {
        // Kiểm tra xem nhân viên đã có bản ghi chấm công ngày này chưa
        const existing = await pool.query(
            'SELECT id, check_in, check_out, status FROM attendance WHERE employee_id = $1 AND work_date = $2',
            [employee_id, date]
        );

        if (existing.rows.length > 0 && existing.rows[0].check_in) {
            return res.status(400).json({
                error: `Nhân viên đã được chấm công vào lúc ${existing.rows[0].check_in} ngày ${date} (không thể chấm công vào trùng lặp)`
            });
        }

        // Quy ước giờ: Check-in sau 08:15:00 tính là đi muộn (late)
        const [hours, minutes] = time.split(':').map(Number);
        const isLate = (hours > 8) || (hours === 8 && minutes > 15);
        const status = isLate ? 'late' : 'present';
        const notes = isLate ? 'Chấm công vào muộn' : 'Chấm công đúng giờ';

        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE attendance SET check_in = $1, status = $2, notes = $3 WHERE id = $4 RETURNING *`,
                [time, status, notes, existing.rows[0].id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO attendance (employee_id, work_date, check_in, status, notes)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [employee_id, date, time, status, notes]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/attendance/check-out', requireAuth, async (req, res) => {
    const { employee_id, work_date, check_out_time } = req.body;
    if (!employee_id) {
        return res.status(400).json({ error: 'Mã định danh nhân viên là bắt buộc' });
    }

    const date = work_date || getVietnamDate();
    const time = check_out_time || getVietnamTime();

    try {
        // Kiểm tra đã có bản ghi check-in chưa
        const record = await pool.query(
            'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND work_date = $2',
            [employee_id, date]
        );

        if (record.rows.length === 0 || !record.rows[0].check_in) {
            return res.status(400).json({
                error: 'Nhân viên chưa chấm công vào ngày hôm nay, không thể chấm công ra'
            });
        }

        const checkInTime = record.rows[0].check_in;
        // Ràng buộc nghiệp vụ: Giờ ra KHÔNG ĐƯỢC trước giờ vào
        if (time < checkInTime) {
            return res.status(400).json({
                error: `Giờ ra (${time}) không được trước giờ vào (${checkInTime})`
            });
        }

        const result = await pool.query(
            `UPDATE attendance SET check_out = $1 WHERE id = $2 RETURNING *`,
            [time, record.rows[0].id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual attendance record creation/modification
app.post('/api/attendance/record', requireAuth, async (req, res) => {
    const { employee_id, work_date, check_in, check_out, status, notes } = req.body;
    if (!employee_id || !work_date) {
        return res.status(400).json({ error: 'Nhân viên và ngày chấm công là bắt buộc' });
    }

    if (check_in && check_out && check_out < check_in) {
        return res.status(400).json({
            error: `Giờ ra (${check_out}) không được trước giờ vào (${check_in})`
        });
    }

    try {
        const result = await pool.query(`
            INSERT INTO attendance (employee_id, work_date, check_in, check_out, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (employee_id, work_date)
            DO UPDATE SET 
                check_in = COALESCE(EXCLUDED.check_in, attendance.check_in),
                check_out = COALESCE(EXCLUDED.check_out, attendance.check_out),
                status = COALESCE(EXCLUDED.status, attendance.status),
                notes = COALESCE(EXCLUDED.notes, attendance.notes)
            RETURNING *
        `, [
            employee_id,
            work_date,
            check_in || null,
            check_out || null,
            status || 'present',
            notes || ''
        ]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
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

// HRM Core - Enterprise Client Logic
// MSSV: DTC245200377 - Hoàng Đức Việt

let currentTab = 'dashboard';
let employeesCache = [];
let departmentsCache = [];
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTabs();
    initDefaultDates();
    loadDashboardStats();
    loadDepartments();
    loadEmployees();
    loadAttendance();
    checkHealth();
});

// Realtime Clock
function initClock() {
    const clockEl = document.getElementById('live-clock');
    const update = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('vi-VN');
    };
    update();
    setInterval(update, 1000);
}

// Tab Switching
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('current-view-title');
    const quickActionBtn = document.getElementById('btn-quick-action');

    const titles = {
        'dashboard': 'Bảng Điều Khiển Tổng Quan',
        'employees': 'Quản Lý Hồ Sơ Nhân Viên',
        'departments': 'Quản Lý Cơ Cấu Phòng Ban',
        'attendance': 'Bảng Điểm Danh & Chấm Công Hàng Ngày',
        'system-status': 'Kiểm Tra Sức Khỏe & Trạng Thái Hạ Tầng'
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            currentTab = tab;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            tabPanes.forEach(p => p.classList.remove('active'));
            const targetPane = document.getElementById(`tab-${tab}`);
            if (targetPane) targetPane.classList.add('active');

            pageTitle.textContent = titles[tab] || 'Hệ Thống Quản Trị';

            // Contextual quick button
            if (tab === 'departments') {
                quickActionBtn.innerHTML = `<span>+ Thêm Phòng Ban</span>`;
                quickActionBtn.onclick = openAddDeptModal;
            } else {
                quickActionBtn.innerHTML = `<span>+ Thêm Nhân Viên</span>`;
                quickActionBtn.onclick = openAddEmployeeModal;
            }

            // Refresh specific data
            if (tab === 'dashboard') loadDashboardStats();
            if (tab === 'employees') loadEmployees();
            if (tab === 'departments') loadDepartments();
            if (tab === 'attendance') loadAttendance();
            if (tab === 'system-status') checkHealth();
        });
    });
}

function initDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const attDate = document.getElementById('attendance-date');
    if (attDate) attDate.value = today;

    const empHire = document.getElementById('modal-emp-hire-date');
    if (empHire) empHire.value = today;
}

// ==========================================
// API CALLS: DASHBOARD STATS
// ==========================================
async function loadDashboardStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        document.getElementById('stat-total-emp').textContent = data.total_employees || 0;
        document.getElementById('stat-total-dept').textContent = data.total_departments || 0;
        document.getElementById('stat-present-today').textContent = data.present_today || 0;
        document.getElementById('stat-late-today').textContent = (data.late_today || 0) + (data.leave_today || 0);

        // Render department distribution
        const container = document.getElementById('dept-distribution-list');
        if (data.department_distribution && data.department_distribution.length > 0) {
            let html = '<div style="display:flex; flex-direction:column; gap:16px;">';
            const maxVal = Math.max(...data.department_distribution.map(d => parseInt(d.count, 10)), 1);
            
            data.department_distribution.forEach(d => {
                const pct = Math.round((parseInt(d.count, 10) / maxVal) * 100);
                html += `
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:6px;">
                            <strong>${escapeHtml(d.name)}</strong>
                            <span>${d.count} nhân sự</span>
                        </div>
                        <div style="background:#f1f5f9; height:10px; border-radius:999px; overflow:hidden;">
                            <div style="background:linear-gradient(90deg, #6366f1, #4f46e5); width:${pct}%; height:100%; border-radius:999px;"></div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="text-center py-4" style="color:var(--text-secondary);">Chưa có dữ liệu thống kê</p>';
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ==========================================
// API CALLS: EMPLOYEES
// ==========================================
function debounceLoadEmployees() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadEmployees, 300);
}

async function loadEmployees() {
    const search = document.getElementById('emp-search-input')?.value || '';
    const deptId = document.getElementById('emp-dept-filter')?.value || '';
    const tbody = document.getElementById('employees-table-body');

    try {
        let url = `/api/employees?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (deptId) url += `department_id=${encodeURIComponent(deptId)}&`;

        const res = await fetch(url);
        const data = await res.json();
        employeesCache = data;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Không tìm thấy nhân viên phù hợp</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(emp => {
            const salaryFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(emp.salary);
            const statusBadge = emp.status === 'active' 
                ? '<span class="badge badge-success">Đang công tác</span>'
                : '<span class="badge badge-danger">Đã nghỉ việc</span>';

            html += `
                <tr>
                    <td><strong>${escapeHtml(emp.emp_code)}</strong></td>
                    <td>
                        <div style="font-weight:600;">${escapeHtml(emp.full_name)}</div>
                        <div style="font-size:0.78rem; color:var(--text-secondary);">${escapeHtml(emp.email)}</div>
                    </td>
                    <td>${escapeHtml(emp.department_name || 'Chưa gán')}</td>
                    <td>${escapeHtml(emp.position)}</td>
                    <td style="font-weight:600;">${salaryFormatted}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="deleteEmployee(${emp.id}, '${escapeHtml(emp.full_name)}')">Xóa</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-amber">Lỗi kết nối cơ sở dữ liệu: ${err.message}</td></tr>`;
    }
}

async function handleCreateEmployee(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
        const res = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            alert('Lỗi: ' + (err.error || 'Không thể tạo nhân viên'));
            return;
        }
        closeModal('modal-employee');
        form.reset();
        initDefaultDates();
        loadEmployees();
        loadDashboardStats();
        loadAttendance();
        alert('Đã thêm nhân viên thành công!');
    } catch (err) {
        alert('Lỗi kết nối API: ' + err.message);
    }
}

async function deleteEmployee(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" khỏi cơ sở dữ liệu?`)) return;
    try {
        const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadEmployees();
            loadDashboardStats();
            loadAttendance();
        } else {
            alert('Lỗi khi xóa nhân viên');
        }
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

// ==========================================
// API CALLS: DEPARTMENTS
// ==========================================
async function loadDepartments() {
    const tbody = document.getElementById('departments-table-body');
    const filterSelect = document.getElementById('emp-dept-filter');
    const modalSelect = document.getElementById('modal-emp-dept-select');

    try {
        const res = await fetch('/api/departments');
        const data = await res.json();
        departmentsCache = data;

        // Populate selects
        let filterOpts = '<option value="">Tất cả phòng ban</option>';
        let modalOpts = '<option value="">-- Chọn phòng ban --</option>';

        data.forEach(d => {
            filterOpts += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
            modalOpts += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
        });

        if (filterSelect) filterSelect.innerHTML = filterOpts;
        if (modalSelect) modalSelect.innerHTML = modalOpts;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Chưa có phòng ban nào</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(d => {
            html += `
                <tr>
                    <td><strong>${escapeHtml(d.code)}</strong></td>
                    <td style="font-weight:600;">${escapeHtml(d.name)}</td>
                    <td>${escapeHtml(d.manager_name || 'Chưa bổ nhiệm')}</td>
                    <td><span class="badge badge-success">${d.employee_count} thành viên</span></td>
                    <td style="color:var(--text-secondary);">${escapeHtml(d.description || '-')}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="deleteDepartment(${d.id}, '${escapeHtml(d.name)}')">Xóa</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-amber">Lỗi kết nối cơ sở dữ liệu: ${err.message}</td></tr>`;
    }
}

async function handleCreateDepartment(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
        const res = await fetch('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            alert('Lỗi: ' + (err.error || 'Không thể tạo phòng ban'));
            return;
        }
        closeModal('modal-department');
        form.reset();
        loadDepartments();
        loadDashboardStats();
        alert('Đã thêm phòng ban thành công!');
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

async function deleteDepartment(id, name) {
    if (!confirm(`Bạn có chắc muốn xóa phòng ban "${name}"?`)) return;
    try {
        const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadDepartments();
            loadDashboardStats();
            loadEmployees();
        } else {
            alert('Không thể xóa phòng ban đang có nhân viên.');
        }
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

// ==========================================
// API CALLS: ATTENDANCE
// ==========================================
async function loadAttendance() {
    const dateInput = document.getElementById('attendance-date');
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('attendance-table-body');

    try {
        const res = await fetch(`/api/attendance?date=${encodeURIComponent(date)}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Chưa có nhân viên nào trong ngày được chọn</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            let statusBadge = '<span class="badge" style="background:#e2e8f0; color:#475569;">Chưa điểm danh</span>';
            if (item.status === 'present') statusBadge = '<span class="badge badge-success">✓ Đúng giờ</span>';
            else if (item.status === 'late') statusBadge = '<span class="badge badge-warning">⚠️ Đi muộn</span>';
            else if (item.status === 'excused_leave') statusBadge = '<span class="badge badge-notice">Nghỉ có phép</span>';

            const checkInVal = item.check_in ? item.check_in.substring(0, 5) : '--:--';
            const checkOutVal = item.check_out ? item.check_out.substring(0, 5) : '--:--';

            html += `
                <tr>
                    <td><strong>${escapeHtml(item.emp_code)}</strong></td>
                    <td style="font-weight:600;">${escapeHtml(item.full_name)}</td>
                    <td>${escapeHtml(item.department_name || '-')}</td>
                    <td style="font-family:monospace; font-weight:700;">${checkInVal}</td>
                    <td style="font-family:monospace; font-weight:700;">${checkOutVal}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="quickCheckIn(${item.employee_id})">Vào</button>
                        <button class="btn btn-secondary btn-sm" onclick="quickCheckOut(${item.employee_id})">Ra</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-amber">Lỗi: ${err.message}</td></tr>`;
    }
}

async function quickCheckIn(empId) {
    const date = document.getElementById('attendance-date')?.value;
    try {
        const res = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: empId, work_date: date })
        });
        if (res.ok) {
            loadAttendance();
            loadDashboardStats();
        }
    } catch (err) {
        alert('Lỗi check-in: ' + err.message);
    }
}

async function quickCheckOut(empId) {
    const date = document.getElementById('attendance-date')?.value;
    try {
        const res = await fetch('/api/attendance/check-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: empId, work_date: date })
        });
        if (res.ok) {
            loadAttendance();
        }
    } catch (err) {
        alert('Lỗi check-out: ' + err.message);
    }
}

// ==========================================
// SYSTEM HEALTH CHECK
// ==========================================
async function checkHealth() {
    const ind = document.getElementById('health-indicator');
    const title = document.getElementById('health-title');
    const sub = document.getElementById('health-sub');

    try {
        const res = await fetch('/health');
        const data = await res.json();
        if (res.ok && data.status === 'UP') {
            ind.className = 'health-indicator status-online';
            title.textContent = `Hệ Thống HRM Core: ĐANG HOẠT ĐỘNG (UP)`;
            sub.textContent = `Cơ sở dữ liệu: ${data.database} | Uptime: ${Math.round(data.uptime_seconds)}s | Sinh viên: ${data.student_id}`;
        } else {
            ind.className = 'health-indicator status-offline';
            title.textContent = `Dịch Vụ: CẢNH BÁO / GIÁN ĐOẠN`;
            sub.textContent = data.error || 'Không thể kết nối đến PostgreSQL';
        }
    } catch (err) {
        ind.className = 'health-indicator status-offline';
        title.textContent = `Mất Kết Nối API Backend`;
        sub.textContent = err.message;
    }
}

// ==========================================
// MODAL CONTROLS & UTILITIES
// ==========================================
function openAddEmployeeModal() {
    document.getElementById('modal-employee').classList.add('open');
}

function openAddDeptModal() {
    document.getElementById('modal-department').classList.add('open');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

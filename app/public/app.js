// HRM Core - Enterprise Client Logic
// MSSV: DTC245200377 - Hoàng Đức Việt

let currentTab = 'dashboard';
let employeesCache = [];
let departmentsCache = [];
let currentUser = null;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTabs();
    initDefaultDates();
    checkAuthStatus();
});

// Realtime Clock
function initClock() {
    const clockEl = document.getElementById('live-clock');
    const update = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
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
    // Current date in Asia/Ho_Chi_Minh
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());

    const attDate = document.getElementById('attendance-date');
    if (attDate) attDate.value = today;

    const empHire = document.getElementById('modal-emp-hire-date');
    if (empHire) empHire.value = today;

    const recordDate = document.getElementById('att-record-date');
    if (recordDate) recordDate.value = today;
}

// ==========================================
// AUTHENTICATION CLIENT LOGIC
// ==========================================
async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            updateAuthUI();
            loadAllData();
        } else {
            currentUser = null;
            updateAuthUI();
            openLoginModal();
        }
    } catch (err) {
        currentUser = null;
        updateAuthUI();
        console.error('Auth check error:', err);
    }
}

function updateAuthUI() {
    const authInfo = document.getElementById('auth-info');
    const authUserName = document.getElementById('auth-user-name');
    const btnLoginOpen = document.getElementById('btn-login-open');

    if (currentUser) {
        authInfo.style.display = 'flex';
        authUserName.textContent = `${currentUser.full_name} (${currentUser.username})`;
        btnLoginOpen.style.display = 'none';
    } else {
        authInfo.style.display = 'none';
        btnLoginOpen.style.display = 'inline-flex';
    }
}

function openLoginModal() {
    const alertBox = document.getElementById('login-error-alert');
    if (alertBox) alertBox.style.display = 'none';
    document.getElementById('modal-login').classList.add('open');
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    const alertBox = document.getElementById('login-error-alert');

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            currentUser = data.user;
            closeModal('modal-login');
            updateAuthUI();
            loadAllData();
        } else {
            if (alertBox) {
                alertBox.textContent = data.error || 'Đăng nhập không thành công';
                alertBox.style.display = 'block';
            }
        }
    } catch (err) {
        if (alertBox) {
            alertBox.textContent = 'Lỗi kết nối máy chủ: ' + err.message;
            alertBox.style.display = 'block';
        }
    }
}

async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout error:', err);
    }
    currentUser = null;
    updateAuthUI();
    openLoginModal();
}

function loadAllData() {
    loadDashboardStats();
    loadDepartments();
    loadEmployees();
    loadAttendance();
    checkHealth();
}

// Wrapper to handle 401 unauthorized
async function fetchWithAuth(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        currentUser = null;
        updateAuthUI();
        openLoginModal();
        throw new Error('Yêu cầu đăng nhập quản trị hệ thống');
    }
    return res;
}

// ==========================================
// API CALLS: DASHBOARD STATS
// ==========================================
async function loadDashboardStats() {
    try {
        const res = await fetchWithAuth('/api/stats');
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

        const res = await fetchWithAuth(url);
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
                        <div class="table-actions">
                            <button class="btn btn-secondary btn-sm" onclick="openEditEmployeeModal(${emp.id})">Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${emp.id}, '${escapeHtml(emp.full_name)}')">Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-amber">${err.message}</td></tr>`;
    }
}

async function handleCreateEmployee(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
        const res = await fetchWithAuth('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (!res.ok) {
            alert('Lỗi: ' + (result.error || 'Không thể tạo nhân viên'));
            return;
        }
        closeModal('modal-employee');
        form.reset();
        initDefaultDates();
        loadEmployees();
        loadDashboardStats();
        loadAttendance();
        alert(`Đã thêm nhân viên ${result.full_name} (${result.emp_code}) thành công!`);
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

function openEditEmployeeModal(id) {
    const emp = employeesCache.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('edit-emp-id').value = emp.id;
    document.getElementById('edit-emp-code').value = emp.emp_code;
    document.getElementById('edit-emp-name').value = emp.full_name;
    document.getElementById('edit-emp-email').value = emp.email;
    document.getElementById('edit-emp-phone').value = emp.phone || '';
    document.getElementById('edit-emp-position').value = emp.position;
    document.getElementById('edit-emp-salary').value = emp.salary;
    document.getElementById('edit-emp-status').value = emp.status;

    // Populate dept select in edit modal
    const deptSelect = document.getElementById('edit-emp-dept');
    let opts = '<option value="">-- Chọn phòng ban --</option>';
    departmentsCache.forEach(d => {
        const selected = d.id === emp.department_id ? 'selected' : '';
        opts += `<option value="${d.id}" ${selected}>${escapeHtml(d.name)}</option>`;
    });
    deptSelect.innerHTML = opts;

    document.getElementById('modal-edit-employee').classList.add('open');
}

async function handleUpdateEmployee(e) {
    e.preventDefault();
    const form = e.target;
    const id = document.getElementById('edit-emp-id').value;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
        const res = await fetchWithAuth(`/api/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (!res.ok) {
            alert('Lỗi: ' + (result.error || 'Không thể cập nhật nhân viên'));
            return;
        }
        closeModal('modal-edit-employee');
        loadEmployees();
        loadDashboardStats();
        loadAttendance();
        alert('Cập nhật thông tin nhân viên thành công!');
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

async function deleteEmployee(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" khỏi cơ sở dữ liệu?`)) return;
    try {
        const res = await fetchWithAuth(`/api/employees/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            loadEmployees();
            loadDashboardStats();
            loadAttendance();
            alert(data.message || 'Đã xóa nhân viên thành công');
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể xóa nhân viên'));
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
        const res = await fetchWithAuth('/api/departments');
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
                        <div class="table-actions">
                            <button class="btn btn-secondary btn-sm" onclick="openEditDepartmentModal(${d.id})">Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteDepartment(${d.id}, '${escapeHtml(d.name)}')">Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-amber">${err.message}</td></tr>`;
    }
}

async function handleCreateDepartment(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
        const res = await fetchWithAuth('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (!res.ok) {
            alert('Lỗi: ' + (result.error || 'Không thể tạo phòng ban'));
            return;
        }
        closeModal('modal-department');
        form.reset();
        loadDepartments();
        loadDashboardStats();
        alert(`Đã thêm phòng ban "${result.name}" (${result.code}) thành công!`);
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

function openEditDepartmentModal(id) {
    const dept = departmentsCache.find(d => d.id === id);
    if (!dept) return;

    document.getElementById('edit-dept-id').value = dept.id;
    document.getElementById('edit-dept-code').value = dept.code;
    document.getElementById('edit-dept-name').value = dept.name;
    document.getElementById('edit-dept-manager').value = dept.manager_name || '';
    document.getElementById('edit-dept-desc').value = dept.description || '';

    document.getElementById('modal-edit-department').classList.add('open');
}

async function handleUpdateDepartment(e) {
    e.preventDefault();
    const form = e.target;
    const id = document.getElementById('edit-dept-id').value;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
        const res = await fetchWithAuth(`/api/departments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (!res.ok) {
            alert('Lỗi: ' + (result.error || 'Không thể cập nhật phòng ban'));
            return;
        }
        closeModal('modal-edit-department');
        loadDepartments();
        loadDashboardStats();
        alert('Cập nhật phòng ban thành công!');
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

async function deleteDepartment(id, name) {
    if (!confirm(`Bạn có chắc muốn xóa phòng ban "${name}"?`)) return;
    try {
        const res = await fetchWithAuth(`/api/departments/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            loadDepartments();
            loadDashboardStats();
            loadEmployees();
            alert(data.message || 'Đã xóa phòng ban thành công');
        } else {
            // Hiển thị thông báo ràng buộc ngăn xóa phòng ban còn nhân viên
            alert('Lỗi ràng buộc dữ liệu: ' + (data.error || 'Không thể xóa phòng ban đang có nhân viên'));
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
    const date = dateInput ? dateInput.value : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());

    const tbody = document.getElementById('attendance-table-body');

    try {
        const res = await fetchWithAuth(`/api/attendance?date=${encodeURIComponent(date)}`);
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
            else if (item.status === 'unexcused_leave') statusBadge = '<span class="badge badge-danger">Nghỉ không phép</span>';

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
                        <div class="table-actions">
                            <button class="btn btn-secondary btn-sm" onclick="quickCheckIn(${item.employee_id})">Vào</button>
                            <button class="btn btn-secondary btn-sm" onclick="quickCheckOut(${item.employee_id})">Ra</button>
                            <button class="btn btn-secondary btn-sm" onclick="openAttendanceRecordModal(${item.employee_id}, '${escapeHtml(item.full_name)}', '${escapeHtml(item.work_date)}', '${item.check_in || ''}', '${item.check_out || ''}', '${item.status || 'present'}', '${escapeHtml(item.notes || '')}')">Chi Tiết</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-amber">${err.message}</td></tr>`;
    }
}

async function quickCheckIn(empId) {
    const date = document.getElementById('attendance-date')?.value;
    try {
        const res = await fetchWithAuth('/api/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: empId, work_date: date })
        });
        const data = await res.json();
        if (res.ok) {
            loadAttendance();
            loadDashboardStats();
        } else {
            alert('Lỗi chấm công vào: ' + (data.error || 'Không thể chấm công'));
        }
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

async function quickCheckOut(empId) {
    const date = document.getElementById('attendance-date')?.value;
    try {
        const res = await fetchWithAuth('/api/attendance/check-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: empId, work_date: date })
        });
        const data = await res.json();
        if (res.ok) {
            loadAttendance();
        } else {
            alert('Lỗi chấm công ra: ' + (data.error || 'Không thể chấm công'));
        }
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

function openAttendanceRecordModal(empId, empName, workDate, checkIn, checkOut, status, notes) {
    document.getElementById('att-record-emp-id').value = empId;
    document.getElementById('att-record-emp-name').value = empName;
    document.getElementById('att-record-date').value = workDate || document.getElementById('attendance-date')?.value;
    document.getElementById('att-record-check-in').value = checkIn ? checkIn.substring(0, 8) : '';
    document.getElementById('att-record-check-out').value = checkOut ? checkOut.substring(0, 8) : '';
    document.getElementById('att-record-status').value = status || 'present';
    document.getElementById('att-record-notes').value = notes || '';

    document.getElementById('modal-attendance-record').classList.add('open');
}

async function handleSaveAttendanceRecord(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    // Validate check_out >= check_in
    if (body.check_in && body.check_out && body.check_out < body.check_in) {
        alert(`Lỗi nghiệp vụ: Giờ ra (${body.check_out}) không được trước giờ vào (${body.check_in})!`);
        return;
    }

    try {
        const res = await fetchWithAuth('/api/attendance/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) {
            alert('Lỗi: ' + (data.error || 'Không thể lưu bản ghi chấm công'));
            return;
        }
        closeModal('modal-attendance-record');
        loadAttendance();
        loadDashboardStats();
        alert('Đã lưu bản ghi chấm công thành công!');
    } catch (err) {
        alert('Lỗi: ' + err.message);
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

-- Khởi tạo cơ sở dữ liệu Quản lý Nhân sự (HRM)
-- Đề tài 10 - MSSV: DTC245200377

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    manager_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    emp_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    position VARCHAR(100) NOT NULL,
    salary NUMERIC(15, 2) NOT NULL DEFAULT 12000000,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIME,
    check_out TIME,
    status VARCHAR(30) NOT NULL DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_date UNIQUE(employee_id, work_date)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'staff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thêm dữ liệu mẫu phòng ban
INSERT INTO departments (code, name, manager_name, description) VALUES
('PB-IT', 'Phòng Công Nghệ Thông Tin', 'Hoàng Đức Việt', 'Phát triển và quản trị hệ thống hạ tầng CNTT, DevOps'),
('PB-HR', 'Phòng Hành Chính Nhân Sự', 'Nguyễn Thị Thu Hà', 'Quản lý tuyển dụng, chế độ đãi ngộ, văn hóa doanh nghiệp'),
('PB-KT', 'Phòng Tài Chính Kế Toán', 'Trần Văn Mạnh', 'Quản lý thu chi, kiểm toán và báo cáo thuế doanh nghiệp'),
('PB-KD', 'Phòng Kinh Doanh & Tiếp Thị', 'Lê Thị Mai', 'Mở rộng thị trường, chăm sóc khách hàng và bán hàng')
ON CONFLICT (code) DO NOTHING;

-- Thêm dữ liệu mẫu nhân viên
INSERT INTO employees (emp_code, full_name, email, phone, department_id, position, salary, hire_date, status) VALUES
('NV001', 'Hoàng Đức Việt', 'viet.hoang@hrm.local', '0987654321', 1, 'Trưởng phòng DevOps / Cloud Engineer', 35000000, '2023-01-15', 'active'),
('NV002', 'Nguyễn Thị Thu Hà', 'ha.nguyen@hrm.local', '0912345678', 2, 'Trưởng phòng Nhân sự', 25000000, '2023-03-01', 'active'),
('NV003', 'Trần Văn Mạnh', 'manh.tran@hrm.local', '0923456789', 3, 'Kế toán trưởng', 22000000, '2023-04-10', 'active'),
('NV004', 'Lê Thị Mai', 'mai.le@hrm.local', '0934567890', 4, 'Giám đốc Kinh Doanh', 28000000, '2023-05-20', 'active'),
('NV005', 'Phạm Minh Tuấn', 'tuan.pham@hrm.local', '0945678901', 1, 'Full-Stack Developer', 20000000, '2023-08-01', 'active'),
('NV006', 'Đỗ Thùy Linh', 'linh.do@hrm.local', '0956789012', 2, 'Chuyên viên Tuyển dụng', 15000000, '2023-09-15', 'active'),
('NV007', 'Vũ Quốc Bảo', 'bao.vu@hrm.local', '0967890123', 1, 'System Administrator', 18000000, '2023-11-01', 'active'),
('NV008', 'Bùi Lan Phương', 'phuong.bui@hrm.local', '0978901234', 3, 'Chuyên viên Kế toán', 14000000, '2024-01-08', 'active')
ON CONFLICT (emp_code) DO NOTHING;

-- Thêm dữ liệu mẫu chấm công hôm nay
INSERT INTO attendance (employee_id, work_date, check_in, check_out, status, notes) VALUES
(1, CURRENT_DATE, '08:00:00', '17:30:00', 'present', 'Làm việc đúng giờ'),
(2, CURRENT_DATE, '07:55:00', '17:30:00', 'present', 'Làm việc đúng giờ'),
(3, CURRENT_DATE, '08:15:00', '17:45:00', 'late', 'Đi muộn 15 phút do kẹt xe'),
(4, CURRENT_DATE, '08:00:00', '17:30:00', 'present', 'Làm việc đúng giờ'),
(5, CURRENT_DATE, '08:05:00', '17:35:00', 'present', 'Làm việc đúng giờ'),
(6, CURRENT_DATE, NULL, NULL, 'excused_leave', 'Nghỉ phép thường niên có đơn'),
(7, CURRENT_DATE, '07:50:00', '17:30:00', 'present', 'Đi làm sớm hỗ trợ bảo trì server'),
(8, CURRENT_DATE, '08:00:00', '17:30:00', 'present', 'Làm việc đúng giờ')
ON CONFLICT (employee_id, work_date) DO NOTHING;

-- Bảng tài khoản quản trị (mật khẩu được khởi tạo an toàn qua biến môi trường khi triển khai, không lưu mật khẩu mặc định trong Git)
-- Users table definition is already created above with CREATE TABLE IF NOT EXISTS users.

-- Phân tách quyền tối thiểu cho Ứng dụng và Exporter (Least Privilege Hardening)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hrm_app_user') THEN
        CREATE ROLE hrm_app_user WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hrm_exporter_user') THEN
        CREATE ROLE hrm_exporter_user WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
END $$;

DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO hrm_app_user', current_database());
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO hrm_exporter_user', current_database());
END $$;

GRANT USAGE ON SCHEMA public TO hrm_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hrm_app_user;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO hrm_app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hrm_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO hrm_app_user;

GRANT pg_monitor TO hrm_exporter_user;
GRANT pg_read_all_stats TO hrm_exporter_user;

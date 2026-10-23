# HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG (HRM CORE)

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Đề tài số 10:** Hệ thống Quản lý Nhân sự (HRM)  
**Sinh viên thực hiện:** Hoàng Đức Việt  
**Mã số sinh viên (MSSV):** DTC245200377  
**Lớp / Khóa:** K23 - Khoa Công Nghệ Thông Tin - Đại học Công nghệ Thông tin & Truyền thông (ICTU)  

---

## 1. Giới thiệu tổng quan

Hệ thống Quản lý Nhân sự (HRM Core) là giải pháp quản trị doanh nghiệp toàn diện, hỗ trợ quản lý danh mục phòng ban chuyên trách, hồ sơ nhân sự, bảng điểm danh & chấm công tự động theo thời gian thực. Toàn bộ hệ thống được container hóa và triển khai thông qua Docker Compose với mô hình kiến trúc phân tán, áp dụng Nginx Reverse Proxy mã hóa SSL/TLS cùng các biện pháp bảo mật hardening chuyên sâu.

### Các thành phần chính trong bản phát hành (Commit 1):
1. **Ứng dụng Web HRM (hrm-app):** Xây dựng trên nền tảng Node.js / Express tối ưu hóa cho Docker container chạy dưới quyền người dùng không đặc quyền (`USER node`), phục vụ giao diện Single-Page Application (SPA) trực quan, hiện đại.
2. **Cơ sở dữ liệu (hrm-postgres):** Hệ quản trị cơ sở dữ liệu quan hệ PostgreSQL 16 Alpine, tự động khởi tạo bảng (`departments`, `employees`, `attendance`, `users`) và nạp dữ liệu mẫu.
3. **Công cụ Quản trị DB (hrm-pgadmin):** Trình quản lý pgAdmin 4 Web GUI kết nối trực tiếp đến PostgreSQL, hỗ trợ truy vấn và kiểm tra cơ sở dữ liệu.
4. **Cổng giao tiếp an toàn (hrm-nginx):** Nginx 1.25 Alpine đóng vai trò Reverse Proxy, định tuyến lưu lượng HTTPS qua chứng chỉ số tự ký (SAN), áp dụng bộ tiêu chuẩn Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection).

---

## 2. Sơ đồ Kiến trúc Hệ thống (Commit 1)

```
                            [ Client / Trình duyệt ]
                                        │
                         HTTPS (Port 443) / HTTP (Port 80)
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │      hrm-nginx (Reverse Proxy) │
                        │   SSL/TLS + Security Headers  │
                        └───────────────┬───────────────┘
                                        │
                   ┌────────────────────┴────────────────────┐
                   │ (hrm-frontend-network)                  │
                   ▼                                         ▼
        ┌─────────────────────┐                   ┌─────────────────────┐
        │  hrm-app (Port 3000)│                   │hrm-pgadmin (Port 80)│
        │ Node.js Express SPA │                   │    pgAdmin 4 Web    │
        └──────────┬──────────┘                   └──────────┬──────────┘
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │ (hrm-backend-network)
                                        ▼
                        ┌───────────────────────────────┐
                        │  hrm-postgres (Port 5432)     │
                        │    PostgreSQL 16 Alpine       │
                        └───────────────────────────────┘
```

---

## 3. Cấu hình Môi trường & Bảo mật (.env)

Tất cả các tham số nhạy cảm được cấu hình thông qua file `.env`. Bản mẫu an toàn được cung cấp tại `.env.example`:

| Tham số | Giá trị mặc định mẫu | Mô tả |
| :--- | :--- | :--- |
| `POSTGRES_DB` | `hrm_db` | Tên cơ sở dữ liệu HRM |
| `POSTGRES_USER` | `hrm_user` | Tài khoản quản trị DB |
| `POSTGRES_PASSWORD` | *(Mật khẩu mạnh ngẫu nhiên)* | Mật khẩu truy cập PostgreSQL |
| `POSTGRES_PORT` | `5432` | Cổng nội bộ cơ sở dữ liệu |
| `PGADMIN_DEFAULT_EMAIL` | `admin@hrm.local` | Email đăng nhập pgAdmin 4 |
| `PGADMIN_DEFAULT_PASSWORD`| *(Mật khẩu mạnh ngẫu nhiên)* | Mật khẩu đăng nhập pgAdmin 4 |
| `PGADMIN_PORT` | `5050` | Cổng truy cập ngoài của pgAdmin 4 |
| `APP_PORT` | `3000` | Cổng nội bộ của HRM Core Application |

---

## 4. Hướng dẫn Khởi chạy Hệ thống

### Bước 1: Sao chép file môi trường
```bash
cp .env.example .env
```

### Bước 2: Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
docker compose up -d --build
```

### Bước 3: Kiểm tra trạng thái hoạt động của các Container
```bash
docker compose ps
```

Kết quả kỳ vọng: Các container `hrm-postgres`, `hrm-app`, `hrm-pgadmin`, `hrm-nginx` đều ở trạng thái `running` (hoặc `healthy`).

---

## 5. Truy cập Ứng dụng & Kiểm thử Kỹ thuật

- **Trang chủ HRM (HTTPS):** `https://192.168.186.128` (hoặc `https://localhost`)
- **Tự động chuyển hướng HTTP sang HTTPS:** `http://192.168.186.128` -> Chuyển hướng mã 301 về `https://...`
- **pgAdmin 4 Web GUI:** `http://192.168.186.128:5050` hoặc qua Proxy: `https://192.168.186.128/pgadmin/`
- **Kiểm tra sức khỏe hệ thống (Health Check):** `https://192.168.186.128/health`
- **Cổng chỉ số giám sát OpenMetrics:** `https://192.168.186.128/metrics`

### Lệnh kiểm tra tự động qua terminal:
```bash
# 1. Kiểm tra chuyển hướng HTTP -> HTTPS (301 Moved Permanently)
curl -I http://localhost/

# 2. Kiểm tra phản hồi HTTPS và Security Headers
curl -k -I https://localhost/

# 3. Kiểm tra API Healthcheck
curl -k https://localhost/health
```

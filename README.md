# HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG (HRM CORE)

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Đề tài số 10:** Hệ thống Quản lý Nhân sự (HRM)  
**Sinh viên thực hiện:** Hoàng Đức Việt  
**Mã số sinh viên (MSSV):** DTC245200377  
**Lớp / Khóa:** K23 - Khoa Công Nghệ Thông Tin - Đại học Công nghệ Thông tin & Truyền thông (ICTU)  

---

## 1. Giới thiệu tổng quan

Hệ thống Quản lý Nhân sự (HRM Core) là giải pháp quản trị doanh nghiệp toàn diện, hỗ trợ quản lý danh mục phòng ban chuyên trách, hồ sơ nhân sự, bảng điểm danh & chấm công tự động theo thời gian thực. Toàn bộ hệ thống được container hóa và triển khai thông qua Docker Compose với mô hình kiến trúc microservices phân tán, tích hợp Nginx Reverse Proxy mã hóa SSL/TLS, hệ thống giám sát Metrics toàn diện bằng Prometheus + Grafana, và các biện pháp bảo mật hardening chuyên sâu.

### Các thành phần chính trong hệ thống:
1. **Ứng dụng Web HRM (hrm-app):** Xây dựng trên nền tảng Node.js / Express, chạy dưới quyền người dùng không đặc quyền (`USER node`), phục vụ giao diện Single-Page Application (SPA) trực quan, hiện đại, xuất metrics chuẩn OpenMetrics tại `/metrics`.
2. **Cơ sở dữ liệu (hrm-postgres):** Hệ quản trị PostgreSQL 16 Alpine, tự động khởi tạo bảng (`departments`, `employees`, `attendance`, `users`) và nạp dữ liệu mẫu ban đầu.
3. **Công cụ Quản trị DB (hrm-pgadmin):** pgAdmin 4 Web GUI kết nối trực tiếp đến PostgreSQL, hỗ trợ truy vấn và quản lý trực quan.
4. **Cổng giao tiếp an toàn (hrm-nginx):** Nginx 1.25 Alpine đóng vai trò Reverse Proxy, định tuyến lưu lượng HTTPS qua chứng chỉ số tự ký (SAN), áp dụng bộ tiêu chuẩn Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection).
5. **Hệ thống Thu thập Metrics (hrm-prometheus):** Thu thập định kỳ (10s) các chỉ số từ web server, cơ sở dữ liệu, container và host.
6. **Bảng điều khiển Giám sát (hrm-grafana):** Tự động nạp Datasource và Dashboard trực quan hóa hiệu năng hệ thống theo thời gian thực.
7. **PostgreSQL Exporter (hrm-postgres-exporter):** Thu thập chi tiết số lượng kết nối, transaction commit/rollback, cache hit ratio từ PostgreSQL.

---

## 2. Sơ đồ Kiến trúc Hệ thống

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
                   │ (hrm-backend-network)                   │
                   ▼                                         │
        ┌─────────────────────┐                              │
        │  hrm-postgres (5432)│◄─────────────────────────────┘
        │    PostgreSQL 16    │
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │hrm-postgres-exporter    │
        │       (Port 9187)       │
        └──────────┬──────────────┘
                   │
                   ▼ (hrm-monitoring-network)
        ┌─────────────────────────┐
        │hrm-prometheus(Port 9091)│
        └──────────┬──────────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │hrm-grafana (Port 3001)  │
        │  Dashboard Giám Sát     │
        └─────────────────────────┘
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
| `PGADMIN_DEFAULT_EMAIL` | `admin@hrm.com` | Email đăng nhập pgAdmin 4 |
| `PGADMIN_DEFAULT_PASSWORD`| *(Mật khẩu mạnh ngẫu nhiên)* | Mật khẩu đăng nhập pgAdmin 4 |
| `PGADMIN_PORT` | `5050` | Cổng truy cập ngoài của pgAdmin 4 |
| `APP_PORT` | `3000` | Cổng nội bộ của HRM Core Application |
| `PROMETHEUS_PORT` | `9091` | Cổng truy cập Prometheus Web |
| `GRAFANA_PORT` | `3001` | Cổng truy cập Grafana Dashboard |
| `GRAFANA_ADMIN_USER` | `admin` | Tài khoản quản trị Grafana |
| `GRAFANA_ADMIN_PASSWORD` | *(Mật khẩu mạnh ngẫu nhiên)* | Mật khẩu quản trị Grafana |

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

---

## 5. Danh mục Cổng & Điểm cuối Truy cập

- **Ứng dụng HRM (HTTPS):** `https://192.168.186.128` (hoặc `https://localhost`)
- **Tự động chuyển hướng HTTP sang HTTPS:** `http://192.168.186.128` -> HTTP 301 chuyển hướng về `https://...`
- **pgAdmin 4 Web GUI:** `http://192.168.186.128:5050` (hoặc proxy: `https://192.168.186.128/pgadmin/`)
  - *Email:* `admin@hrm.com`
  - *Mật khẩu:* `PgAdminSecure2026!`
- **Prometheus Web UI & Targets:** `http://192.168.186.128:9091`
- **Grafana Metrics Dashboard:** `http://192.168.186.128:3001`
  - *User:* `admin`
  - *Password:* `GrafanaSecure2026!`
  - *Dashboard tự nạp:* `HRM Core - Giám Sát Hiệu Năng Hệ Thống (DTC245200377)`
- **Kiểm tra sức khỏe hệ thống (Health Check):** `https://192.168.186.128/health`
- **Cổng chỉ số giám sát OpenMetrics:** `https://192.168.186.128/metrics`

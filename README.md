# HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG (HRM CORE)

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Đề tài số 10:** Hệ thống Quản lý Nhân sự (HRM)  
**Sinh viên thực hiện:** Hoàng Đức Việt  
**Mã số sinh viên (MSSV):** DTC245200377  
**Lớp / Khóa:** K23 - Khoa Công Nghệ Thông Tin - Đại học Công nghệ Thông tin & Truyền thông (ICTU)  
**Repository GitHub:** https://github.com/hoangducviet04012006-ux/DTC245200377-HRM-DevOps.git  

---

## 1. Giới thiệu tổng quan

Hệ thống Quản lý Nhân sự (HRM Core) là giải pháp quản trị doanh nghiệp toàn diện, hỗ trợ quản lý danh mục phòng ban chuyên trách, hồ sơ nhân sự, bảng điểm danh & chấm công tự động theo thời gian thực. Toàn bộ hệ thống được container hóa và triển khai thông qua Docker Compose với mô hình kiến trúc phân tán microservices, tích hợp Nginx Reverse Proxy mã hóa SSL/TLS, hệ thống giám sát Metrics bằng Prometheus + Grafana, hệ thống thu thập & phân tích Log tập trung bằng Loki + Promtail, cùng các biện pháp bảo mật hardening chuyên sâu.

### Các thành phần chính trong hệ thống:
1. **Ứng dụng Web HRM (hrm-app):** Xây dựng trên nền tảng Node.js / Express, chạy dưới quyền người dùng không đặc quyền (`USER node`), phục vụ giao diện Single-Page Application (SPA) trực quan, hiện đại, xuất metrics chuẩn OpenMetrics tại `/metrics` và healthcheck tại `/health`.
2. **Cơ sở dữ liệu (hrm-postgres):** Hệ quản trị PostgreSQL 16 Alpine, tự động khởi tạo bảng (`departments`, `employees`, `attendance`, `users`) và nạp dữ liệu mẫu ban đầu qua `init.sql`.
3. **Công cụ Quản trị DB (hrm-pgadmin):** pgAdmin 4 Web GUI kết nối trực tiếp đến PostgreSQL, nạp sẵn cấu hình máy chủ qua `servers.json`.
4. **Cổng giao tiếp an toàn (hrm-nginx):** Nginx 1.25 Alpine đóng vai trò Reverse Proxy, định tuyến lưu lượng HTTPS qua chứng chỉ số tự ký có SAN, áp dụng bộ tiêu chuẩn Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection).
5. **Hệ thống Thu thập Metrics (hrm-prometheus):** Định kỳ cào dữ liệu (scrape metrics 10s) từ web application, database exporter, container (cAdvisor) và host (node-exporter).
6. **Bảng điều khiển Giám sát (hrm-grafana):** Tự động nạp Datasource và Dashboard trực quan hóa hiệu năng hệ thống theo thời gian thực.
7. **PostgreSQL Exporter (hrm-postgres-exporter):** Thu thập chi tiết số lượng kết nối, transaction commit/rollback, cache hit ratio từ PostgreSQL.
8. **Hệ thống Quản lý Log Tập Trung (hrm-loki):** Lưu trữ và lập chỉ mục nhật ký hoạt động phân tán với hiệu năng cao.
9. **Log Collector (hrm-promtail):** Tự động thu thập log từ Docker daemon và container stream để đẩy về Loki server.

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
        ┌─────────────────────────┐               ┌─────────────────────────┐
        │hrm-prometheus(Port 9091)│◄──────────────┤hrm-grafana (Port 3001)  │
        └─────────────────────────┘               │  Dashboard Giám Sát     │
                   ▲                              └────────────┬────────────┘
                   │                                           │
        ┌─────────────────────────┐                            ▼
        │hrm-promtail (Log Shipper)──► hrm-loki (Port 3101)────┘
        │ /var/lib/docker/containers (LogQL Engine)
        └─────────────────────────┘
```

---

## 3. Cấu hình Môi trường & Bảo mật (.env)

Tất cả các tham số nhạy cảm được cấu hình thông qua file `.env` (được bảo vệ trong `.gitignore` và không commit lên GitHub). File mẫu `.env.example`:

| Tham số | Giá trị mặc định | Mục đích sử dụng |
| :--- | :--- | :--- |
| `POSTGRES_DB` | `hrm_db` | Tên cơ sở dữ liệu HRM |
| `POSTGRES_USER` | `hrm_user` | Tài khoản kết nối DB ứng dụng |
| `POSTGRES_PASSWORD` | `HrmSecureP@ss2026!` | Mật khẩu truy cập PostgreSQL |
| `POSTGRES_PORT` | `5432` | Cổng nội bộ cơ sở dữ liệu |
| `PGADMIN_DEFAULT_EMAIL` | `admin@hrm.com` | Email đăng nhập pgAdmin 4 Web |
| `PGADMIN_DEFAULT_PASSWORD`| `PgAdminSecure2026!` | Mật khẩu đăng nhập pgAdmin 4 |
| `PGADMIN_PORT` | `5050` | Cổng truy cập pgAdmin 4 trực tiếp |
| `APP_PORT` | `3000` | Cổng nội bộ của HRM Core Application |
| `PROMETHEUS_PORT` | `9091` | Cổng truy cập Prometheus Web UI |
| `GRAFANA_PORT` | `3001` | Cổng truy cập Grafana Dashboard |
| `GRAFANA_ADMIN_USER` | `admin` | Tài khoản quản trị Grafana |
| `GRAFANA_ADMIN_PASSWORD` | `GrafanaSecure2026!` | Mật khẩu quản trị Grafana |
| `LOKI_PORT` | `3101` | Cổng dịch vụ Loki Log Engine |

---

## 4. Hướng dẫn Khởi chạy Hệ thống

### Bước 1: Chuẩn bị file môi trường
```bash
cp .env.example .env
```

### Bước 2: Tạo chứng chỉ SSL tự ký cho Nginx (nếu chưa có)
```bash
cd nginx/ssl && sh generate-ssl.sh && cd ../..
```

### Bước 3: Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra trạng thái hoạt động của các Container
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
- **Grafana Metrics & Log Dashboard:** `http://192.168.186.128:3001`
  - *User:* `admin`
  - *Password:* `GrafanaSecure2026!`
  - *Dashboard tự nạp:* `HRM Core - Giám Sát Hiệu Năng Hệ Thống (DTC245200377)`
- **Loki Log API:** `http://192.168.186.128:3101/loki/api/v1/status/buildinfo`
- **Kiểm tra sức khỏe hệ thống (Health Check):** `https://192.168.186.128/health`
- **Cổng chỉ số giám sát OpenMetrics:** `https://192.168.186.128/metrics`

---

## 6. Truy vấn Log Tập Trung (LogQL)

Hệ thống tích hợp Loki + Promtail để thu thập toàn bộ log container và log hệ thống. Dưới đây là các câu truy vấn LogQL mẫu phục vụ điều tra sự cố và giám sát:

### Query 1: Lọc toàn bộ log của ứng dụng HRM Core
```logql
{job="docker-containers"} |= "hrm-app"
```
*Mục đích:* Xem luồng thực thi, các lệnh API request và thời gian phản hồi của backend Node.js.

### Query 2: Lọc các request lỗi (HTTP 4xx và 5xx) trên Nginx Reverse Proxy
```logql
{job="docker-containers"} |= "hrm-nginx" |~ " (4[0-9]{2}|5[0-9]{2}) "
```
*Mục đích:* Phát hiện các cuộc tấn công dò quét đường dẫn (404), lỗi phân quyền (403), hoặc lỗi sập backend gateway (502/504).

### Query 3: Tính toán tần suất log theo thời gian (Metric Query)
```logql
sum by (stream) (rate({job="docker-containers"}[1m]))
```
*Mục đích:* Đo lường tốc độ phát sinh log trên mỗi giây nhằm phát hiện sự bất thường (log spike) do lỗi lặp vô tận hoặc tấn công DoS.

### Query 4: Giám sát kết nối và truy vấn Cơ sở dữ liệu PostgreSQL
```logql
{job="docker-containers"} |= "hrm-postgres" |= "connection received"
```
*Mục đích:* Kiểm soát các phiên kết nối mới đến PostgreSQL, bảo đảm chỉ các dịch vụ nội bộ được phép khởi tạo kết nối.

---

## 7. Các Biện Pháp Bảo Mật & Hardening Hệ Thống

Hệ thống tuân thủ nghiêm ngặt các tiêu chuẩn an toàn thông tin DevOps:

1. **Non-Root Container Execution:** 
   Container ứng dụng chính `hrm-app` sử dụng chỉ thị `USER node` (UID 1000) trong Dockerfile, ngăn chặn hoàn toàn nguy cơ leo thang đặc quyền (Privilege Escalation) từ container sang máy chủ vật lý nếu phát sinh lỗ hổng phần mềm.
2. **Multi-tier Network Isolation:** 
   Phân tách kiến trúc mạng thành 3 phân vùng riêng biệt (`hrm-frontend-network`, `hrm-backend-network`, `hrm-monitoring-network`). Cơ sở dữ liệu PostgreSQL và Exporter chỉ nằm trong mạng backend/monitoring, không bao giờ mở cổng trực tiếp ra ngoài Internet; chỉ Nginx Reverse Proxy tiếp xúc cổng 80/443.
3. **Quản lý Bí mật & Mật khẩu Mạnh (Least Privilege & Secrets Management):** 
   Tất cả mật khẩu và chuỗi kết nối được quản lý tập trung trong file `.env` với độ dài >= 16 ký tự, có ký tự đặc biệt. File `.env` được đưa vào `.gitignore` để không bao giờ bị rò rỉ mã nguồn lên GitHub. Cung cấp file `.env.example` với dữ liệu mẫu an toàn.
4. **Nginx Security Headers & TLS Hardening:** 
   Áp dụng đầy đủ các HTTP Security Headers đạt chuẩn A+:
   - `Strict-Transport-Security (HSTS)` bắt buộc kết nối an toàn trong 1 năm.
   - `Content-Security-Policy (CSP)` hạn chế thực thi script độc hại và phòng chống XSS.
   - `X-Frame-Options: SAMEORIGIN` chống Clickjacking.
   - `X-Content-Type-Options: nosniff` chống MIME-sniffing.
   - `X-XSS-Protection: 1; mode=block` kích hoạt bộ lọc XSS trình duyệt.
5. **Giới hạn Tài nguyên (Resource Constraints):** 
   Cấu hình `deploy.resources.limits` cho từng container (CPU giới hạn từ 0.5 - 1.0 core, Memory từ 128MB - 512MB) nhằm triệt tiêu nguy cơ tấn công từ chối dịch vụ (DoS) gây cạn kiệt tài nguyên host.
6. **Container Healthcheck Tự Động:** 
   Cấu hình `HEALTHCHECK` định kỳ cho cơ sở dữ liệu (`pg_isready`) và ứng dụng Web (`curl -f /health`), tự động khởi động lại container bị lỗi và chỉ cho phép các service phụ thuộc khởi chạy khi service gốc đã hoàn toàn sẵn sàng.

---

## 8. Lịch sử Commit theo Chuẩn Đề tài

1. **Commit 1:** `feat(core): implement HRM web app with PostgreSQL, pgAdmin and Nginx HTTPS reverse proxy`  
   *(Triển khai mã nguồn web HRM, cơ sở dữ liệu PostgreSQL, pgAdmin và Nginx reverse proxy với HTTPS tự ký và security headers)*
2. **Commit 2:** `feat(monitoring): integrate Prometheus and Grafana for container, web server, and database monitoring`  
   *(Tích hợp Prometheus + Grafana, PostgreSQL Exporter, dashboard trực quan hóa giám sát hệ thống)*
3. **Commit 3:** `feat(logging-hardening): integrate Loki Promtail log aggregation and apply security hardening`  
   *(Tích hợp hệ thống log tập trung Loki + Promtail, tài liệu truy vấn LogQL và áp dụng toàn diện các biện pháp hardening non-root, network isolation, resource limits)*

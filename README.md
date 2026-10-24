# HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG (HRM CORE)

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Đề tài số 10:** Hệ thống Quản lý Nhân sự (HRM)  
**Sinh viên thực hiện:** Hoàng Đức Việt  
**Mã số sinh viên (MSSV):** DTC245200377  
**Lớp / Khóa:** K23 - Khoa Công Nghệ Thông Tin - Đại học Công nghệ Thông tin & Truyền thông (ICTU)  
**Repository GitHub:** https://github.com/hoangducviet04012006-ux/DTC245200377-HRM-DevOps.git  

---

## 1. Giới thiệu tổng quan

Hệ thống Quản lý Nhân sự (HRM Core) là giải pháp quản trị doanh nghiệp toàn diện, hỗ trợ quản lý danh mục phòng ban chuyên trách, hồ sơ nhân sự, bảng điểm danh & chấm công tự động theo thời gian thực. Toàn bộ hệ thống được container hóa và triển khai thông qua Docker Compose với mô hình kiến trúc gồm 11 dịch vụ/container, tích hợp Nginx Reverse Proxy mã hóa SSL/TLS, hệ thống giám sát Metrics bằng Prometheus + Grafana, hệ thống thu thập & phân tích Log tập trung bằng Loki + Promtail, cùng các biện pháp bảo mật hardening chuyên sâu.

### Các thành phần chính trong hệ thống:
1. **Ứng dụng Web HRM (hrm-app):** Xây dựng trên nền tảng Node.js / Express, chạy dưới quyền người dùng không đặc quyền (`USER node`), phục vụ giao diện Single-Page Application (SPA) trực quan, hiện đại, xuất metrics chuẩn OpenMetrics tại `/metrics` và healthcheck tại `/health`.
2. **Cơ sở dữ liệu (hrm-postgres):** Hệ quản trị PostgreSQL 16 Alpine, tự động khởi tạo bảng (`departments`, `employees`, `attendance`, `users`) và nạp dữ liệu mẫu ban đầu qua `init.sql`.
3. **Công cụ Quản trị DB (hrm-pgadmin):** pgAdmin 4 Web GUI kết nối trực tiếp đến PostgreSQL, nạp sẵn cấu hình máy chủ qua `servers.json`.
4. **Cổng giao tiếp an toàn (hrm-nginx):** Nginx 1.25 Alpine đóng vai trò Reverse Proxy, định tuyến lưu lượng HTTPS qua chứng chỉ số tự ký có SAN, áp dụng bộ tiêu chuẩn Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection).
5. **Hệ thống Thu thập Metrics (hrm-prometheus):** Định kỳ cào dữ liệu (scrape metrics 10s) từ web application (hrm-app), máy chủ web Nginx (hrm-nginx-exporter), cơ sở dữ liệu (hrm-postgres-exporter) và container runtime (hrm-cadvisor nội bộ).
6. **Bảng điều khiển Giám sát (hrm-grafana):** Tự động nạp Datasource và Dashboard trực quan hóa hiệu năng hệ thống theo thời gian thực.
7. **PostgreSQL Exporter (hrm-postgres-exporter):** Thu thập chi tiết số lượng kết nối, transaction commit/rollback, cache hit ratio từ PostgreSQL qua tài khoản giám sát đặc thù.
8. **Hệ thống Quản lý Log Tập Trung (hrm-loki):** Grafana Loki 3.7.7 lưu trữ và lập chỉ mục nhật ký hoạt động phân tán với hiệu năng cao.
9. **Log Collector (hrm-promtail):** Grafana Promtail 3.6.8 tự động thu thập log từ Docker daemon và container stream để đẩy về Loki server.

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

Tất cả các tham số nhạy cảm (mật khẩu, chuỗi kết nối, secret) được quản lý tập trung trong file `.env` (nằm ngoài Git qua `.gitignore`). Tuyệt đối không hardcode mật khẩu mặc định trong mã nguồn hay Compose. Tham khảo file mẫu `.env.example`:

| Tham số | Giá trị mẫu / Định dạng | Mục đích sử dụng |
| :--- | :--- | :--- |
| `POSTGRES_DB` | `hrm_db` | Tên cơ sở dữ liệu HRM |
| `POSTGRES_USER` | `hrm_user` | Tài khoản quản trị DB (dùng cho migration / pgAdmin) |
| `POSTGRES_PASSWORD` | `<cấu hình trong file .env>` | Mật khẩu tài khoản quản trị PostgreSQL |
| `POSTGRES_PORT` | `5432` | Cổng nội bộ cơ sở dữ liệu (không mở ra host) |
| `APP_DB_USER` | `hrm_app_user` | Tài khoản phân quyền tối thiểu cho App runtime |
| `APP_DB_PASSWORD` | `<cấu hình trong file .env>` | Mật khẩu DB dành riêng cho ứng dụng |
| `EXPORTER_DB_USER` | `hrm_exporter_user` | Tài khoản quyền `pg_monitor` cho Postgres Exporter |
| `EXPORTER_DB_PASSWORD` | `<cấu hình trong file .env>` | Mật khẩu dành riêng cho Prometheus Exporter |
| `PGADMIN_DEFAULT_EMAIL` | `admin@hrm.com` | Email đăng nhập pgAdmin 4 Web |
| `PGADMIN_DEFAULT_PASSWORD`| `<cấu hình trong file .env>` | Mật khẩu đăng nhập pgAdmin 4 |
| `PGADMIN_PORT` | `5050` | Cổng truy cập pgAdmin 4 trực tiếp |
| `APP_PORT` | `3000` | Cổng nội bộ của HRM Core Application |
| `PROMETHEUS_PORT` | `9091` | Cổng truy cập Prometheus Web UI |
| `GRAFANA_PORT` | `3001` | Cổng truy cập Grafana Dashboard |
| `GRAFANA_ADMIN_USER` | `admin` | Tài khoản quản trị Grafana |
| `GRAFANA_ADMIN_PASSWORD` | `<cấu hình trong file .env>` | Mật khẩu quản trị Grafana |
| `LOKI_PORT` | `3101` | Cổng dịch vụ Loki Log Engine |
| `ADMIN_USERNAME` | `admin` | Tên đăng nhập tài khoản quản trị HRM Web |
| `ADMIN_INITIAL_PASSWORD` | `<cấu hình trong file .env>` | Mật khẩu quản trị HRM Web khởi tạo |

---

## 4. Hướng dẫn Khởi chạy Hệ thống

### Bước 1: Chuẩn bị file môi trường
```bash
cp .env.example .env
# Chỉnh sửa file .env với mật khẩu an toàn riêng
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
  - *Mật khẩu:* `<cấu hình trong file .env>`
- **Prometheus Web UI & Targets:** `http://192.168.186.128:9091/targets` (Gồm 5 scrape targets: 4 target cho HRM app, db, web, container + 1 target tự giám sát Prometheus)
- **Grafana Metrics & Log Dashboard:** `http://192.168.186.128:3001`
  - *User:* `admin`
  - *Password:* `<cấu hình trong file .env>`
  - *Dashboard tự nạp:* `HRM Core - Giám Sát Hiệu Năng Hệ Thống (DTC245200377)`
- **Loki Log API:** `http://192.168.186.128:3101/loki/api/v1/status/buildinfo`
- **Kiểm tra sức khỏe hệ thống (Health Check):** `https://192.168.186.128/health`
- **Cổng chỉ số giám sát OpenMetrics:** `https://192.168.186.128/metrics`

---

## 6. Truy vấn Log Tập Trung (LogQL)

Hệ thống tích hợp Loki + Promtail để tự động thu thập nhật ký của các container thuộc dự án HRM thông qua cơ chế Docker Service Discovery (`docker_sd_configs` với bộ lọc nhãn `com.docker.compose.project=hrm`). Dưới đây là 3 câu truy vấn LogQL chuẩn xác khớp với nhãn và định dạng thực tế của hệ thống:

### Query 1: Xem toàn bộ log của Nginx Reverse Proxy
```logql
{project="hrm", container="hrm-nginx"}
```
*Mục đích:* Giám sát toàn bộ lưu lượng HTTP/HTTPS đi qua cổng gateway Nginx, bao gồm mã trạng thái HTTP, địa chỉ IP truy cập và đường dẫn request.

### Query 2: Lọc sự kiện đăng nhập thất bại và phân biệt với đăng nhập thành công
```logql
# Lọc các lần đăng nhập thất bại (Mã trạng thái HTTP 401)
{project="hrm", container="hrm-nginx"} |= "POST /api/auth/login" |= " 401 "

# Lọc các lần đăng nhập thành công (Mã trạng thái HTTP 200)
{project="hrm", container="hrm-nginx"} |= "POST /api/auth/login" |= " 200 "
```
*Mục đích:* Truy vết chính xác các nỗ lực đăng nhập vào hệ thống HRM, phân biệt rõ ràng giữa các lần đăng nhập thành công (200) và thất bại (401) thông qua mã trạng thái HTTP thực tế trên access log của Nginx Reverse Proxy.

### Query 3: Đếm tổng số log phát sinh theo thời gian (Metric Vector Query)
```logql
sum(count_over_time({project="hrm", container="hrm-nginx"}[5m]))
```
*Mục đích:* Thống kê tổng số dòng log mà Nginx ghi nhận trong khoảng thời gian 5 phút gần nhất, hỗ trợ theo dõi mức độ hoạt động và phát hiện bất thường.

### Query bổ sung: Giám sát log ứng dụng HRM Core
```logql
{project="hrm", container="hrm-app"}
```
*Mục đích:* Theo dõi log nghiệp vụ nội bộ của backend Node.js (kết nối database, truy vấn chấm công, khởi tạo phiên làm việc).

---

## 7. Các Biện Pháp Bảo Mật & Hardening Hệ Thống

Hệ thống áp dụng toàn diện 4 biện pháp an toàn thông tin cốt lõi theo chuẩn DevOps:

1. **Non-Root Container Execution:** 
   Container ứng dụng chính `hrm-app` sử dụng chỉ thị `USER node` (UID 1000) trong Dockerfile, ngăn ngừa nguy cơ leo thang đặc quyền (Privilege Escalation) từ container sang máy chủ vật lý nếu phát sinh lỗ hổng phần mềm.
2. **Multi-tier Network Isolation & Đóng Cổng Database:** 
   Phân tách kiến trúc mạng thành 3 phân vùng riêng biệt (`hrm-frontend-network`, `hrm-backend-network`, `hrm-monitoring-network`). Cơ sở dữ liệu PostgreSQL `hrm-postgres` hoạt động hoàn toàn trong mạng nội bộ, tuyệt đối không publish cổng 5432 ra host vật lý; chỉ có Nginx Reverse Proxy mở cổng công khai 80/443.
3. **Quản lý Bí mật Ngoài Git (Zero Hardcoded Secrets):** 
   Tất cả mật khẩu và chuỗi kết nối được quản lý qua file `.env` với độ phức tạp cao (>= 24 ký tự). File `.env` được đưa vào `.gitignore` để tránh rò rỉ mã nguồn lên GitHub. Toàn bộ mã nguồn backend, file Docker Compose và tài liệu hướng dẫn được làm sạch 100%, không còn bất kỳ mật khẩu dự phòng (fallback default password) hardcode nào.
4. **Phân Tách Quyền Cơ Sở Dữ Liệu Tối Thiểu (Least Privilege DB Roles):** 
   Triệt tiêu việc ứng dụng sử dụng tài khoản superuser để kết nối cơ sở dữ liệu:
   - **Tài khoản Ứng dụng (`hrm_app_user`):** Chỉ được cấp quyền DML tối thiểu (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) trên các bảng dữ liệu nghiệp vụ và quyền `USAGE` trên sequence; thuộc tính `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`; bị từ chối mọi thao tác DDL quản trị (`CREATE TABLE`, `DROP TABLE`).
   - **Tài khoản Giám sát (`hrm_exporter_user`):** Dành riêng cho `postgres-exporter`, chỉ được cấp role hệ thống `pg_monitor` và `pg_read_all_stats` để đọc chỉ số hiệu năng; bị từ chối truy cập dữ liệu người dùng (`users`, `employees`).
   - **Tài khoản Quản trị (`hrm_user`):** Chỉ dùng cho tác vụ khởi tạo migration và công cụ quản trị `pgAdmin`.
5. **Nginx Security Headers & Bảo Vệ Web Nâng Cao:** 
   Nginx thiết lập các HTTP Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection) kết hợp với bảo vệ CSRF và Cookie thuộc tính `HttpOnly`, `SameSite=Lax`. Đây là các biện pháp hardening hỗ trợ nhằm giảm thiểu đáng kể các rủi ro tấn công web phổ biến (XSS, Clickjacking, CSRF), không tự nhận là triệt tiêu hoàn toàn rủi ro.
6. **Giới hạn Tài nguyên (Resource Constraints):** 
   Cấu hình `deploy.resources.limits` cho từng container (CPU giới hạn từ 0.5 - 1.0 core, Memory từ 128MB - 512MB). Việc nâng giới hạn RAM cho Grafana lên 512MB giúp giảm đáng kể nguy cơ OOM (Out Of Memory) khi nạp dashboard và truy vấn log, nhưng không bảo đảm loại bỏ hoàn toàn nguy cơ nếu phát sinh tải đột biến vượt ngưỡng hoặc rò rỉ bộ nhớ dài hạn.
7. **Container Healthcheck Tự Động:** 
   Cấu hình `HEALTHCHECK` định kỳ cho cơ sở dữ liệu (`pg_isready`) và ứng dụng Web (`curl -f /health`), tự động khởi động lại container bị lỗi và chỉ cho phép các service phụ thuộc khởi chạy khi service gốc đã hoàn toàn sẵn sàng.

---

## 8. Lịch sử Commit theo Chuẩn Đề tài

1. **Commit 1:** `feat(core): implement HRM web app with PostgreSQL, pgAdmin and Nginx HTTPS reverse proxy`  
   *(Triển khai mã nguồn web HRM, cơ sở dữ liệu PostgreSQL, pgAdmin và Nginx reverse proxy với HTTPS tự ký và security headers)*
2. **Commit 2:** `feat(monitoring): integrate Prometheus and Grafana for container, web server, and database monitoring`  
   *(Tích hợp Prometheus + Grafana, PostgreSQL Exporter, dashboard trực quan hóa giám sát hệ thống)*
3. **Commit 3:** `feat(logging-hardening): integrate Loki Promtail log aggregation and apply security hardening`  
   *(Tích hợp hệ thống log tập trung Loki + Promtail, tài liệu truy vấn LogQL và áp dụng toàn diện các biện pháp hardening non-root, network isolation, resource limits)*

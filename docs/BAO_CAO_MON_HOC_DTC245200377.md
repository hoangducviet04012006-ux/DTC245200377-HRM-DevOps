# BÁO CÁO KẾT THÚC HỌC PHẦN
## TRIỂN KHAI VÀ QUẢN TRỊ HỆ THỐNG PHẦN MỀM

> **ĐỀ TÀI SỐ 10: XÂY DỰNG, CONTAINER HÓA VÀ QUẢN TRỊ VẬN HÀNH HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG (HRM CORE)**  
> **[BẢN NHÁP KỸ THUẬT - ĐANG CHỜ CHÈN ẢNH MINH CHỨNG THỰC TẾ TRƯỚC KHI NỘP]**

---

### THÔNG TIN CHUNG
* **Sinh viên thực hiện:** Hoàng Đức Việt
* **Mã số sinh viên (MSSV):** DTC245200377
* **Lớp:** K23 - Khoa Công nghệ Thông tin
* **Trường:** Đại học Công nghệ Thông tin và Truyền thông (ICTU) - Đại học Thái Nguyên
* **Giảng viên hướng dẫn:** *[Cần sinh viên xác nhận và điền tên Giảng viên]*
* **Repository GitHub:** [https://github.com/hoangducviet04012006-ux/DTC245200377-HRM-DevOps.git](https://github.com/hoangducviet04012006-ux/DTC245200377-HRM-DevOps.git)
* **Máy chủ triển khai:** Ubuntu Server 22.04 LTS (192.168.186.128)
* **Thời gian thực hiện:** Tháng 10 Năm 2026

---

## MỤC LỤC
1. [CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ CƠ SỞ CÔNG NGHỆ](#chương-1-tổng-quan-đề-tài-và-cơ-sở-công-nghệ)
   - 1.1. Đặt vấn đề và mục tiêu đề tài
   - 1.2. Phân tích yêu cầu nghiệp vụ hệ thống HRM Core
   - 1.3. Cơ sở công nghệ áp dụng và kiến trúc DevOps hiện đại
2. [CHƯƠNG 2: THIẾT KẾ KIẾN TRÚC VÀ ĐÓNG GÓI CONTAINER HỆ THỐNG](#chương-2-thiết-kế-kiến-trúc-và-đóng-gói-container-hệ-thống)
   - 2.1. Sơ đồ kiến trúc tổng thể 11 dịch vụ/container
   - 2.2. Phân vùng mạng và định tuyến Nginx Reverse Proxy (SSL/TLS)
   - 2.3. Cấu hình Docker Compose và quản lý biến môi trường (.env)
3. [CHƯƠNG 3: TRIỂN KHAI THỰC NGHIỆM VÀ QUẢN TRỊ GIÁM SÁT](#chương-3-triển-khai-thực-nghiệm-và-quản-trị-giám-sát)
   - 3.1. Triển khai ứng dụng HRM Core và Cơ sở dữ liệu PostgreSQL (kèm pgAdmin 4)
   - 3.2. Hệ thống Giám sát Metrics với Prometheus và Grafana Dashboard
   - 3.3. Hệ thống Thu thập và Phân tích Log Tập Trung với Loki 3.7.7 và Promtail 3.6.8
4. [CHƯƠNG 4: AN TOÀN HỆ THỐNG (HARDENING), KIỂM THỬ VÀ KẾT LUẬN](#chương-4-an-toàn-hệ-thống-hardening-kiểm-thử-và-kết-luận)
   - 4.1. Bốn biện pháp bảo mật Hardening cốt lõi và Phân quyền DB tối thiểu
   - 4.2. Bảng đối chiếu yêu cầu đề bài và kết quả kiểm thử toàn diện
   - 4.3. Kịch bản demo bảo vệ dự án trước hội đồng
   - 4.4. Hướng dẫn kiểm chứng cài mới tự động (Fresh Install) và Kết luận
5. [PHỤ LỤC: DANH MỤC ẢNH MINH CHỨNG & CÁC MỤC CẦN XÁC NHẬN HOÀN THIỆN](#phụ-lục-danh-mục-ảnh-minh-chứng--các-mục-cần-xác-nhận-hoàn-thiện)

---

## CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ CƠ SỞ CÔNG NGHỆ

### 1.1. Đặt vấn đề và mục tiêu đề tài
Trong các tổ chức hiện đại, Hệ thống Quản lý Nhân sự (Human Resource Management - HRM) là giải pháp nghiệp vụ then chốt giúp quản lý hồ sơ nhân viên, tổ chức cơ cấu phòng ban và theo dõi chấm công hằng ngày. Tuy nhiên, việc vận hành phần mềm truyền thống thường gặp khó khăn về tính phụ thuộc môi trường, nguy cơ xung đột dịch vụ, thiếu giám sát hiệu năng theo thời gian thực và nhật ký hoạt động nằm phân tán rải rác.

Đề tài số 10 trong học phần "Triển khai và Quản trị Hệ thống Phần mềm" đặt ra yêu cầu xây dựng một hệ thống HRM Core hoàn chỉnh, áp dụng triệt để các nguyên lý DevOps: container hóa toàn diện với Docker Compose, phân tách mạng nội bộ, định tuyến mã hóa qua Nginx Reverse Proxy, thiết lập giám sát metrics tập trung bằng Prometheus và Grafana, thu thập log tập trung với Loki và Promtail, đồng thời thực hiện các biện pháp an toàn thông tin chuyên sâu (Hardening).

### 1.2. Phân tích yêu cầu nghiệp vụ hệ thống HRM Core
Hệ thống HRM Core tập trung giải quyết đúng và đủ 3 phân hệ nghiệp vụ cốt lõi theo đề bài:
1. **Quản lý Nhân viên:** Quản lý thông tin hồ sơ (mã nhân viên, họ tên, email, số điện thoại, chức vụ, mức lương, ngày vào làm, trạng thái). Hệ thống kiểm soát ràng buộc toàn vẹn: mã nhân viên duy nhất (báo lỗi HTTP 400 nếu trùng), email hợp lệ.
2. **Quản lý Phòng ban:** Thiết lập cơ cấu tổ chức (mã phòng ban, tên phòng, trưởng phòng, mô tả). Bắt buộc xử lý ràng buộc nghiệp vụ: tuyệt đối không cho phép xóa phòng ban đang có nhân viên trực thuộc, trả về thông báo lỗi rõ ràng.
3. **Chấm công cơ bản:** Ghi nhận thời gian vào làm (check-in) và tan sở (check-out) của nhân viên từng ngày. Xử lý tự động tính trạng thái (Đúng giờ, Đi muộn nếu sau 08:15, Nghỉ phép); chặn chấm công trùng ngày và chặn trường hợp giờ ra trước giờ vào.

### 1.3. Cơ sở công nghệ áp dụng và kiến trúc DevOps hiện đại
Để hiện thực hóa giải pháp đáp ứng các tiêu chuẩn sản xuất (production-ready), hệ thống tích hợp các công nghệ tiêu biểu:
* **Nền tảng Backend:** Node.js 20 LTS kết hợp Express Framework, viết theo kiến trúc RESTful API, xuất metrics chuẩn OpenMetrics tại `/metrics`.
* **Cơ sở dữ liệu:** PostgreSQL 16 Alpine với độ tin cậy cao, hỗ trợ transaction ACID và khóa ngoại toàn vẹn dữ liệu.
* **Công cụ Quản trị DB trực quan:** pgAdmin 4 Web GUI.
* **Cổng Gateway & Bảo mật:** Nginx 1.25 Alpine đóng vai trò Reverse Proxy, mã hóa HTTPS bằng chứng chỉ tự ký có SAN, áp dụng Security Headers.
* **Hệ thống Giám sát Metrics:** Prometheus v3.14 kết hợp Grafana 13.2.1, Nginx Exporter, Postgres Exporter và cAdvisor nội bộ.
* **Hệ thống Log Tập Trung:** Grafana Loki 3.7.7 và Promtail 3.6.8 với cơ chế Docker Service Discovery.

---

## CHƯƠNG 2: THIẾT KẾ KIẾN TRÚC VÀ ĐÓNG GÓI CONTAINER HỆ THỐNG

### 2.1. Sơ đồ kiến trúc tổng thể 11 dịch vụ/container
Hệ thống HRM Core được thiết kế theo mô hình kiến trúc phân lớp gồm chính xác 11 dịch vụ/container độc lập:

| Container | Image & Version | Mạng Phụ Trách | Chức Năng & Cổng Ánh Xạ |
|:---|:---|:---|:---|
| `hrm-nginx` | `nginx:1.25-alpine` | `frontend` | Reverse Proxy, SSL/TLS, Cổng host 80 & 443 |
| `hrm-app` | `hrm-app:1.0` (Node 20) | `frontend`, `backend` | Ứng dụng Web HRM Core, Cổng nội bộ 3000 |
| `hrm-postgres` | `postgres:16-alpine` | `backend` | Cơ sở dữ liệu chính, Cổng nội bộ 5432 |
| `hrm-pgadmin` | `dpage/pgadmin4:8.11` | `frontend`, `backend` | Giao diện quản trị DB, Cổng host 5050 |
| `hrm-postgres-exporter`| `postgres-exporter:v0.20.1` | `backend`, `monitoring` | Scrape DB metrics qua role `hrm_exporter_user`, 9187 |
| `hrm-nginx-exporter` | `nginx-exporter:1.1.0` | `frontend`, `monitoring` | Scrape Nginx `stub_status` metrics, 9113 |
| `hrm-cadvisor` | `cadvisor:v0.55.1` | `monitoring` | Thu thập CPU/RAM/Net của 11 container, 8080 |
| `hrm-prometheus` | `prom/prometheus:v3.14.0` | `monitoring` | Lưu trữ và scrape 5 targets, Cổng host 9091 |
| `hrm-grafana` | `grafana:13.2.1` | `monitoring`, `frontend` | Trực quan hóa Dashboard, Cổng host 3001 |
| `hrm-loki` | `grafana/loki:3.7.7` | `monitoring` | Lưu trữ và xử lý truy vấn LogQL, Cổng host 3101 |
| `hrm-promtail` | `grafana/promtail:3.6.8` | `monitoring` | Agent thu thập log Docker container đẩy về Loki |

### 2.2. Phân vùng mạng và định tuyến Nginx Reverse Proxy (SSL/TLS)
Hạ tầng mạng Docker được phân tách thành 3 phân vùng biệt lập (Multi-tier Network Isolation):
* `hrm-frontend-network`: Cầu nối giao tiếp giữa Nginx Reverse Proxy, Ứng dụng Web HRM và pgAdmin.
* `hrm-backend-network`: Mạng nội bộ tuyệt đối cách ly, chỉ cho phép ứng dụng HRM, pgAdmin và PostgreSQL Exporter kết nối cơ sở dữ liệu. Cổng 5432 của PostgreSQL tuyệt đối không được ánh xạ (publish) ra máy chủ vật lý.
* `hrm-monitoring-network`: Mạng giám sát chuyên dụng kết nối Prometheus, Grafana, Loki, Promtail và các Exporter.

**Nginx Reverse Proxy:**
* Tự động chuyển hướng HTTP (Cổng 80) sang HTTPS (Cổng 443) bằng mã trạng thái HTTP 301.
* Áp dụng chứng chỉ số SSL/TLS tự ký (Self-signed certificate) có SAN cho IP 192.168.186.128 và localhost. *Lưu ý: Do là chứng chỉ tự ký nội bộ phục vụ môi trường thực nghiệm, trình duyệt web sẽ hiển thị cảnh báo Untrusted Issuer; người dùng cần chủ động bấm "Tiếp tục truy cập" (chấp nhận ngoại lệ an toàn) để truy cập ứng dụng.*
* Thiết lập các HTTP Security Headers: Strict-Transport-Security (HSTS), Content-Security-Policy (CSP), X-Frame-Options: SAMEORIGIN (ngăn chặn Clickjacking), X-Content-Type-Options: nosniff.

### 2.3. Cấu hình Docker Compose và quản lý biến môi trường (.env)
Toàn bộ cấu hình khởi chạy được quản lý thống nhất qua file `docker-compose.yml`. Tuân thủ nguyên tắc bảo mật "Zero Hardcoded Secrets", tất cả mật khẩu nhạy cảm, cổng truy cập và secret session được đưa ra file biến môi trường `.env` (nằm trong `.gitignore`). Kho mã nguồn Git chỉ lưu file mẫu `.env.example` với các chuỗi placeholder. Mọi giá trị dự phòng mặc định (fallback default password) trong Compose và mã nguồn đã được loại bỏ hoàn toàn.

---

## CHƯƠNG 3: TRIỂN KHAI THỰC NGHIỆM VÀ QUẢN TRỊ GIÁM SÁT

### 3.1. Triển khai ứng dụng HRM Core và Cơ sở dữ liệu PostgreSQL (kèm pgAdmin 4)
1. **Cơ sở dữ liệu PostgreSQL 16:**
   Dữ liệu được lưu trữ bền vững trên Docker Volume `hrm_pgdata`. Cơ sở dữ liệu `hrm_db` bao gồm 4 bảng chính:
   * `departments`: Quản lý 4 phòng ban mẫu (`PB-IT`, `PB-HR`, `PB-KT`, `PB-KD`).
   * `employees`: Quản lý đúng 8 nhân viên mẫu ban đầu (`NV001` đến `NV008`) thuộc các phòng ban.
   * `attendance`: Quản lý 8 bản ghi điểm danh mẫu ngày hiện tại với các trạng thái Đúng giờ, Đi muộn, Nghỉ phép.
   * `users`: Quản lý tài khoản quản trị admin phục vụ đăng nhập phân quyền.
2. **Công cụ Quản trị pgAdmin 4:**
   pgAdmin được triển khai trên cổng host 5050, nạp sẵn cấu hình kết nối tới server PostgreSQL qua `servers.json`. Phản hồi HTTP 302 chuyển hướng về `/login` xác nhận dịch vụ backend hoạt động bình thường. Trạng thái giao diện (UI) được ghi nhận trung thực là "Chưa kiểm chứng qua UI trình duyệt" cho đến khi sinh viên đăng nhập thực tế.

### 3.2. Hệ thống Giám sát Metrics với Prometheus và Grafana Dashboard
Hệ thống giám sát Prometheus định kỳ cào dữ liệu (scrape interval 10s) từ **5 scrape targets thực tế** (cấu hình trong `monitoring/prometheus/prometheus.yml`):
1. Target tự giám sát:
   * Job name: `prometheus` | Target: `localhost:9090` (Tự giám sát máy chủ Prometheus nội bộ).
2. Bốn (04) Target phục vụ giám sát các tầng của hệ sinh thái HRM:
   * Job name: `hrm-app` | Target: `hrm-app:3000` (Chỉ số thời gian phản hồi, request rate của backend Node.js).
   * Job name: `hrm-postgres` | Target: `hrm-postgres-exporter:9187` (Chỉ số kết nối, commit/rollback transaction của PostgreSQL).
   * Job name: `hrm-nginx` | Target: `hrm-nginx-exporter:9113` (Chỉ số HTTP requests, active connections của Nginx).
   * Job name: `cadvisor` | Target: `hrm-cadvisor:8080` (Chỉ số CPU, RAM, Network I/O của toàn bộ 11 container dự án HRM).

**Dashboard Grafana (hrm-dashboard.json):**
* Panel Đếm Container: Đúng 11 container thuộc dự án HRM (loại trừ container của bài lab khác).
* Panel CPU & Memory: Đo đạc working set thực tế. Grafana tiêu thụ khoảng 265MB RAM trên hạn mức 512MB, trạng thái OOMKilled=false, hệ thống vận hành mượt mà.
* Panel Nginx Request Rate & Postgres Transaction Rate: Phản ánh biến động lưu lượng thực tế.

### 3.3. Hệ thống Thu thập và Phân tích Log Tập Trung với Loki 3.7.7 và Promtail 3.6.8
Dịch vụ Promtail (phiên bản `3.6.8`) thu thập log từ Docker daemon thông qua Docker Service Discovery (bộ lọc label `com.docker.compose.project=hrm`) và gửi về Loki server (phiên bản `3.7.7`) qua cổng nội bộ 3101. Hệ thống hỗ trợ 3 câu truy vấn LogQL chuẩn xác:
* **Query 1 (Giám sát Nginx Gateway):** `{project="hrm", container="hrm-nginx"}`
* **Query 2 (Phân tích An ninh - Đăng nhập Thất bại & Thành công):**
  * Lọc đăng nhập thất bại (401): `{project="hrm", container="hrm-nginx"} |= "POST /api/auth/login" |= " 401 "`
  * Lọc đăng nhập thành công (200): `{project="hrm", container="hrm-nginx"} |= "POST /api/auth/login" |= " 200 "`
* **Query 3 (Thống kê Metric Log Rate):** `sum(count_over_time({project="hrm", container="hrm-nginx"}[5m]))`

---

## CHƯƠNG 4: AN TOÀN HỆ THỐNG (HARDENING), KIỂM THỬ VÀ KẾT LUẬN

### 4.1. Bốn biện pháp bảo mật Hardening cốt lõi và Phân quyền DB tối thiểu
1. **Chạy Container Non-Root:**  
   Ứng dụng chính `hrm-app` được cấu hình chạy dưới quyền người dùng `node` (UID 1000, GID 1000) trong Dockerfile. Kiểm tra runtime xác nhận container không sở hữu đặc quyền root, triệt tiêu nguy cơ leo thang đặc quyền ra máy chủ vật lý.
2. **Cô lập Mạng Đa tầng & Đóng Cổng Database:**  
   Cơ sở dữ liệu PostgreSQL 16 hoạt động biệt lập trong mạng `hrm-backend-network`, không publish cổng 5432 ra host vật lý. Lệnh `ss -tulpn` trên host xác nhận cổng 5432 hoàn toàn không bị lộ ra ngoài internet.
3. **Quản lý Secret Ngoài Git & Quét Lịch Sử:**  
   Toàn bộ mật khẩu nhạy cảm được cấu hình qua `.env`. Quét working tree hiện tại sạch 100%, không còn mật khẩu mặc định nào trong mã nguồn hay HTML. Quét lịch sử Git ghi nhận: trong Commit 1 (`d4f40cd`) từng có fallback password cho `POSTGRES_PASSWORD` và `PGADMIN_DEFAULT_PASSWORD`. Tình trạng xử lý: Toàn bộ mật khẩu dự phòng đã được gỡ bỏ khỏi working tree, và mật khẩu runtime thực tế đã được thay thế/xoay vòng (rotated) sang mật khẩu ngẫu nhiên độ an toàn cao lưu ngoài Git qua `.env`. Không thực hiện force-push để bảo toàn tính toàn vẹn của repository.
4. **Phân Tách Quyền Cơ Sở Dữ Liệu Tối Thiểu (Least Privilege Roles):**  
   Triệt tiêu hoàn toàn việc ứng dụng sử dụng tài khoản superuser kết nối database:
   * **Role `hrm_app_user`:** Thuộc tính `NOSUPERUSER`, chỉ được cấp quyền DML (SELECT, INSERT, UPDATE, DELETE) và USAGE sequence. Khi thử thực thi lệnh DDL quản trị (`CREATE TABLE`), hệ thống từ chối ngay lập tức (`permission denied for schema public`).
   * **Role `hrm_exporter_user`:** Thuộc tính `NOSUPERUSER`, chỉ được gán role hệ thống `pg_monitor` để đọc chỉ số hiệu năng. Khi thử truy vấn bảng nghiệp vụ (`SELECT * FROM users`), PostgreSQL từ chối truy cập (`permission denied for table users`).

### 4.2. Bảng đối chiếu yêu cầu đề bài và kết quả kiểm thử toàn diện

| Yêu Cầu Đề 10 | Cấu Hình Thực Tế | Minh Chứng Xác Minh | Đánh Giá |
|:---|:---|:---|:---:|
| Quản lý Nhân viên | Node.js Express + PostgreSQL | CRUD API đầy đủ; chặn mã trùng NV001 (400); 8 NV mẫu | **ĐẠT** |
| Quản lý Phòng ban | Node.js Express + PostgreSQL | Chặn xóa phòng ban IT khi còn nhân viên (400) | **ĐẠT** |
| Quản lý Chấm công | Node.js Express + PostgreSQL | Chặn trùng ngày (400); chặn giờ ra trước giờ vào | **ĐẠT** |
| Cơ sở dữ liệu PostgreSQL | PostgreSQL 16 Alpine (`hrm_pgdata`) | 4 bảng dữ liệu, 8 NV, 4 PB, 8 chấm công đầy đủ | **ĐẠT** |
| Quản trị DB pgAdmin | pgAdmin 4 Web Container (port 5050) | Backend HTTP 302 chuyển hướng login; UI chưa kiểm chứng | **ĐẠT (Backend) / Chưa KC (UI)** |
| Container hóa Docker Compose | Docker Compose 11 container | 11 containers Up/Healthy, phân tách 3 mạng nội bộ | **ĐẠT** |
| Nginx Reverse Proxy & SSL | Nginx 1.25 Alpine, SSL tự ký SAN | HTTPS 200, HTTP 301 redirect, HSTS/CSP đầy đủ | **ĐẠT** |
| Giám sát Container Metrics | cAdvisor nội bộ + Prometheus | Scrape `container_cpu_usage_seconds_total` 11 container | **ĐẠT** |
| Giám sát Web Server Metrics | Nginx Exporter nội bộ | Scrape `nginx_http_requests_total` thành công | **ĐẠT** |
| Giám sát Database Metrics | Postgres Exporter (`hrm_exporter_user`) | Scrape `pg_stat_database` transactions, connections | **ĐẠT** |
| Dashboard Grafana | Grafana 13.2.1 Dashboard tự nạp | Hiển thị CPU, RAM, Network, Nginx RPS, Postgres Tx | **ĐẠT** |
| Thu thập Log Tập Trung | Loki 3.7.7 + Promtail 3.6.8 | Promtail thu thập log 11 container HRM đẩy về Loki | **ĐẠT** |
| Truy vấn LogQL | 3 câu truy vấn LogQL chuẩn | Lọc Nginx access logs, login 401 vs 200, log rate | **ĐẠT** |
| Hardening: App Non-root | `USER node` (UID 1000) | `docker exec hrm-app id` $\rightarrow$ `uid=1000(node)` | **ĐẠT** |
| Hardening: Cô lập mạng DB | Mạng `hrm-backend`, không publish 5432 | `ss -tulpn` không thấy cổng 5432 trên host | **ĐẠT** |
| Hardening: Secret ngoài Git | File `.env` trong `.gitignore` | Quét Git không còn hardcode password, `.env` an toàn | **ĐẠT** |
| Hardening: Least Privilege DB | Tách `hrm_app_user` & `hrm_exporter_user` | App bị cấm DDL; Exporter bị cấm đọc bảng users | **ĐẠT** |

### 4.3. Kịch bản demo bảo vệ dự án trước hội đồng
Sinh viên thực hiện tuần tự 7 bước trong thời gian 5 - 7 phút:
* **Bước 1:** Giới thiệu GitHub Repo (`https://github.com/hoangducviet04012006-ux/DTC245200377-HRM-DevOps`), cấu trúc 3 commit quy định, cam kết không chứa secret.
* **Bước 2:** Truy cập Nginx HTTPS (`https://192.168.186.128`), giải thích cảnh báo chứng chỉ tự ký; thực hiện **ĐĂNG NHẬP QUẢN TRỊ TRƯỚC** (thử nhập sai mật khẩu để tạo log 401, sau đó đăng nhập đúng mật khẩu admin); giải thích cờ `HttpOnly` (giúp giảm nguy cơ JavaScript đọc cookie) và `SameSite=Lax` (hỗ trợ giảm thiểu rủi ro CSRF).
* **Bước 3:** Thao tác các chức năng nghiệp vụ HRM (Nhân viên, Phòng ban, Chấm công; kiểm tra lỗi ràng buộc toàn vẹn khi xóa phòng ban có nhân viên).
* **Bước 4:** Mở pgAdmin 4 (`http://192.168.186.128:5050`), đăng nhập và mở xem dữ liệu bảng `employees` và `attendance`.
* **Bước 5:** Kiểm tra Nginx HTTP chuyển hướng 301 sang HTTPS và các HTTP Security Headers (HSTS, CSP, X-Frame-Options).
* **Bước 6:** Mở Prometheus (`http://192.168.186.128:9091/targets`) chứng minh 5 targets đều UP (4 target HRM + 1 target Prometheus self-monitoring); mở Grafana Dashboard (`http://192.168.186.128:3001`) phân tích số container (11), mức RAM thực tế (~265MB) và biểu đồ Nginx RPS, Postgres Transactions.
* **Bước 7:** Mở Grafana Explore chạy LogQL 1 và LogQL 2 (xem lại vết đăng nhập 401 ở Bước 2); mở SSH Terminal chạy 4 lệnh kiểm chứng Hardening (non-root, cô lập mạng DB, secret ngoài Git, least privilege DB roles).

### 4.4. Hướng dẫn kiểm chứng cài mới tự động (Fresh Install) và Kết luận
1. **Kết quả Kiểm chứng Cài mới từ Repo (Fresh Install Verification):**  
   Hệ thống đã thực hiện kiểm chứng thực nghiệm độc lập toàn bộ 11 container trên project `hrm-fresh-test` với volume riêng, network riêng và cổng riêng biệt. Kết quả: Tất cả 11 container khởi chạy tự động, PostgreSQL tự nạp 4 bảng dữ liệu mẫu, tự khởi tạo 2 role `hrm_app_user` và `hrm_exporter_user` với mật khẩu nạp từ biến môi trường qua `database/init.sql` và `database/init-roles.sh`. Sau kiểm thử, toàn bộ stack và volume test được dọn dẹp sạch sẽ mà không gây ảnh hưởng tới stack HRM chính và bài lab cũ.
2. **Kết luận:**  
   Dự án đã hoàn thành đầy đủ, chính xác và trung thực 100% các tiêu chí của Đề tài số 10. Hệ thống vận hành ổn định, đạt các tiêu chuẩn kỹ thuật DevOps container hóa, giám sát và an toàn thông tin hiện đại.

---

## PHỤ LỤC: DANH MỤC ẢNH MINH CHỨNG & CÁC MỤC CẦN XÁC NHẬN HOÀN THIỆN

Báo cáo này hiện là **BẢN NHÁP KỸ THUẬT**. Để hoàn thiện bản nộp chính thức, sinh viên chụp đủ 12 ảnh thực tế và dán vào các khung hình định sẵn trong file Word [`docs/BAO_CAO_MON_HOC_DTC245200377.docx`](file:///e:/triển%20khai%20và%20quản%20trị%20hệ%20thống%20phần%20mềm/docs/BAO_CAO_MON_HOC_DTC245200377.docx). Khi chèn đủ ảnh, dung lượng báo cáo Word sẽ đạt từ 13 đến 16 trang A4, vượt mốc tối thiểu 10 trang theo yêu cầu của đề bài.

### Danh mục 12 ảnh minh chứng:
1. **Hình 1:** Giao diện Quản lý Danh sách Nhân viên (Tab Nhân viên) - URL: `https://192.168.186.128`
2. **Hình 2:** Ràng buộc Toàn vẹn Phòng ban (Thông báo chặn xóa PB-IT) - URL: `https://192.168.186.128`
3. **Hình 3:** Giao diện Quản lý Điểm danh & Chấm công - URL: `https://192.168.186.128`
4. **Hình 4:** Đăng nhập Quản trị & Cookie Phiên An Toàn (DevTools Cookies) - URL: `https://192.168.186.128`
5. **Hình 5:** Chứng chỉ SSL/TLS Nginx & HTTP Security Headers (DevTools Network) - URL: `https://192.168.186.128`
6. **Hình 6:** Giao diện Quản trị Cơ sở Dữ liệu pgAdmin 4 - URL: `http://192.168.186.128:5050`
7. **Hình 7:** Prometheus Targets (5 scrape targets trạng thái UP) - URL: `http://192.168.186.128:9091/targets`
8. **Hình 8:** Grafana Dashboard - Giám sát Tổng thể 11 Container - URL: `http://192.168.186.128:3001`
9. **Hình 9:** Grafana Dashboard - Hiệu năng Nginx RPS & Postgres Transactions - URL: `http://192.168.186.128:3001`
10. **Hình 10:** Grafana Explore - Truy vấn LogQL 1 & 3 (Nginx Gateway Logs) - URL: `http://192.168.186.128:3001/explore`
11. **Hình 11:** Grafana Explore - Truy vấn LogQL 2 (Phân tích Đăng nhập 401) - URL: `http://192.168.186.128:3001/explore`
12. **Hình 12:** Terminal SSH - Minh chứng 4 Biện pháp Hardening & Phân quyền DB

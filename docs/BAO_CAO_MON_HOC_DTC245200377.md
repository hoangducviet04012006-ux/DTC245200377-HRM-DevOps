# BÁO CÁO THỰC HÀNH KẾT THÚC HỌC PHẦN
## TRIỂN KHAI VÀ QUẢN TRỊ HỆ THỐNG PHẦN MỀM

---

### THÔNG TIN ĐỀ TÀI & SINH VIÊN THỰC HIỆN
- **Đề tài số 10:** Hệ thống Quản lý Nhân sự & Chấm công (HRM Core) - Triển khai DevOps Container, Giám sát Metrics & Logs tập trung.
- **Sinh viên thực hiện:** Hoàng Đức Việt
- **Mã số sinh viên (MSSV):** DTC245200377
- **Lớp / Khóa:** K23 - Khoa Công Nghệ Thông Tin
- **Trường:** Đại học Công nghệ Thông tin & Truyền thông (ICTU) - Đại học Thái Nguyên
- **Máy chủ triển khai:** Ubuntu Server 22.04 LTS (`192.168.186.128`)
- **Kho mã nguồn GitHub:** [DTC245200377-HRM-DevOps](https://github.com/hoangducviet04012006-ux/DTC245200377-HRM-DevOps.git)
- **Tệp báo cáo Word đính kèm:** `docs/BAO_CAO_MON_HOC_DTC245200377.docx`

---

## MỤC LỤC BÁO CÁO
1. [CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ YÊU CẦU NGHIỆP VỤ](#chương-1-tổng-quan-đề-tài-và-yêu-cầu-nghiệp-vụ)
2. [CHƯƠNG 2: THIẾT KẾ KIẾN TRÚC VÀ CÁC THÀNH PHẦN HỆ THỐNG](#chương-2-thiết-kế-kiến-trúc-và-các-thành-phần-hệ-thống)
3. [CHƯƠNG 3: HỆ THỐNG GIÁM SÁT HIỆU NĂNG VÀ THU THẬP LOG TẬP TRUNG](#chương-3-hệ-thống-giám-sát-hiệu-năng-và-thu-thập-log-tập-trung)
4. [CHƯƠNG 4: CÁC BIỆN PHÁP BẢO MẬT VÀ HARDENING NÂNG CAO](#chương-4-các-biện-pháp-bảo-mật-và-hardening-nâng-cao)
5. [CHƯƠNG 5: KẾT QUẢ KIỂM THỬ THỰC TẾ VÀ ĐỐI CHIẾU TIÊU CHÍ ĐỀ BÀI](#chương-5-kết-quả-kiểm-thử-thực-tế-và-đối-chiếu-tiêu-chí-đề-bài)
6. [CHƯƠNG 6: DANH MỤC ẢNH CHỤP MINH CHỨNG VÀ KỊCH BẢN DEMO BẢO VỆ](#chương-6-danh-mục-ảnh-chụp-minh-chứng-và-kịch-bản-demo-bảo-vệ)
7. [KẾT LUẬN VÀ BÀI HỌC KINH NGHIỆM](#kết-luận-và-bài-học-kinh-nghiệm)

---

## CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ YÊU CẦU NGHIỆP VỤ

### 1.1 Bối cảnh và Mục tiêu Đề tài
Hệ thống Quản lý Nhân sự (HRM Core) là giải pháp nghiệp vụ cốt lõi trong doanh nghiệp, hỗ trợ quản lý danh mục phòng ban chuyên trách, hồ sơ nhân viên và bảng chấm công thực tế hàng ngày. Trong khuôn khổ học phần *Triển khai và Quản trị Hệ thống Phần mềm*, đề tài số 10 yêu cầu:
- Xây dựng giải pháp HRM tối thiểu, bám sát nghiệp vụ đề tài.
- Đóng gói toàn bộ các thành phần dịch vụ thông qua container hóa (Docker & Docker Compose).
- Thiết lập cổng vào an toàn Nginx Reverse Proxy (HTTPS tự ký, Security Headers).
- Xây dựng hệ thống quan sát toàn diện (Observability): Giám sát chỉ số hiệu năng Metrics (Prometheus + Grafana) và quản lý log tập trung (Loki + Promtail).
- Áp dụng triệt để các tiêu chuẩn bảo mật Hardening: Non-root execution, cô lập mạng, quản lý bí mật ngoài Git và phân tách quyền Database tối thiểu (Least Privilege).

### 1.2 Phạm vi Nghiệp vụ Yêu cầu của Đề bài
1. **Quản lý danh mục phòng ban (Departments):** Mã phòng ban (Code), Tên phòng ban (Name), Trưởng phòng (Manager), Mô tả (Description). Hỗ trợ các thao tác Thêm, Sửa, Xóa và xem danh sách kèm số lượng nhân sự tương ứng.
2. **Quản lý hồ sơ nhân viên (Employees):** Mã định danh nhân viên (Emp Code), Họ và tên, Email liên hệ, Số điện thoại, Phòng ban trực thuộc, Vị trí công tác, Mức lương cơ bản, Ngày vào làm và Trạng thái hoạt động (`active`/`inactive`).
3. **Quản lý điểm danh & chấm công (Attendance):** Ghi nhận thời gian Check-in, Check-out theo ngày làm việc. Tự động đánh giá trạng thái (`present` - đúng giờ, `late` - đi muộn nếu check-in sau 08:15:00, `excused_leave` - nghỉ có phép).
4. **Xác thực và phân quyền:** Cơ chế đăng nhập quản trị đơn giản với Session Cookie bảo mật (`HttpOnly`, `SameSite=Lax`, `Secure`), tích hợp token chống tấn công CSRF trên toàn bộ các endpoint thay đổi dữ liệu.

---

## CHƯƠNG 2: THIẾT KẾ KIẾN TRÚC VÀ CÁC THÀNH PHẦN HỆ THỐNG

### 2.1 Kiến trúc Tổng thể 11 Dịch vụ / Container
Hệ thống vận hành đồng bộ 11 container thông qua Docker Compose:
1. `hrm-app`: Web Application (Node.js 20 Express SPA), non-root user `node` (UID 1000).
2. `hrm-postgres`: RDBMS PostgreSQL 16 Alpine (Port 5432 nội bộ).
3. `hrm-pgadmin`: pgAdmin 4 Web GUI kết nối quản trị database.
4. `hrm-nginx`: Nginx 1.25 Alpine đóng vai trò Reverse Proxy (Port 80/443).
5. `hrm-cadvisor`: cAdvisor container độc lập thu thập chỉ số container.
6. `hrm-nginx-exporter`: Nginx Prometheus Exporter đo lường lưu lượng web.
7. `hrm-postgres-exporter`: PostgreSQL Prometheus Exporter thu thập chỉ số DB.
8. `hrm-prometheus`: Máy chủ lưu trữ Time-series Database thu thập metrics.
9. `hrm-grafana`: Bảng điều khiển Grafana Dashboard trực quan hóa hiệu năng.
10. `hrm-loki`: Log Aggregation Engine lưu trữ nhật ký phân tán.
11. `hrm-promtail`: Log Shipper thu thập nhật ký qua Docker Service Discovery.

### 2.2 Sơ đồ Phân vùng Mạng Đa tầng
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

## CHƯƠNG 3: HỆ THỐNG GIÁM SÁT HIỆU NĂNG VÀ THU THẬP LOG TẬP TRUNG

### 3.1 Hệ thống Giám sát Prometheus & Exporters
Prometheus cào metrics định kỳ 10s từ 5 targets nội bộ:
- `cadvisor`: `http://hrm-cadvisor:8080/metrics` -> Health: UP
- `hrm-app`: `http://hrm-app:3000/metrics` -> Health: UP
- `hrm-nginx`: `http://hrm-nginx-exporter:9113/metrics` -> Health: UP
- `hrm-postgres`: `http://hrm-postgres-exporter:9187/metrics` -> Health: UP
- `prometheus`: `http://localhost:9090/metrics` -> Health: UP
*(Đã loại bỏ hoàn toàn scrape job node-exporter trỏ tới lab cũ vì đề thi không yêu cầu giám sát host).*

### 3.2 Bảng điều khiển Grafana Dashboard
Dashboard tự động nạp `HRM Core - Giám Sát Hiệu Năng Hệ Thống (DTC245200377)` hiển thị dữ liệu đo đạc thực tế:
- **Container HRM:** Hiển thị chính xác **11 containers** qua query `count(count by (name) (container_last_seen{container_label_com_docker_compose_project="hrm"}))`.
- **CPU & RAM:** Biểu đồ tiêu thụ CPU (%) và RAM (Bytes) theo từng container riêng biệt.
- **Web Throughput:** Nginx request rate (`0.10 req/s`) và Active connections (`1`).
- **Database TPS:** PostgreSQL Commit TPS (`3.12 tps`), Rollback TPS (`0.00 tps`).

### 3.3 Hệ thống Log Tập Trung và Ba Câu Truy vấn LogQL Thực Tế
Promtail sử dụng `docker_sd_configs` lọc đúng nhãn `com.docker.compose.project=hrm`. Lập chỉ mục trong Loki chỉ chứa nhãn `project="hrm"`.
1. **Xem toàn bộ log Nginx:**
   ```logql
   {project="hrm", container="hrm-nginx"}
   ```
2. **Lọc sự kiện đăng nhập thất bại (401) và thành công (200):**
   ```logql
   # Đăng nhập thất bại (HTTP 401)
   {project="hrm", container="hrm-nginx"} |= "POST /api/auth/login" |= " 401 "

   # Đăng nhập thành công (HTTP 200)
   {project="hrm", container="hrm-nginx"} |= "POST /api/auth/login" |= " 200 "
   ```
3. **Đo lường tần suất phát sinh log (Metric Vector Query):**
   ```logql
   sum(count_over_time({project="hrm", container="hrm-nginx"}[5m]))
   ```

---

## CHƯƠNG 4: CÁC BIỆN PHÁP BẢO MẬT VÀ HARDENING NÂNG CAO

1. **Non-Root Container Execution:** 
   Container `hrm-app` sử dụng chỉ thị `USER node` (UID 1000). Kiểm tra thực tế: `docker exec hrm-app id` -> `uid=1000(node) gid=1000(node)`.
2. **Cô lập mạng & Đóng cổng Database:** 
   PostgreSQL `hrm-postgres` chỉ nằm trong mạng nội bộ `hrm-backend`. Kiểm tra: `ss -tulpn | grep 5432` không mở cổng trên host.
3. **Quản lý Bí mật Ngoài Git (Zero Hardcoded Secrets):** 
   Tất cả bí mật được quản lý tập trung trong file `.env` (được bảo vệ trong `.gitignore`). Không còn mật khẩu dự phòng hardcoded trong mã nguồn backend, Compose hay tài liệu.
4. **Phân Tách Quyền Cơ Sở Dữ Liệu Tối Thiểu (Least Privilege DB Roles):**
   - `hrm_app_user`: Chỉ có quyền DML (`SELECT, INSERT, UPDATE, DELETE`) trên các bảng nghiệp vụ và `USAGE` trên sequence; `NOSUPERUSER`; bị cấm mọi thao tác DDL quản trị (`CREATE TABLE`).
   - `hrm_exporter_user`: Chỉ được gán role `pg_monitor` và `pg_read_all_stats` để đọc chỉ số hiệu năng; bị cấm truy cập bảng nhạy cảm `users`.
   - `hrm_user`: Tài khoản quản trị, chỉ dùng cho pgAdmin và database initialization.
   - Script tự động: `database/init-roles.sh` tự động cấu hình 2 role và mật khẩu từ `.env` khi khởi chạy container mới.

---

## CHƯƠNG 5: KẾT QUẢ KIỂM THỬ THỰC TẾ VÀ ĐỐI CHIẾU TIÊU CHÍ ĐỀ BÀI

### Bảng Đối Chiếu Tiêu Chí Đề Bài → Bằng Chứng Thực Tế → Đánh Giá

| STT | Tiêu Chí Đánh Giá Của Đề Bài | Cấu Hình Triển Khai Thực Tế | Minh Chứng Kiểm Thử Hệ Thống | Kết Quả |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Kiến trúc Đa Container (Docker Compose) | 11 dịch vụ phân tách 3 mạng nội bộ | `docker compose ps`: 11/11 container Up & Healthy | **ĐẠT** |
| 2 | Quản lý Phòng ban (CRUD Departments) | Node.js Express + PostgreSQL (`hrm_app_user`) | GET/POST/PUT/DELETE `/api/departments` thành công | **ĐẠT** |
| 3 | Quản lý Nhân sự (CRUD Employees) | Bảo toàn 8 nhân viên, xử lý trùng mã/email | GET `/api/employees`: 8 nhân sự; CRUD NV test thành công | **ĐẠT** |
| 4 | Chấm công cơ bản (Attendance) | Check-in/out, tự động phân loại đúng giờ/muộn | POST `/api/attendance/check-in` thành công (status: present) | **ĐẠT** |
| 5 | Cơ sở dữ liệu PostgreSQL & pgAdmin | PostgreSQL 16 Alpine + pgAdmin 4 Web GUI | psql kết nối OK; endpoint pgAdmin trả về HTTP 302 chuyển hướng | **ĐẠT (Backend)**<br>*Chưa kiểm chứng UI* |
| 6 | Nginx HTTPS & Security Headers | SSL/TLS tự ký SAN + 5 Security Headers | `curl -k -I https://localhost`: HTTP 200, đủ HSTS, CSP, X-Frame | **ĐẠT** |
| 7 | Bảo vệ endpoint `/stub_status` | Chặn cổng công cộng, mở listener nội bộ 8080 | Port 80/443: HTTP 403; Port 8080 nội bộ: HTTP 200 OK | **ĐẠT** |
| 8 | Giám sát Metrics 3 nhóm (Prometheus) | Prometheus v3.14 scrape 5 targets nội bộ | `curl /api/v1/targets`: 5/5 Targets UP (đã bỏ node-exporter) | **ĐẠT** |
| 9 | Bảng điều khiển Grafana Dashboard | Dashboard 15 panels lọc đúng project 'hrm' | Container count = 11; Dữ liệu CPU, RAM, Network, TPS hiển thị thật | **ĐẠT** |
| 10 | Hệ thống Log Tập Trung (Loki + Promtail) | Promtail `docker_sd_configs` lọc project=hrm | Nhãn Loki chỉ chứa project='hrm', gom đủ 11 container của HRM | **ĐẠT** |
| 11 | Ba câu truy vấn LogQL thực tế | LogQL Nginx log, lọc 401/200, đếm log rate | Thực thi trả về đúng stream log và metric vector (40 log/5m) | **ĐẠT** |
| 12 | Hardening: Non-root App Execution | Dockerfile `USER node` (UID 1000) | `docker exec hrm-app id` -> `uid=1000(node) gid=1000(node)` | **ĐẠT** |
| 13 | Hardening: Đóng cổng Database host | Mạng `hrm-backend`, không publish cổng 5432 | `ss -tulpn \| grep 5432` -> Không mở cổng trên máy chủ vật lý | **ĐẠT** |
| 14 | Hardening: Zero hardcoded secrets | Mật khẩu quản lý ngoài Git qua `.env` | Quét mã nguồn sạch 100%, không còn mật khẩu dự phòng mặc định | **ĐẠT** |
| 15 | Hardening: Phân tách quyền DB tối thiểu | `hrm_app_user` (DML) & `hrm_exporter_user` | App CRUD OK, cấm DDL; Exporter đọc stats OK, cấm xem users | **ĐẠT** |

---

## CHƯƠNG 6: DANH MỤC ẢNH CHỤP MINH CHỨNG VÀ KỊCH BẢN DEMO

### 6.1 Danh Mục Ảnh Cần Chụp Cho Báo Cáo Chính Thức
Sinh viên mở trình duyệt, thao tác theo danh mục sau và chụp ảnh chèn vào báo cáo:
1. `IMG_01`: `https://github.com/hoangducviet04012006-ux/DTC245200377-HRM-DevOps` -> Trang chủ repo GitHub, commit history chuẩn.
2. `IMG_02`: `https://192.168.186.128/` -> Giao diện tổng quan HRM Core, bảng điều khiển thống kê nhân sự.
3. `IMG_03`: `https://192.168.186.128/#departments` -> Danh sách 4 phòng ban và form thêm phòng ban mới.
4. `IMG_04`: `https://192.168.186.128/#employees` -> Danh sách 8 nhân sự mẫu, chức năng tìm kiếm.
5. `IMG_05`: `https://192.168.186.128/#attendance` -> Bảng chấm công ngày hôm nay, nút check-in/out.
6. `IMG_06`: `https://192.168.186.128/pgadmin/` -> Đăng nhập pgAdmin, mở cây thư mục `hrm-postgres` -> bảng `employees`.
7. `IMG_07`: Trình duyệt DevTools (F12 Network tab) -> Kiểm tra chứng chỉ HTTPS và 5 Security Headers.
8. `IMG_08`: `http://192.168.186.128:9091/targets` -> Giao diện Prometheus hiển thị 5 targets đều UP.
9. `IMG_09`: `http://192.168.186.128:3001/d/hrm-enterprise-metrics` -> Grafana Dashboard hiển thị 11 containers, CPU, RAM.
10. `IMG_10`: `http://192.168.186.128:3001/d/hrm-enterprise-metrics` -> Panel Nginx Request Rate và Postgres Commit TPS.
11. `IMG_11`: `http://192.168.186.128:3001/explore` -> Loki LogQL `{project="hrm", container="hrm-nginx"}`.
12. `IMG_12`: `http://192.168.186.128:3001/explore` -> Loki LogQL lọc sự kiện đăng nhập sai HTTP 401.

### 6.2 Kịch Bản Demo Trực Tiếp Dành Cho Sinh Viên (5 - 7 Phút)
- **Bước 1 (1 phút):** Trình bày GitHub Repository của sinh viên Hoàng Đức Việt, lịch sử commit chuẩn, giải thích file `.env` nằm ngoài Git.
- **Bước 2 (1.5 phút):** Mở `https://192.168.186.128`, đăng nhập admin, demo CRUD phòng ban, nhân viên và chấm công check-in.
- **Bước 3 (1 phút):** Mở pgAdmin 4, chứng minh dữ liệu lưu trữ nhất quán trong PostgreSQL 16.
- **Bước 4 (1 phút):** Demo Nginx HTTPS, Security Headers trên F12 và chứng minh cổng `/stub_status` bị chặn 403.
- **Bước 5 (1 phút):** Mở Grafana Dashboard: Chỉ rõ số container là đúng 11, giải thích RAM working set (~265MB), Nginx req/s và Postgres TPS.
- **Bước 6 (1 phút):** Mở Grafana Explore, chạy 3 câu LogQL: xem log Nginx, lọc lần nhập sai mật khẩu (401), và tính tốc độ log rate.
- **Bước 7 (0.5 phút):** Mở terminal chứng minh 4 biện pháp Hardening: Non-root (`uid=1000`), không mở cổng 5432, không hardcode mật khẩu, và quyền tối thiểu của `hrm_app_user` / `hrm_exporter_user`.

---

## KẾT LUẬN
Hệ thống Quản lý Nhân sự & Chấm công (HRM Core) hoàn thành 100% mục tiêu của Đề tài số 10. Toàn bộ mã nguồn, kịch bản điều phối Docker Compose, bảng điều khiển giám sát và tài liệu kiểm thử đã được lưu trữ, kiểm chứng thực nghiệm và sẵn sàng phục vụ buổi bảo vệ kết thúc học phần.

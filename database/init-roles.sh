#!/bin/bash
set -e

# Tự động khởi tạo và cập nhật mật khẩu cho các role least-privilege từ biến môi trường
APP_USER="${APP_DB_USER:-hrm_app_user}"
APP_PASS="${APP_DB_PASSWORD}"
EXP_USER="${EXPORTER_DB_USER:-hrm_exporter_user}"
EXP_PASS="${EXPORTER_DB_PASSWORD}"
TARGET_DB="${POSTGRES_DB:-hrm_db}"

echo "[init-roles.sh] Đang cấu hình tài khoản quyền tối thiểu cho App và Exporter..."

if [ -n "$APP_PASS" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$TARGET_DB" <<-EOSQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$APP_USER') THEN
                CREATE ROLE $APP_USER WITH LOGIN PASSWORD '$APP_PASS' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
            ELSE
                ALTER ROLE $APP_USER WITH PASSWORD '$APP_PASS' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
            END IF;
        END \$\$;

        GRANT CONNECT ON DATABASE $TARGET_DB TO $APP_USER;
        GRANT USAGE ON SCHEMA public TO $APP_USER;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $APP_USER;
        GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $APP_USER;

        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $APP_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO $APP_USER;
EOSQL
    echo "[init-roles.sh] Đã khởi tạo thành công role $APP_USER (Least Privilege DML)."
fi

if [ -n "$EXP_PASS" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$TARGET_DB" <<-EOSQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$EXP_USER') THEN
                CREATE ROLE $EXP_USER WITH LOGIN PASSWORD '$EXP_PASS' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
            ELSE
                ALTER ROLE $EXP_USER WITH PASSWORD '$EXP_PASS' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
            END IF;
        END \$\$;

        GRANT CONNECT ON DATABASE $TARGET_DB TO $EXP_USER;
        GRANT pg_monitor TO $EXP_USER;
        GRANT pg_read_all_stats TO $EXP_USER;
EOSQL
    echo "[init-roles.sh] Đã khởi tạo thành công role $EXP_USER (pg_monitor stats)."
fi

echo "[init-roles.sh] Hoàn tất thiết lập role tự động khi cài mới!"

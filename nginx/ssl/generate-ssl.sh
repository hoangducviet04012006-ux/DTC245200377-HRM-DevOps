#!/bin/sh
# Script tự động tạo chứng chỉ SSL tự ký có SAN
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/C=VN/ST=ThaiNguyen/O=ICTU-HRM/CN=192.168.186.128" \
  -addext "subjectAltName=DNS:localhost,DNS:hrm.local,IP:127.0.0.1,IP:192.168.186.128"
chmod 600 /etc/nginx/ssl/key.pem
chmod 644 /etc/nginx/ssl/cert.pem
echo "SSL Certificate generated."

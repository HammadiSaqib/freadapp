#!/bin/bash

# Fix MySQL permissions for IP 102.129.255.123
echo "Fixing MySQL permissions for IP 102.129.255.123..."

# Create user for specific IP with all privileges
mysql -u root -p << EOF
CREATE USER IF NOT EXISTS 'root'@'102.129.255.123' IDENTIFIED BY 'Hammad123!';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'102.129.255.123' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User='root';
EOF

echo "MySQL permissions updated for IP 102.129.255.123"
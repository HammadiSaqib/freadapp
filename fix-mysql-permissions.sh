#!/bin/bash

# Fix MySQL permissions for IP 102.129.255.123
mysql -u root -p -e "CREATE USER IF NOT EXISTS 'root'@'102.129.255.123' IDENTIFIED BY '';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'102.129.255.123' WITH GRANT OPTION;"
mysql -u root -p -e "FLUSH PRIVILEGES;"

echo "MySQL permissions updated for IP 102.129.255.123"
echo "Verifying user permissions:"
mysql -u root -p -e "SELECT User, Host FROM mysql.user WHERE Host='102.129.255.123';"
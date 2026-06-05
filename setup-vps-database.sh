#!/bin/bash

# VPS Database Setup Script for Credit Repair Application
echo "Setting up fresh database on VPS..."

# MySQL root password (you'll need to enter this when prompted)
DB_NAME="creditrepair_db"
DB_USER="root"

echo "Step 1: Creating fresh database..."
mysql -u root -p << EOF
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ${DB_NAME};
SHOW DATABASES;
EOF

echo "Step 2: Configuring MySQL for remote connections..."
# Backup original MySQL config
cp /etc/mysql/mysql.conf.d/mysqld.cnf /etc/mysql/mysql.conf.d/mysqld.cnf.backup

# Update bind-address to allow remote connections
sed -i 's/bind-address\s*=\s*127.0.0.1/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf

echo "Step 3: Creating remote access user..."
mysql -u root -p << EOF
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO 'root'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User = 'root';
EOF

echo "Step 4: Restarting MySQL service..."
systemctl restart mysql
systemctl status mysql

echo "Step 5: Importing database from SQL file..."
if [ -f "/root/creditrepair_db.sql" ]; then
    echo "Importing creditrepair_db.sql..."
    mysql -u root -p ${DB_NAME} < /root/creditrepair_db.sql
    echo "Database import completed!"
else
    echo "SQL file not found. Please ensure creditrepair_db.sql is in /root/ directory"
    echo "You can import it later with: mysql -u root -p ${DB_NAME} < /root/creditrepair_db.sql"
fi

echo "Step 6: Verifying database setup..."
mysql -u root -p << EOF
USE ${DB_NAME};
SHOW TABLES;
EOF

echo "Database setup completed!"
echo "Your VPS database is now ready for remote connections."
echo "Connection string: mysql://root:@72.61.2.28:3306/creditrepair_db"
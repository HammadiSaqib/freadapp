#!/bin/bash

# Update MySQL to allow remote connections
mysql -u root -p << EOF
UPDATE mysql.user SET Host='%' WHERE User='root' AND Host='localhost';
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User='root';
EOF

echo "MySQL permissions updated to allow remote connections"
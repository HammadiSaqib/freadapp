#!/bin/bash

echo "Starting database import..."

# Import the SQL file into the database
mysql -u root -p creditrepair_db < /root/creditrepair_db.sql

echo "Database import completed!"

# Show tables to verify import
echo "Verifying import - showing tables:"
mysql -u root -p -e "USE creditrepair_db; SHOW TABLES;"

echo "Import verification completed!"
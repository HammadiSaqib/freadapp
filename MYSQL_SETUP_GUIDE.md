# MySQL Database Setup Guide

This guide will help you migrate from SQLite to MySQL using your existing XAMPP installation.

## Prerequisites

- XAMPP installed and running
- Node.js and npm installed
- Existing SQLite database (optional, for migration)

## Step 1: Configure XAMPP

### 1.1 Start XAMPP Services
1. Open XAMPP Control Panel
2. Start **Apache** and **MySQL** services
3. Ensure both services show "Running" status

### 1.2 Access phpMyAdmin (Optional)
1. Open your browser and go to `http://localhost/phpmyadmin`
2. Login with:
   - Username: `root`
   - Password: (leave empty for default XAMPP setup)

## Step 2: Environment Configuration

### 2.1 Create Environment File
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your MySQL settings:
   ```env
   # MySQL Configuration (XAMPP defaults)
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=
   MYSQL_DATABASE=creditrepair_db
   
   # Set database type to MySQL
   DATABASE_TYPE=mysql
   ```

### 2.2 Customize Settings (Optional)
If you've customized your XAMPP MySQL setup:
- Update `MYSQL_PASSWORD` if you've set a root password
- Change `MYSQL_PORT` if using a different port
- Modify `MYSQL_DATABASE` to use a different database name

## Step 3: Install Dependencies

Install the required MySQL dependency:
```bash
npm install mysql2
```

## Step 4: Database Migration

### 4.1 Test MySQL Connection
First, verify your MySQL connection works:
```bash
node -e "require('./server/database/mysqlConfig.js').testConnection().then(console.log)"
```

### 4.2 Run Migration (if you have existing SQLite data)

#### Option A: Dry Run (Recommended First)
```bash
node server/scripts/migrateToMySQL.js --dry-run
```

#### Option B: Full Migration
```bash
node server/scripts/migrateToMySQL.js --force
```

#### Option C: Custom SQLite Path
```bash
node server/scripts/migrateToMySQL.js --sqlite-path ./path/to/your/database.sqlite
```

### 4.3 Migration Options
- `--dry-run`: Analyze migration without executing
- `--force`: Skip confirmation prompts
- `--sqlite-path <path>`: Specify custom SQLite database path
- `--skip-validation`: Skip post-migration validation
- `--help`: Show all available options

## Step 5: Initialize Fresh Database (No Migration)

If you don't have existing data to migrate:
```bash
node -e "require('./server/database/mysqlSchema.js').initializeDatabase().then(() => console.log('Database initialized!'))"
```

## Step 6: Update Application Configuration

### 6.1 Update Server Entry Point
Modify your server startup code to use the database adapter:

```typescript
import { loadEnvironmentConfig } from './config/environment.js';
import { initializeDatabaseAdapter } from './database/databaseAdapter.js';

const config = loadEnvironmentConfig();

// Initialize database adapter
const dbType = process.env.DATABASE_TYPE === 'mysql' ? 'mysql' : 'sqlite';
await initializeDatabaseAdapter(config, dbType);
```

### 6.2 Update Database Queries
Replace direct database calls with the adapter:

```typescript
// Old way
import { runQuery } from './database/schema.js';

// New way
import { runQuery } from './database/databaseAdapter.js';
```

## Step 7: Testing

### 7.1 Test Database Connection
```bash
node -e "require('./server/database/mysqlConfig.js').testConnection().then(r => console.log('Connection:', r ? 'Success' : 'Failed'))"
```

### 7.2 Test Application
1. Start your application:
   ```bash
   npm run dev
   ```

2. Verify all features work correctly
3. Check that data is being stored in MySQL

### 7.3 Verify Data in phpMyAdmin
1. Go to `http://localhost/phpmyadmin`
2. Select `creditrepair_db` database
3. Browse tables to verify data

## Troubleshooting

### Common Issues

#### 1. "Connection refused" Error
- **Cause**: MySQL service not running
- **Solution**: Start MySQL in XAMPP Control Panel

#### 2. "Access denied" Error
- **Cause**: Incorrect credentials
- **Solution**: Verify username/password in `.env` file

#### 3. "Database does not exist" Error
- **Cause**: Database not created
- **Solution**: The migration script will create it automatically, or create manually in phpMyAdmin

#### 4. Port 3306 Already in Use
- **Cause**: Another MySQL instance running
- **Solution**: Stop other MySQL services or change port in XAMPP

#### 5. Migration Fails
- **Cause**: SQLite database locked or corrupted
- **Solution**: Ensure no other processes are using the SQLite file

### Performance Optimization

#### 1. Connection Pool Settings
Adjust in `.env`:
```env
MYSQL_CONNECTION_LIMIT=20
MYSQL_ACQUIRE_TIMEOUT=60000
MYSQL_TIMEOUT=60000
```

#### 2. MySQL Configuration
For better performance, edit XAMPP's `my.ini`:
```ini
innodb_buffer_pool_size=256M
max_connections=200
query_cache_size=64M
```

## Security Considerations

### 1. Production Setup
For production environments:
- Set a strong MySQL root password
- Create a dedicated database user
- Use SSL connections
- Configure firewall rules

### 2. Environment Variables
```env
# Production MySQL settings
MYSQL_PASSWORD=your-strong-password
MYSQL_SSL=true
MYSQL_SSL_CA=/path/to/ca.pem
```

## Backup and Recovery

### 1. Backup MySQL Database
```bash
mysqldump -u root -p creditrepair_db > backup.sql
```

### 2. Restore from Backup
```bash
mysql -u root -p creditrepair_db < backup.sql
```

### 3. Keep SQLite Backup
After successful migration, keep your SQLite file as backup:
```bash
cp database.sqlite database.sqlite.backup
```

## Next Steps

1. **Monitor Performance**: Use the built-in performance monitoring tools
2. **Set Up Backups**: Implement regular database backups
3. **Security Hardening**: Follow MySQL security best practices
4. **Scaling**: Consider MySQL replication for high availability

## Support

If you encounter issues:
1. Check XAMPP error logs in `xampp/mysql/data/`
2. Review application logs for detailed error messages
3. Verify all environment variables are correctly set
4. Test MySQL connection independently of the application

---

**Note**: This setup is optimized for development with XAMPP. For production deployments, consider using a dedicated MySQL server with proper security configurations.
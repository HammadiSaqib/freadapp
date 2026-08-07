# Deployment Guide for SQL Fixes and Database Migration

This guide outlines the steps to deploy the fixed SQL issues and ensure database schema completeness on the VPS.

## Overview

The following issues have been addressed:
1. **SQL syntax errors** in `server/routes/groups.ts` - Fixed backticks in template literals
2. **Database schema validation** - Created migration script to ensure all required tables exist
3. **Comprehensive testing** - All SQL queries validated and build process verified

## Pre-Deployment Steps

1. **Verify Local Build**
   ```bash
   npm run build:server
   ```
   ✅ Build should complete without errors

2. **Test SQL Syntax**
   ```bash
   node test-sql-syntax.cjs
   ```
   ✅ All SQL queries should pass validation

3. **Analyze Database Schema**
   ```bash
   node compare-database-schema.cjs
   ```
   ✅ Reference schema contains 69 tables including critical `groups` table

## Deployment Steps

### Step 1: Build the Application
```bash
npm run build:server
```

### Step 2: Copy Files to VPS
Copy the following files to the VPS at `/root/ScoreMachineV2RawCode/`:
- `dist/` directory (entire built application)
- `server/routes/groups.ts` (source file with fixes)
- `vps-database-migration.cjs` (database migration script)
- `package.json` and `package-lock.json` (if dependencies changed)

**Copy Commands:**
```bash
# Copy built application
scp -r dist/ root@your-vps-ip:/root/ScoreMachineV2RawCode/

# Copy migration script
scp vps-database-migration.cjs root@your-vps-ip:/root/ScoreMachineV2RawCode/

# Copy source file
scp server/routes/groups.ts root@your-vps-ip:/root/ScoreMachineV2RawCode/server/routes/
```

### Step 3: Run Database Migration (CRITICAL)
On the VPS, ensure database schema is complete:
```bash
cd /root/ScoreMachineV2RawCode
node vps-database-migration.cjs
```

**What this script does:**
- Creates a backup of the current database
- Checks for critical tables: `groups`, `group_members`, `activities`, `users`
- Creates missing tables with proper structure
- Validates the `groups` table is accessible
- Provides detailed migration report

### Step 4: Restart PM2 Process
On the VPS, restart the application:
```bash
pm2 restart thecapsol-api
pm2 logs thecapsol-api --lines 50
```

### Step 5: Verify Deployment
1. Check PM2 status: `pm2 status`
2. Monitor logs: `pm2 logs thecapsol-api`
3. Test API endpoints that use groups functionality
4. Verify no SQL syntax errors in logs
5. Confirm database connection is successful

## Database Migration Details

### Critical Tables Ensured:
- **groups** - Community groups with proper column structure
- **group_members** - Group membership relationships
- **activities** - User activity tracking
- **users** - User accounts and authentication

### Migration Safety Features:
- Automatic database backup before changes
- Uses `CREATE TABLE IF NOT EXISTS` to avoid conflicts
- Detailed logging of all operations
- Rollback information provided

## Rollback Plan

If issues occur:

### Application Rollback:
1. Stop the application: `pm2 stop thecapsol-api`
2. Restore previous version from backup
3. Restart: `pm2 start thecapsol-api`

### Database Rollback:
1. The migration script creates automatic backups
2. Restore from backup file if needed:
   ```bash
   mysql -u username -p database_name < backup-file.sql
   ```

## Testing Checklist

After deployment, test:
- [ ] Application starts without errors
- [ ] Database connection successful
- [ ] Groups creation functionality
- [ ] Groups listing/retrieval
- [ ] Group member operations
- [ ] Group updates and deletions
- [ ] No SQL syntax errors in logs
- [ ] Migration script completed successfully
- [ ] All critical tables exist and are accessible

## Files Modified/Added

### Modified:
- `server/routes/groups.ts` - Fixed SQL syntax in template literals and string queries

### Added:
- `vps-database-migration.cjs` - Database migration and validation script
- `compare-database-schema.cjs` - Schema analysis tool
- `test-sql-syntax.cjs` - SQL syntax validation tool

## Troubleshooting

### If Migration Fails:
1. Check database connection settings in `.env`
2. Verify MySQL service is running
3. Ensure database user has CREATE TABLE permissions
4. Check if database name exists
5. Review migration logs for specific errors

### If Application Won't Start:
1. Check PM2 logs: `pm2 logs thecapsol-api`

## Domain & SSL Deployment (Nginx + PM2)

Follow these steps to run the app at `https://thescoremachine.com` and secure the portal subdomains with HTTPS and WebSocket support.

### 1) DNS Setup
- Create `A` records for `thescoremachine.com`, `www`, `admin`, `super-admin`, `affiliate`, `support`, `funding-manager`, `member`, `printing-team`, `ref`, `onboarding`, and `api` pointing to your VPS IPv4.
- Optionally create `AAAA` records for IPv6 if available.
- Propagation can take up to 30 minutes.

### 2) Server Prerequisites
- Ensure Node.js `v20+` (target is `node22`).
- Install Nginx: `sudo apt update && sudo apt install -y nginx`.
- Allow HTTP/HTTPS in firewall: `sudo ufw allow 'Nginx Full'`.

### 3) Environment Configuration
- Copy `.env.production.example` to `.env` in project root: `cp .env.production.example .env`.
- Set values:
   - `FRONTEND_URL=https://thescoremachine.com`
   - `CORS_ORIGIN=https://thescoremachine.com,https://www.thescoremachine.com,https://admin.thescoremachine.com,https://super-admin.thescoremachine.com,https://affiliate.thescoremachine.com,https://support.thescoremachine.com,https://funding-manager.thescoremachine.com,https://member.thescoremachine.com,https://printing-team.thescoremachine.com,https://ref.thescoremachine.com,https://onboarding.thescoremachine.com,https://api.thescoremachine.com`
   - `VITE_API_URL=https://thescoremachine.com`
  - Provide secure `JWT_SECRET` (64+ random hex) and MySQL credentials.

### 4) Build and Start with PM2
```bash
cd /root/ScoreMachineV2RawCode
git pull origin master
npm ci
npm run build
pm2 start ecosystem.config.cjs --name thecapsol-api
pm2 save
pm2 status
```

Notes:
- `ecosystem.config.cjs` points to `dist/server/production.mjs` and uses domain envs.
- Sensitive credentials are read from `.env` at runtime.

### 5) Configure Nginx Reverse Proxy
1. Create a site config based on `deploy/nginx.conf.example`:
```bash
sudo nano /etc/nginx/sites-available/scoremachine
# Paste and edit domains if needed
sudo ln -s /etc/nginx/sites-available/scoremachine /etc/nginx/sites-enabled/scoremachine
sudo nginx -t && sudo systemctl reload nginx
```

Important:
- Nginx rejects request bodies larger than about `1MB` by default unless `client_max_body_size` is set.
- The example configs in `deploy/nginx.conf.example` and `deploy/nginx.http-bootstrap.conf.example` now include `client_max_body_size 100M;`.
- Nginx also defaults to relatively short upstream timeouts. Long AI requests can hit `504 Gateway Timeout` unless `proxy_read_timeout` and `proxy_send_timeout` are raised.
- If your VPS already has an older live Nginx config, add this line inside the active `server { ... }` block too, then reload Nginx.

For an existing VPS, the fastest fix is:
```bash
sudo nano /etc/nginx/sites-available/scoremachine
# add inside the active server block:
# client_max_body_size 100M;
# add inside the active location / block too:
# proxy_connect_timeout 60s;
# proxy_send_timeout 120s;
# proxy_read_timeout 120s;
# send_timeout 120s;
sudo nginx -t
sudo systemctl reload nginx
```

If the server already had an older site config for the same domain, disable the old symlink before reloading Nginx. One hostname should be owned by only one active site config.

Example cleanup:
```bash
sudo ls -l /etc/nginx/sites-enabled
sudo grep -R -n "server_name .*thescoremachine.com" /etc/nginx/sites-enabled /etc/nginx/conf.d
sudo rm /etc/nginx/sites-enabled/thescoremachine.com
sudo nginx -t && sudo systemctl reload nginx
```

First-time TLS setup:
- If you do not already have a certificate on the server, do not start with `deploy/nginx.conf.example` because it references certificate files that do not exist yet.
- Start with `deploy/nginx.http-bootstrap.conf.example` so Nginx can run on port 80 without SSL.
- After Certbot succeeds, switch `/etc/nginx/sites-available/scoremachine` to the final HTTPS config from `deploy/nginx.conf.example` if Certbot did not already update the file for you.

If uploads still fail after this change, verify whether Nginx is the blocker:
```bash
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log
```

If you see `413 Request Entity Too Large`, the request never reached Node/PM2 and the problem is definitely the active Nginx config.

### 6) Obtain TLS Certificates (Let's Encrypt)
Before requesting a certificate, verify which hostnames already resolve to this VPS:
```bash
for d in \
   thescoremachine.com \
   www.thescoremachine.com \
   admin.thescoremachine.com \
   super-admin.thescoremachine.com \
   affiliate.thescoremachine.com \
   printing-team.thescoremachine.com \
   ref.thescoremachine.com \
   onboarding.thescoremachine.com \
   support.thescoremachine.com \
   funding-manager.thescoremachine.com \
   member.thescoremachine.com \
   api.thescoremachine.com
do
   echo "== $d =="
   getent ahosts "$d" | awk '{print $1}' | sort -u
done
```

Request the first certificate only for hostnames that already resolve. Start with the main site and active portal domains:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx \
   -d thescoremachine.com \
   -d www.thescoremachine.com \
   -d admin.thescoremachine.com \
   -d super-admin.thescoremachine.com \
   -d affiliate.thescoremachine.com \
   -d printing-team.thescoremachine.com \
   -d ref.thescoremachine.com \
   -d onboarding.thescoremachine.com
sudo systemctl reload nginx
```

Only include domains that already resolve to this VPS. If one hostname is not pointed correctly yet, remove it from the `certbot` command for now and re-run later after DNS is fixed.

After additional subdomains are created in DNS, expand the existing certificate:
```bash
sudo certbot --nginx --cert-name thescoremachine.com --expand \
   -d thescoremachine.com \
   -d www.thescoremachine.com \
   -d admin.thescoremachine.com \
   -d super-admin.thescoremachine.com \
   -d affiliate.thescoremachine.com \
   -d printing-team.thescoremachine.com \
   -d ref.thescoremachine.com \
   -d onboarding.thescoremachine.com \
   -d support.thescoremachine.com \
   -d funding-manager.thescoremachine.com \
   -d member.thescoremachine.com
```

Add `api.thescoremachine.com` in a later `--expand` run only if you actually create that DNS record.

If onboarding links must be secure like `admin`, `member`, and `ref`, then `onboarding.thescoremachine.com` has to exist in all three places at the same time:
- DNS record
- Nginx `server_name`
- active Let's Encrypt certificate SAN list

If one is missing, the onboarding URL will still show `Not Secure` or fall back to plain HTTP.

The same rule applies to `printing-team.thescoremachine.com`.

If Certbot says the nginx plugin is broken because of missing certificate files:
```bash
sudo grep -R "mywarmachine.com\|letsencrypt/live" /etc/nginx
```

Remove or replace every stale `mywarmachine.com` certificate path, switch to the bootstrap HTTP config, then run:
```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx \
   -d thescoremachine.com \
   -d www.thescoremachine.com \
   -d admin.thescoremachine.com \
   -d super-admin.thescoremachine.com \
   -d affiliate.thescoremachine.com \
   -d printing-team.thescoremachine.com \
   -d ref.thescoremachine.com \
   -d onboarding.thescoremachine.com \
   -d support.thescoremachine.com \
   -d funding-manager.thescoremachine.com \
   -d member.thescoremachine.com \
   -d api.thescoremachine.com
```

### 7) Verify
- `curl -I https://thescoremachine.com`
- `curl -I https://admin.thescoremachine.com/login`
- `curl -I https://affiliate.thescoremachine.com/login`
- `curl -I https://printing-team.thescoremachine.com/login`
- `curl -I https://ref.thescoremachine.com/register?ref=test&plan=1`
- `curl -I https://onboarding.thescoremachine.com/test-admin`
- Open site in browser; authenticate; check APIs and WebSocket features.
- If `TokenExpiredError` appears, clear browser storage (localStorage/sessionStorage) and login again.

### 8) Logs and Monitoring
- App logs: `pm2 logs thecapsol-api --lines 100`
- Nginx: `sudo tail -n 100 /var/log/nginx/access.log /var/log/nginx/error.log`

### Common Pitfalls
- `VITE_API_URL` must be set at build time for client to target your domain.
- Ensure `FRONTEND_URL` and `CORS_ORIGIN` use `https` and include every production subdomain you actually serve.
- WebSocket proxy requires `Upgrade`/`Connection` headers as in the example config.
2. Verify database connection in logs
3. Ensure all environment variables are set
4. Check file permissions on uploaded files

## Notes

- The SQL fixes address build-time syntax errors caused by unescaped backticks
- Database migration ensures schema completeness without data loss
- All changes are backward compatible
- Migration script can be run multiple times safely

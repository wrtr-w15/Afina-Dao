# Database Backup & Restore

This directory contains database backups and import/export scripts for Afina DAO Wiki.

## 📦 Backup Files

Backup files follow the naming convention:
```
afina_dao_wiki_full_YYYYMMDD_HHMMSS.sql
```

Latest backup:
- **afina_dao_wiki_full_20251003_182526.sql** (22KB)

## 🔄 Creating a Backup

### Full Backup (Recommended for Production)
```bash
mysqldump -h localhost -P 3306 -u root afina_dao_wiki \
  --no-tablespaces \
  --single-transaction \
  --quick \
  --lock-tables=false \
  --routines \
  --triggers \
  > afina_dao_wiki_full_$(date +%Y%m%d_%H%M%S).sql
```

### Schema Only (No Data)
```bash
mysqldump -h localhost -P 3306 -u root afina_dao_wiki \
  --no-tablespaces \
  --no-data \
  --routines \
  --triggers \
  > afina_dao_wiki_schema_$(date +%Y%m%d_%H%M%S).sql
```

### Data Only (No Schema)
```bash
mysqldump -h localhost -P 3306 -u root afina_dao_wiki \
  --no-tablespaces \
  --no-create-info \
  --complete-insert \
  > afina_dao_wiki_data_$(date +%Y%m%d_%H%M%S).sql
```

## 📥 Importing a Backup

### Option 1: Using Import Script (Recommended)
```bash
./import.sh afina_dao_wiki_full_20251003_182526.sql
```

### Option 2: Manual Import
```bash
# Create database (if doesn't exist)
mysql -h localhost -P 3306 -u root -p -e "CREATE DATABASE IF NOT EXISTS afina_dao_wiki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import dump
mysql -h localhost -P 3306 -u root -p afina_dao_wiki < afina_dao_wiki_full_20251003_182526.sql
```

### Option 3: Remote Server Import
```bash
# Upload dump to server
scp afina_dao_wiki_full_*.sql user@server:/path/to/backup/

# SSH to server and import
ssh user@server
mysql -u root -p afina_dao_wiki < /path/to/backup/afina_dao_wiki_full_*.sql
```

## 🚀 Production Deployment

### 1. Prepare Server
```bash
# Install MySQL
sudo apt update
sudo apt install mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database user
mysql -u root -p
CREATE USER 'afina_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON afina_dao_wiki.* TO 'afina_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Transfer and Import
```bash
# Transfer dump
scp afina_dao_wiki_full_*.sql user@server:/tmp/

# Import on server
ssh user@server
mysql -u afina_user -p afina_dao_wiki < /tmp/afina_dao_wiki_full_*.sql
```

### 3. Configure Application
Update `.env.local` on server:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=afina_user
DB_PASSWORD=secure_password
DB_NAME=afina_dao_wiki
```

### 4. Verify
```bash
mysql -u afina_user -p afina_dao_wiki -e "SHOW TABLES;"
mysql -u afina_user -p afina_dao_wiki -e "SELECT COUNT(*) FROM projects;"
```

## 🗄 Database Schema

The backup includes the following tables:

### Core Tables
- `projects` - Project information
- `project_translations` - Project translations (ru, en, ua)
- `project_blocks` - Content blocks with Markdown
- `project_block_translations` - Block translations
- `project_block_links` - External links

### Management
- `categories` - Project categories
- `pricing_settings` - Pricing configuration
- `discount_multipliers` - Volume discounts

### Authentication
- `auth_sessions` - 2FA sessions

## 📊 Backup Schedule (Production)

### Recommended Schedule
```bash
# Daily backup (keep last 7 days)
0 2 * * * mysqldump ... > backup_daily_$(date +\%Y\%m\%d).sql

# Weekly backup (keep last 4 weeks)
0 2 * * 0 mysqldump ... > backup_weekly_$(date +\%Y\%m\%d).sql

# Monthly backup (keep last 12 months)
0 2 1 * * mysqldump ... > backup_monthly_$(date +\%Y\%m\%d).sql
```

### Automated Cleanup
```bash
# Remove backups older than 30 days
find /path/to/backup/ -name "*.sql" -mtime +30 -delete
```

## 🔐 Security Notes

### Best Practices
1. **Encrypt Backups**: Use GPG encryption for sensitive data
   ```bash
   mysqldump ... | gpg --encrypt --recipient your@email.com > backup.sql.gpg
   ```

2. **Secure Storage**: Store backups in secure location with restricted access
   ```bash
   chmod 600 *.sql
   ```

3. **Off-site Backup**: Copy backups to remote location (S3, Backblaze, etc.)

4. **Test Restores**: Regularly test backup restoration

5. **Avoid Passwords in Scripts**: Use `.my.cnf` for credentials
   ```bash
   # ~/.my.cnf
   [client]
   user=root
   password=your_password
   host=localhost
   ```

## ⚠️ Important Notes

1. **Character Set**: Backups use UTF-8 (utf8mb4) encoding
2. **Time Zone**: Timestamps are in server's local timezone
3. **Large Databases**: Use `--quick` option for large datasets
4. **Binary Logs**: Consider enabling binary logs for point-in-time recovery
5. **Transactions**: Use `--single-transaction` for InnoDB tables

## 🆘 Troubleshooting

### Error: Access Denied
```bash
# Grant proper privileges
GRANT ALL PRIVILEGES ON afina_dao_wiki.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

### Error: Table doesn't exist
```bash
# Drop and recreate database
DROP DATABASE afina_dao_wiki;
CREATE DATABASE afina_dao_wiki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# Re-import
```

### Error: Disk space
```bash
# Check available space
df -h
# Compress old backups
gzip *.sql
```

## 📞 Support

For backup/restore issues, contact:
- @acycas
- @kirjeyy

---

**Last Updated**: 2025-10-03


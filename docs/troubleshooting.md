# Troubleshooting Guide

## Common Issues & Solutions

### Application Won't Start

**Symptom**: `npm start` fails
**Possible Causes**:
1. Port already in use
2. Missing environment variables
3. Database connection failed
4. Redis connection failed

**Solutions**:
```bash
# Check if port is in use
lsof -i :5000

# Verify .env file
cat .env | grep -v "^#"

# Test MySQL connection
mysql -u ${DB_USER} -p -e "SELECT 1"

# Test Redis connection
redis-cli ping
```

### Database Connection Errors

**Symptom**: "Can't connect to MySQL server"
**Solutions**:
```bash
# Check MySQL is running
sudo systemctl status mysql

# Verify credentials
mysql -u ${DB_USER} -p${DB_PASSWORD}

# Check DATABASE_URL in .env
echo $DATABASE_URL

# Test with Prisma
npx prisma db pull
```

### Redis Connection Errors

**Symptom**: "Redis connection failed"
**Solutions**:
```bash
# Check Redis is running
redis-cli ping

# Check Redis password
redis-cli -a ${REDIS_PASSWORD} ping

# Restart Redis
sudo systemctl restart redis
```

### Sessions Not Persisting

**Symptom**: User logged out immediately
**Possible Causes**:
1. Redis not connected
2. SESSION_SECRET changed
3. Cookie domain mismatch
4. HTTPS/HTTP mismatch

**Solutions**:
```bash
# Check Redis connection
redis-cli -a ${REDIS_PASSWORD} KEYS "onlineapp:*"

# Verify SESSION_SECRET is consistent
# Check cookie settings for HTTPS

# For FortiGate proxy, verify:
# - X-Forwarded-Host header
# - /proxy/ in URL
# - sameSite: 'none' being used
```

### Rate Limiting Too Strict

**Symptom**: "Too many requests" error
**Solutions**:
```javascript
// In rateLimitMiddleware.js, adjust:
windowMs: 1000,  // Increase window
limit: 20,       // Increase limit

// Or whitelist IP in blockMiddleware
```

### Failed Login - Account Locked

**Symptom**: "Account blocked after 5 attempts"
**Solution**:
```sql
-- Check user state
SELECT id_user, username, state, login_attempts, block_code 
FROM online2024_users 
WHERE username = 'problematic_user';

-- Unblock user (state=1, reset attempts)
UPDATE online2024_users 
SET state = 1, login_attempts = 0, block_code = NULL 
WHERE username = 'problematic_user';
```

### Email Notifications Not Sending

**Symptom**: No security alert emails
**Solutions**:
```bash
# Test SMTP configuration
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'mail.aps.dz',
  port: 25,
  auth: {
    user: process.env.ADMIN_MAIL,
    pass: process.env.ADMIN_MAIL_PASSWORD
  }
});
transporter.sendMail({
  from: process.env.ADMIN_MAIL,
  to: process.env.RECEPTION_MAIL,
  subject: 'Test',
  text: 'Test email'
}, console.log);
"
```

### API Key Validation Fails

**Symptom**: "You are not authorized"
**Solutions**:
```bash
# Verify API_KEY in .env
echo $API_KEY

# Test with curl
curl -H "x-api-key: your-api-key" http://localhost:5000/api/v1/agencies

# Check middleware order in index.js
# validateClient should come after CORS, before routes
```

### Image Upload Fails

**Symptom**: "Invalid file type" or "File size exceeds limit"
**Solutions**:
```bash
# Check file type
file uploaded_image.jpg

# Check file size (max 1MB)
ls -lh uploaded_image.jpg

# Verify upload directory exists and is writable
mkdir -p uploads/original
chmod 755 uploads/original

# Check ORIGINAL_IMAGE_PATH in .env
```

### Slow Article Queries

**Symptom**: Article endpoints taking >1s
**Solutions**:
```sql
-- Check missing indexes
SHOW INDEX FROM online2024_articles;

-- Ensure these indexes exist:
CREATE INDEX idx_agency_date ON online2024_articles(id_agency, created_date);
CREATE INDEX idx_created_date ON online2024_articles(created_date);

-- Analyze query performance
EXPLAIN SELECT * FROM online2024_articles WHERE id_agency = 1;
```

### Memory Issues

**Symptom**: "JavaScript heap out of memory"
**Solutions**:
```bash
# Increase Node.js memory
node --max-old-space-size=4096 index.js

# Or in PM2
pm2 start index.js --node-args="--max-old-space-size=4096"

# Check for memory leaks
pm2 monit
```

### Log Files Growing Too Large

**Symptom**: Disk space filling up
**Solutions**:
```bash
# Check log sizes
du -sh logs/*

# Winston daily rotation should handle this
# If not, check LOG_PATH in .env

# Manual cleanup (be careful!)
find logs/ -name "*.log" -mtime +30 -delete
```

## Debugging Tips

### Enable Debug Logging

Uncomment in `configs/database.js`:
```javascript
log: [
  { emit: "stdout", level: "query" },
  { emit: "stdout", level: "error" }
]
```

### Check Application Logs

```bash
# PM2 logs
pm2 logs aps-dashboard

# Application logs
tail -f logs/server-errors/$(date +%Y-%m-%d).log
tail -f logs/user-errors/$(date +%Y-%m-%d).log

# Session logs
tail -f logs_info/erreurs_connexion/$(date +%Y-%m-%d).log
```

### Verify Environment

```bash
# Check Node version
node --version  # Should be 18.x+

# Check npm version
npm --version

# Check dependencies
npm list --depth=0
```

### Database Diagnostics

```sql
-- Check connections
SHOW PROCESSLIST;

-- Check table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = 'aps_dashboard'
ORDER BY (data_length + index_length) DESC;

-- Check slow queries
SHOW GLOBAL STATUS LIKE 'Slow_queries';
```

## Getting Help

If you can't resolve an issue:

1. **Check Documentation**:
   - [README.md](../README.md)
   - [Architecture](./architecture.md)
   - [Security](./security.md)

2. **Review Logs**:
   - Application logs
   - System logs
   - Database logs

3. **Check Configuration**:
   - `.env` file
   - Database connection
   - Redis connection

4. **Test Components**:
   - Database connectivity
   - Redis connectivity
   - Email sending

5. **Contact Support**:
   - Email: support@example.com
   - Include: Error messages, logs, steps to reproduce

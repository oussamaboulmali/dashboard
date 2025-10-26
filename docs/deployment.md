# Deployment Guide

## Production Deployment

### Prerequisites

- Ubuntu 20.04+ or CentOS 7+
- Node.js 18.x+
- MySQL 8.0+
- Redis 6.0+
- Apache 2.4+ or Nginx 1.18+
- SSL Certificate

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server

# Install PM2
sudo npm install -g pm2
```

### 2. Application Setup

```bash
# Clone repository
git clone <repo-url> /opt/aps-dashboard
cd /opt/aps-dashboard

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env  # Edit configuration

# Generate Prisma client
npx prisma generate

# Initialize database
npx prisma db push
```

### 3. PM2 Configuration

```bash
# Start application
pm2 start index.js --name aps-dashboard -i max

# Configure auto-start
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### 4. Apache Reverse Proxy

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

### 5. Security Hardening

```bash
# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Auto-updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 6. Monitoring

```bash
# View logs
pm2 logs aps-dashboard

# Application logs
tail -f logs/server-errors/*.log

# System resources
pm2 monit
htop
```

### 7. Backup Strategy

**Database Backup**:
```bash
# Daily backup script
0 2 * * * mysqldump -u root -p aps_dashboard > /backup/db-$(date +\%Y\%m\%d).sql
```

**Application Backup**:
```bash
# Backup uploads and logs
0 3 * * * tar -czf /backup/files-$(date +\%Y\%m\%d).tar.gz /opt/aps-dashboard/uploads /opt/aps-dashboard/logs
```

### 8. Updates

```bash
# Pull latest code
cd /opt/aps-dashboard
git pull origin main

# Install dependencies
npm install --production

# Restart application
pm2 restart aps-dashboard
```

## Docker Deployment (Alternative)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate

EXPOSE 5000
CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mysql
      - redis
  
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: aps_dashboard
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

volumes:
  mysql_data:
```

## Troubleshooting

See [troubleshooting.md](./troubleshooting.md) for common issues.

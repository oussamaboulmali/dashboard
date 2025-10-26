# Security Documentation

## Security Layers

### 1. Network Security
- Firewall rules
- IP whitelisting
- DDoS protection via rate limiting

### 2. Transport Security
- **TLS 1.2/1.3** required
- **HTTPS** enforcement in production
- **Secure cookies**: HttpOnly, Secure, SameSite

### 3. Authentication Security

**Password Security**:
- Bcrypt hashing with automatic salt generation
- Minimum 6 characters required
- No password in logs or responses

**Session Security**:
- Redis-backed sessions
- Configurable timeout (default: 12 hours)
- Automatic expiration
- HttpOnly cookies prevent XSS theft

**Failed Login Protection**:
- Maximum 5 attempts before auto-block
- Account blocked with code 210
- Email notification to admin
- Manual unblock required

### 4. Authorization

**Role-Based Access Control**:
- Hierarchical roles (Admin, User)
- Menu-based permissions
- Resource-level validation

**Service Restrictions**:
- Coopération service limited to APS agencies
- Enforced at business logic layer

### 5. Input Validation

**Joi Schema Validation**:
- All endpoints use Joi schemas
- Type checking and constraints
- Automatic error responses

**Security Validator**:
Detects and blocks:
- SQL Injection (`SELECT`, `UNION`, etc.)
- XSS (`<script>`, `javascript:`, etc.)
- Path Traversal (`../`, `/etc/`, etc.)
- Command Injection (`;`, `|`, backticks, etc.)
- Buffer Overflow (10KB max input)

**Email Alerts**: Sent on threat detection

### 6. Rate Limiting

**Configuration**:
- **Limit**: 10 requests per second per IP
- **Penalty**: 1-hour IP block
- **Notification**: Email alert on first violation per IP per 24h

**Implementation**:
```javascript
windowMs: 1000,        // 1 second
limit: 10,             // 10 requests
blockDuration: 3600000 // 1 hour
```

### 7. API Security

**API Key Validation**:
- Required on all endpoints
- Header: `x-api-key`
- Validated before processing

**CORS Policy**:
- Configurable allowed origins
- Credentials support
- Limited methods (POST, PUT)

**Security Headers (Helmet)**:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security

### 8. Data Security

**Sensitive Data**:
- Passwords: Bcrypt hashed
- Sessions: Encrypted in Redis
- Database: SSL connections recommended

**Audit Logging**:
- All user actions logged
- IP, user agent, timestamp recorded
- Categorized logs (users, agencies, auth)
- Daily rotation with retention

## Security Best Practices

### For Developers
1. Never commit `.env` files
2. Use parameterized queries (Prisma handles this)
3. Validate all user inputs
4. Log security events
5. Keep dependencies updated

### For Administrators
1. Use strong passwords
2. Regularly review logs
3. Monitor failed logins
4. Keep system updated
5. Enable firewall
6. Use SSL/TLS
7. Regular backups

### For Users
1. Use unique passwords
2. Log out after use
3. Don't share credentials
4. Report suspicious activity

## Security Incident Response

### Detected Threat
1. Request automatically blocked
2. Email alert sent to admin
3. IP address logged
4. Investigate logs

### Account Compromise
1. Block user account immediately
2. Force logout all sessions
3. Reset password
4. Review audit logs
5. Notify user

### Security Updates
1. Test in development
2. Schedule maintenance window
3. Update dependencies
4. Restart services
5. Verify functionality

## Security Checklist

**Before Production**:
- [ ] SSL/TLS configured
- [ ] Strong passwords set
- [ ] API key configured
- [ ] CORS origins limited
- [ ] Firewall enabled
- [ ] Fail2ban configured
- [ ] Backups automated
- [ ] Logs monitored
- [ ] Email alerts tested
- [ ] Rate limiting tested

**Monthly Tasks**:
- [ ] Review audit logs
- [ ] Check failed logins
- [ ] Update dependencies
- [ ] Verify backups
- [ ] Test restore process

**Quarterly Tasks**:
- [ ] Security audit
- [ ] Penetration testing
- [ ] Update documentation
- [ ] Review permissions

For more information, see [troubleshooting.md](./troubleshooting.md).

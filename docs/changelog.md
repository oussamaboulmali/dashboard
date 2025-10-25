# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-25

### Added
- Initial release of APS Dashboard
- User authentication with session management
- Role-based access control (RBAC)
- Agency management (CRUD operations)
- Article aggregation from multiple news agencies
- Advanced article search with date range filtering
- Global article search across all agencies
- Rate limiting (10 req/sec) with automatic IP blocking
- Security validation (SQL injection, XSS, path traversal, command injection)
- Comprehensive audit logging with Winston
- Daily log rotation
- Email notifications for security events
- Dashboard statistics (role-specific)
- Session management with Redis
- FortiGate proxy support with dynamic session configuration
- Multi-language support (Arabic, French, English)
- Image upload and processing for agency logos
- Failed login attempt tracking (auto-block after 5 attempts)
- User blocking with reason codes
- Service-based organization with access restrictions
- Menu-based permissions system
- Prisma ORM integration for type-safe database operations

### Security
- Bcrypt password hashing
- HttpOnly and Secure cookies
- API key validation on all endpoints
- CORS policy configuration
- Helmet security headers
- Input validation with Joi
- Security threat detection and alerting

### Documentation
- Comprehensive README with quick start guide
- Architecture documentation
- API reference documentation
- Security best practices
- Deployment guide
- Troubleshooting guide
- Database schema documentation
- Workflow and permissions documentation
- Contributing guidelines
- Code of conduct

## [Unreleased]

### Planned Features
- Two-factor authentication (2FA)
- Advanced analytics dashboard
- Article caching with Redis
- Export functionality (PDF, Excel)
- Notification system
- Advanced user activity reports
- API rate limit customization per user/role
- Webhook support for article updates
- Mobile app API enhancements

### Known Issues
- None reported

## Version History

- **1.0.0** (2025-10-25): Initial production release

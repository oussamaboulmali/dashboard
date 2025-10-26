# APS Dashboard - News Agency Management System

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5-brightgreen.svg)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-Latest-red.svg)](https://redis.io/)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Folder Structure](#folder-structure)
- [Security](#security)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

**APS Dashboard** is a comprehensive news agency management system designed for managing multiple international news agencies (AFP, ANSA, APS, AZERTAC, MAP, MENA, etc.). The system provides a centralized platform for article aggregation, user management, role-based access control, and real-time monitoring.

### Mission

To provide a secure, scalable, and efficient platform for news professionals to access, manage, and distribute content from multiple international news agencies with advanced role-based permissions and comprehensive audit logging.

## ✨ Key Features

### 🔐 Authentication & Security
- **Session-based authentication** with Redis store
- **Role-Based Access Control (RBAC)** with granular menu permissions
- **Multi-factor security validation** (SQL injection, XSS, CSRF protection)
- **Rate limiting** (10 requests/second) with automatic IP blocking
- **Failed login attempt tracking** (auto-block after 5 attempts)
- **Password security** with bcrypt hashing
- **API key validation** for all requests
- **Comprehensive security monitoring** with email alerts

### 👥 User Management
- **Multi-role system**: Admin, User, Service-based roles
- **Service-based organization**: Different services with specific agency access
- **User states**: Active, Deactivated, Blocked, Deleted
- **Agency assignment** with Coopération service restrictions
- **Profile management** with multi-language support (Arabic, French, English)
- **Bulk operations** for user-agency assignments
- **Account blocking** with reason codes (failed logins, ToS violations)

### 📰 News Agency Management
- **Multi-agency support**: Manage multiple international news sources
- **Agency states**: Active/Inactive with automatic user-agency cleanup
- **Logo upload** with image processing (max 1MB, JPG/PNG)
- **Bilingual support**: Agency names in English and Arabic
- **URL-friendly aliases** auto-generated from agency names
- **User-agency relationship management**

### 📄 Article Management
- **Real-time article aggregation** from multiple agencies
- **Advanced search capabilities**: Full-text search across title, slug, and content
- **Flexible filtering**: Single date or date range filtering
- **Pagination support** with customizable page sizes
- **Global search**: Search across all assigned agencies
- **Article refresh time**: Configurable per user
- **Article metadata**: Label, title, slug, full_text, filename, creation date

### 📊 Dashboard & Analytics
- **Role-specific dashboards**:
  - **Admin**: Comprehensive statistics (user counts, articles, connections)
  - **User**: Latest 20 articles from assigned agencies
- **Real-time metrics**: Connected users, article counts, agency statistics
- **Historical data**: 7-day article trends
- **Agency performance**: Articles per agency today

### 📝 Comprehensive Logging
- **Categorized logging**: User actions, errors, sessions, authentication
- **Daily log rotation** with Winston
- **Structured JSON logs** with metadata (IP, user agent, timestamp)
- **Log categories**:
  - User actions (creation, modification, deletion)
  - Authentication events (login, logout, failures)
  - Agency operations
  - Error tracking (user errors, server errors, database errors)
- **Log file management**: Browse and read logs via API

### 🔒 Session Management
- **Redis-based session storage** for scalability
- **Active session detection** during login
- **Force logout capability** for admins
- **Session expiration** with configurable timeout
- **Multi-device session handling**
- **FortiGate proxy support** with dynamic cookie configuration

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   Express    │────▶│   MySQL     │
│  (Browser)  │     │    Server    │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                      
                           ├─────▶ ┌─────────────┐
                           │       │    Redis    │
                           │       │   (Cache)   │
                           │       └─────────────┘
                           │
                           └─────▶ ┌─────────────┐
                                   │   Python    │
                                   │ IP Blocking │
                                   └─────────────┘
```

### Request Flow

```
Client Request
    │
    ▼
API Key Validation (validateClient)
    │
    ▼
Rate Limiting (10 req/sec)
    │
    ▼
Security Validation (SQL/XSS/Path Traversal)
    │
    ▼
Session Authentication (authenticate)
    │
    ▼
Role Authorization (restrict)
    │
    ▼
Controller → Service → Database
    │
    ▼
Response + Logging
```

### Database Architecture

The system uses **MySQL** with **Prisma ORM** for data management:

#### Core Tables
- `online2024_users`: User accounts and profiles
- `online2024_roles`: Role definitions
- `online2024_menu`: Menu/feature definitions
- `online2024_roles_menu`: Role-menu relationships (permissions)
- `online2024_service`: Service organizations
- `online2024_agencies`: News agencies
- `online2024_articles`: News articles
- `online2024_user_agency`: User-agency assignments
- `online2024_sessions`: Active user sessions
- `processedfiles`: Tracking of processed article files

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18.x with ES6 Modules
- **Framework**: Express.js 4.21
- **ORM**: Prisma 6.5
- **Database**: MySQL 8.0
- **Cache**: Redis (with connect-redis)
- **Authentication**: Session-based with bcryptjs

### Security & Middleware
- **Security**: Helmet, CORS, custom security validator
- **Rate Limiting**: express-rate-limit
- **Input Validation**: Joi
- **Image Processing**: Sharp
- **File Upload**: Multer

### Logging & Monitoring
- **Logging**: Winston with daily-rotate-file
- **HTTP Logging**: Morgan
- **Email Notifications**: Nodemailer

### Python Integration
- **IP Blocking**: Custom Python script for system-level IP blocking

## 📦 Prerequisites

Before installation, ensure you have:

- **Node.js**: v18.x or higher ([Download](https://nodejs.org/))
- **npm**: v9.x or higher (comes with Node.js)
- **MySQL**: v8.0 or higher ([Download](https://dev.mysql.com/downloads/))
- **Redis**: Latest version ([Download](https://redis.io/download))
- **Python**: v3.8+ (for IP blocking script)
- **Git**: For version control

### System Requirements
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: 10GB+ free space
- **OS**: Linux (Ubuntu 20.04+), Windows 10+, or macOS 10.15+

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd aps-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE aps_dashboard;
EXIT;

# Run Prisma migrations
npx prisma generate
npx prisma db push
```

### 4. Set Up Redis

```bash
# Linux/macOS
redis-server

# Windows (using Redis for Windows)
redis-server.exe
```

### 5. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# See Configuration section for all variables
NODE_ENV=development
PORT=5000
DATABASE_URL=mysql://user:password@localhost:3306/aps_dashboard
# ... (see Configuration section)
```

### 6. Start the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
PROJECT_NAME=APS Dashboard
PROJECT_ENV=production

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=aps_dashboard
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_URL=mysql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Session Configuration
SESSION_SECRET=your_super_secret_session_key_min_32_chars
SESSION_NAME=aps_dashboard_session
SESSION_TIME=720  # Session timeout in minutes (12 hours)

# Security Configuration
API_KEY=your_api_key_for_client_validation

# CORS Configuration (JSON array)
CORS_ORIGINS=["http://localhost:3000","http://your-frontend-domain.com"]

# Email Configuration (for alerts)
ADMIN_MAIL=admin@example.com
ADMIN_MAIL_PASSWORD=your_email_password
RECEPTION_MAIL=security@example.com

# File Storage Paths
ORIGINAL_IMAGE_PATH=/path/to/uploads/original
LOG_PATH=/path/to/logs
LOG_SYS=/path/to/system/logs  # Optional: Secondary log location
```

### Database Schema Configuration

The Prisma schema is located at `prisma/schema.prisma`. After any schema changes:

```bash
# Generate Prisma Client
npx prisma generate

# Apply changes to database
npx prisma db push

# View database in browser
npx prisma studio
```

## 📖 Usage

### Starting the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

### API Access

All API endpoints require:
1. **API Key**: Send `x-api-key` header
2. **Session Cookie**: After login (except login/register endpoints)

### Basic API Flow

```javascript
// 1. Login
POST /api/v1/auth/login
Body: { username: "admin", password: "password" }

// 2. Get Dashboard Stats
POST /api/v1/auth/stats
Headers: { "x-api-key": "your-api-key" }

// 3. Get Agencies
POST /api/v1/agencies/users/list
Headers: { "x-api-key": "your-api-key" }

// 4. Get Articles
POST /api/v1/agencies/articles
Body: { agencyId: 1, pageSize: 20, page: 1, date: "2025-10-25" }

// 5. Search Articles
POST /api/v1/agencies/articles/searchAll
Body: { 
  searchText: "politics", 
  pageSize: 20, 
  page: 1,
  date_start: "2025-10-01",
  date_finish: "2025-10-25"
}

// 6. Logout
POST /api/v1/auth/logout
```

## 📚 API Documentation

For complete API documentation, see [docs/api.md](./docs/api.md)

### Quick Reference

| Endpoint | Method | Description | Auth | Permission |
|----------|--------|-------------|------|------------|
| `/api/v1/auth/login` | POST | User login | No | Public |
| `/api/v1/auth/logout` | POST | User logout | Yes | - |
| `/api/v1/auth/stats` | POST | Dashboard statistics | Yes | - |
| `/api/v1/agencies` | POST | Get all agencies | Yes | - |
| `/api/v1/agencies/create` | POST | Create agency | Yes | Menu 3 |
| `/api/v1/agencies/articles` | POST | Get articles | Yes | Menu 2 |
| `/api/v1/agencies/articles/searchAll` | POST | Global search | Yes | Menu 2 |
| `/api/v1/users` | POST | Get all users | Yes | - |
| `/api/v1/users/create` | POST | Create user | Yes | Menu 5 |
| `/api/v1/logs/session` | POST | Get sessions | Yes | Menu 4 |

**Menu Permissions**:
- Menu 2: Articles Access
- Menu 3: Agency Management
- Menu 4: Logs Access
- Menu 5: User Management

## 📁 Folder Structure

```
aps-dashboard/
├── index.js                    # Application entry point
├── package.json                # Dependencies and scripts
├── .env                        # Environment configuration (not in git)
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── configs/
│   │   ├── cache.js           # Redis configuration
│   │   └── database.js        # Prisma client setup
│   ├── controllers/           # Request handlers
│   │   ├── agencyController.js
│   │   ├── authController.js
│   │   ├── logController.js
│   │   └── userController.js
│   ├── services/              # Business logic
│   │   ├── agencyService.js
│   │   ├── authService.js
│   │   ├── logService.js
│   │   └── userService.js
│   ├── middlewares/           # Express middleware
│   │   ├── authMiddleware.js       # Authentication & authorization
│   │   ├── errorMiddleware.js      # Error handling
│   │   ├── rateLimitMiddleware.js  # Rate limiting
│   │   └── securityMiddleware.js   # Security validation
│   ├── routes/                # Route definitions
│   │   ├── agency.js
│   │   ├── auth.js
│   │   ├── log.js
│   │   └── user.js
│   ├── validations/           # Input validation schemas
│   │   ├── agencyValidation.js
│   │   ├── authValidation.js
│   │   ├── logValidation.js
│   │   └── userValidation.js
│   ├── helpers/               # Helper functions
│   │   ├── authHelper.js      # Email sending
│   │   └── imageHelper.js     # Image processing
│   └── utils/                 # Utility functions
│       ├── blockMessage.js    # Block message definitions
│       ├── dbUrl.js          # Database URL builder
│       ├── logger.js         # Winston logging setup
│       └── tryCatch.js       # Async error wrapper
├── codec_agences/             # Agency-specific parsers
│   ├── fetch_and_parse_articles_AFP.py
│   ├── fetch_and_parse_articles_ANSA.py
│   ├── fetch_and_parse_articles_APS_CHINE.py
│   └── ...
├── docs/                      # Documentation
│   ├── api.md
│   ├── architecture.md
│   ├── deployment.md
│   ├── security.md
│   └── ...
└── logs/                      # Log files (auto-generated)
    ├── user-errors/
    ├── server-errors/
    ├── db-errors/
    └── logs_info/
```

## 🔒 Security

This application implements multiple layers of security:

### Authentication & Authorization
- Session-based authentication with Redis
- Role-based access control (RBAC)
- Menu-based permissions
- API key validation on all requests

### Input Validation
- Joi schema validation
- SQL injection prevention
- XSS attack prevention
- Path traversal protection
- Command injection prevention

### Rate Limiting & DDoS Protection
- 10 requests per second per IP
- Automatic IP blocking for 1 hour on violations
- Email alerts for security events

### Password Security
- Bcrypt hashing with salt
- Failed login attempt tracking (max 5)
- Automatic account blocking

### Session Security
- HttpOnly cookies
- Secure cookies in production
- SameSite cookie policy
- Dynamic configuration for proxy support
- Session expiration

For detailed security documentation, see [docs/security.md](./docs/security.md)

## 🚀 Deployment

### Production Deployment Guide

See [docs/deployment.md](./docs/deployment.md) for comprehensive deployment instructions including:

- Apache/Nginx reverse proxy setup
- SSL/TLS configuration
- PM2 process management
- Docker deployment
- Environment hardening
- Backup strategies

### Quick PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start index.js --name aps-dashboard

# Auto-restart on system reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs aps-dashboard
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- Follow ESLint configuration
- Write JSDoc comments for all functions
- Maintain test coverage above 80%
- Follow the commit message guidelines in [docs/commits.md](./docs/commits.md)

## 📝 License

ISC License - See LICENSE file for details

## 📞 Support

For issues, questions, or contributions:

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@example.com
- **Documentation**: [docs/](./docs/)

## 🙏 Acknowledgments

- News agencies: AFP, ANSA, APS, AZERTAC, MAP, MENA
- Open source community
- All contributors

---

**Made with ❤️ by the APS Development Team**

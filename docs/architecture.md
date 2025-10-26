# System Architecture

This document provides a comprehensive overview of the APS Dashboard system architecture, including microservices, database design, caching strategy, and infrastructure components.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Application Layers](#application-layers)
- [Database Architecture](#database-architecture)
- [Caching Strategy](#caching-strategy)
- [Security Architecture](#security-architecture)
- [Integration Points](#integration-points)
- [Scalability Considerations](#scalability-considerations)

## Architecture Overview

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │  Browser   │  │   Mobile   │  │  Desktop   │             │
│  │   (Web)    │  │    App     │  │    App     │             │
│  └────────────┘  └────────────┘  └────────────┘             │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS (API Key + Session)
┌───────────────────────▼──────────────────────────────────────┐
│                   Reverse Proxy Layer                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Apache / Nginx                                       │    │
│  │  - SSL/TLS Termination                               │    │
│  │  - Load Balancing                                     │    │
│  │  - Static File Serving                                │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP
┌───────────────────────▼──────────────────────────────────────┐
│                  Application Layer (Node.js)                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Express.js Server                                    │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │    │
│  │  │Middleware  │  │Controllers │  │  Services  │    │    │
│  │  │  Stack     │  │   Layer    │  │   Layer    │    │    │
│  │  └────────────┘  └────────────┘  └────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────┬────────────────┬──────────────────┬───────────────────┘
       │                │                  │
       ▼                ▼                  ▼
┌──────────┐    ┌──────────────┐   ┌─────────────┐
│  MySQL   │    │    Redis     │   │   Python    │
│ Database │    │ Cache/Session│   │  Parsers    │
└──────────┘    └──────────────┘   └─────────────┘
       │                                   │
       │                                   │
       ▼                                   ▼
┌──────────────┐              ┌─────────────────────┐
│  Prisma ORM  │              │  News Agency APIs   │
│              │              │  - AFP              │
│              │              │  - ANSA             │
│              │              │  - APS              │
│              │              │  - AZERTAC          │
│              │              │  - MAP              │
│              │              │  - MENA             │
└──────────────┘              └─────────────────────┘
```

### System Components

1. **Client Layer**: Web browsers, mobile apps, desktop applications
2. **Reverse Proxy**: Apache/Nginx for SSL, load balancing, and security
3. **Application Layer**: Node.js/Express API server
4. **Data Layer**: MySQL database, Redis cache
5. **Integration Layer**: Python parsers for news agency feeds

## Application Layers

### 1. Presentation Layer (Routes)

**Location**: `src/routes/`

```
Routes
  ├── auth.js        → Authentication endpoints
  ├── user.js        → User management endpoints
  ├── agency.js      → Agency & article endpoints
  └── log.js         → Logging & monitoring endpoints
```

**Responsibilities:**
- Route definition and mapping
- HTTP method specification
- Middleware attachment
- File upload handling (Multer)

### 2. Middleware Layer

**Location**: `src/middlewares/`

```
Middleware Stack
  │
  1. Compression                    ← Response compression
  │
  2. Trust Proxy                    ← Proxy header handling
  │
  3. Dynamic Session Config         ← FortiGate/normal routing
  │
  4. CORS                          ← Cross-origin policy
  │
  5. Helmet                        ← Security headers
  │
  6. API Key Validation            ← validateClient
  │
  7. Rate Limiting                 ← 10 req/sec
  │
  8. Morgan (HTTP Logging)         ← Request logging
  │
  9. Body Parsers                  ← JSON/URL-encoded
  │
  10. Route-specific middleware
      ├─ authenticate              ← Session validation
      ├─ restrict(menuId)          ← Permission checking
      └─ securityValidator         ← Input sanitization
  │
  11. Error Handler                ← Centralized error handling
```

### 3. Controller Layer

**Location**: `src/controllers/`

**Responsibilities:**
- Request validation (Joi schemas)
- Input sanitization
- Service layer orchestration
- Response formatting
- Logging user actions
- Error handling with tryCatch wrapper

**Pattern:**
```javascript
export const ControllerFunction = tryCatch(async (req, res) => {
    // 1. Validate input
    const { error } = schema.validate(req.body);
    if (error) throw new ErrorHandler(400, error.message);
    
    // 2. Call service layer
    const data = await service({...req.body, userId: req.session.userId});
    
    // 3. Log action
    logger.info({...logData, message: 'Action completed'});
    
    // 4. Return response
    return res.status(200).json({ success: true, data });
});
```

### 4. Service Layer (Business Logic)

**Location**: `src/services/`

**Responsibilities:**
- Business logic implementation
- Data validation and transformation
- Database operations via Prisma
- Complex queries and aggregations
- Cache operations
- Email notifications
- External integrations

**Pattern:**
```javascript
export const serviceName = async (data, logData) => {
    // 1. Validate business rules
    const entity = await prisma.table.findUnique({...});
    if (!entity) throw new ErrorHandler(404, 'Not found');
    
    // 2. Perform business operations
    const result = await prisma.table.create({...});
    
    // 3. Log if needed
    logger.info({...logData, message: 'Operation completed'});
    
    // 4. Return data
    return result;
};
```

### 5. Data Access Layer (Prisma ORM)

**Location**: `src/configs/database.js`

**Responsibilities:**
- Database connection management
- Query generation
- Transaction handling
- Type-safe database operations

## Database Architecture

### Entity Relationship Diagram

```
┌────────────────────┐
│  online2024_roles  │
│  ─────────────────│
│  PK id_role       │
│     name          │
└─────────┬──────────┘
          │ 1
          │
          │ N
┌─────────▼──────────────┐      N   ┌─────────────────────┐
│online2024_roles_menu   │◄─────────┤  online2024_menu    │
│  ──────────────────    │          │  ─────────────────  │
│  PK id_role, id_menu   │          │  PK id_menu         │
└────────────────────────┘          │     name            │
                                    └─────────────────────┘

┌────────────────────┐      1
│ online2024_service │
│  ────────────────  │
│  PK id_service     │
│  FK id_role        │
│     name           │
└─────────┬──────────┘
          │ 1
          │
          │ N
┌─────────▼─────────────────┐
│  online2024_users         │
│  ─────────────────────    │
│  PK id_user               │
│  FK id_role               │
│  FK id_service            │
│     username              │
│     password              │
│     state                 │
│     login_attempts        │
│     ... (profile fields)  │
└────┬──────────────────┬───┘
     │ 1                │ 1
     │                  │
     │ N                │ N
     │            ┌─────▼─────────────────────┐
     │            │ online2024_user_agency    │
     │            │  ───────────────────────  │
     │            │  PK id_user, id_agency    │
     │            │  FK id_user               │
     │            │  FK id_agency             │
     │            │     assigned_by           │
     │            │     assigned_date         │
     │            └──────────┬────────────────┘
     │                       │ N
     │                       │
     │                       │ 1
     │            ┌──────────▼────────────────┐
     │            │  online2024_agencies      │
     │            │  ───────────────────────  │
     │            │  PK id_agency             │
     │            │     name                  │
     │            │     name_ar               │
     │            │     alias                 │
     │            │     url                   │
     │            │     state                 │
     │            └──────────┬────────────────┘
     │                       │ 1
     │                       │
     │ N                     │ N
┌────▼───────────────────┐  │
│online2024_sessions     │  │
│  ────────────────────  │  │
│  PK id_session         │  │
│  FK id_user            │  │
│     adresse_ip         │  │
│     is_active          │  │
│     login_date         │  │
│     logout_date        │  │
└────────────────────────┘  │
                            │
                  ┌─────────▼──────────────┐
                  │ online2024_articles    │
                  │  ────────────────────  │
                  │  PK id_article         │
                  │  FK id_agency          │
                  │     label              │
                  │     title              │
                  │     slug               │
                  │     full_text          │
                  │     file_name          │
                  │     created_date       │
                  └────────────────────────┘
```

### Database Indexes

Optimized indexes for common queries:

```sql
-- User lookups
CREATE INDEX idx_username ON online2024_users(username);
CREATE INDEX idx_user_state ON online2024_users(state);

-- Agency lookups
CREATE INDEX idx_state ON online2024_agencies(state);

-- Article queries
CREATE INDEX idx_agency_date ON online2024_articles(id_agency, created_date);
CREATE INDEX idx_created_date ON online2024_articles(created_date);

-- Session queries
CREATE INDEX idx_active_sessions ON online2024_sessions(id_user, is_active);

-- User-agency relationships
CREATE INDEX idx_user_agency ON online2024_user_agency(id_user, id_agency);
```

### Database Considerations

**Master-Replica Architecture** (Recommended for Production):

```
┌──────────────┐
│   Master DB  │  ← Writes (CREATE, UPDATE, DELETE)
│   (Primary)  │
└──────┬───────┘
       │
       │ Replication
       │
       ▼
┌──────────────┐
│  Replica DB  │  ← Reads (SELECT queries)
│  (Read-only) │
└──────────────┘
```

**Benefits:**
- **Load Distribution**: Separate read/write operations
- **High Availability**: Failover to replica if master fails
- **Backup Strategy**: Take backups from replica without affecting master

**Prisma Configuration for Replica**:
```javascript
// Read replica for heavy SELECT queries
const readPrisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_REPLICA_URL
        }
    }
});
```

## Caching Strategy

### Redis Architecture

```
┌──────────────────────┐
│   Redis Instance     │
│                      │
│  ┌────────────────┐  │
│  │ Session Store  │  │  ← Express sessions
│  │ Prefix:        │  │
│  │ "onlineapp:"   │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ Article Cache  │  │  ← Future: Article caching
│  │ (Optional)     │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ Rate Limit     │  │  ← Rate limit counters
│  │ Tracking       │  │
│  └────────────────┘  │
└──────────────────────┘
```

### Session Storage

**Structure**:
```
Key: "onlineapp:sess:{sessionId}"
Value: {
    sessionId: 12345,
    username: "john_doe",
    userId: 42,
    cookie: { ... },
    createdAt: "2025-10-25T10:00:00Z"
}
TTL: SESSION_TIME (configurable, default 12 hours)
```

### Cache Invalidation Strategy

**Session Cache:**
- **TTL**: Automatically expires after SESSION_TIME
- **Manual**: Cleared on logout
- **Force Clear**: Admin can clear any session

**Future: Article Cache:**
```javascript
// Potential implementation
const cacheKey = `agency:${agencyId}:${date}`;
await redis.set(cacheKey, JSON.stringify(articles), 'EX', 300); // 5 min TTL
```

## Security Architecture

### Defense in Depth

```
Layer 1: Network Security
  ├─ Firewall rules
  ├─ IP whitelisting
  └─ DDoS protection

Layer 2: Transport Security
  ├─ TLS 1.2/1.3
  ├─ HTTPS enforcement
  └─ Secure cookies

Layer 3: Application Security
  ├─ API key validation
  ├─ Rate limiting (10 req/sec)
  ├─ IP blocking (1 hour)
  └─ Security headers (Helmet)

Layer 4: Authentication
  ├─ Session-based auth
  ├─ Bcrypt password hashing
  ├─ Failed login tracking
  └─ Automatic blocking (5 attempts)

Layer 5: Authorization
  ├─ Role-based access control
  ├─ Menu-based permissions
  └─ Resource-level checks

Layer 6: Input Validation
  ├─ Joi schema validation
  ├─ SQL injection prevention
  ├─ XSS prevention
  ├─ Path traversal prevention
  └─ Command injection prevention

Layer 7: Data Security
  ├─ Encrypted database connections
  ├─ Sensitive data encryption
  └─ Secure session storage

Layer 8: Monitoring & Logging
  ├─ Comprehensive audit logs
  ├─ Security event alerts
  ├─ Real-time monitoring
  └─ Anomaly detection
```

### Security Validation Pipeline

```javascript
Request → API Key → Rate Limit → Security Scan → Session → Permission → Controller
           ↓          ↓             ↓              ↓         ↓             ↓
         Valid?    Under limit?   No threats?   Active?  Has access?   Process
           │           │              │            │         │            │
           NO          NO             NO           NO        NO           │
           ↓           ↓              ↓            ↓         ↓            │
         401         429            403          403       403           │
                                      │                                  │
                                      └──────► Email Alert               │
                                                                         │
                                                                    Response
```

## Integration Points

### Python News Parsers

**Architecture:**
```
Python Parsers (Separate Process)
  ├─ fetch_and_parse_articles_AFP.py
  ├─ fetch_and_parse_articles_ANSA.py
  ├─ fetch_and_parse_articles_APS_CHINE.py
  └─ ... (one per agency)
      │
      ▼
  Parse & Normalize
      │
      ▼
  Database Insert (MySQL)
      │
      ▼
  Track in processedfiles
      │
      ▼
  Available to Node.js API
```

**Communication:**
- **Database**: Shared MySQL database
- **File Tracking**: `processedfiles` table prevents duplicates
- **No Direct API**: Parsers write directly to database

### Email Service Integration

**Use Cases:**
- Account blocking notifications
- Rate limit violation alerts
- Security threat notifications
- System error alerts

**Configuration:**
```javascript
transporter: {
    host: "mail.aps.dz",
    port: 25,
    auth: {
        user: process.env.ADMIN_MAIL,
        pass: process.env.ADMIN_MAIL_PASSWORD
    }
}
```

### External Agency APIs

Handled by Python parsers:
- **AFP**: Agence France-Presse
- **ANSA**: Agenzia Nazionale Stampa Associata
- **APS**: Algérie Presse Service
- **AZERTAC**: Azerbaijan State News Agency
- **MAP**: Maghreb Arabe Presse
- **MENA**: Middle East News Agency

## Scalability Considerations

### Horizontal Scaling

```
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Node.js  │  │  Node.js  │  │  Node.js  │
│ Instance1 │  │ Instance2 │  │ Instance3 │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │
      └──────────────┴──────────────┘
                     │
              ┌──────▼──────┐
              │ Load        │
              │ Balancer    │
              └─────────────┘
```

**Strategy:**
- Multiple Node.js instances behind load balancer
- Shared Redis for session consistency
- Shared MySQL database (with read replicas)

### Database Scaling

**Current State:**
- Single MySQL instance
- Prisma ORM for queries
- Indexed for common operations

**Future Scaling Options:**
1. **Read Replicas**: Distribute read load
2. **Connection Pooling**: Prisma built-in pooling
3. **Query Optimization**: Monitor slow queries
4. **Partitioning**: Partition articles by date

### Redis Scaling

**Current State:**
- Single Redis instance
- Session storage only

**Future Scaling Options:**
1. **Redis Cluster**: Distribute data
2. **Redis Sentinel**: High availability
3. **Separate Instances**: Sessions vs Cache

### Application Optimization

**Current Optimizations:**
- Compression middleware (gzip)
- Pagination on all list endpoints
- Selective field projection in queries
- Daily log rotation to prevent disk fill

**Future Optimizations:**
- Article caching in Redis
- Background job processing (Bull/Bee-Queue)
- CDN for static assets
- Database query result caching

## Deployment Architecture

### Single Server Setup

```
┌────────────────────────────────────────┐
│         Production Server               │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Apache/Nginx (Port 80/443)      │  │
│  │  - SSL Termination               │  │
│  │  - Reverse Proxy to Node.js      │  │
│  └──────────┬───────────────────────┘  │
│             │                           │
│  ┌──────────▼───────────────────────┐  │
│  │  Node.js (PM2, Port 5000)        │  │
│  │  - Multiple instances            │  │
│  │  - Auto-restart on crash         │  │
│  └──────────┬───────────────────────┘  │
│             │                           │
│  ┌──────────▼───────────────────────┐  │
│  │  MySQL (Port 3306)               │  │
│  │  - Local instance                │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Redis (Port 6379)               │  │
│  │  - Local instance                │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Multi-Server Setup (Recommended for Production)

```
┌─────────────┐      ┌─────────────┐
│   Web       │      │   Web       │
│ Server 1    │      │ Server 2    │
│ (Node.js)   │      │ (Node.js)   │
└──────┬──────┘      └──────┬──────┘
       │                    │
       └──────────┬─────────┘
                  │
          ┌───────▼───────┐
          │ Load Balancer │
          └───────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
┌──────▼──────┐       ┌──────▼──────┐
│   MySQL     │       │    Redis    │
│   Master    │       │  Cluster    │
│      +      │       │             │
│  Replicas   │       │             │
└─────────────┘       └─────────────┘
```

---

For more information:
- [Security Documentation](./security.md)
- [Deployment Guide](./deployment.md)
- [Database Schema](./database-schema.md)

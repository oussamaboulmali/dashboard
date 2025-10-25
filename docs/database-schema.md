# Database Schema Documentation

## Overview

The system uses MySQL 8.0+ with Prisma ORM for type-safe database operations.

## Core Tables

### online2024_users
**Purpose**: Store user accounts and profiles

**Key Fields**:
- `id_user` (PK): Auto-increment user ID
- `username` (Unique): Login username
- `password`: Bcrypt hashed password
- `state`: 0=Deactivated, 1=Active, 2=Blocked, 3=Deleted
- `login_attempts`: Failed login counter
- `id_role` (FK): User role
- `id_service` (FK): User service/department
- `lang`: Language preference (1=Arabic, 2=French, 3=English)

### online2024_agencies
**Purpose**: News agency definitions

**Key Fields**:
- `id_agency` (PK): Auto-increment agency ID
- `name` (Unique): Agency name (English)
- `name_ar`: Agency name (Arabic)
- `alias`: URL-friendly name
- `url`: Logo file path
- `state`: Active/Inactive boolean

### online2024_articles
**Purpose**: News articles from agencies

**Key Fields**:
- `id_article` (PK, BigInt): Auto-increment article ID
- `id_agency` (FK): Source agency
- `title`: Article headline
- `slug`: Short description
- `full_text` (LongText): Complete article
- `created_date` (Indexed): Publication timestamp

### online2024_user_agency
**Purpose**: User-agency access mapping

**Composite PK**: `(id_user, id_agency)`

### online2024_sessions
**Purpose**: Active user sessions

**Key Fields**:
- `id_session` (PK, BigInt): Session ID
- `id_user` (FK): User reference
- `is_active`: Boolean session status
- `login_date`: Session start time

## Relationships

```
users → sessions (1:N)
users → user_agency (1:N)
agencies → user_agency (1:N)
agencies → articles (1:N)
roles → users (1:N)
roles → roles_menu (1:N)
service → users (1:N)
```

## Indexes

Critical indexes for performance:
- `idx_state`: users.state
- `idx_agency_date`: articles(id_agency, created_date)
- `idx_user_agency`: user_agency(id_user, id_agency)

## Migrations

Managed by Prisma:
```bash
npx prisma generate  # Generate client
npx prisma db push   # Apply schema changes
```

For full schema, see `prisma/schema.prisma`.

# API Documentation

Complete API reference for the APS Dashboard system.

## Base URL

```
Production: https://your-domain.com/api/v1
Development: http://localhost:5000/api/v1
```

## Authentication

All endpoints (except login) require:
1. **API Key**: Header `x-api-key: your-api-key`
2. **Session Cookie**: Automatically sent after login

### Login

**Endpoint**: `POST /auth/login`
**Access**: Public
**Request**:
```json
{
  "username": "admin",
  "password": "password123"
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "hasSession": false,
  "data": {
    "userId": 1,
    "sessionId": 12345,
    "username": "admin",
    "designation": "System Administrator",
    "lang": 2
  }
}
```

## Agencies

### List All Agencies
**POST** `/agencies`
- Permission: Authenticated

### Create Agency
**POST** `/agencies/create`
- Permission: Menu 3
- Body: `multipart/form-data` with `logo` file

### Get Articles
**POST** `/agencies/articles`
- Permission: Menu 2
- Body: `{ agencyId, pageSize, page, date }`

### Search Articles
**POST** `/agencies/articles/searchAll`
- Permission: Menu 2
- Body: `{ searchText, pageSize, page, date_start, date_finish }`

## Users

### List Users
**POST** `/users`
- Permission: Authenticated

### Create User
**POST** `/users/create`
- Permission: Menu 5
- Body: User details + agencies array

### Update User
**PUT** `/users/update`
- Permission: Menu 5

### Block User
**PUT** `/users/block`
- Permission: Authenticated
- Body: `{ userId, blockCode }`

## Logs

### Get Sessions
**POST** `/logs/session`
- Permission: Menu 4
- Body: `{ date }`

### Get Log Files
**POST** `/logs`
- Permission: Menu 4

For complete endpoint details, see the JSDoc comments in controller files.

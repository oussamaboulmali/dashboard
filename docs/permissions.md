# Permissions & Access Control

## RBAC Model

The system uses Role-Based Access Control with menu permissions.

### Roles

- **Role 1**: Administrator (Full Access)
- **Role 2**: Regular User (Articles Only)

### Menu Permissions

| Menu ID | Name | Description | Accessible By |
|---------|------|-------------|---------------|
| 2 | Articles | View and search articles | Role 1, 2 |
| 3 | Agencies | Manage agencies | Role 1 |
| 4 | Logs | View system logs | Role 1 |
| 5 | Users | Manage users | Role 1 |

### Service Restrictions

**Coopération Service**:
- Can only access APS agencies (ID 1 & 2)
- Cannot be assigned international agencies

### Access Matrix

```
Resource          | Admin | User  | Coopération
------------------|-------|-------|-------------
View Articles     |  ✓    |  ✓    |  ✓ (APS only)
Search Articles   |  ✓    |  ✓    |  ✓ (APS only)
Create Agency     |  ✓    |  ✗    |  ✗
Manage Users      |  ✓    |  ✗    |  ✗
View Logs         |  ✓    |  ✗    |  ✗
System Stats      |  ✓    |  ✓*   |  ✓*
```

\* Limited statistics based on role

For more details, see source code authorization checks.

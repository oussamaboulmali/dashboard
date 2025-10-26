# Contributing to APS Dashboard

Thank you for your interest in contributing to APS Dashboard! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aps-dashboard.git
cd aps-dashboard

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/aps-dashboard.git
```

### Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your local configuration
nano .env

# Set up database
npx prisma generate
npx prisma db push

# Start Redis
redis-server

# Run in development mode
npm run dev
```

### Create a Branch

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

## Development Workflow

### 1. Make Changes

- Write clean, readable code
- Follow existing code style
- Add JSDoc comments for new functions
- Update relevant documentation

### 2. Test Your Changes

```bash
# Run the application
npm run dev

# Test endpoints with curl or Postman
# Verify no errors in console
# Check logs for issues
```

### 3. Commit Changes

Follow [Commit Guidelines](./docs/commits.md):

```bash
git add .
git commit -m "feat(scope): brief description"
```

### 4. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Fill out the PR template
- Wait for review

## Coding Standards

### JavaScript Style

- **ES6+ Modules**: Use `import/export`
- **Async/Await**: Prefer over callbacks
- **Arrow Functions**: Use where appropriate
- **Const/Let**: No `var`
- **Template Literals**: For string interpolation

### JSDoc Comments

All functions must have JSDoc comments:

```javascript
/**
 * Brief description of function
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 * @throws {ErrorType} When error occurs
 */
export const functionName = async (paramName) => {
  // Implementation
};
```

### Error Handling

Use the `ErrorHandler` class:

```javascript
throw new ErrorHandler(statusCode, message, hasSession, logout, inputError);
```

Wrap controllers with `tryCatch`:

```javascript
export const MyController = tryCatch(async (req, res) => {
  // Your code
});
```

### File Organization

```
src/
├── controllers/    # Request handlers
├── services/       # Business logic
├── middlewares/    # Express middleware
├── routes/         # Route definitions
├── validations/    # Joi schemas
├── helpers/        # Helper functions
├── utils/          # Utility functions
└── configs/        # Configuration files
```

### Naming Conventions

- **Files**: camelCase (e.g., `userService.js`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Classes**: PascalCase (e.g., `ErrorHandler`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ATTEMPTS`)
- **Database Tables**: snake_case (e.g., `online2024_users`)

### Security Practices

- **Never** commit sensitive data (`.env` files, passwords, keys)
- **Always** validate user input
- **Always** use parameterized queries (Prisma handles this)
- **Always** hash passwords with bcrypt
- **Always** sanitize file uploads
- **Always** log security events

## Commit Guidelines

See [docs/commits.md](./docs/commits.md) for detailed guidelines.

**Quick Reference**:
```
feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting
refactor: Code restructuring
test: Tests
chore: Maintenance
```

## Pull Request Process

### Before Submitting

- [ ] Code follows project style
- [ ] All tests pass
- [ ] JSDoc comments added/updated
- [ ] Documentation updated if needed
- [ ] No console.log statements (use logger)
- [ ] No commented-out code
- [ ] Commit messages follow guidelines

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)

## Related Issues
Closes #issue_number
```

### Review Process

1. **Automated Checks**: Code must pass all checks
2. **Peer Review**: At least one approval required
3. **Feedback**: Address all review comments
4. **Approval**: Maintainer approves and merges

### After Merge

```bash
# Update your local repository
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

## Reporting Bugs

### Before Reporting

1. **Check existing issues**: Search for similar bugs
2. **Try latest version**: Update to latest code
3. **Read documentation**: Check if it's expected behavior

### Bug Report Template

```markdown
**Describe the Bug**
Clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g., Ubuntu 20.04]
- Node.js: [e.g., 18.17.0]
- Browser: [e.g., Chrome 115]

**Additional Context**
Any other relevant information.

**Logs**
Relevant log excerpts (if applicable).
```

## Suggesting Features

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature.

**Use Case**
Who would benefit and how?

**Proposed Solution**
How should this work?

**Alternatives Considered**
Other approaches you've thought about.

**Additional Context**
Any other relevant information.
```

## Development Guidelines

### Adding New Endpoints

1. **Define Route** (`src/routes/`)
2. **Create Validation** (`src/validations/`)
3. **Write Controller** (`src/controllers/`)
4. **Implement Service** (`src/services/`)
5. **Update Documentation**
6. **Test Thoroughly**

### Modifying Database Schema

1. Update `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push`
4. Update relevant services
5. Document changes in `docs/database-schema.md`

### Adding Dependencies

```bash
# Install dependency
npm install package-name

# Update package-lock.json
npm install

# Commit both package.json and package-lock.json
```

Document why the dependency was added in the commit message.

## Questions?

- **Documentation**: Check [docs/](./docs/) folder
- **Issues**: Create a GitHub issue
- **Email**: support@example.com

Thank you for contributing! 🎉

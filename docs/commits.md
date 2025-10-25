# Commit Message Guidelines

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring (no feature change)
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, tooling
- **ci**: CI/CD configuration changes
- **revert**: Revert a previous commit

### Scope

Optional. Examples:
- `auth`: Authentication/authorization
- `user`: User management
- `agency`: Agency management
- `article`: Article operations
- `security`: Security features
- `api`: API endpoints
- `db`: Database changes

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Max 50 characters

### Body

- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Footer

- Reference issues: `Closes #123`
- Breaking changes: `BREAKING CHANGE: description`

## Examples

### Feature
```
feat(auth): add two-factor authentication

Implement TOTP-based 2FA for enhanced security.
Users can enable 2FA in their profile settings.

Closes #45
```

### Bug Fix
```
fix(article): correct pagination offset calculation

The offset was incorrectly calculated for pages > 1,
causing articles to be skipped. Now uses proper
(page - 1) * pageSize formula.

Fixes #67
```

### Documentation
```
docs: add API authentication examples

Add comprehensive examples for API key and session
authentication in the API documentation.
```

### Breaking Change
```
feat(api): change article response format

BREAKING CHANGE: Article API now returns created_date
as ISO string instead of timestamp. Update client code
to parse ISO date strings.

Closes #89
```

### Multiple Changes
```
chore: update dependencies

- Update express to 4.21.2
- Update prisma to 6.5.0
- Update winston to 3.17.0

All tests passing after updates.
```

## Best Practices

1. **Atomic Commits**: One logical change per commit
2. **Descriptive**: Clearly explain what changed and why
3. **Reference Issues**: Link to issue tracker
4. **Test Before Commit**: Ensure code works
5. **No WIP Commits**: Finish work before committing

## Bad Examples ❌

```
fix stuff
updated files
changes
WIP
.
commit
```

## Good Examples ✅

```
feat(user): add user profile picture upload
fix(security): prevent XSS in article search
docs(api): update authentication section
refactor(service): extract common validation logic
test(auth): add unit tests for login flow
```

## Git Workflow

1. **Branch Naming**:
   - `feature/add-2fa`
   - `fix/article-pagination`
   - `docs/update-readme`

2. **Commit Often**: Small, logical commits

3. **Pull Before Push**: Always pull latest changes

4. **Review Before Push**: Check diff one more time

5. **Write Good Messages**: Future you will thank you

## Tools

### Commitizen (Recommended)

```bash
npm install -g commitizen
npm install -g cz-conventional-changelog

# Configure
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc

# Use
git cz
```

### Commitlint

```bash
npm install --save-dev @commitlint/{cli,config-conventional}

# Create config
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# Hook
npm install --save-dev husky
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

For more information, see [CONTRIBUTING.md](../CONTRIBUTING.md).

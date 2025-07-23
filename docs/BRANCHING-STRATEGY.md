# Git Branching Strategy

## Overview

This document outlines the Git branching strategy for the Retro AI project. We follow a three-branch workflow designed to support continuous development, staged releases, and stable production deployments.

## Branch Structure

### 1. **develop** (Default Branch)
- **Purpose**: Active development branch where all feature work is integrated
- **Protection**: Protected branch with required PR reviews
- **CI/CD**: Runs tests and linting on every push and PR

### 2. **staging**
- **Purpose**: Pre-release testing and alpha/beta releases
- **Protection**: Protected branch, only accepts PRs from develop
- **CI/CD**: Automatically creates alpha releases with tags
- **Versioning**: `MAJOR.MINOR.PATCH-alpha.BUILD+COMMIT`

### 3. **main**
- **Purpose**: Production-ready code
- **Protection**: Highly protected, only accepts PRs from staging
- **CI/CD**: Automatically creates production releases
- **Versioning**: `MAJOR.MINOR.PATCH`

## Workflow Diagram

```
feature/issue-XX ──┐
                   ├──> develop ──> staging ──> main
feature/issue-YY ──┘
```

## Development Flow

### 1. Creating a New Feature

```bash
# Always start from develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/issue-XX-description

# Work on the feature
# ... make changes ...

# Commit and push
git add .
git commit -m "Implement feature (#XX)"
git push -u origin feature/issue-XX-description
```

### 2. Creating a Bug Fix

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create fix branch
git checkout -b fix/issue-XX-description

# Fix the bug
# ... make changes ...

# Commit and push
git add .
git commit -m "Fix bug description (#XX)"
git push -u origin fix/issue-XX-description
```

### 3. Pull Request Process

1. Create PR from feature/fix branch to `develop`
2. Ensure CI passes (tests, linting)
3. Get code review approval
4. Merge using "Squash and merge" strategy
5. Delete feature branch after merge

## Release Process

### Alpha Releases (Staging)

1. Create PR from `develop` to `staging`
2. Review changes and test thoroughly
3. Merge PR
4. GitHub Actions automatically (on self-hosted runners):
   - Runs tests and builds
   - Creates versioned tag: `v0.1.0-alpha.202507230930+a7c3e09`
   - Creates GitHub pre-release

### Production Releases (Main)

1. Ensure staging has been thoroughly tested
2. Update version in package.json if needed:
   ```bash
   npm run prepare-release [patch|minor|major]
   ```
3. Create PR from `staging` to `main`
4. Review and approve
5. Merge PR
6. GitHub Actions automatically (on self-hosted runners):
   - Runs final tests and builds
   - Creates versioned tag: `v0.1.0`
   - Creates GitHub release with changelog

### Manual Workflow Triggers

You can manually trigger workflows with different runner types:

```bash
# Use GitHub-hosted runners (fallback)
gh workflow run "Alpha Release" --field runner_type=ubuntu-latest

# Use self-hosted runners (default)
gh workflow run "Alpha Release" --field runner_type=self-hosted
```

## Versioning Convention

### Alpha/Beta Releases
Format: `MAJOR.MINOR.PATCH-alpha.BUILD+COMMIT`

Example: `0.1.0-alpha.202507230930+a7c3e09`

- **MAJOR**: Breaking changes (0 during pre-1.0)
- **MINOR**: New features
- **PATCH**: Bug fixes
- **alpha**: Pre-release identifier
- **BUILD**: Timestamp (YYYYMMDDHHMM)
- **COMMIT**: Short git hash

### Production Releases
Format: `MAJOR.MINOR.PATCH`

Example: `1.2.3`

## Branch Naming Conventions

- **Features**: `feature/issue-XX-brief-description`
- **Bug Fixes**: `fix/issue-XX-brief-description`
- **Enhancements**: `enhance/issue-XX-brief-description`
- **Security**: `security/issue-XX-brief-description`
- **Documentation**: `docs/issue-XX-brief-description`

## Emergency Hotfixes

For critical production issues:

1. Create branch from `main`: `hotfix/issue-XX-description`
2. Fix the issue
3. Create PR to `main`
4. After merge, backport to `staging` and `develop`

## Best Practices

1. **Always create branches from develop** (unless explicitly instructed otherwise)
2. **Keep branches small and focused** - one issue per branch
3. **Write clear commit messages** referencing the issue number
4. **Run tests locally** before pushing
5. **Keep develop stable** - don't merge broken code
6. **Update documentation** when adding features
7. **Delete branches** after merging

## Self-Hosted Runners

The project uses self-hosted GitHub Actions runners for builds and deployments. See [SELF-HOSTED-RUNNERS.md](./SELF-HOSTED-RUNNERS.md) for setup instructions.

### Key Points:
- All workflows default to `self-hosted` runners
- Fallback to `ubuntu-latest` available via manual trigger
- Requires proper runner setup and maintenance
- Provides better performance and cost control

## Scripts and Commands

### Version Management

```bash
# Bump patch version (0.1.0 -> 0.1.1)
npm run version:patch

# Bump minor version (0.1.0 -> 0.2.0)
npm run version:minor

# Bump major version (0.1.0 -> 1.0.0)
npm run version:major

# Generate alpha version string
npm run version:alpha

# Prepare for production release
npm run prepare-release [patch|minor|major]
```

### Common Git Commands

```bash
# Update local develop branch
git checkout develop
git pull origin develop

# Clean up local branches
git branch -d feature/old-branch
git remote prune origin

# Check branch status
git branch -a
git log --oneline --graph --all
```

## Questions?

If you have questions about the branching strategy, please:
1. Check this documentation first
2. Ask in the team chat
3. Create an issue for process improvements
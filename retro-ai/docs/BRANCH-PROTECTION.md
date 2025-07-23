# Branch Protection Rules

This document outlines the recommended GitHub branch protection rules for the Retro AI repository to ensure code quality and prevent accidental changes to critical branches.

## Protected Branches

### 1. **main** Branch Protection

**Settings → Branches → Add rule → Branch name pattern: `main`**

#### Required Settings:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **2**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from CODEOWNERS
  - ✅ Require approval of the most recent push

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Required status checks:
    - `test (18.x)`
    - `test (20.x)`
    - `security`
    - `build`

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits** (optional but recommended)

- ✅ **Require linear history**

- ✅ **Include administrators**

- ✅ **Restrict who can push to matching branches**
  - Add specific users or teams who can merge to main

- ❌ **Allow force pushes** (keep disabled)

- ❌ **Allow deletions** (keep disabled)

### 2. **staging** Branch Protection

**Settings → Branches → Add rule → Branch name pattern: `staging`**

#### Required Settings:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Required status checks:
    - `test (18.x)`
    - `test (20.x)`
    - `security`

- ✅ **Require conversation resolution before merging**

- ✅ **Include administrators**

- ❌ **Allow force pushes** (keep disabled)

- ❌ **Allow deletions** (keep disabled)

### 3. **develop** Branch Protection

**Settings → Branches → Add rule → Branch name pattern: `develop`**

#### Required Settings:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ❌ Dismiss stale pull request approvals (optional for develop)

- ✅ **Require status checks to pass before merging**
  - Required status checks:
    - `test (20.x)`
    - `security`

- ✅ **Require conversation resolution before merging**

- ❌ **Allow force pushes** (keep disabled)

- ❌ **Allow deletions** (keep disabled)

## Additional GitHub Settings

### General Repository Settings

**Settings → General**

- ✅ **Allow squash merging**
  - Default message: "Pull request title and description"
- ❌ **Allow merge commits** (disabled to maintain clean history)
- ❌ **Allow rebase merging** (disabled to maintain clean history)
- ✅ **Always suggest updating pull request branches**
- ✅ **Allow auto-merge**
- ✅ **Automatically delete head branches**

### Pull Request Settings

**Settings → General → Pull Requests**

- ✅ **Allow maintainers to edit**

### Actions Settings

**Settings → Actions → General**

- **Actions permissions**: "Allow all actions and reusable workflows"
- **Workflow permissions**: "Read and write permissions"
- ✅ **Allow GitHub Actions to create and approve pull requests**

## Bypass Rules

### Emergency Procedures

For emergency hotfixes, repository administrators can:
1. Temporarily disable "Include administrators" on the relevant branch
2. Make the necessary changes
3. Re-enable the protection immediately after

**Important**: All emergency bypasses should be:
- Documented in an issue
- Reviewed retrospectively
- Minimized to critical security fixes only

## CODEOWNERS File

Create a `.github/CODEOWNERS` file to automatically request reviews:

```
# Global owners
* @davemjones @team-lead

# Frontend code
/retro-ai/components/ @frontend-team
/retro-ai/app/ @frontend-team
/retro-ai/styles/ @frontend-team

# Backend code
/retro-ai/lib/ @backend-team
/retro-ai/server.js @backend-team
/retro-ai/prisma/ @backend-team

# Documentation
*.md @documentation-team
/retro-ai/docs/ @documentation-team

# CI/CD
/.github/ @devops-team
```

## Enforcement

### Monitoring

- Review branch protection audit logs monthly
- Monitor for protection rule violations
- Ensure new team members understand the rules

### Updates

Branch protection rules should be reviewed and updated:
- When team structure changes
- When CI/CD pipeline changes
- During quarterly security reviews
- When GitHub introduces new protection features

## Troubleshooting

### Common Issues

1. **"Required status checks have not passed"**
   - Ensure all CI tests are passing
   - Check if branch is up to date with base branch
   - Verify status check names match exactly

2. **"At least X approving review is required"**
   - Request review from team members
   - Ensure reviewer has write access
   - Check if previous approvals were dismissed

3. **"Conversation must be resolved"**
   - Resolve all PR comments
   - Mark conversations as resolved
   - Check for hidden/collapsed conversations

## Questions?

For questions about branch protection:
1. Check GitHub's official documentation
2. Contact the repository administrators
3. Create an issue for clarification
# Git Workflow Guide

This document outlines the Git workflow used in this project. We follow a **Git Flow** branching strategy with three main branch types: `main`, `develop`, and `feature` branches.

> **For new developers:** See [DEVELOPER_GUIDE.md](../guides/DEVELOPER_GUIDE.md) for complete setup instructions including forking and initial configuration.

## Branch Overview

### Main Branch
- **Purpose**: Production-ready, stable code
- **Protection**: Should only receive merges from `develop` after thorough testing
- **Naming**: `main` (or `master` in older repositories)

### Develop Branch
- **Purpose**: Integration branch for ongoing development
- **Protection**: Should be kept stable and tested
- **Naming**: `develop`

### Feature Branches
- **Purpose**: Individual features or bug fixes
- **Naming Convention**: `feature/feature-name` or `feature/issue-number-description`
- **Source**: Always branch from `develop`
- **Destination**: Always merge back to `develop`

## Workflow Diagram

```
main (production)
  │
  └── develop (integration)
       │
       ├── feature/user-authentication
       ├── feature/audio-recording
       └── feature/ui-improvements
```

## Common Workflows

### 1. Starting a New Feature

```bash
# Step 1: Ensure you're on develop and it's up to date
git checkout develop
git pull origin develop

# Step 2: Create a new feature branch
git checkout -b feature/your-feature-name

# Step 3: Start working on your feature
# ... make changes ...

# Step 4: Commit your changes
git add .
git commit -m "Add: description of your changes"

# Step 5: Push to remote (first time)
git push -u origin feature/your-feature-name

# Step 6: Continue pushing as you work
git push
```

### 2. Working on an Existing Feature

```bash
# Switch to your feature branch
git checkout feature/your-feature-name

# Make sure it's up to date with develop
git pull origin develop

# Work on your feature
# ... make changes ...

# Commit and push
git add .
git commit -m "Update: description of changes"
git push
```

### 3. Completing a Feature

```bash
# Step 1: Ensure all changes are committed and pushed
git checkout feature/your-feature-name
git add .
git commit -m "Final: complete feature implementation"
git push

# Step 2: Switch to develop and merge
git checkout develop
git pull origin develop
git merge feature/your-feature-name

# Step 3: Push the updated develop branch
git push origin develop

# Step 4: Clean up (delete local and remote feature branch)
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### 4. Releasing to Production

```bash
# Step 1: Ensure develop is stable and tested
git checkout develop
git pull origin develop

# Step 2: Switch to main and merge
git checkout main
git pull origin main
git merge develop

# Step 3: Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main
git push origin v1.0.0
```

### 5. Hotfix (Emergency Fix to Production)

If you need to fix a critical bug in production:

```bash
# Step 1: Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# Step 2: Fix the bug
# ... make changes ...
git add .
git commit -m "Fix: critical bug description"
git push -u origin hotfix/critical-bug-fix

# Step 3: Merge to both main and develop
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

git checkout develop
git merge hotfix/critical-bug-fix
git push origin develop

# Step 4: Clean up
git branch -d hotfix/critical-bug-fix
git push origin --delete hotfix/critical-bug-fix
```

## Best Practices

### Commit Messages

Use clear, descriptive commit messages following this format:

```
Type: Brief description

Optional longer explanation if needed
```

**Types:**
- `Add:` - New feature
- `Fix:` - Bug fix
- `Update:` - Update existing feature
- `Refactor:` - Code refactoring
- `Docs:` - Documentation changes
- `Style:` - Formatting, styling
- `Test:` - Adding or updating tests
- `Chore:` - Maintenance tasks

**Examples:**
```
Add: user authentication with JWT tokens
Fix: audio recording stops after 30 seconds
Update: improve error handling in transcription service
Refactor: reorganize component structure
```

### Branch Naming

- Use lowercase letters
- Separate words with hyphens
- Be descriptive but concise
- Include issue number if applicable

**Good examples:**
- `feature/user-login`
- `feature/audio-recording`
- `feature/123-transcription-export`
- `hotfix/audio-crash-fix`

**Bad examples:**
- `feature1` (too vague)
- `new_stuff` (not descriptive)
- `Feature/UserLogin` (inconsistent casing)

### Keeping Branches Updated

Regularly sync your feature branch with `develop`:

```bash
# While on your feature branch
git checkout feature/your-feature-name
git pull origin develop
# Resolve any conflicts if they occur
git push
```

### Pull Requests (Recommended)

For team collaboration, use Pull Requests:

1. Push your feature branch to remote
2. Create a Pull Request from `feature/your-feature-name` to `develop`
3. Request code review
4. Address feedback and push updates
5. Merge via GitHub/GitLab interface after approval

## Troubleshooting

### Merge Conflicts

If you encounter merge conflicts:

```bash
# When merging, Git will show conflicted files
# Open the files and look for conflict markers:
# <<<<<<< HEAD
# ... your changes ...
# =======
# ... incoming changes ...
# >>>>>>> branch-name

# Resolve conflicts manually, then:
git add .
git commit -m "Merge: resolve conflicts with develop"
```

### Undoing Changes

```bash
# Discard uncommitted changes
git checkout -- <file>

# Discard all uncommitted changes
git reset --hard HEAD

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

### Switching Branches with Uncommitted Changes

```bash
# Stash changes temporarily
git stash

# Switch branches
git checkout develop

# Apply stashed changes later
git stash pop
```

## Quick Reference

| Action | Command |
|--------|---------|
| Create feature branch | `git checkout -b feature/name develop` |
| Switch branch | `git checkout branch-name` |
| View branches | `git branch -a` |
| Update from remote | `git pull origin branch-name` |
| Push to remote | `git push origin branch-name` |
| Merge feature to develop | `git checkout develop && git merge feature/name` |
| Delete local branch | `git branch -d branch-name` |
| Delete remote branch | `git push origin --delete branch-name` |
| View commit history | `git log --oneline --graph --all` |

## Additional Resources

- [Git Flow Documentation](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Atlassian Git Workflows](https://www.atlassian.com/git/tutorials/comparing-workflows)


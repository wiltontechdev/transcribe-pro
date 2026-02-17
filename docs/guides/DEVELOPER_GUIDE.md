# Developer Guide - Transcription Pro

**For: Julius & Wilton**

This guide provides step-by-step instructions for setting up your development environment, working with Git branches, and understanding where to save files.

---

## Table of Contents

1. [Initial Setup (Forking & Cloning)](#initial-setup)
2. [Branch Workflow](#branch-workflow)
3. [File Structure & Where to Save Files](#file-structure)
4. [Daily Workflow](#daily-workflow)
5. [Commit & Push Guidelines](#commit-guidelines)
6. [Common Scenarios](#common-scenarios)

---

## Initial Setup

### Step 1: Fork the Repository

1. Go to the main repository on GitHub: `https://github.com/shmawilton/Transcribe-pro`
2. Click the **"Fork"** button in the top right corner
3. This creates your own copy of the repository under your GitHub account

### Step 2: Clone Your Fork

```bash
# Replace YOUR_USERNAME with your GitHub username
git clone https://github.com/YOUR_USERNAME/Transcribe-pro.git
cd Transcribe-pro
```

### Step 3: Add Upstream Remote

```bash
# Add the original repository as 'upstream'
git remote add upstream https://github.com/shmawilton/Transcribe-pro.git

# Verify remotes
git remote -v
# Should show:
# origin    https://github.com/YOUR_USERNAME/Transcribe-pro.git (fetch)
# origin    https://github.com/YOUR_USERNAME/Transcribe-pro.git (push)
# upstream  https://github.com/shmawilton/Transcribe-pro.git (fetch)
# upstream  https://github.com/shmawilton/Transcribe-pro.git (push)
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Set Up Your Branches

```bash
# Fetch all branches from upstream
git fetch upstream

# Create local tracking branches
git checkout -b develop upstream/develop
git checkout -b main upstream/main

# Create your feature branches from develop
git checkout develop
git checkout -b julius/waveform        # For Julius
# OR
git checkout -b wilton/audio-engine    # For Wilton
```

---

## Branch Workflow

### Understanding the Branch Structure

```
upstream/main (production)
  └── upstream/develop (integration)
       ├── julius/waveform (your feature branch)
       ├── julius/playback-panel
       ├── julius/marker-panel
       ├── wilton/audio-engine
       ├── wilton/global-controls
       └── wilton/marker-timeline
```

### Your Assigned Branches

**Julius:**
- `julius/waveform` - Week 1
- `julius/playback-panel` - Week 1-2
- `julius/marker-panel` - Week 2-3
- `julius/marker-manager` - Week 2
- `julius/project-loader` - Week 3
- `julius/menu-bar` - Week 3
- `julius/help-modal` - Week 4

**Wilton:**
- `wilton/audio-engine` - Week 1-2
- `wilton/marker-timeline` - Week 1
- `wilton/global-controls` - Week 2
- `wilton/marker-editor` - Week 3
- `wilton/project-saver` - Week 3
- `wilton/settings-modal` - Week 4

### Switching Between Branches

```bash
# List all branches
git branch -a

# Switch to a branch
git checkout julius/waveform

# Create and switch to a new branch
git checkout -b julius/new-feature develop
```

### Syncing with Upstream

**IMPORTANT:** Always sync with upstream before starting work!

```bash
# 1. Switch to develop
git checkout develop

# 2. Fetch latest changes from upstream
git fetch upstream

# 3. Merge upstream/develop into your local develop
git merge upstream/develop

# 4. Push to your fork
git push origin develop

# 5. Switch to your feature branch
git checkout julius/waveform

# 6. Update your feature branch with latest develop
git merge develop
# OR use rebase (cleaner history):
git rebase develop
```

---

## File Structure & Where to Save Files

### ✅ WHERE TO SAVE YOUR FILES

#### For Julius - Your Components:

```
src/renderer/components/
├── audio/
│   ├── Waveform.tsx              ✅ Save here
│   └── WaveformInteraction.ts   ✅ Save here
├── controls/
│   ├── PlaybackPanel.tsx         ✅ Save here
│   └── MarkerPanel.tsx           ✅ Save here
├── markers/
│   └── MarkerManager.ts          ✅ Save here (logic file)
├── project/
│   └── ProjectLoader.ts          ✅ Save here
└── ui/
    ├── MenuBar.tsx               ✅ Save here
    └── HelpModal.tsx             ✅ Save here
```

#### For Wilton - Your Components:

```
src/renderer/components/
├── audio/
│   └── AudioEngine.ts            ✅ Save here
├── controls/
│   └── GlobalControlsPanel.tsx   ✅ Save here
├── markers/
│   ├── MarkerTimeline.tsx        ✅ Save here
│   └── MarkerEditor.tsx          ✅ Save here
├── project/
│   └── ProjectSaver.ts            ✅ Save here
└── ui/
    └── SettingsModal.tsx         ✅ Save here
```

#### Shared Files (Both Developers):

```
src/renderer/
├── store/
│   └── store.ts                  ✅ Both can modify (coordinate!)
├── types/
│   └── types.ts                  ✅ Both can modify (coordinate!)
└── styles/
    └── globals.css               ✅ Both can modify (coordinate!)
```

### ❌ WHERE NOT TO SAVE FILES

**DO NOT create files in these locations:**

```
❌ src/App.tsx                    (old location - use src/renderer/App.tsx)
❌ src/store/useAppStore.ts       (old location - use src/renderer/store/store.ts)
❌ Root directory                 (don't create random files here)
❌ node_modules/                  (never modify - auto-generated)
❌ dist/                          (never modify - build output)
❌ .git/                          (never modify - Git internals)
```

**DO NOT commit these files:**

```
❌ .env.local                     (local environment variables)
❌ .DS_Store                      (macOS system file)
❌ Thumbs.db                      (Windows system file)
❌ *.log                          (log files)
❌ .vscode/settings.json          (personal IDE settings)
❌ package-lock.json              (only commit if adding new dependencies)
```

---

## Daily Workflow

### Starting Your Day

```bash
# 1. Fetch latest changes
git fetch upstream

# 2. Update your local develop
git checkout develop
git merge upstream/develop
git push origin develop

# 3. Switch to your feature branch
git checkout julius/waveform  # or your current branch

# 4. Update feature branch with latest develop
git merge develop

# 5. Start development server
npm run dev
```

### During Development

1. **Work on your assigned component**
   - Edit files in `src/renderer/components/`
   - Follow the file structure guidelines above

2. **Test your changes**
   - Run `npm run dev` to see changes
   - Test functionality thoroughly

3. **Commit frequently**
   ```bash
   git add src/renderer/components/audio/Waveform.tsx
   git commit -m "Add: waveform rendering with canvas"
   ```

4. **Push to your fork**
   ```bash
   git push origin julius/waveform
   ```

### Ending Your Day

```bash
# 1. Commit any uncommitted changes
git add .
git commit -m "Update: progress on waveform component"

# 2. Push to your fork
git push origin julius/waveform

# 3. Optional: Create a Pull Request on GitHub
# Go to GitHub → Your Fork → Create Pull Request
```

---

## Commit & Push Guidelines

### Commit Message Format

```
Type: Brief description

Optional longer explanation
```

**Types:**
- `Add:` - New feature or component
- `Fix:` - Bug fix
- `Update:` - Update existing feature
- `Refactor:` - Code refactoring
- `Style:` - Styling changes
- `Docs:` - Documentation updates

**Examples:**
```bash
git commit -m "Add: waveform canvas rendering with audio visualization"
git commit -m "Fix: playback controls not responding to clicks"
git commit -m "Update: improve waveform performance with requestAnimationFrame"
git commit -m "Style: add glassmorphism effects to playback panel"
```

### When to Push

- **Push frequently** - After each logical unit of work
- **Push before switching branches** - Ensures work is saved
- **Push before syncing** - Prevents conflicts
- **Push at end of day** - Backup your work

### Pushing to Your Fork

```bash
# Push current branch to your fork (origin)
git push origin julius/waveform

# First time pushing a new branch
git push -u origin julius/waveform
```

**IMPORTANT:** 
- ✅ Push to `origin` (your fork)
- ❌ Never push directly to `upstream` (main repo)

---

## Common Scenarios

### Scenario 1: Starting a New Feature

```bash
# 1. Sync with upstream
git checkout develop
git fetch upstream
git merge upstream/develop

# 2. Create new feature branch
git checkout -b julius/new-feature develop

# 3. Start coding!
# ... make changes ...

# 4. Commit and push
git add .
git commit -m "Add: new feature description"
git push -u origin julius/new-feature
```

### Scenario 2: Updating Your Feature Branch

```bash
# 1. Save your current work
git add .
git commit -m "WIP: current progress"
git push origin julius/waveform

# 2. Update from develop
git checkout develop
git fetch upstream
git merge upstream/develop

# 3. Update your feature branch
git checkout julius/waveform
git merge develop

# 4. Resolve conflicts if any, then continue
```

### Scenario 3: Creating a Pull Request

1. Push your feature branch to your fork:
   ```bash
   git push origin julius/waveform
   ```

2. Go to GitHub:
   - Navigate to your fork: `https://github.com/YOUR_USERNAME/Transcribe-pro`
   - Click "Compare & pull request"
   - Select: `base: develop` ← `compare: julius/waveform`
   - Add description of changes
   - Request review from team member
   - Click "Create pull request"

3. After PR is approved and merged:
   ```bash
   # Update your local branches
   git checkout develop
   git fetch upstream
   git merge upstream/develop
   
   # Delete merged feature branch
   git branch -d julius/waveform
   git push origin --delete julius/waveform
   ```

### Scenario 4: Resolving Merge Conflicts

```bash
# When merging develop into your feature branch
git checkout julius/waveform
git merge develop

# If conflicts occur:
# 1. Git will show conflicted files
# 2. Open files in editor
# 3. Look for conflict markers:
#    <<<<<<< HEAD
#    ... your code ...
#    =======
#    ... incoming code ...
#    >>>>>>> develop
# 4. Resolve conflicts manually
# 5. Stage resolved files
git add .
git commit -m "Merge: resolve conflicts with develop"
```

### Scenario 5: Undoing Changes

```bash
# Discard uncommitted changes to a file
git checkout -- src/renderer/components/audio/Waveform.tsx

# Discard all uncommitted changes
git reset --hard HEAD

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

---

## File Naming Conventions

### Component Files

- **React Components:** Use PascalCase with `.tsx` extension
  - ✅ `Waveform.tsx`
  - ✅ `PlaybackPanel.tsx`
  - ❌ `waveform.tsx`
  - ❌ `playback-panel.tsx`

- **Logic/Utility Files:** Use PascalCase with `.ts` extension
  - ✅ `AudioEngine.ts`
  - ✅ `MarkerManager.ts`
  - ✅ `ProjectSaver.ts`

### Directory Names

- Use lowercase with hyphens or camelCase
  - ✅ `audio/`
  - ✅ `controls/`
  - ✅ `marker-timeline/` (if needed)

---

## Important Reminders

### ✅ DO:

- Always sync with `upstream/develop` before starting work
- Work on your assigned feature branches only
- Commit frequently with clear messages
- Push to your fork (`origin`) regularly
- Test your changes before committing
- Coordinate when modifying shared files (store, types, styles)
- Create Pull Requests for code review

### ❌ DON'T:

- Don't push directly to `upstream` (main repository)
- Don't work directly on `develop` or `main` branches
- Don't commit large files or build artifacts
- Don't commit personal IDE settings
- Don't modify files outside your assigned components without coordination
- Don't force push to shared branches
- Don't delete branches that others might be using

---

## Getting Help

If you encounter issues:

1. **Check this guide first** - Most common scenarios are covered
2. **Check Git Workflow Guide** - See `GIT_WORKFLOW.md` for detailed Git commands
3. **Ask your teammate** - Coordinate on shared files
4. **Check Git status** - `git status` shows current state
5. **Check branch history** - `git log --oneline --graph --all`

---

## Quick Reference

| Task | Command |
|------|---------|
| Sync with upstream | `git fetch upstream && git merge upstream/develop` |
| Switch branch | `git checkout julius/waveform` |
| Create branch | `git checkout -b julius/new-feature develop` |
| Commit changes | `git add . && git commit -m "Type: description"` |
| Push to fork | `git push origin julius/waveform` |
| View branches | `git branch -a` |
| View status | `git status` |
| View history | `git log --oneline --graph --all` |

---

**Last Updated:** Week 0 Setup Complete
**Next Review:** After Week 1


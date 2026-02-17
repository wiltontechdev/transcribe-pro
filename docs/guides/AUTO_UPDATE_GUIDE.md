# Auto-Update System Guide

TranscribePro uses `electron-updater` to provide automatic updates for the desktop application. This guide explains how to set up, configure, and release updates.

## Overview

The auto-update system:
- Checks for updates on app startup (silent)
- Allows manual update checks from Settings
- Shows a notification when updates are available
- Downloads updates in the background
- Allows users to install updates with app restart

## Setup Instructions

### 1. Configure GitHub Repository

In `package.json`, update the `build.publish` section with your GitHub details:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",
  "repo": "Transcribe-pro",
  "releaseType": "release"
}
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

### 2. Create GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Give it a name like "TranscribePro Publisher"
4. Select scopes: `repo` (full control of private repositories)
5. Generate and copy the token

### 3. Set Environment Variable

Before publishing, set your GitHub token:

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN = "your_github_token_here"
```

**macOS/Linux:**
```bash
export GH_TOKEN="your_github_token_here"
```

Or create a `.env` file (don't commit this!):
```
GH_TOKEN=your_github_token_here
```

### 4. Code Signing (Recommended for Production)

For production releases, you should code sign your application:

**Windows:** Get a code signing certificate from a CA (Comodo, DigiCert, etc.)
**macOS:** Use an Apple Developer certificate

See `ENABLE_CODE_SIGNING.md` for detailed instructions.

## Releasing Updates

### Step-by-Step Release Process

1. **Update version number** in `package.json`:
   ```json
   "version": "1.1.0"
   ```

2. **Update CHANGELOG.md** with release notes:
   ```markdown
   ## [1.1.0] - 2026-02-15
   
   ### Added
   - New feature X
   - New feature Y
   
   ### Fixed
   - Bug fix Z
   ```

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "chore: release v1.1.0"
   ```

4. **Create a git tag:**
   ```bash
   git tag v1.1.0
   ```

5. **Push changes and tags:**
   ```bash
   git push origin main
   git push origin v1.1.0
   ```

6. **Build and publish:**
   ```bash
   # Windows
   npm run publish:win
   
   # macOS
   npm run publish:mac
   
   # Linux
   npm run publish:linux
   
   # All platforms
   npm run publish
   ```

7. **Verify on GitHub:**
   - Go to your repository's Releases page
   - You should see a new draft release
   - Edit the release notes if needed
   - Publish the release

### Understanding Release Types

- **Draft Release**: Created automatically by electron-builder, not visible to users
- **Pre-release**: For beta/testing versions (users won't auto-update unless enabled)
- **Release**: Full release, users will receive update notifications

## How Updates Work

### For Users

1. App checks for updates 5 seconds after startup
2. If update available, notification appears in bottom-right corner
3. User can:
   - Click "Download Update" to download in background
   - Click "Details" to see release notes
   - Dismiss the notification (will reappear next startup)
4. After download completes, user clicks "Restart & Install"
5. App restarts with new version

### For Developers

The update flow:
1. `autoUpdater.checkForUpdates()` queries GitHub Releases API
2. Compares current version with latest release version
3. If newer version found, emits `update-available` event
4. Download stores update in temp directory
5. `autoUpdater.quitAndInstall()` applies update on restart

## Rollback Strategy

### User-Side Rollback

Users can manually rollback by:
1. Downloading a previous version from GitHub Releases
2. Uninstalling current version
3. Installing the older version

### Developer-Side Rollback

If a critical bug is found:

1. **Quick fix approach:**
   - Fix the bug
   - Release a new patch version immediately
   - Users will auto-update to the fixed version

2. **Revert approach:**
   - Delete/unpublish the problematic release from GitHub
   - Users won't see it as an update anymore
   - Optionally re-publish a previous version with a new version number

### Best Practices for Avoiding Rollbacks

1. **Use pre-releases** for testing:
   ```json
   "publish": {
     "provider": "github",
     "releaseType": "prerelease"
   }
   ```

2. **Test on all platforms** before full release

3. **Use staged rollouts** by initially publishing as draft, testing with beta users, then publishing

## Troubleshooting

### Update Check Fails

- Verify GitHub token is set correctly
- Check internet connectivity
- Ensure release is published (not draft)
- Check that version in package.json matches release tag

### Download Fails

- Check available disk space
- Verify update file exists in GitHub release assets
- Check for firewall/proxy blocking downloads

### Install Fails on Windows

- May need to run as administrator
- Check Windows Defender isn't blocking
- Verify code signing certificate is valid

### Updates Not Working in Development

This is expected! Auto-updates only work in packaged builds:
```javascript
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  // Updates disabled in dev mode
}
```

## Configuration Options

### Auto-Download Updates

If you want updates to download automatically:
```javascript
autoUpdater.autoDownload = true;
```

### Auto-Install on Quit

Updates install automatically when user quits:
```javascript
autoUpdater.autoInstallOnAppQuit = true; // Default
```

### Custom Update Server

If you host updates elsewhere (not GitHub):
```json
"publish": {
  "provider": "generic",
  "url": "https://your-server.com/updates/"
}
```

## Security Considerations

1. **Always sign releases** in production
2. **Keep GH_TOKEN secret** - never commit it
3. **Use HTTPS** for all update downloads
4. **Verify release integrity** - electron-updater validates signatures

## File Structure

After implementing auto-updates, these files are involved:

```
src/
├── main/
│   ├── main.ts          # Auto-updater initialization & IPC handlers
│   └── preload.ts       # Update APIs exposed to renderer
├── renderer/
│   └── components/ui/
│       ├── UpdateNotification.tsx  # Update UI component
│       └── SettingsModal.tsx       # "Check for Updates" button
├── types/
│   └── electron.d.ts    # TypeScript definitions
package.json             # Build & publish config
CHANGELOG.md             # Version history
```

## CI/CD: Building macOS on GitHub Actions

The repo includes a workflow that builds the macOS app on **macOS runners** so you don’t need a Mac locally.

- **Workflow file:** `.github/workflows/build-macos.yml`
- **Runs on:** `macos-latest`
- **Triggers:** Push/PR to `main`, or **Actions → Build macOS → Run workflow**

**What it does:**

1. Checks out the repo and sets up Node 20
2. Runs `npm ci`
3. Generates `public/icon.icns` from `public/logo.png` (mac build expects this)
4. Cleans `release/`, runs `npm run build`, then `electron-builder --mac`
5. Uploads the `release/` folder as the **macos-build** artifact

**Using the artifacts:** After a run, open the run → **Artifacts** → download **macos-build** to get the DMGs (and any other files in `release/`).

**Publishing from CI (optional):** To have the workflow publish to GitHub Releases, add a `GH_TOKEN` secret (repo-scoped PAT) and in the workflow uncomment and set:

```yaml
env:
  GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

Then add a step (or use `electron-builder --mac --publish always`) to publish. Code signing on macOS in CI requires extra setup (certificates and secrets); the workflow currently uses `CSC_IDENTITY_AUTO_DISCOVERY: "false"` for unsigned builds.

## Additional Resources

- [electron-updater documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

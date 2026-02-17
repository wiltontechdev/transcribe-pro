# Enabling Code Signing for Windows Builds

To enable code signing, Windows needs permission to create symbolic links. Here are the options:

## Option 1: Enable Developer Mode (Recommended - Easiest)

1. **Open Windows Settings:**
   - Press `Win + I` or click Start → Settings

2. **Navigate to Developer Settings:**
   - Go to **Privacy & Security** → **For developers** (or search "Developer settings")

3. **Enable Developer Mode:**
   - Toggle **"Developer Mode"** to **ON**
   - Windows may prompt you to restart (recommended)

4. **Restart your computer** (if prompted)

5. **Run the build again:**
   ```powershell
   npm run dist:win
   ```

## Option 2: Run PowerShell as Administrator (Quick Fix)

1. **Right-click PowerShell** → **Run as Administrator**

2. **Navigate to your project:**
   ```powershell
   cd "C:\Users\HomePC\Desktop\Transcription Pro\Pulls\Transcribe-pro"
   ```

3. **Run the build:**
   ```powershell
   npm run dist:win
   ```

## Option 3: Grant Symlink Privilege via Group Policy (Advanced)

If you have admin access and want a permanent solution:

1. **Open Group Policy Editor:**
   - Press `Win + R`
   - Type `gpedit.msc` and press Enter

2. **Navigate to:**
   - Computer Configuration → Windows Settings → Security Settings → Local Policies → User Rights Assignment

3. **Edit "Create symbolic links":**
   - Double-click "Create symbolic links"
   - Click "Add User or Group"
   - Add your Windows username
   - Click OK

4. **Restart your computer**

## Option 4: Use a Code Signing Certificate (Production)

For production releases, you'll need a proper code signing certificate:

1. **Purchase a code signing certificate** from a trusted CA (e.g., DigiCert, Sectigo)

2. **Install the certificate** on your Windows machine

3. **Configure electron-builder** to use it:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.pfx",
     "certificatePassword": "your-password"
   }
   ```

## Current Status

Code signing is now **enabled** in the configuration. After enabling Developer Mode (Option 1) or running as admin (Option 2), the build should complete with code signing.

**Note:** Unsigned executables will show "Unknown publisher" warnings. This is normal for development builds. For production, use Option 4.

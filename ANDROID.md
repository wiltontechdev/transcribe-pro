# Android Build Guide - Transcription Pro

The app runs on Android with **minimal code changes** using [Capacitor](https://capacitorjs.com/). Same codebase as web and Electron.

## Prerequisites

- Node.js 18+
- Android Studio (for Android SDK and emulator)
- Java 17 (required by Android)

### SDK location

If the build fails with "SDK location not found", create `android/local.properties`:

```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

Or set the `ANDROID_HOME` environment variable to your SDK path.

## Quick Start

### 1. Build and sync

```bash
npm run build:android
# or: npm run build && npx cap sync android
```

### 2. Open in Android Studio

```bash
npm run android:open
# or: npx cap open android
```

Then run the app on an emulator or device from Android Studio (▶ Run).

### 3. After code changes

```bash
npm run cap:sync
```

Then run again from Android Studio.

## What Works Without Changes

- **Audio playback**: Uses Tone.js (web) when `window.electronAPI` is absent — works on Android
- **Waveform visualization**: Canvas-based, works in WebView
- **Markers, transcription, export**: All React/JS logic runs in the WebView
- **PWA features**: IndexedDB, project saving, etc.
- **Storage**: Uses IndexedDB for projects (already in place)

## Minimal Code Adjustments

### 1. Electron-only paths

The app already checks `window.electronAPI` before using Electron features. On Android, `electronAPI` is undefined, so it falls back to web behavior:

- **Audio engine**: `useAudioEngine.ts` uses `Howler` in Electron, `Tone.js` in browser — Android uses Tone.js
- **File picker**: `audioFilePicker` uses web `File` API when Electron is not available
- **FFmpeg**: Native FFmpeg (used for pitch/speed in Electron) is not available on Android — the app uses Tone.js pitch/speed instead

### 2. Optional: Add Capacitor file picker

For a better native file picker on Android:

```bash
npm install @capacitor/filesystem
```

### 3. Build script

Add to `package.json`:

```json
"build:web": "vite build",
"cap:sync": "npm run build:web && npx cap sync android"
```

## Architecture Differences

| Feature        | Electron (Desktop) | Android (Capacitor) |
|----------------|-------------------|----------------------|
| Audio engine   | Howler.js         | Tone.js              |
| Pitch/speed    | FFmpeg + Howler   | Tone.js PitchShift   |
| File access    | Native dialogs    | Web File API        |
| Storage        | File system       | IndexedDB           |

## Known Limitations / Android vs Electron

| Feature | Electron | Android |
|---------|----------|---------|
| Audio engine | Howler (FFmpeg for pitch/speed) | Tone.js (native pitch/speed) |
| Normalize audio | FFmpeg loudnorm | Not available |
| Apply fade | FFmpeg | Not available |
| Detect key | FFmpeg | Not available |
| Auto-update | electron-updater | Not available |
| File picker | Native dialog | Web File API (system picker) |

## Troubleshooting

- **Blank screen**: Ensure `capacitor.config.ts` has correct `webDir: 'dist'`
- **Audio not working**: User interaction required (tap) to start AudioContext on mobile
- **File picker**: Uses system picker; storage permissions are in AndroidManifest

## Build APK (Debug)

**From Android Studio:**
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. APK is created at `android/app/build/outputs/apk/debug/app-debug.apk`

**From terminal:**
```bash
npm run android:apk
```

## Build APK (Release / Signed)

1. Run `npm run cap:sync` to sync latest web build
2. In Android Studio: Build → Generate Signed Bundle / APK
3. Choose APK or Android App Bundle (AAB)
4. Create or select a keystore
5. Build

Or from terminal: `cd android && ./gradlew assembleRelease` (requires signing config)

## Change App Icon

The app uses `public/logo.png` (Transcribe Pro logo). To regenerate Android icons:

```bash
npm run android:icons
```

This creates `assets/icon-only.png` and `icon-foreground.png` from `public/logo.png`, then runs `@capacitor/assets` to generate all Android launcher icons. Run after changing the logo.

## Publishing

1. Build release: `npm run cap:sync` then in Android Studio: Build → Generate Signed Bundle / APK
2. Or: `cd android && ./gradlew assembleRelease`

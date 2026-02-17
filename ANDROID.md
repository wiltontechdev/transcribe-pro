# Converting Transcription Pro to Android

This app can be converted to an Android app with **minimal code changes** using [Capacitor](https://capacitorjs.com/). Capacitor wraps your existing web app in a native WebView, so most of the codebase works as-is.

## Prerequisites

- Node.js 18+
- Android Studio (for Android SDK and emulator)
- Java 17 (required by Android)

## Quick Start

### 1. Add Android platform

```bash
npm install @capacitor/android
npx cap add android
```

### 2. Configure Capacitor

Edit `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.transcribepro.app',  // Match your app ID
  appName: 'Transcription Pro',
  webDir: 'dist',
  server: {
    // For local dev: androidScheme: 'https'
  },
};

export default config;
```

### 3. Build and sync

```bash
# Build the web app (Vite outputs to dist/)
npm run build

# Sync web assets to native projects
npx cap sync android
```

### 4. Open in Android Studio

```bash
npx cap open android
```

Then run the app on an emulator or device from Android Studio.

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

## Troubleshooting

- **Blank screen**: Ensure `capacitor.config.ts` has correct `webDir: 'dist'`
- **Audio not working**: Check that the app has microphone/storage permissions in Android manifest
- **CORS**: If loading from a dev server, ensure `androidScheme: 'https'` in `capacitor.config.ts` server config

## Publishing

1. Build release: `npx cap sync android` then build in Android Studio (Build → Generate Signed Bundle)
2. Or use the built-in Gradle: `cd android && ./gradlew assembleRelease`

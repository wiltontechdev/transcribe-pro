# Changelog

All notable changes to TranscribePro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Auto-update system for Electron desktop app
- Update notification UI with download progress
- "Check for Updates" button in Settings modal
- Version display in Settings modal

## [1.0.0] - 2026-01-31

### Added
- Initial release of TranscribePro
- Audio file loading and playback with Howler.js
- Waveform visualization with real-time playback indicator
- Marker system for annotating audio timestamps
- Pitch shifting (±2 semitones) using FFmpeg
- Playback speed control (0.25x - 4x)
- Volume control with mute toggle
- Undo/Redo system for all edits
- Project save/load functionality (.tsproj format)
- Auto-save to IndexedDB (web/mobile)
- PWA support for mobile installation
- Dark and Light theme support
- Keyboard shortcuts for common actions
- Export functionality for projects
- Recent projects list
- Welcome screen with quick start guide
- Responsive design for desktop, tablet, and mobile
- Electron desktop app with native file dialogs
- Audio normalization feature
- Fade in/out effects
- Cross-platform support (Windows, macOS, Linux)

### Technical
- Built with React 18, TypeScript, and Vite
- Electron 28 for desktop builds
- Zustand for state management
- Tailwind CSS for styling
- FFmpeg integration for audio processing

---

## Version Numbering Guide

- **Major version (X.0.0)**: Breaking changes, major feature overhauls
- **Minor version (0.X.0)**: New features, backwards compatible
- **Patch version (0.0.X)**: Bug fixes, small improvements

## How to Release a New Version

1. Update version in `package.json`
2. Add release notes to this CHANGELOG.md
3. Commit changes: `git commit -am "chore: release vX.X.X"`
4. Create git tag: `git tag vX.X.X`
5. Push with tags: `git push && git push --tags`
6. Run publish script: `npm run publish:win` (or :mac, :linux)
7. The release will be created on GitHub automatically

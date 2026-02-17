# Transcription Pro

A transcription application built with Electron, React, and TypeScript.

## Tech Stack

- **Electron** - Cross-platform desktop application framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Tone.js** - Web Audio framework

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

This will start both the React dev server and Electron app.

### Building

Build the application:

```bash
npm run build
npm run build:electron
```

## Git Workflow

This project uses a Git Flow workflow:

- `main` - Production-ready code (stable releases only)
- `develop` - Integration branch for ongoing development
- `feature/*` - Feature branches branched from `develop`

### Branch Structure

```
main (production)
  └── develop (integration)
       └── feature/your-feature-name
```

### Workflow Commands

#### Creating a Feature Branch

```bash
# Make sure you're on develop and it's up to date
git checkout develop
git pull origin develop

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Work on your feature, commit changes
git add .
git commit -m "Add: your feature description"

# Push feature branch to remote
git push -u origin feature/your-feature-name
```

#### Merging a Feature Branch

```bash
# After feature is complete, merge back to develop
git checkout develop
git pull origin develop
git merge feature/your-feature-name
git push origin develop

# Delete local feature branch (optional)
git branch -d feature/your-feature-name

# Delete remote feature branch (optional)
git push origin --delete feature/your-feature-name
```

#### Releasing to Production

```bash
# When ready to release, merge develop to main
git checkout main
git pull origin main
git merge develop
git push origin main

# Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

For more detailed workflow information, see [docs/workflow/GIT_WORKFLOW.md](./docs/workflow/GIT_WORKFLOW.md).

## Documentation

All documentation is organized in the `docs/` folder:

- **Workflow Documentation**: [docs/workflow/](./docs/workflow/)
  - [Git Workflow](./docs/workflow/GIT_WORKFLOW.md) - Detailed Git commands and branching strategy
  - [GitHub Setup](./docs/workflow/GITHUB_SETUP.md) - GitHub repository setup and configuration

- **Developer Guides**: [docs/guides/](./docs/guides/)
  - [Developer Guide](./docs/guides/DEVELOPER_GUIDE.md) - Complete setup and development workflow

- **Component Documentation**: [docs/components/](./docs/components/)
  - [Audio Engine](./docs/components/audio-engine/) - Audio engine implementation, API, and usage

## Project Structure

```
transcribe-pro/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Main entry point
│   │   └── preload.ts           # Preload script
│   ├── renderer/                # React renderer process
│   │   ├── App.tsx              # Main app component
│   │   ├── components/           # React components
│   │   │   ├── audio/           # Audio components
│   │   │   ├── controls/        # Control panels
│   │   │   ├── markers/         # Marker components
│   │   │   ├── ui/              # UI components
│   │   │   └── project/         # Project management
│   │   ├── store/               # Zustand store
│   │   ├── types/               # TypeScript types
│   │   └── styles/              # CSS styles
│   ├── main.tsx                 # React entry point
│   └── index.css                # Tailwind imports
├── dist/                        # Build output (don't commit)
├── node_modules/                # Dependencies (don't commit)
└── package.json                 # Dependencies and scripts
```

## For Developers

**New to the project?** Start here:
1. Read [docs/guides/DEVELOPER_GUIDE.md](./docs/guides/DEVELOPER_GUIDE.md) - Complete setup and workflow guide
2. Read [docs/workflow/GIT_WORKFLOW.md](./docs/workflow/GIT_WORKFLOW.md) - Detailed Git commands
3. Read [docs/workflow/GITHUB_SETUP.md](./docs/workflow/GITHUB_SETUP.md) - GitHub setup instructions

## License

MIT


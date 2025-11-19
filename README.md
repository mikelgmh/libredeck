# LibreDeck

[![Build Status](https://github.com/mikelgmh/libredeck/workflows/Release/badge.svg)](https://github.com/mikelgmh/libredeck/actions)
[![Test Status](https://github.com/mikelgmh/libredeck/workflows/Release/badge.svg?branch=master&event=push)](https://github.com/mikelgmh/libredeck/actions)
[![Release](https://img.shields.io/github/v/release/mikelgmh/libredeck)](https://github.com/mikelgmh/libredeck/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Open Source StreamDeck Alternative - Multi-platform desktop automation app.

## Features

- **Multi-process architecture**: Daemon (Bun) + Web Frontend (Astro + Vue) + CLI (Bun)
- **Plugin system**: Extensible with JavaScript plugins
- **Real-time UI**: WebSocket-powered live updates
- **Cross-platform**: Windows, macOS, Linux

## Installation

### From Releases

Download the latest release from [GitHub Releases](https://github.com/mikelgmh/libredeck/releases).

Extract and run:
- `sdctl start` (starts daemon and web server)

### From Source

```bash
# Clone repo
git clone https://github.com/mikelgmh/libredeck.git
cd libredeck

# Install dependencies
bun run install:all

# Development
bun run dev

# Build for production
./build.sh
```

## Usage

```bash
# Start LibreDeck
./dist/sdctl start

# Open web UI at http://localhost:4321
```

## Development

- **Daemon**: `cd daemon && bun run dev`
- **Web**: `cd web && npm run dev`
- **CLI**: `cd cli && bun run dev`

## Building

Run `./build.sh` to create executables for all platforms.

## Testing

```bash
# Run all tests
bun run test

# Run daemon tests
bun run test:daemon

# Run web tests
bun run test:web

# Run E2E tests
bun run test:e2e
```

## Releases

Automated via GitHub Actions on push to master and release creation.

## Updates

LibreDeck includes automatic update checking:

```bash
sdctl update
```

This will check for new releases on GitHub and update the CLI automatically.

## Contributing

This project uses [Conventional Commits](https://conventionalcommits.org/) for automatic versioning and releases.

### Commit Types

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `BREAKING CHANGE:` - Breaking changes (major version bump)
- `chore:`, `docs:`, `style:`, `refactor:`, `test:` - Other changes

Example:
```
feat: add new plugin system
fix: resolve memory leak in daemon
```

Releases are created automatically on push to master via GitHub Actions and semantic-release.

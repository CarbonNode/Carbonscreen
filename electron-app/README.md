# Squeet's Screensaver Utility

An Electron + Next.js desktop application that monitors system idle time and automatically triggers the Windows screensaver.

## Features

- Real-time countdown display with circular progress indicator
- Configurable idle threshold (1-120 minutes)
- Global keyboard and mouse activity detection
- Fullscreen application detection (won't trigger during fullscreen apps)
- System tray integration with minimize-to-tray
- Start with Windows option
- Modern minimal dark theme UI
- Single instance protection

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Windows 10/11

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Create installer
npm run package
```

The installer will be created in the `release/` directory.

## Project Structure

```
electron-app/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry point
│   │   ├── idleChecker.ts  # Idle detection logic
│   │   ├── config.ts   # Configuration store
│   │   ├── startup.ts  # Windows startup integration
│   │   └── preload.ts  # IPC bridge
│   └── renderer/       # Next.js frontend
│       ├── pages/      # Next.js pages
│       ├── components/ # React components
│       └── styles/     # CSS styles
├── resources/          # App icons
└── release/           # Build output
```

## How It Works

1. **Idle Detection**: Uses `uiohook-napi` for global mouse/keyboard event monitoring
2. **Fallback**: If uiohook fails, falls back to Windows API via PowerShell
3. **Screensaver Trigger**: Launches Windows default screensaver when idle threshold is reached
4. **Fullscreen Check**: Skips screensaver activation when fullscreen apps are detected

## Configuration

Settings are stored in:
- Windows: `%APPDATA%/squeets-screensaver-utility/ssu-config.json`

## License

MIT

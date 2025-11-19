# LibreDeck Copilot Instructions

## Project Overview

LibreDeck is an open-source StreamDeck alternative built with a **multi-process architecture**:

- **Daemon (Bun)**: Local server providing REST API + WebSocket communication
- **Web Frontend (Astro + Vue)**: Administration panel for managing profiles and buttons
- **CLI (Bun)**: Development and management tools (`sdctl`)

**Key insight**: This is a **desktop automation app** disguised as a web app - the web UI is just the control panel, the actual automation happens via the daemon.

## Architecture Patterns

### Component Boundaries

- **Daemon** (`daemon/src/`): Core business logic, database, plugin system, action execution
- **Web** (`web/src/`): Pure UI layer, communicates only via HTTP + WebSocket
- **CLI** (`cli/src/`): Development tooling and system management

### Communication Flow

```
Web UI ←→ HTTP API ←→ Daemon ←→ SQLite + Plugins
   ↑                    ↓
WebSocket Events ←→ Action Execution
```

### Database Design

- **SQLite with JSON columns**: Structured entities (profiles, pages, buttons) with flexible `data` JSON fields
- **Hierarchical structure**: Profiles → Pages → Buttons, each with configurable grid positions
- **Plugin system**: Manifest-based plugins with sandboxed execution

## Development Workflow

### Essential Commands

```bash
./dev.sh setup    # First-time setup (installs all deps, creates DB)
./dev.sh dev      # Start daemon + frontend in watch mode
./dev.sh clean    # Clean build artifacts and reset DB
```

### Port Configuration

- Daemon API: `3001` (configurable via `PORT`)
- WebSocket: `3002` (configurable via `WS_PORT`)
- Frontend dev: `4321` (Astro dev server)

### Development Loop

1. **Daemon changes**: Auto-restart via `bun --watch`
2. **Frontend changes**: Hot reload via Astro dev server
3. **Database reset**: Use `./dev.sh clean` between major schema changes

## Critical Files

### Core Architecture

- `daemon/src/server.ts`: Main daemon entry point, HTTP server setup
- `daemon/src/db.ts`: Database schema and service layer
- `web/src/components/Dashboard.vue`: Main UI component with StreamDeck grid

### Key Patterns

- **Action System**: `daemon/src/action-runner.ts` executes button actions (shell, http, hotkey, etc.)
- **Plugin System**: `daemon/src/plugin-loader.ts` loads and sandboxes JavaScript plugins
- **WebSocket Events**: Real-time UI updates via `daemon/src/ws.ts`

## Code Conventions

### Database Access

```typescript
// Always use DatabaseService, never direct SQL
const dbService = new DatabaseService();
const profiles = dbService.getProfiles();
```

### API Responses

```typescript
// Consistent error handling in daemon/src/api/routes.ts
return new Response(JSON.stringify({ error: 'Message' }), {
  status: 400,
  headers: corsHeaders,
});
```

### Vue Components

- **Composition API only** (not Options API)
- **WebSocket integration pattern**: See `Dashboard.vue` lines 200-250
- **API calls**: Use `apiRequest()` helper for consistent error handling

### Plugin Development

- Plugins live in `data/plugins/[plugin-name]/`
- **Manifest-driven**: `manifest.json` defines actions, permissions, schema
- **Sandboxed execution**: Plugins cannot access Node.js APIs directly

## Common Tasks

### Adding New Action Types

1. Update `daemon/src/action-runner.ts` with new action handler
2. Add action schema to plugin manifest format
3. Update `web/src/components/Dashboard.vue` button editor UI

### Database Schema Changes

1. Update `daemon/src/db.ts` schema and interfaces
2. Run `./dev.sh clean` to reset database
3. Update corresponding API routes in `daemon/src/api/routes.ts`

### New API Endpoints

1. Add route handler in `daemon/src/api/routes.ts`
2. Follow CORS pattern (all responses need CORS headers)
3. Use DatabaseService for data access, never direct SQL

## Technology Stack

### Runtime & Build

- **Daemon**: Bun (JavaScript runtime + bundler)
- **Frontend**: Astro (meta-framework) + Vue 3 (Composition API)
- **Database**: SQLite with Bun's native driver
- **Styling**: Tailwind CSS + DaisyUI components

### Key Dependencies

- **daemon**: `uuid`, `chokidar` (file watching), `mime-types`
- **web**: `@vueuse/core` (Vue utilities), `pinia` (state management)
- **cli**: `commander` (CLI framework), `chalk` (colors), `inquirer` (prompts)

## Debugging & Troubleshooting

### Common Issues

- **CORS errors**: Check daemon CORS configuration in `server.ts`
- **WebSocket disconnects**: Auto-reconnect logic in Dashboard.vue
- **Plugin loading failures**: Check plugin manifest.json syntax

### Development Tools

- **Health check**: `http://localhost:3001/health`
- **CLI status**: `sdctl status` (if CLI is built and linked)
- **Database inspection**: Direct SQLite access in `data/db.sqlite`

## Security Considerations

- **Plugin sandboxing**: Plugins run with restricted permissions
- **CORS protection**: Only allows localhost origins in development
- **No authentication**: Currently designed for local-only use
- **File upload validation**: Asset uploads must be validated for type/size

Remember: LibreDeck is a **local automation platform**, not a web service. All components run on the user's machine for privacy and performance.

## Development Guidelines

### Server Management

- **Never execute development server commands**: Do not run `cd /c/Users/Mikel/Documents/GitHub/LibreDeck && ./dev.sh dev` or any other server startup commands. The user manages the server manually and it is generally already running in the background.
- **Assume server is running**: When making changes, assume the daemon and frontend are already running and will pick up changes automatically.

# MacroStudio

A cross-platform, modular, open-source dynamic shortcut and macro execution interface inspired by Elgato Stream Deck and Bitfocus Companion. Built with Node.js, React, SQLite, and Electron.

## Features
- **Connection Manager**: Instantly add offline drivers like Microsoft Teams and Discord RPC and manage them seamlessly from the UI without cluttering RAM.
- **Portability**: Import and export `.mvp` profile files carrying your custom grid buttons, styling, scripts, and plugin tokens natively.
- **Variables Engine**: High-frequency dynamic feedback directly painted on button labels (e.g., `%discord.mute%`) through WebSocket injection.
- **Zero Configuration Sandbox**: All driver setups handle security tokens magically through SQLite. Absolutely no `.env` files or manual CLI flags required for end-users.

## How to Run for Development (Hot-Reload)
You can spin up the full React + Express Backend ecosystem using two terminals to watch for codebase changes instantly.

1. **Frontend (Vite Server)**
```bash
cd frontend
yarn install
yarn dev
```

2. **Backend (Node Server)**
```bash
cd backend
yarn install
yarn dev
```
*(Open http://localhost:5173/ in your browser)*

---

## How to Run as a Desktop App (Electron Native)
Running the wrapper via Electron bypasses the browser entirely, spinning up the backend process silently and injecting the React layer.

1. Prepare the production interface payload:
```bash
cd frontend
yarn build
```

2. Start the Electron application wrapper:
```bash
cd ..
yarn install
yarn dev
```

## Adding New Integrations
The Plugin architecture is wildly decoupled. Drop a new folder in `backend/core/drivers`. 

Map an `index.js` file exposing an `id`, `name`, `configSchema` array, `hooks.onLoad` and an `actions` array. MacroStudio will automatically sandbox it, scan the disk, and expose it in the "Catálogo de Integrações" UI instantly!

import { initDatabase } from './db';
import { WebSocketManager } from './ws';
import { PluginLoader } from './plugin-loader';
import { ActionRunner } from './action-runner';
import { windowWatcher } from './window-watcher';
import { DatabaseService } from './db';
import { setupAPIRoutes } from './api/routes';

// Import opcional del tray (solo funciona en Windows)
let Tray: any = null;
try {
  Tray = require('systray');
} catch (error) {
  console.log('ℹ️ Tray module not available (this is normal on Linux/macOS)');
}

const path = require('path');
const fs = require('fs');

const PORT = Number(process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1]) || Number(process.env.PORT) || 3001;
const WS_PORT = Number(process.env.WS_PORT) || 3002;
const FRONTEND_PORT = Number(process.argv.find(arg => arg.startsWith('--web-port='))?.split('=')[1]) || Number(process.env.FRONTEND_PORT) || 3002;
const DEV_MODE = process.env.DEV_MODE === 'true';

class LibreDeckDaemon {
  private httpServer?: any;
  private frontendServer?: any;
  private wsManager?: WebSocketManager;
  private pluginLoader?: PluginLoader;
  private actionRunner?: ActionRunner;
  private tray?: any;

  constructor() { }

  private async initializeServices() {
    try {
      // Inicializar base de datos
      await initDatabase();
      console.log('✓ Database initialized');

      // Inicializar sistemas
      this.pluginLoader = new PluginLoader();
      this.actionRunner = new ActionRunner(this.pluginLoader);

      // Cargar plugins
      await this.pluginLoader.loadAllPlugins();

      // Configurar WebSocket
      this.wsManager = new WebSocketManager(WS_PORT);

      // Inicializar auto-profile switching si hay configuración guardada
      await this.initializeAutoProfileSwitching();

      // Inicializar tray icon
      this.initializeTray();

      console.log('✓ Services initialized');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  private async initializeAutoProfileSwitching() {
    try {
      const db = new DatabaseService();
      const autoProfileConfig = db.getSetting('autoProfileSwitch');

      if (autoProfileConfig) {
        const config = JSON.parse(autoProfileConfig);
        if (config.enabled && config.rules && config.rules.length > 0) {
          // Connect window watcher events to WebSocket
          windowWatcher.on('profile-switch', (profileId: string, window: any) => {
            // Update current profile in window watcher
            windowWatcher.setCurrentProfile(profileId);
            this.wsManager?.broadcast('profile.navigate', { profileId }, 'profiles');
          });

          windowWatcher.startWatching(config.rules);
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize auto-profile switching:', error);
    }
  }

  private initializeTray() {
    try {
      // Solo intentar inicializar tray en Windows y si el módulo está disponible
      if (process.platform !== 'win32' || !Tray) {
        console.log('ℹ️ Tray icon not supported on this platform or module not available');
        return;
      }

      Tray.create({ title: 'LibreDeck Daemon' }, (tray) => {
        const openItem = tray.item("Abrir LibreDeck", () => {
          const { exec } = require('child_process');
          const os = require('os');

          // Obtener IP local
          const interfaces = os.networkInterfaces() as any;
          let localIP = 'localhost';
          for (const iface of Object.values(interfaces)) {
            for (const addr of iface as any[]) {
              if (addr.family === 'IPv4' && !addr.internal) {
                localIP = addr.address;
                break;
              }
            }
            if (localIP !== 'localhost') break;
          }

          const frontendPort = process.env.PORT_FRONTEND || PORT;
          exec(`start http://${localIP}:${frontendPort}`);
        });
        const quitItem = tray.item("Salir", () => {
          tray.kill();
          process.exit(0);
        });
        tray.setMenu(openItem, tray.separator(), quitItem);
        this.tray = tray;
        console.log('✓ Tray icon initialized');
      });
    } catch (error) {
      console.log('ℹ️ Tray icon not available on this system (this is normal on Linux/macOS)');
    }
  }

  public async start() {
    await this.initializeServices();

    // Crear servidor API
    this.httpServer = Bun.serve({
      port: PORT,
      fetch: async (req: Request) => {
        const url = new URL(req.url);

        // Obtener origin del request
        const origin = req.headers.get('origin') || '*';

        // Configurar CORS - permitir localhost y cualquier IP local
        const isLocalOrigin = origin === 'null' ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.match(/https?:\/\/192\.168\.\d+\.\d+(:\d+)?/) ||
          origin.match(/https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?/) ||
          origin.match(/https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?/);

        const corsHeaders = {
          'Access-Control-Allow-Origin': '*', // Allow all origins for development
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true'
        };

        // Manejar preflight OPTIONS
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: corsHeaders
          });
        }

        // Servir assets estáticos
        if (url.pathname.startsWith('/assets/')) {
          try {
            const assetPath = url.pathname.replace('/assets/', '');
            const fullPath = path.join(__dirname, '..', 'data', 'assets', assetPath);
            const file = Bun.file(fullPath);

            if (await file.exists()) {
              return new Response(file, {
                headers: {
                  ...corsHeaders,
                  'Cache-Control': 'public, max-age=3600'
                }
              });
            }
          } catch (error) {
            console.error('Error serving asset:', error);
          }

          return new Response('Asset not found', {
            status: 404,
            headers: corsHeaders
          });
        }

        // Manejar rutas API
        if (url.pathname.startsWith('/api/')) {
          const response = await setupAPIRoutes(req, {
            wsManager: this.wsManager!,
            pluginLoader: this.pluginLoader!,
            actionRunner: this.actionRunner!,
            windowWatcher: windowWatcher
          });

          // Agregar headers CORS a las respuestas API
          const headers = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            headers.set(key, value);
          });

          return new Response(response.body, {
            status: response.status,
            headers
          });
        }

        // Health check
        if (url.pathname === '/health') {
          return new Response(JSON.stringify({
            status: 'ok',
            timestamp: Date.now(),
            version: '0.1.0',
            websocket: WS_PORT
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        return new Response('LibreDeck API Server', {
          headers: corsHeaders
        });
      },
      error: (error) => {
        console.error('API Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    });

    // Crear servidor frontend
    this.frontendServer = Bun.serve({
      port: FRONTEND_PORT,
      fetch: async (req: Request) => {
        const url = new URL(req.url);

        // Obtener origin del request
        const origin = req.headers.get('origin') || '*';

        // Configurar CORS - permitir localhost y cualquier IP local
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*', // Allow all origins for development
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true'
        };

        // Manejar preflight OPTIONS
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: corsHeaders
          });
        }

        // Servir config
        if (url.pathname === '/config') {
          const config: any = {
            wsPort: WS_PORT,
            apiPort: PORT
          };

          return new Response(JSON.stringify(config), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Servir web-dist (UI embebida)
        try {
          let filePath = url.pathname === '/' ? '/index.html' : url.pathname;

          // Buscar archivos web-dist en múltiples ubicaciones posibles
          const possiblePaths = [
            path.join(process.cwd(), 'web-dist'),           // Desde CWD
            path.join(path.dirname(process.execPath), 'web-dist'), // Desde el directorio del ejecutable
          ];

          for (const basePath of possiblePaths) {
            const fullPath = path.join(basePath, filePath.slice(1));
            try {
              const file = Bun.file(fullPath);
              if (await file.exists()) {
                return new Response(file, {
                  headers: {
                    ...corsHeaders,
                    'Content-Type': this.getContentType(filePath)
                  }
                });
              }
            } catch (error) {
              // Continuar buscando en la siguiente ubicación
            }
          }
        } catch (error) {
          console.error('Error serving web file:', error);
        }

        // Fallback a index.html para SPA - buscar en las mismas ubicaciones
        const possibleIndexPaths = [
          path.join(process.cwd(), 'web-dist', 'index.html'),
          path.join(path.dirname(process.execPath), 'web-dist', 'index.html'),
        ];

        for (const indexPath of possibleIndexPaths) {
          try {
            const indexFile = Bun.file(indexPath);
            if (await indexFile.exists()) {
              return new Response(indexFile, {
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'text/html'
                }
              });
            }
          } catch (error) {
            // Continuar buscando
          }
        }

        // Debug info si no se encuentra nada
        const debugInfo = possibleIndexPaths.map(p => `${p}: ${fs.existsSync(p)}`).join('<br>');
        return new Response(`LibreDeck Frontend Server<br>CWD: ${process.cwd()}<br>execPath: ${process.execPath}<br>execDir: ${path.dirname(process.execPath)}<br><br>Checked paths:<br>${debugInfo}`, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html'
          }
        });
      },
      error: (error) => {
        console.error('Frontend Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    });

    console.log(`🚀 LibreDeck daemon started${DEV_MODE ? ' (DEV MODE)' : ''}`);
    console.log(`📡 API Server: http://localhost:${PORT}`);
    console.log(`🌐 Frontend Server: http://localhost:${FRONTEND_PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${WS_PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);

    // Abrir navegador automáticamente solo en producción
    if (!DEV_MODE) {
      const { spawn } = require('child_process');
      const os = require('os');
      const interfaces = os.networkInterfaces() as any;
      let localIP = 'localhost';
      for (const iface of Object.values(interfaces)) {
        for (const addr of iface as any[]) {
          if (addr.family === 'IPv4' && !addr.internal) {
            localIP = addr.address;
            break;
          }
          if (localIP !== 'localhost') break;
        }
      }
      const frontendPort = process.env.PORT_FRONTEND || FRONTEND_PORT;
      try {
        spawn('cmd', ['/c', 'start', '', `http://${localIP}:${frontendPort}`], { detached: true, stdio: 'ignore' });
      } catch (error) {
        console.error('Failed to open browser:', error);
      }
    }
  }

  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const types: { [key: string]: string } = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'ico': 'image/x-icon'
    };
    return types[ext || ''] || 'text/plain';
  }

  public async stop() {
    if (this.httpServer) {
      this.httpServer.stop();
    }
    if (this.frontendServer) {
      this.frontendServer.stop();
    }
    if (this.wsManager) {
      this.wsManager.close();
    }
    if (this.tray) {
      this.tray.kill();
    }
    console.log('🛑 LibreDeck daemon stopped');
  }
}

// Manejo de señales del sistema
const daemon = new LibreDeckDaemon();

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await daemon.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await daemon.stop();
  process.exit(0);
});

// Iniciar daemon
daemon.start().catch(console.error);
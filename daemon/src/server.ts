import { initDatabase } from './db';
import { WebSocketManager } from './ws';
import { PluginLoader } from './plugin-loader';
import { ActionRunner } from './action-runner';
import { windowWatcher } from './window-watcher';
import { DatabaseService } from './db';
import { setupAPIRoutes } from './api/routes';

const PORT = Number(process.env.PORT) || 3001;
const WS_PORT = Number(process.env.WS_PORT) || 3002;

class LibreDeckDaemon {
  private httpServer?: any;
  private wsManager?: WebSocketManager;
  private pluginLoader?: PluginLoader;
  private actionRunner?: ActionRunner;

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
          console.log('🔄 Starting auto-profile switching with saved configuration');
          console.log('📋 Loaded rules:', config.rules.length);
          
          // Connect window watcher events to WebSocket
          windowWatcher.on('profile-switch', (profileId: string, window: any) => {
            console.log('👤 Auto-switching to profile:', profileId, 'due to window:', window.title);
            this.wsManager?.broadcast('profile.navigate', { profileId }, 'profiles');
          });
          
          windowWatcher.startWatching(config.rules);
        } else {
          console.log('ℹ️ Auto-profile switching disabled or no rules configured');
        }
      } else {
        console.log('ℹ️ No auto-profile configuration found');
      }
    } catch (error) {
      console.error('❌ Failed to initialize auto-profile switching:', error);
    }
  }

  public async start() {
    await this.initializeServices();

    // Crear servidor HTTP con Bun
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
            const file = Bun.file(`../data/assets/${assetPath}`);

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

        return new Response('LibreDeck Daemon API', {
          headers: corsHeaders
        });
      },
      error: (error) => {
        console.error('Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    });

    console.log(`🚀 LibreDeck daemon started`);
    console.log(`📡 HTTP API: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${WS_PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
  }

  public async stop() {
    if (this.httpServer) {
      this.httpServer.stop();
    }
    if (this.wsManager) {
      this.wsManager.close();
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
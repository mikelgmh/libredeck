import { initDatabase } from './db';
import { WebSocketManager } from './ws';
import { PluginLoader } from './plugin-loader';
import { ActionRunner } from './action-runner';
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

      // Configurar WebSocket
      this.wsManager = new WebSocketManager(WS_PORT);

      console.log('✓ Services initialized');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
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
          'Access-Control-Allow-Origin': isLocalOrigin ? origin : 'http://localhost:4321',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
            actionRunner: this.actionRunner!
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
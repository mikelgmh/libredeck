import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './db';
import { windowWatcher } from './window-watcher';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  id?: string;
}

export interface WebSocketClient {
  id: string;
  ws: any; // Bun WebSocket
  subscriptions: Set<string>;
}

export class WebSocketManager {
  private server: any;
  private clients: Map<string, WebSocketClient> = new Map();
  private db: DatabaseService;
  private port: number;

  constructor(port: number) {
    this.port = port;
    this.db = new DatabaseService();
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.server = Bun.serve({
      port: this.port,
      fetch: (req, server) => {
        // Upgrade the request to a WebSocket
        if (server.upgrade(req)) {
          return; // do not return a Response
        }
        return new Response('WebSocket server', { status: 200 });
      },
      websocket: {
        message: (ws: any, message: string) => {
          try {
            const clientData = this.getClientByWs(ws);
            if (clientData) {
              const parsedMessage: WebSocketMessage = JSON.parse(message);
              this.handleClientMessage(clientData.id, parsedMessage);
            }
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Invalid message format' }
            }));
          }
        },
        open: (ws: any) => {
          const clientId = uuidv4();
          const client: WebSocketClient = {
            id: clientId,
            ws,
            subscriptions: new Set()
          };

          this.clients.set(clientId, client);

          // Enviar mensaje de bienvenida
          ws.send(JSON.stringify({
            type: 'connected',
            payload: { clientId, timestamp: Date.now() }
          }));
        },
        close: (ws: any) => {
          const clientData = this.getClientByWs(ws);
          if (clientData) {
            this.clients.delete(clientData.id);
          }
        }
      }
    });

  }

  private getClientByWs(ws: any): WebSocketClient | null {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return null;
  }

  private handleClientMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.payload?.topics || []);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.payload?.topics || []);
        break;

      case 'button.press':
        this.handleButtonPress(clientId, message.payload);
        break;

      case 'page.select':
        const { pageId } = message.payload;
        console.log('📨 Received page.select:', { pageId, clientId })
        // Broadcast to all other subscribed clients (exclude sender)
        this.clients.forEach((otherClient, otherClientId) => {
          if (otherClientId !== clientId && otherClient.subscriptions.has('pages')) {
            console.log('📤 Broadcasting page.navigate to client:', otherClientId)
            this.sendToClient(otherClientId, {
              type: 'page.navigate',
              payload: { pageId },
              id: uuidv4()
            });
          }
        });
        break;

      case 'profile.select':
        const { profileId } = message.payload;
        // Update current profile in window watcher
        windowWatcher.setCurrentProfile(profileId);
        // Broadcast to all other subscribed clients (exclude sender)
        this.clients.forEach((otherClient, otherClientId) => {
          if (otherClientId !== clientId && otherClient.subscriptions.has('profiles')) {
            this.sendToClient(otherClientId, {
              type: 'profile.navigate',
              payload: { profileId },
              id: uuidv4()
            });
          }
        });
        break;

      default:
        this.sendToClient(clientId, {
          type: 'error',
          payload: { message: `Unknown message type: ${message.type}` }
        });
    }
  }

  private handleSubscription(clientId: string, topics: string[]) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log('📋 Client', clientId, 'subscribing to topics:', topics)
    topics.forEach(topic => {
      client.subscriptions.add(topic);
    });

    console.log('✅ Client', clientId, 'subscriptions:', Array.from(client.subscriptions))
    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: { topics, subscriptions: Array.from(client.subscriptions) }
    });
  }

  private handleUnsubscription(clientId: string, topics: string[]) {
    const client = this.clients.get(clientId);
    if (!client) return;

    topics.forEach(topic => {
      client.subscriptions.delete(topic);
    });

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      payload: { topics, subscriptions: Array.from(client.subscriptions) }
    });
  }

  private async handleButtonPress(clientId: string, payload: any) {
    const { buttonId, pageId, profileId, pressType = 'short' } = payload;

    // Log del evento
    this.db.addLog({
      level: 'info',
      message: `Button pressed: ${buttonId}`,
      meta: { clientId, pageId, profileId, pressType },
      ts: Date.now()
    });

    // Emitir evento a clientes suscritos
    this.broadcast('button.pressed', {
      buttonId,
      pageId,
      profileId,
      pressType,
      timestamp: Date.now(),
      clientId
    });
  }

  // Métodos públicos para enviar eventos desde otras partes del daemon
  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      return false;
    }
  }

  public broadcast(eventType: string, payload: any, topic?: string): void {
    const message: WebSocketMessage = {
      type: eventType,
      payload,
      id: uuidv4()
    };

    this.clients.forEach((client, clientId) => {
      // Si hay un topic específico, solo enviar a clientes suscritos
      if (topic && !client.subscriptions.has(topic)) {
        return;
      }

      this.sendToClient(clientId, message);
    });
  }

  public broadcastProfileUpdate(profileId: string, profile: any): void {
    this.broadcast('profile.updated', { profileId, profile }, 'profiles');
  }

  public broadcastPageCreated(pageId: string, page: any): void {
    this.broadcast('page.created', { pageId, page }, 'pages');
  }

  public broadcastPageUpdate(pageId: string, page: any): void {
    this.broadcast('page.updated', { pageId, page }, 'pages');
  }

  public broadcastPageDeleted(pageId: string): void {
    this.broadcast('page.deleted', { pageId }, 'pages');
  }

  public broadcastButtonUpdate(buttonId: string, button: any): void {
    this.broadcast('button.updated', { buttonId, button }, 'buttons');
  }

  public broadcastButtonDeleted(buttonId: string): void {
    this.broadcast('button.deleted', { buttonId }, 'buttons');
  }

  public broadcastActionStarted(actionId: string, context: any): void {
    this.broadcast('action.started', { actionId, context, timestamp: Date.now() });
  }

  public broadcastActionFinished(actionId: string, result: any): void {
    this.broadcast('action.finished', { actionId, result, timestamp: Date.now() });
  }

  public broadcastActionError(actionId: string, error: any): void {
    this.broadcast('action.error', { actionId, error, timestamp: Date.now() });
  }

  public broadcastPluginInstalled(pluginId: string, plugin: any): void {
    this.broadcast('plugin.installed', { pluginId, plugin }, 'plugins');
  }

  public broadcastPluginEnabled(pluginId: string, enabled: boolean): void {
    this.broadcast('plugin.enabled', { pluginId, enabled }, 'plugins');
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getClientSubscriptions(clientId: string): string[] {
    const client = this.clients.get(clientId);
    return client ? Array.from(client.subscriptions) : [];
  }

  public close(): void {
    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();
    if (this.server) {
      this.server.stop();
    }
  }
}
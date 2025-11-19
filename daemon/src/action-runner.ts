import { v4 as uuidv4 } from 'uuid';
import { PluginLoader } from './plugin-loader';
import { DatabaseService } from './db';
import {
  MultimediaPlugin,
  ShellPlugin,
  HttpPlugin,
  UtilityPlugin,
  HotkeyPlugin,
  TypeTextPlugin,
  OpenAppPlugin,
  PagePlugin,
  BrowserPlugin,
  PCVitalsPlugin,
  type NativePlugin
} from './plugins';

export interface ActionDescriptor {
  id?: string;
  type: string;
  name?: string;
  parameters?: Record<string, any>;
  cooldown?: number;
  timeout?: number;
}

export interface ActionContext {
  buttonId?: string;
  pageId?: string;
  profileId?: string;
  userId?: string;
  timestamp: number;
  pressType?: 'short' | 'long' | 'double';
}

export interface ActionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

export class ActionRunner {
  private pluginLoader: PluginLoader;
  private db: DatabaseService;
  private runningActions: Map<string, Promise<ActionResult>> = new Map();
  private actionHandlers: Map<string, Function> = new Map();
  private lastExecution: Map<string, number> = new Map();
  private nativePlugins: NativePlugin[] = [];

  constructor(pluginLoader: PluginLoader) {
    this.pluginLoader = pluginLoader;
    this.db = new DatabaseService();
    this.loadNativePlugins();
    this.setupBuiltInActions();
  }

  private loadNativePlugins() {
    console.log('🔌 Loading native plugins...');

    // Create plugin context for logging
    const pluginContext = {
      log: (level: string, message: string, meta?: any) => {
        this.db.addLog({ level, message, meta, ts: Date.now() });
      }
    };

    // Load all native plugins
    const multimediaPlugin = new MultimediaPlugin(pluginContext);
    const shellPlugin = new ShellPlugin(pluginContext);
    const httpPlugin = new HttpPlugin(pluginContext);
    const utilityPlugin = new UtilityPlugin(pluginContext);
    const hotkeyPlugin = new HotkeyPlugin(pluginContext);
    const typeTextPlugin = new TypeTextPlugin(pluginContext);
    const openAppPlugin = new OpenAppPlugin(pluginContext);
    const pagePlugin = new PagePlugin(pluginContext);
    const browserPlugin = new BrowserPlugin(pluginContext);
    const pcVitalsPlugin = new PCVitalsPlugin(pluginContext);

    // Set action executor for utility plugin
    utilityPlugin.setActionExecutor(this.executeAction.bind(this));

    this.nativePlugins.push(
      multimediaPlugin,
      shellPlugin,
      httpPlugin,
      utilityPlugin,
      hotkeyPlugin,
      typeTextPlugin,
      openAppPlugin,
      pagePlugin,
      browserPlugin,
      pcVitalsPlugin
    );

    // Register all action handlers from native plugins
    for (const plugin of this.nativePlugins) {
      const manifest = plugin.getManifest();
      const handlers = plugin.getActionHandlers();

      for (const [actionType, handler] of handlers.entries()) {
        this.registerAction(`${manifest.id}.${actionType}`, handler);
      }

      console.log(`✓ Loaded native plugin: ${manifest.name} v${manifest.version}`);
    }
  }

  private setupBuiltInActions() {
    // All actions are now handled by native plugins
    // This method is kept for future non-plugin actions if needed
  }

  public registerAction(actionType: string, handler: Function): void {
    this.actionHandlers.set(actionType, handler);
    console.log(`✓ Registered action handler: ${actionType}`);
  }

  public async executeAction(
    action: ActionDescriptor,
    context: ActionContext
  ): Promise<ActionResult> {
    const actionId = action.id || uuidv4();
    const startTime = Date.now();

    try {
      // Check cooldown
      if (action.cooldown && this.isOnCooldown(actionId, action.cooldown)) {
        return {
          success: false,
          error: 'Action is on cooldown',
          duration: 0
        };
      }

      // Check if already running (prevent double execution)
      if (this.runningActions.has(actionId)) {
        return {
          success: false,
          error: 'Action is already running',
          duration: 0
        };
      }

      console.log(`🎬 Executing action: ${action.type}`, action.parameters);

      // Log action start
      this.db.addLog({
        level: 'info',
        message: `Action started: ${action.type}`,
        meta: { action, context },
        ts: startTime
      });

      // Create execution promise
      const executionPromise = this.doExecuteAction(action, context);
      this.runningActions.set(actionId, executionPromise);

      // Execute with timeout
      const result = await this.executeWithTimeout(
        executionPromise,
        action.timeout || 30000 // 30s default timeout
      );

      const duration = Date.now() - startTime;

      // Update last execution time
      this.lastExecution.set(actionId, startTime);

      // Log result
      this.db.addLog({
        level: result.success ? 'info' : 'error',
        message: `Action ${result.success ? 'completed' : 'failed'}: ${action.type}`,
        meta: { action, context, result, duration },
        ts: Date.now()
      });

      return {
        ...result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.db.addLog({
        level: 'error',
        message: `Action error: ${action.type} - ${errorMessage}`,
        meta: { action, context, error: errorMessage },
        ts: Date.now()
      });

      return {
        success: false,
        error: errorMessage,
        duration
      };
    } finally {
      this.runningActions.delete(actionId);
    }
  }

  private async doExecuteAction(
    action: ActionDescriptor,
    context: ActionContext
  ): Promise<ActionResult> {
    let handler = this.actionHandlers.get(action.type);

    // Fallback for plugin.action format - try base action type
    if (!handler && action.type.includes('.')) {
      const baseType = action.type.split('.')[1];
      handler = this.actionHandlers.get(baseType);
    }

    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`);
    }

    const result = await handler(action.parameters || {}, context);

    return {
      success: true,
      result,
      duration: 0 // Will be set by caller
    };
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Action timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private isOnCooldown(actionId: string, cooldownMs: number): boolean {
    const lastExecution = this.lastExecution.get(actionId);
    if (!lastExecution) return false;

    return (Date.now() - lastExecution) < cooldownMs;
  }

  // Built-in action implementations

  // Public methods for management

  public getRunningActions(): string[] {
    return Array.from(this.runningActions.keys());
  }

  public getNativePlugins(): NativePlugin[] {
    return this.nativePlugins;
  }

  public async cancelAction(actionId: string): Promise<boolean> {
    const runningAction = this.runningActions.get(actionId);
    if (!runningAction) {
      return false;
    }

    // TODO: Implement action cancellation
    this.runningActions.delete(actionId);

    this.db.addLog({
      level: 'info',
      message: `Action cancelled: ${actionId}`,
      meta: { actionId },
      ts: Date.now()
    });

    return true;
  }

  public getActionStats(): any {
    return {
      running: this.runningActions.size,
      registered: this.actionHandlers.size,
      lastExecutions: Object.fromEntries(this.lastExecution)
    };
  }

  public dispose(): void {
    console.log('🧹 Cleaning up ActionRunner...');

    // Dispose all native plugins
    for (const plugin of this.nativePlugins) {
      plugin.dispose();
    }

    this.nativePlugins = [];
    this.actionHandlers.clear();
    this.runningActions.clear();
    this.lastExecution.clear();
  }
}
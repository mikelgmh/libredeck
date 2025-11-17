import { v4 as uuidv4 } from 'uuid';
import { PluginLoader } from './plugin-loader';
import { DatabaseService } from './db';

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

  constructor(pluginLoader: PluginLoader) {
    this.pluginLoader = pluginLoader;
    this.db = new DatabaseService();
    this.setupBuiltInActions();
  }

  private setupBuiltInActions() {
    // Built-in action types
    this.registerAction('shell', this.executeShellAction.bind(this));
    this.registerAction('http', this.executeHttpAction.bind(this));
    this.registerAction('delay', this.executeDelayAction.bind(this));
    this.registerAction('sequence', this.executeSequenceAction.bind(this));
    this.registerAction('hotkey', this.executeHotkeyAction.bind(this));
    this.registerAction('multimedia', this.executeMultimediaAction.bind(this));
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
    const handler = this.actionHandlers.get(action.type);
    
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
  
  private async executeShellAction(params: any, context: ActionContext): Promise<any> {
    const { command, args = [], cwd } = params;
    
    if (!command) {
      throw new Error('Shell command is required');
    }

    // Security: Only allow whitelisted commands in production
    // TODO: Implement command whitelist based on permissions
    
    try {
      const proc = Bun.spawn({
        cmd: [command, ...args],
        cwd: cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();
      
      await proc.exited;
      
      return {
        stdout: output,
        stderr: error,
        exitCode: proc.exitCode
      };
    } catch (error) {
      throw new Error(`Shell execution failed: ${error}`);
    }
  }

  private async executeHttpAction(params: any, context: ActionContext): Promise<any> {
    const { url, method = 'GET', headers = {}, body } = params;
    
    if (!url) {
      throw new Error('URL is required for HTTP action');
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    };
  }

  private async executeDelayAction(params: any, context: ActionContext): Promise<any> {
    const { duration = 1000 } = params;
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    return { delayed: duration };
  }

  private async executeSequenceAction(params: any, context: ActionContext): Promise<any> {
    const { actions = [] } = params;
    const results = [];
    
    for (const subAction of actions) {
      const result = await this.executeAction(subAction, context);
      results.push(result);
      
      // Stop sequence if any action fails and failFast is true
      if (!result.success && params.failFast) {
        break;
      }
    }
    
    return { results };
  }

  private async executeHotkeyAction(params: any, context: ActionContext): Promise<any> {
    // TODO: Implement hotkey simulation using native libraries
    const { keys, modifiers = [] } = params;
    
    console.log(`Hotkey simulation: ${modifiers.join('+')}+${keys}`);
    
    return {
      keys,
      modifiers,
      simulated: true
    };
  }

  private async executeMultimediaAction(params: any, context: ActionContext): Promise<any> {
    // TODO: Implement multimedia controls
    const { action } = params; // play, pause, next, prev, volumeUp, volumeDown, mute
    
    console.log(`Multimedia action: ${action}`);
    
    return {
      action,
      executed: true
    };
  }

  // Public methods for management

  public getRunningActions(): string[] {
    return Array.from(this.runningActions.keys());
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
}
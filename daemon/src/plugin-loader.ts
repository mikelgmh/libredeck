import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './db';
import chokidar from 'chokidar';
import { getPluginsDir } from './paths';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions: string[];
  actions: PluginAction[];
  ui?: {
    components?: string[];
    routes?: string[];
  };
}

export interface PluginAction {
  id: string;
  name: string;
  description?: string;
  schema?: any; // JSON Schema for action parameters
  icon?: string;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  module: any;
  path: string;
  enabled: boolean;
}

export class PluginLoader {
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();
  private pluginActions: Map<string, PluginAction> = new Map();
  private db: DatabaseService;
  private watcher?: chokidar.FSWatcher;

  constructor() {
    this.db = new DatabaseService();
    this.setupPluginWatcher();
  }

  private setupPluginWatcher() {
    // Watch for plugin changes in development mode
    const pluginsDir = getPluginsDir();
    this.watcher = chokidar.watch(pluginsDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    this.watcher
      .on('add', path => this.handlePluginFileChange(path, 'add'))
      .on('change', path => this.handlePluginFileChange(path, 'change'))
      .on('unlink', path => this.handlePluginFileChange(path, 'unlink'));
  }

  private async handlePluginFileChange(path: string, event: string) {
    console.log(`Plugin file ${event}: ${path}`);
    
    // Reload plugin if it's a manifest or main file
    if (path.includes('manifest.json') || path.includes('main.js')) {
      const pluginDir = path.split('/').slice(-2, -1)[0]; // Get plugin directory name
      await this.reloadPlugin(pluginDir);
    }
  }

  public async loadAllPlugins(): Promise<void> {
    console.log('🔌 Loading plugins...');
    
    const pluginsFromDB = this.db.getEnabledPlugins();
    
    for (const pluginRecord of pluginsFromDB) {
      try {
        await this.loadPlugin(pluginRecord.id);
      } catch (error) {
        console.error(`Failed to load plugin ${pluginRecord.id}:`, error);
      }
    }
    
    console.log(`✓ Loaded ${this.loadedPlugins.size} plugins`);
  }

  public async loadPlugin(pluginId: string): Promise<boolean> {
    try {
      // Check if this is a built-in plugin (stored in database)
      const pluginRecord = this.db.getEnabledPlugins().find(p => p.id === pluginId);
      
      if (pluginRecord) {
        // Load built-in plugin
        return await this.loadBuiltInPlugin(pluginRecord);
      } else {
        // Load external plugin from file system
        return await this.loadExternalPlugin(pluginId);
      }
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      return false;
    }
  }

  private async loadBuiltInPlugin(pluginRecord: any): Promise<boolean> {
    try {
      const manifest = JSON.parse(pluginRecord.manifest);
      
      if (!this.validateManifest(manifest)) {
        throw new Error(`Invalid plugin manifest for ${pluginRecord.id}`);
      }

      // For built-in plugins, we don't need to import them as they're already loaded by ActionRunner
      // Just register their actions in our action registry
      
      // Create loaded plugin record
      const loadedPlugin: LoadedPlugin = {
        manifest,
        module: {
          register: (api: any) => {
            // For built-in plugins, the registration happens through ActionRunner
            console.log(`Built-in plugin ${pluginRecord.id} registered`);
          }
        },
        path: `built-in/${pluginRecord.id}`,
        enabled: true
      };

      // Register plugin actions
      manifest.actions.forEach(action => {
        const fullActionId = `${pluginRecord.id}.${action.id}`;
        this.pluginActions.set(fullActionId, {
          ...action,
          id: fullActionId
        });
      });

      this.loadedPlugins.set(pluginRecord.id, loadedPlugin);
      
      console.log(`✓ Loaded built-in plugin: ${manifest.name} v${manifest.version}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to load built-in plugin ${pluginRecord.id}:`, error);
      return false;
    }
  }

  private async loadExternalPlugin(pluginId: string): Promise<boolean> {
    const pluginsDir = getPluginsDir();
    const pluginPath = `${pluginsDir}/${pluginId}`;
    
    try {
      // Check if plugin directory exists
      const manifestFile = Bun.file(`${pluginPath}/manifest.json`);
      if (!(await manifestFile.exists())) {
        throw new Error(`Plugin manifest not found: ${pluginPath}/manifest.json`);
      }

      // Load and validate manifest
      const manifestText = await manifestFile.text();
      const manifest: PluginManifest = JSON.parse(manifestText);
      
      if (!this.validateManifest(manifest)) {
        throw new Error(`Invalid plugin manifest for ${pluginId}`);
      }

      // Load main module
      const mainFile = Bun.file(`${pluginPath}/main.js`);
      if (!(await mainFile.exists())) {
        throw new Error(`Plugin main file not found: ${pluginPath}/main.js`);
      }

      // Import the plugin module
      const moduleUrl = `file://${process.cwd()}/${pluginPath}/main.js`;
      const module = await import(moduleUrl);
      
      if (!module.register || typeof module.register !== 'function') {
        throw new Error(`Plugin ${pluginId} does not export a register function`);
      }

      // Create loaded plugin record
      const loadedPlugin: LoadedPlugin = {
        manifest,
        module,
        path: pluginPath,
        enabled: true
      };

      // Register plugin actions
      manifest.actions.forEach(action => {
        const fullActionId = `${pluginId}.${action.id}`;
        this.pluginActions.set(fullActionId, {
          ...action,
          id: fullActionId
        });
      });

      this.loadedPlugins.set(pluginId, loadedPlugin);
      
      // Initialize plugin with API
      const pluginAPI = this.createPluginAPI(pluginId);
      module.register(pluginAPI);
      
      console.log(`✓ Loaded external plugin: ${manifest.name} v${manifest.version}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to load external plugin ${pluginId}:`, error);
      return false;
    }
  }

  public async reloadPlugin(pluginId: string): Promise<boolean> {
    // Unload existing plugin
    if (this.loadedPlugins.has(pluginId)) {
      this.unloadPlugin(pluginId);
    }
    
    // Reload plugin
    return await this.loadPlugin(pluginId);
  }

  public unloadPlugin(pluginId: string): void {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) return;

    // Remove plugin actions
    plugin.manifest.actions.forEach(action => {
      const fullActionId = `${pluginId}.${action.id}`;
      this.pluginActions.delete(fullActionId);
    });

    // Call unload hook if exists
    if (plugin.module.unload && typeof plugin.module.unload === 'function') {
      try {
        plugin.module.unload();
      } catch (error) {
        console.error(`Error unloading plugin ${pluginId}:`, error);
      }
    }

    this.loadedPlugins.delete(pluginId);
    console.log(`✓ Unloaded plugin: ${pluginId}`);
  }

  private validateManifest(manifest: PluginManifest): boolean {
    return !!(manifest.id && manifest.name && manifest.version && 
             Array.isArray(manifest.permissions) && Array.isArray(manifest.actions));
  }

  private createPluginAPI(pluginId: string) {
    return {
      // Event system
      emitEvent: (eventName: string, payload: any) => {
        // TODO: Implement event emission to WebSocket
        console.log(`Plugin ${pluginId} emitted event: ${eventName}`, payload);
      },
      
      // Storage for plugin-specific data
      getSetting: (key: string) => {
        return this.db.getSetting(`plugin.${pluginId}.${key}`);
      },
      
      setSetting: (key: string, value: string) => {
        this.db.setSetting(`plugin.${pluginId}.${key}`, value);
      },
      
      // Logging
      log: (level: string, message: string, meta?: any) => {
        this.db.addLog({
          level,
          message: `[${pluginId}] ${message}`,
          meta: { pluginId, ...meta },
          ts: Date.now()
        });
      },
      
      // HTTP utilities (restricted)
      http: {
        request: async (url: string, options: any = {}) => {
          // TODO: Implement with permission checks
          const response = await fetch(url, options);
          return response;
        }
      },
      
      // Register action handlers
      onAction: (actionId: string, handler: Function) => {
        const fullActionId = `${pluginId}.${actionId}`;
        // TODO: Store action handler for execution
        console.log(`Registered action handler: ${fullActionId}`);
      }
    };
  }

  // Public getters
  public getLoadedPlugins(): Map<string, LoadedPlugin> {
    return this.loadedPlugins;
  }

  public getPluginActions(): Map<string, PluginAction> {
    return this.pluginActions;
  }

  public getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  public getAction(actionId: string): PluginAction | undefined {
    return this.pluginActions.get(actionId);
  }

  public async installPluginFromZip(zipPath: string): Promise<string> {
    // TODO: Implement ZIP extraction and installation
    throw new Error('Not implemented yet');
  }

  public async uninstallPlugin(pluginId: string): Promise<boolean> {
    // Unload from memory
    this.unloadPlugin(pluginId);
    
    // Remove from database
    const stmt = this.db.getDatabase().prepare('DELETE FROM plugins WHERE id = ?');
    stmt.run(pluginId);
    
    // TODO: Remove plugin files from disk
    
    console.log(`✓ Uninstalled plugin: ${pluginId}`);
    return true;
  }

  public dispose(): void {
    if (this.watcher) {
      this.watcher.close();
    }
    
    // Unload all plugins
    for (const pluginId of this.loadedPlugins.keys()) {
      this.unloadPlugin(pluginId);
    }
  }
}
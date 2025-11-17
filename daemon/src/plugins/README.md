# Native Plugins

Native plugins are TypeScript plugins that are bundled with LibreDeck and have full access to the system.

## Architecture

Native plugins are different from user-installed plugins:

- **Native Plugins** (`daemon/src/plugins/`): TypeScript code compiled with the daemon, full system access
- **User Plugins** (`data/plugins/`): JavaScript code loaded at runtime, sandboxed

## Creating a Native Plugin

### 1. Create Plugin File

Create a new file in `daemon/src/plugins/` with the pattern `*.plugin.ts`:

```typescript
export interface PluginContext {
  log: (level: string, message: string, meta?: any) => void
}

export class MyPlugin {
  private context: PluginContext

  constructor(context: PluginContext) {
    this.context = context
  }

  /**
   * Plugin metadata
   */
  public getManifest() {
    return {
      id: 'my-plugin',
      name: 'My Plugin',
      version: '1.0.0',
      description: 'Description of what the plugin does',
      author: 'Your Name',
      native: true,
      actions: [
        {
          id: 'my-action',
          name: 'My Action',
          description: 'What this action does',
          schema: {
            type: 'object',
            properties: {
              parameter1: {
                type: 'string',
                description: 'Description of parameter1'
              }
            },
            required: ['parameter1']
          }
        }
      ]
    }
  }

  /**
   * Get action handlers
   */
  public getActionHandlers(): Map<string, any> {
    const handlers = new Map()
    handlers.set('my-action', this.executeMyAction.bind(this))
    return handlers
  }

  /**
   * Execute action
   */
  private async executeMyAction(params: any, context: any): Promise<any> {
    const { parameter1 } = params
    
    this.context.log('info', `Executing my action with: ${parameter1}`)
    
    // Your action logic here
    
    return {
      success: true,
      result: 'Action completed'
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Cleanup if needed
  }
}
```

### 2. Register in Index

Add your plugin to `index.ts`:

```typescript
import { MyPlugin } from './my-plugin.plugin'

export { MyPlugin, MultimediaPlugin }

export function getNativePlugins(): NativePlugin[] {
  return [
    // Will be auto-loaded by ActionRunner
  ]
}
```

### 3. Load in ActionRunner

The plugin will be automatically loaded by `ActionRunner` in the `loadNativePlugins()` method.

To add a new plugin, modify `daemon/src/action-runner.ts`:

```typescript
private loadNativePlugins() {
  // ... existing code ...
  
  // Load your plugin
  const myPlugin = new MyPlugin(pluginContext);
  this.nativePlugins.push(myPlugin);
  
  // Register handlers
  for (const plugin of this.nativePlugins) {
    // ... existing code ...
  }
}
```

## Plugin Context

The `PluginContext` provides utilities for plugins:

- `log(level, message, meta?)` - Log to database with level: 'info', 'warn', 'error'

## Action Schema

Use JSON Schema to define action parameters:

```typescript
schema: {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      format: 'uri',
      description: 'The URL to open'
    },
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET'
    }
  },
  required: ['url']
}
```

## Examples

See `multimedia.plugin.ts` for a complete example of:
- Cross-platform support (Windows, macOS, Linux)
- Command execution with Bun.spawn
- Error handling
- Logging

## Best Practices

1. **Error Handling**: Always wrap execution in try-catch and throw meaningful errors
2. **Logging**: Use `context.log()` for all significant events
3. **Cleanup**: Implement `dispose()` to clean up resources (timers, file handles, etc.)
4. **Cross-platform**: Check `process.platform` and provide implementations for each OS when possible
5. **Type Safety**: Use TypeScript types for all parameters and return values
6. **Documentation**: Document all parameters in the action schema

## Testing

Test your plugin by:

1. Restarting the daemon: `./dev.sh dev`
2. Check logs for plugin loading: `✓ Loaded native plugin: My Plugin v1.0.0`
3. Create a button with your action in the UI
4. Execute the action and check logs for success/errors

## Future Improvements

- Hot reload for native plugins during development
- Plugin API for more system features (filesystem, network, etc.)
- Plugin dependencies and inter-plugin communication
- Performance monitoring and profiling

/**
 * Native Shell Plugin
 * Execute shell commands and scripts
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class ShellPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'shell',
            name: 'Shell Commands',
            version: '1.0.0',
            description: 'Execute shell commands and scripts',
            author: 'LibreDeck',
            native: true,
            actions: [
                {
                    id: 'shell',
                    name: 'Shell Command',
                    description: 'Execute a shell command',
                    schema: {
                        type: 'object',
                        properties: {
                            command: {
                                type: 'string',
                                description: 'The command to execute'
                            },
                            args: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Command arguments',
                                default: []
                            },
                            cwd: {
                                type: 'string',
                                description: 'Working directory for the command'
                            }
                        },
                        required: ['command']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('shell', this.executeShellAction.bind(this))
        return handlers
    }

    private async executeShellAction(params: any, context: any): Promise<any> {
        const { command, args = [], cwd } = params

        if (!command) {
            throw new Error('Shell command is required')
        }

        this.context.log('info', `Executing shell command: ${command}`, { args, cwd })

        // Security: Only allow whitelisted commands in production
        // TODO: Implement command whitelist based on permissions

        try {
            const proc = Bun.spawn({
                cmd: [command, ...args],
                cwd: cwd || process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe']
            })

            const output = await new Response(proc.stdout).text()
            const error = await new Response(proc.stderr).text()

            await proc.exited

            this.context.log('info', `Shell command completed: ${command}`, {
                exitCode: proc.exitCode,
                hasOutput: !!output,
                hasError: !!error
            })

            return {
                stdout: output,
                stderr: error,
                exitCode: proc.exitCode
            }
        } catch (error) {
            this.context.log('error', `Shell command failed: ${error}`, { command })
            throw new Error(`Shell execution failed: ${error}`)
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}

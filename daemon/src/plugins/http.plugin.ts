/**
 * Native HTTP Plugin
 * Make HTTP requests
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class HttpPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'http',
            name: 'HTTP Requests',
            version: '1.0.0',
            description: 'Make HTTP/HTTPS requests to APIs and webhooks',
            author: 'LibreDeck',
            permissions: ['http', 'network'],
            actions: [
                {
                    id: 'http',
                    name: 'HTTP Request',
                    description: 'Make an HTTP request',
                    icon: 'Globe',
                    schema: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                format: 'uri',
                                description: 'The URL to request'
                            },
                            method: {
                                type: 'string',
                                enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                                default: 'GET',
                                description: 'HTTP method'
                            },
                            headers: {
                                type: 'object',
                                description: 'HTTP headers',
                                default: {}
                            },
                            body: {
                                description: 'Request body (for POST/PUT/PATCH)',
                                default: null
                            }
                        },
                        required: ['url']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('http', this.executeHttpAction.bind(this))
        return handlers
    }

    private async executeHttpAction(params: any, context: any): Promise<any> {
        const { url, method = 'GET', headers = {}, body } = params

        if (!url) {
            throw new Error('URL is required for HTTP action')
        }

        this.context.log('info', `Making HTTP request: ${method} ${url}`)

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            })

            const responseBody = await response.text()

            this.context.log('info', `HTTP request completed: ${method} ${url}`, {
                status: response.status,
                statusText: response.statusText
            })

            return {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: responseBody
            }
        } catch (error) {
            this.context.log('error', `HTTP request failed: ${error}`, { url, method })
            throw error
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}

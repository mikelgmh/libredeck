/**
 * PC Vitals Plugin
 * Monitor system metrics like CPU, GPU, RAM usage and temperatures
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class PCVitalsPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'pc-vitals',
            name: 'PC Vitals',
            version: '1.0.0',
            description: 'Monitor system metrics like CPU, GPU, RAM usage and temperatures',
            author: 'LibreDeck',
            permissions: ['system', 'monitoring'],
            actions: [
                {
                    id: 'monitor',
                    name: 'Monitor PC Metric',
                    description: 'Display real-time system metrics on button',
                    icon: 'Activity',
                    dynamic: true,
                    schema: {
                        type: 'object',
                        properties: {
                            component: {
                                type: 'string',
                                title: 'Component',
                                description: 'System component to monitor',
                                enum: ['cpu', 'ram', 'gpu'],
                                default: 'cpu',
                                ui: {
                                    component: 'select',
                                    options: [
                                        { value: 'cpu', label: 'CPU' },
                                        { value: 'ram', label: 'RAM' },
                                        { value: 'gpu', label: 'GPU' }
                                    ]
                                }
                            },
                            metric: {
                                type: 'string',
                                title: 'Metric',
                                description: 'What to measure',
                                enum: ['usage', 'temperature'],
                                default: 'usage',
                                ui: {
                                    component: 'select',
                                    options: [
                                        { value: 'usage', label: 'Usage %' },
                                        { value: 'temperature', label: 'Temperature °C' }
                                    ]
                                }
                            },
                            updateInterval: {
                                type: 'number',
                                title: 'Update Interval (ms)',
                                description: 'How often to update the metric',
                                default: 1000,
                                minimum: 500,
                                maximum: 10000,
                                ui: {
                                    component: 'input',
                                    type: 'number',
                                    min: 500,
                                    max: 10000,
                                    placeholder: '1000'
                                }
                            }
                        },
                        required: ['component', 'metric']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('monitor', this.monitorVitals.bind(this))
        return handlers
    }

    private async monitorVitals(params: any, context: any): Promise<any> {
        const { component, metric, updateInterval = 1000 } = params

        if (!component || !metric) {
            throw new Error('Component and metric are required for PC vitals monitoring')
        }

        this.context.log('info', `Monitoring ${component} ${metric}`, { component, metric, updateInterval })

        try {
            // Fetch current system metrics
            const response = await fetch('http://localhost:3001/api/v1/system/metrics')
            if (!response.ok) {
                throw new Error(`Failed to fetch system metrics: ${response.status}`)
            }

            const metrics = await response.json()

            // Extract the requested metric
            let value: number | null = null
            let unit = ''

            switch (component) {
                case 'cpu':
                    if (metric === 'usage') {
                        value = metrics.cpu.usage
                        unit = '%'
                    } else if (metric === 'temperature') {
                        value = metrics.cpu.temperature
                        unit = '°C'
                    }
                    break
                case 'ram':
                    if (metric === 'usage') {
                        value = metrics.ram.usage
                        unit = '%'
                    }
                    break
                case 'gpu':
                    if (metric === 'usage') {
                        value = metrics.gpu.usage
                        unit = '%'
                    } else if (metric === 'temperature') {
                        value = metrics.gpu.temperature
                        unit = '°C'
                    }
                    break
            }

            if (value === null) {
                return {
                    component,
                    metric,
                    value: 'N/A',
                    unit,
                    updateInterval,
                    monitored: true,
                    description: `${component.toUpperCase()} ${metric} not available`
                }
            }

            return {
                component,
                metric,
                value: Math.round(value * 10) / 10, // Round to 1 decimal place
                unit,
                updateInterval,
                monitored: true,
                description: `${component.toUpperCase()} ${metric}: ${value}${unit}`
            }
        } catch (error) {
            this.context.log('error', `Failed to monitor PC vitals: ${error}`, { component, metric })
            return {
                component,
                metric,
                value: 'Error',
                unit: '',
                updateInterval,
                monitored: false,
                description: `Error monitoring ${component} ${metric}`
            }
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}
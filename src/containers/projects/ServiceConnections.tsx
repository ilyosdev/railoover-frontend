import { Component } from 'react'
import { IAppDef } from '../apps/AppDefinition'
import '../../styles/project-dashboard.css'

interface ServiceNode {
    id: string
    name: string
    type: string
    x: number
    y: number
    color: string
}

interface ServiceConnection {
    from: string
    to: string
}

interface ServiceConnectionsProps {
    services: IAppDef[]
    onServiceClick?: (serviceName: string) => void
}

export default class ServiceConnectionsVisualization extends Component<ServiceConnectionsProps> {
    private detectServiceType(service: IAppDef): string {
        const tags = service.tags || []
        const knownTypes = ['frontend', 'backend', 'database', 'worker']
        const typeTag = tags.find((t) =>
            knownTypes.includes(t.tagName?.toLowerCase())
        )
        if (typeTag) {
            return typeTag.tagName.toLowerCase()
        }

        const name = (service.appName || '').toLowerCase()

        if (
            name.includes('postgres') ||
            name.includes('mysql') ||
            name.includes('mongo') ||
            name.includes('redis') ||
            name.includes('db') ||
            name.includes('database')
        ) {
            return 'database'
        }

        if (
            name.includes('frontend') ||
            name.includes('front') ||
            name.includes('web') ||
            name.includes('ui') ||
            name.includes('client')
        ) {
            return 'frontend'
        }

        if (
            name.includes('worker') ||
            name.includes('queue') ||
            name.includes('job') ||
            name.includes('cron')
        ) {
            return 'worker'
        }

        return 'backend'
    }

    private getServiceColor(type: string): string {
        const colors: Record<string, string> = {
            frontend: '#8b5cf6',
            backend: '#3b82f6',
            database: '#10b981',
            worker: '#f59e0b',
        }
        return colors[type] || '#3b82f6'
    }

    private buildGraph(): {
        nodes: ServiceNode[]
        connections: ServiceConnection[]
    } {
        const { services } = this.props

        const serviceTypes: Record<string, IAppDef[]> = {
            database: [],
            backend: [],
            frontend: [],
            worker: [],
        }

        services.forEach((service) => {
            const type = this.detectServiceType(service)
            if (serviceTypes[type]) {
                serviceTypes[type].push(service)
            }
        })

        const nodes: ServiceNode[] = []
        const connections: ServiceConnection[] = []

        let currentY = 50
        const layerSpacing = 150
        const nodeSpacing = 20

        const layers: Array<{ type: string; services: IAppDef[] }> = [
            { type: 'database', services: serviceTypes.database },
            { type: 'backend', services: serviceTypes.backend },
            { type: 'frontend', services: serviceTypes.frontend },
            { type: 'worker', services: serviceTypes.worker },
        ].filter((layer) => layer.services.length > 0)

        layers.forEach((layer, layerIndex) => {
            const layerNodeCount = layer.services.length
            const totalWidth = 600
            const nodeWidth = Math.min(
                150,
                (totalWidth - (layerNodeCount - 1) * nodeSpacing) /
                    layerNodeCount
            )
            const startX =
                (800 -
                    (layerNodeCount * nodeWidth +
                        (layerNodeCount - 1) * nodeSpacing)) /
                2

            layer.services.forEach((service, index) => {
                const x = startX + index * (nodeWidth + nodeSpacing)
                nodes.push({
                    id: service.appName || '',
                    name: service.appName || '',
                    type: layer.type,
                    x,
                    y: currentY,
                    color: this.getServiceColor(layer.type),
                })

                if (layerIndex > 0) {
                    const previousLayer = layers[layerIndex - 1]
                    previousLayer.services.forEach((prevService) => {
                        connections.push({
                            from: prevService.appName || '',
                            to: service.appName || '',
                        })
                    })
                }
            })

            currentY += layerSpacing
        })

        return { nodes, connections }
    }

    private renderConnection(
        from: ServiceNode,
        to: ServiceNode,
        index: number
    ): JSX.Element {
        const fromX = from.x + 75
        const fromY = from.y + 60
        const toX = to.x + 75
        const toY = to.y

        const midY = (fromY + toY) / 2

        const pathData = `M ${fromX} ${fromY} 
                         C ${fromX} ${midY}, 
                           ${toX} ${midY}, 
                           ${toX} ${toY}`

        return (
            <g key={`connection-${index}`}>
                <path
                    d={pathData}
                    className="service-connection-line"
                    strokeWidth="2"
                    fill="none"
                    stroke="#404040"
                    markerEnd="url(#arrowhead)"
                />
            </g>
        )
    }

    private renderNode(node: ServiceNode): JSX.Element {
        const nodeWidth = 150
        const nodeHeight = 60

        return (
            <g
                key={node.id}
                className={`service-node ${node.type}`}
                onClick={() => {
                    if (this.props.onServiceClick) {
                        this.props.onServiceClick(node.name)
                    }
                }}
            >
                <rect
                    className="service-node-rect"
                    x={node.x}
                    y={node.y}
                    width={nodeWidth}
                    height={nodeHeight}
                    rx="6"
                    fill="#1a1a1a"
                    stroke={node.color}
                    strokeWidth="1.5"
                />
                <text
                    className="service-node-text"
                    x={node.x + nodeWidth / 2}
                    y={node.y + nodeHeight / 2 - 5}
                    textAnchor="middle"
                    fill="#e5e5e5"
                >
                    {node.name.length > 18
                        ? node.name.substring(0, 15) + '...'
                        : node.name}
                </text>
                <text
                    className="service-node-type"
                    x={node.x + nodeWidth / 2}
                    y={node.y + nodeHeight / 2 + 12}
                    textAnchor="middle"
                    fill="#999"
                >
                    {node.type}
                </text>
            </g>
        )
    }

    render() {
        const { services } = this.props

        if (services.length === 0) {
            return (
                <div className="empty-state">
                    <div className="empty-state-icon">🔗</div>
                    <div className="empty-state-title">
                        No Service Connections
                    </div>
                    <div className="empty-state-description">
                        Add services to see their connections
                    </div>
                </div>
            )
        }

        const { nodes, connections } = this.buildGraph()

        if (nodes.length === 0) {
            return (
                <div className="empty-state">
                    <div className="empty-state-icon">🔗</div>
                    <div className="empty-state-title">
                        No Service Connections
                    </div>
                </div>
            )
        }

        const svgHeight = Math.max(
            400,
            nodes.reduce((max, node) => Math.max(max, node.y), 0) + 100
        )

        return (
            <div className="service-connections-container">
                <div style={{ marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                        Service Architecture
                    </h3>
                    <p
                        style={{
                            margin: '4px 0 0 0',
                            fontSize: 13,
                            color: '#999',
                        }}
                    >
                        Visual representation of service dependencies
                    </p>
                </div>

                <svg
                    className="service-connections-svg"
                    viewBox={`0 0 800 ${svgHeight}`}
                    style={{ maxWidth: '100%', height: 'auto' }}
                >
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="10"
                            refX="9"
                            refY="3"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 10 3, 0 6"
                                fill="#404040"
                                className="service-connection-arrow"
                            />
                        </marker>
                    </defs>

                    {connections.map((conn, index) => {
                        const fromNode = nodes.find((n) => n.id === conn.from)
                        const toNode = nodes.find((n) => n.id === conn.to)
                        if (fromNode && toNode) {
                            return this.renderConnection(
                                fromNode,
                                toNode,
                                index
                            )
                        }
                        return null
                    })}

                    {nodes.map((node) => this.renderNode(node))}
                </svg>
            </div>
        )
    }
}

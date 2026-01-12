import { useCallback, useMemo, useEffect, useRef } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    useNodesState,
    useEdgesState,
    addEdge,
    type Edge,
    type Connection,
    type OnConnect,
    type NodeChange,
    BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button, Tooltip } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import moment from 'moment'
import ServiceNode, { type ServiceNodeType } from './ServiceNode'
import { IAppDef } from '../apps/AppDefinition'
import '../../styles/project-canvas.css'

interface ProjectCanvasProps {
    services: IAppDef[]
    projectId: string
    onServiceClick?: (service: IAppDef) => void
    onAddService?: () => void
    onRefresh?: () => void
}

const POSITION_STORAGE_PREFIX = 'railover_canvas_positions_'

function getSavedPositions(
    projectId: string
): Map<string, { x: number; y: number }> {
    try {
        const saved = localStorage.getItem(POSITION_STORAGE_PREFIX + projectId)
        if (saved) {
            const parsed = JSON.parse(saved)
            return new Map(Object.entries(parsed))
        }
    } catch (e) {
        // Ignore parse errors
    }
    return new Map()
}

function savePositions(
    projectId: string,
    positions: Map<string, { x: number; y: number }>
) {
    try {
        const obj: Record<string, { x: number; y: number }> = {}
        positions.forEach((pos, key) => {
            obj[key] = pos
        })
        localStorage.setItem(
            POSITION_STORAGE_PREFIX + projectId,
            JSON.stringify(obj)
        )
    } catch (e) {
        // Ignore storage errors
    }
}

const nodeTypes = {
    service: ServiceNode,
}

type ServiceType = 'database' | 'web' | 'worker' | 'frontend' | 'backend'

function getDeployedImageName(service: IAppDef): string {
    const deployedVersion = service.deployedVersion || 0
    const versionInfo = service.versions?.find(
        (v) => v.version === deployedVersion
    )
    return versionInfo?.deployedImageName || ''
}

function detectServiceType(service: IAppDef): ServiceType {
    const tags = service.tags || []
    const knownTypes = ['frontend', 'backend', 'database', 'worker']
    const typeTag = tags.find((t) =>
        knownTypes.includes(t.tagName?.toLowerCase())
    )
    if (typeTag) {
        return typeTag.tagName.toLowerCase() as ServiceType
    }

    const name = (service.appName || '').toLowerCase()
    const imageName = getDeployedImageName(service).toLowerCase()

    const dbKeywords = [
        'postgres',
        'mysql',
        'redis',
        'mongodb',
        'mongo',
        'mariadb',
    ]
    if (dbKeywords.some((kw) => name.includes(kw) || imageName.includes(kw))) {
        return 'database'
    }

    const workerKeywords = ['worker', 'cron', 'job', 'queue', 'consumer']
    if (workerKeywords.some((kw) => name.includes(kw))) {
        return 'worker'
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

    return 'backend'
}

function getServiceIcon(service: IAppDef): string {
    const name = (service.appName || '').toLowerCase()
    const tags = service.tags || []

    if (tags.some((t) => t.tagName === 'postgres') || name.includes('postgres'))
        return '🐘'
    if (tags.some((t) => t.tagName === 'mysql') || name.includes('mysql'))
        return '🐬'
    if (tags.some((t) => t.tagName === 'redis') || name.includes('redis'))
        return '🔴'
    if (tags.some((t) => t.tagName === 'mongodb') || name.includes('mongo'))
        return '🍃'
    if (tags.some((t) => t.tagName === 'database')) return '🗄️'

    if (tags.some((t) => ['worker', 'cron', 'job'].includes(t.tagName)))
        return '⚡'

    if (
        name.includes('frontend') ||
        name.includes('front') ||
        name.includes('web') ||
        name.includes('ui')
    )
        return '🌐'
    if (name.includes('api') || name.includes('backend')) return '⚙️'

    return '📦'
}

function getServiceStatus(
    service: IAppDef
): 'running' | 'building' | 'stopped' | 'error' {
    if (service.isAppBuilding) return 'building'
    return 'running'
}

function getLastDeployedTime(service: IAppDef): string | undefined {
    const deployedVersion = service.deployedVersion || 0
    const versionInfo = service.versions?.find(
        (v) => v.version === deployedVersion
    )
    return versionInfo?.timeStamp
        ? moment(versionInfo.timeStamp).fromNow()
        : undefined
}

function generateNodePositions(
    services: IAppDef[]
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()

    const databases = services.filter(
        (s) => detectServiceType(s) === 'database'
    )
    const backends = services.filter((s) => detectServiceType(s) === 'backend')
    const frontends = services.filter(
        (s) => detectServiceType(s) === 'frontend'
    )
    const workers = services.filter((s) => detectServiceType(s) === 'worker')

    const NODE_WIDTH = 280
    const NODE_HEIGHT = 140
    const H_GAP = 60
    const V_GAP = 100

    let currentY = 50

    const placeRow = (items: IAppDef[], y: number) => {
        const totalWidth =
            items.length * NODE_WIDTH + (items.length - 1) * H_GAP
        let startX = Math.max(50, (800 - totalWidth) / 2)

        items.forEach((service, idx) => {
            positions.set(service.appName || '', {
                x: startX + idx * (NODE_WIDTH + H_GAP),
                y,
            })
        })

        return y + NODE_HEIGHT + V_GAP
    }

    if (frontends.length > 0) {
        currentY = placeRow(frontends, currentY)
    }

    if (backends.length > 0) {
        currentY = placeRow(backends, currentY)
    }

    if (workers.length > 0) {
        currentY = placeRow(workers, currentY)
    }

    if (databases.length > 0) {
        placeRow(databases, currentY)
    }

    return positions
}

function getConnectionColor(targetType: ServiceType): string {
    switch (targetType) {
        case 'database':
            return '#10b981'
        case 'frontend':
            return '#8b5cf6'
        case 'backend':
            return '#3b82f6'
        case 'worker':
            return '#f59e0b'
        default:
            return '#64748b'
    }
}

function inferConnections(services: IAppDef[]): Edge[] {
    const edges: Edge[] = []
    const serviceNames = services.map((s) => s.appName || '')
    const serviceMap = new Map(services.map((s) => [s.appName || '', s]))

    services.forEach((service) => {
        const envVars = service.envVars || []

        envVars.forEach((envVar) => {
            const value = envVar.value || ''

            serviceNames.forEach((targetName) => {
                if (
                    targetName !== service.appName &&
                    (value.includes(targetName) ||
                        value
                            .toLowerCase()
                            .includes(
                                targetName.toLowerCase().replace(/-/g, '_')
                            ))
                ) {
                    const edgeId = `${service.appName}-${targetName}`
                    if (!edges.find((e) => e.id === edgeId)) {
                        const targetService = serviceMap.get(targetName)
                        const targetType = targetService
                            ? detectServiceType(targetService)
                            : 'backend'

                        edges.push({
                            id: edgeId,
                            source: service.appName || '',
                            target: targetName,
                            animated: true,
                            style: {
                                stroke: getConnectionColor(targetType),
                                strokeWidth: 2,
                            },
                        })
                    }
                }
            })
        })
    })

    return edges
}

export default function ProjectCanvas({
    services,
    projectId,
    onServiceClick,
    onAddService,
    onRefresh,
}: ProjectCanvasProps) {
    const savedPositions = useRef(getSavedPositions(projectId))
    const generatedPositions = useMemo(
        () => generateNodePositions(services),
        [services]
    )

    const initialNodes: ServiceNodeType[] = useMemo(
        () =>
            services.map((service) => {
                const appName = service.appName || ''
                const pos = savedPositions.current.get(appName) ||
                    generatedPositions.get(appName) || { x: 100, y: 100 }
                return {
                    id: appName,
                    type: 'service',
                    position: pos,
                    data: {
                        label: appName,
                        appName: appName,
                        serviceType: detectServiceType(service),
                        status: getServiceStatus(service),
                        icon: getServiceIcon(service),
                        lastDeployed: getLastDeployedTime(service),
                        onNodeClick: () => onServiceClick?.(service),
                    },
                }
            }),
        [services, generatedPositions, onServiceClick]
    )

    const initialEdges = useMemo(() => inferConnections(services), [services])

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

    const handleNodesChange = useCallback(
        (changes: NodeChange<ServiceNodeType>[]) => {
            onNodesChange(changes)

            const positionChanges = changes.filter(
                (c) => c.type === 'position' && !c.dragging && c.position
            )
            if (positionChanges.length > 0) {
                setNodes((currentNodes) => {
                    const newPositions = new Map(savedPositions.current)
                    currentNodes.forEach((node) => {
                        newPositions.set(node.id, node.position)
                    })
                    savedPositions.current = newPositions
                    savePositions(projectId, newPositions)
                    return currentNodes
                })
            }
        },
        [onNodesChange, setNodes, projectId]
    )

    useEffect(() => {
        savedPositions.current = getSavedPositions(projectId)
    }, [projectId])

    const onConnect: OnConnect = useCallback(
        (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
        [setEdges]
    )

    return (
        <div className="project-canvas-container">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={1.5}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#374151"
                />
                <Controls showInteractive={false} className="canvas-controls" />
                <MiniMap
                    nodeColor={(node) => {
                        const data = node.data as ServiceNodeType['data']
                        switch (data?.serviceType) {
                            case 'database':
                                return '#10b981'
                            case 'frontend':
                                return '#8b5cf6'
                            case 'backend':
                                return '#3b82f6'
                            case 'worker':
                                return '#f59e0b'
                            default:
                                return '#6b7280'
                        }
                    }}
                    maskColor="rgba(0, 0, 0, 0.8)"
                    className="canvas-minimap"
                />
                <Panel position="top-right" className="canvas-panel">
                    <div style={{ display: 'flex', gap: 8 }}>
                        {onRefresh && (
                            <Tooltip title="Refresh">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={onRefresh}
                                />
                            </Tooltip>
                        )}
                        {onAddService && (
                            <Tooltip title="Add Service">
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={onAddService}
                                >
                                    Add Service
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    )
}

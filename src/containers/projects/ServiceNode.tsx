import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Button, Tooltip } from 'antd'
import {
    FileTextOutlined,
    ReloadOutlined,
    SettingOutlined,
} from '@ant-design/icons'

export type ServiceNodeType = Node<
    {
        label: string
        appName: string
        serviceType: 'database' | 'web' | 'worker' | 'frontend' | 'backend'
        status: 'running' | 'building' | 'stopped' | 'error'
        icon: string
        lastDeployed?: string
        onNodeClick?: () => void
        onQuickAction?: (action: 'logs' | 'restart' | 'settings') => void
    },
    'service'
>

function getStatusColor(status: string): string {
    switch (status) {
        case 'running':
            return '#10b981'
        case 'building':
            return '#f59e0b'
        case 'stopped':
            return '#6b7280'
        case 'error':
            return '#ef4444'
        default:
            return '#6b7280'
    }
}

function getTypeColor(serviceType: string): string {
    switch (serviceType) {
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
}

function ServiceNode({ data }: NodeProps<ServiceNodeType>) {
    const statusColor = getStatusColor(data.status)
    const typeColor = getTypeColor(data.serviceType)

    const getGradientBg = (type: string) => {
        switch (type) {
            case 'database':
                return 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)'
            case 'frontend':
                return 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)'
            case 'backend':
                return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)'
            case 'worker':
                return 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)'
            default:
                return 'linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, rgba(75, 85, 99, 0.05) 100%)'
        }
    }

    return (
        <div
            className="service-node"
            onClick={() => data.onNodeClick?.()}
            style={{
                borderColor: typeColor,
                backgroundImage: getGradientBg(data.serviceType),
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="service-node-handle"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="service-node-handle"
            />
            <Handle
                type="target"
                position={Position.Left}
                className="service-node-handle"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="service-node-handle"
            />

            <div
                className="service-node-status"
                style={{ backgroundColor: statusColor }}
                title={data.status}
            />

            <div className="service-node-icon">{data.icon}</div>

            <div className="service-node-info">
                <div className="service-node-name">{data.label}</div>
                <div className="service-node-type" style={{ color: typeColor }}>
                    {data.serviceType.charAt(0).toUpperCase() +
                        data.serviceType.slice(1)}
                </div>
                {data.lastDeployed && (
                    <div className="service-node-deployed">
                        {data.lastDeployed}
                    </div>
                )}
            </div>

            <div className="service-node-actions">
                <Tooltip title="Logs">
                    <Button
                        type="text"
                        size="small"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                            e.stopPropagation()
                            data.onQuickAction?.('logs')
                        }}
                    />
                </Tooltip>
                <Tooltip title="Restart">
                    <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={(e) => {
                            e.stopPropagation()
                            data.onQuickAction?.('restart')
                        }}
                    />
                </Tooltip>
                <Tooltip title="Settings">
                    <Button
                        type="text"
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={(e) => {
                            e.stopPropagation()
                            data.onQuickAction?.('settings')
                        }}
                    />
                </Tooltip>
            </div>
        </div>
    )
}

export default memo(ServiceNode)

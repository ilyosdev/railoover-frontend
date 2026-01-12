import { Button, Tooltip } from 'antd'
import {
    FileTextOutlined,
    ReloadOutlined,
    SettingOutlined,
} from '@ant-design/icons'
import moment from 'moment'
import { IAppDef } from '../apps/AppDefinition'

interface ServiceCardV2Props {
    service: IAppDef
    onClick: () => void
    onQuickAction?: (action: 'logs' | 'restart' | 'settings') => void
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

function getServiceType(service: IAppDef): string {
    const tags = service.tags || []
    const name = (service.appName || '').toLowerCase()

    if (
        tags.some((t) => t.tagName === 'database') ||
        ['postgres', 'mysql', 'redis', 'mongo'].some((db) => name.includes(db))
    ) {
        return 'Database'
    }
    if (tags.some((t) => ['worker', 'cron', 'job'].includes(t.tagName))) {
        return 'Worker'
    }
    return 'Web Service'
}

function getStatusColor(service: IAppDef): string {
    if (service.isAppBuilding) return '#f59e0b'
    return '#10b981'
}

function getStatusLabel(service: IAppDef): string {
    if (service.isAppBuilding) return 'Building'
    return 'Running'
}

export default function ServiceCardV2({
    service,
    onClick,
    onQuickAction,
}: ServiceCardV2Props) {
    const icon = getServiceIcon(service)
    const serviceType = getServiceType(service)
    const statusColor = getStatusColor(service)
    const statusLabel = getStatusLabel(service)
    const deployedVersion = service.deployedVersion || 0
    const versionInfo = service.versions?.find(
        (v) => v.version === deployedVersion
    )
    const lastDeployed = versionInfo?.timeStamp

    return (
        <div className="service-card-v2" onClick={onClick}>
            <div
                className="service-card-status-dot"
                style={{ backgroundColor: statusColor }}
                title={statusLabel}
            />

            <div className="service-card-icon">{icon}</div>

            <div className="service-card-content">
                <h3 className="service-card-name">{service.appName}</h3>
                <div className="service-card-meta">
                    <span className="service-card-type">{serviceType}</span>
                    {lastDeployed && (
                        <>
                            <span className="service-card-separator">•</span>
                            <span className="service-card-time">
                                {moment(lastDeployed).fromNow()}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="service-card-actions">
                <Tooltip title="View Logs">
                    <Button
                        type="text"
                        size="small"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                            e.stopPropagation()
                            onQuickAction?.('logs')
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
                            onQuickAction?.('restart')
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
                            onQuickAction?.('settings')
                        }}
                    />
                </Tooltip>
            </div>
        </div>
    )
}

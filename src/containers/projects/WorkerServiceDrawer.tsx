import {
    Button,
    Drawer,
    Tabs,
    Tag,
    Divider,
    Input,
    message,
    Spin,
    Tooltip,
} from 'antd'
import {
    CloseOutlined,
    ThunderboltOutlined,
    HistoryOutlined,
    FileTextOutlined,
    SettingOutlined,
    CopyOutlined,
    ReloadOutlined,
    DeleteOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    RollbackOutlined,
    CodeOutlined,
    LoadingOutlined,
    SaveOutlined,
} from '@ant-design/icons'
import moment from 'moment'
import { Component } from 'react'
import { IAppDef, IAppEnvVar } from '../apps/AppDefinition'
import ApiManager from '../../api/ApiManager'
import Toaster from '../../utils/Toaster'
import Utils from '../../utils/Utils'
import '../../styles/project-dashboard.css'

interface WorkerServiceDrawerProps {
    service: IAppDef | null
    visible: boolean
    onClose: () => void
    apiManager: ApiManager
    projectId: string
    onServiceUpdated?: () => void
    allServices?: IAppDef[]
}

interface WorkerServiceDrawerState {
    activeTab: string
    appLogs: string
    isLoadingLogs: boolean
    isWrappedLogs: boolean
    logFilter: string
    isDeleting: boolean
    isRollingBack: boolean
    isRedeploying: boolean
    editedEnvVars: IAppEnvVar[]
    editedInstanceCount: number
    isSaving: boolean
    cronSchedule: string
}

export default class WorkerServiceDrawer extends Component<
    WorkerServiceDrawerProps,
    WorkerServiceDrawerState
> {
    private logFetchInterval: NodeJS.Timeout | null = null

    constructor(props: WorkerServiceDrawerProps) {
        super(props)
        this.state = {
            activeTab: 'overview',
            appLogs: '',
            isLoadingLogs: false,
            isWrappedLogs: true,
            logFilter: '',
            isDeleting: false,
            isRollingBack: false,
            isRedeploying: false,
            editedEnvVars: [],
            editedInstanceCount: 1,
            isSaving: false,
            cronSchedule: '',
        }
    }

    componentDidUpdate(prevProps: WorkerServiceDrawerProps) {
        if (!prevProps.visible && this.props.visible && this.props.service) {
            const cronEnv = (this.props.service.envVars || []).find(
                (e) => e.key === 'CRON_SCHEDULE'
            )
            this.setState({
                activeTab: 'overview',
                appLogs: '',
                editedEnvVars: [...(this.props.service.envVars || [])],
                editedInstanceCount: this.props.service.instanceCount || 1,
                cronSchedule: cronEnv?.value || '',
            })
        }
        if (prevProps.visible && !this.props.visible) {
            this.stopLogFetching()
        }
    }

    componentWillUnmount() {
        this.stopLogFetching()
    }

    startLogFetching() {
        if (this.logFetchInterval) return
        this.fetchLogs()
    }

    stopLogFetching() {
        if (this.logFetchInterval) {
            clearTimeout(this.logFetchInterval)
            this.logFetchInterval = null
        }
    }

    fetchLogs() {
        const self = this
        const { service, apiManager } = this.props

        if (!service || !service.appName) return

        self.setState({ isLoadingLogs: true })

        const separators = ['00000000', '01000000', '02000000', '03000000']
        const ansiRegex = Utils.getAnsiColorRegex()

        apiManager
            .fetchAppLogsInHex(service.appName)
            .then(function (logInfo: { logs: string }) {
                const logsProcessed = logInfo.logs
                    .split(new RegExp(separators.join('|'), 'g'))
                    .map((rawRow) => {
                        let time = 0
                        let textUtf8 = Utils.convertHexStringToUtf8(rawRow)
                        try {
                            time = new Date(textUtf8.substring(0, 30)).getTime()
                        } catch (err) {}
                        return { text: textUtf8, time: time }
                    })
                    .sort((a, b) =>
                        a.time > b.time ? 1 : b.time > a.time ? -1 : 0
                    )
                    .map((a) => a.text)
                    .join('')
                    .replace(ansiRegex, '')

                self.setState({
                    appLogs: logsProcessed,
                    isLoadingLogs: false,
                })

                self.logFetchInterval = setTimeout(() => {
                    self.fetchLogs()
                }, 5000)
            })
            .catch(function () {
                self.setState({ isLoadingLogs: false })
            })
    }

    copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
        message.success('Copied to clipboard')
    }

    getWorkerType(): string {
        const { service } = this.props
        if (!service) return 'worker'

        const tags = service.tags || []
        for (const tag of tags) {
            if (['cron', 'job', 'worker'].includes(tag.tagName)) {
                return tag.tagName
            }
        }
        return 'worker'
    }

    getWorkerIcon(): string {
        const workerType = this.getWorkerType()
        const icons: Record<string, string> = {
            cron: '⏰',
            job: '⚙️',
            worker: '⚡',
        }
        return icons[workerType] || icons.worker
    }

    getWorkerColor(): string {
        const workerType = this.getWorkerType()
        const colors: Record<string, string> = {
            cron: '#ec4899',
            job: '#f59e0b',
            worker: '#f59e0b',
        }
        return colors[workerType] || colors.worker
    }

    handleDeleteService() {
        const self = this
        const { service, apiManager, onServiceUpdated, onClose } = this.props

        if (!service || !service.appName) return

        self.setState({ isDeleting: true })

        apiManager
            .deleteApp(undefined, [], [service.appName])
            .then(function () {
                message.success('Worker deleted successfully')
                onClose()
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isDeleting: false })
            })
    }

    handleRedeploy() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service || !service.appName) return

        self.setState({ isRedeploying: true })

        const deployedVersion = service.deployedVersion || 0
        const versionInfo = service.versions?.find(
            (v) => v.version === deployedVersion
        )
        const deployedImage =
            versionInfo?.deployedImageName ||
            'caprover/caprover-placeholder-app:latest'

        apiManager
            .uploadCaptainDefinitionContent(
                service.appName,
                { schemaVersion: 2, imageName: deployedImage },
                '',
                true
            )
            .then(function () {
                message.success('Redeploy triggered')
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isRedeploying: false })
            })
    }

    handleRollback(version: number) {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service || !service.appName) return

        self.setState({ isRollingBack: true })

        const targetVersion = service.versions?.find(
            (v) => v.version === version
        )

        apiManager
            .uploadCaptainDefinitionContent(
                service.appName,
                {
                    schemaVersion: 2,
                    imageName:
                        targetVersion?.deployedImageName ||
                        'caprover/caprover-placeholder-app:latest',
                },
                '',
                true
            )
            .then(function () {
                message.success(`Rolled back to version ${version}`)
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isRollingBack: false })
            })
    }

    handleSaveSettings() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props
        const { editedEnvVars, editedInstanceCount, cronSchedule } = this.state

        if (!service || !service.appName) return

        self.setState({ isSaving: true })

        const envVars = [...editedEnvVars]
        const cronIndex = envVars.findIndex((e) => e.key === 'CRON_SCHEDULE')
        if (cronSchedule) {
            if (cronIndex >= 0) {
                envVars[cronIndex] = {
                    key: 'CRON_SCHEDULE',
                    value: cronSchedule,
                }
            } else {
                envVars.push({ key: 'CRON_SCHEDULE', value: cronSchedule })
            }
        } else if (cronIndex >= 0) {
            envVars.splice(cronIndex, 1)
        }

        const updatedApp: IAppDef = {
            ...service,
            instanceCount: editedInstanceCount,
            envVars: envVars,
        }

        apiManager
            .updateConfigAndSave(service.appName, updatedApp)
            .then(function () {
                message.success('Settings saved')
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isSaving: false })
            })
    }

    renderOverviewTab() {
        const { service } = this.props

        if (!service) return null

        const workerType = this.getWorkerType()
        const workerIcon = this.getWorkerIcon()
        const deployedVersion = service.deployedVersion || 0
        const currentVersion = service.versions?.find(
            (v) => v.version === deployedVersion
        )
        const deployCount = service.versions?.length || 0

        return (
            <div className="worker-drawer-tab-content">
                <div className="worker-overview-header">
                    <span className="worker-icon">{workerIcon}</span>
                    <div className="worker-header-info">
                        <h3>
                            {workerType.charAt(0).toUpperCase() +
                                workerType.slice(1)}{' '}
                            Service
                        </h3>
                        <p>Background job processing service</p>
                    </div>
                </div>

                <div className="worker-stats-grid">
                    <div className="worker-stat-card">
                        <div className="worker-stat-value">
                            {service.instanceCount || 1}
                        </div>
                        <div className="worker-stat-label">Instances</div>
                    </div>
                    <div className="worker-stat-card">
                        <div className="worker-stat-value">{deployCount}</div>
                        <div className="worker-stat-label">Deployments</div>
                    </div>
                    <div className="worker-stat-card">
                        <div className="worker-stat-value">
                            {(service.envVars || []).length}
                        </div>
                        <div className="worker-stat-label">Env Vars</div>
                    </div>
                </div>

                <div className="worker-section">
                    <h4 className="worker-section-title">Service Info</h4>
                    <div className="worker-info-card">
                        <div className="worker-info-row">
                            <span className="worker-info-label">Status</span>
                            <span className="worker-info-value">
                                <Tag color="green">Running</Tag>
                            </span>
                        </div>
                        <div className="worker-info-row">
                            <span className="worker-info-label">
                                Current Version
                            </span>
                            <span className="worker-info-value">
                                v{currentVersion?.version || 0}
                            </span>
                        </div>
                        <div className="worker-info-row">
                            <span className="worker-info-label">
                                Last Deployed
                            </span>
                            <span className="worker-info-value">
                                {currentVersion?.timeStamp
                                    ? moment(currentVersion.timeStamp).fromNow()
                                    : 'Never'}
                            </span>
                        </div>
                        {this.state.cronSchedule && (
                            <div className="worker-info-row">
                                <span className="worker-info-label">
                                    Cron Schedule
                                </span>
                                <span className="worker-info-value">
                                    <code>{this.state.cronSchedule}</code>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {(service.envVars || []).length > 0 && (
                    <div className="worker-section">
                        <h4 className="worker-section-title">
                            Environment Variables
                            <span className="service-drawer-count-badge">
                                {(service.envVars || []).length}
                            </span>
                        </h4>
                        <div className="service-drawer-env-list">
                            {(service.envVars || [])
                                .slice(0, 5)
                                .map((env, idx) => (
                                    <div
                                        key={idx}
                                        className="service-drawer-env-item"
                                    >
                                        <span className="service-drawer-env-key">
                                            {env.key}
                                        </span>
                                        <span className="service-drawer-env-value">
                                            ••••••••
                                        </span>
                                    </div>
                                ))}
                            {(service.envVars || []).length > 5 && (
                                <div className="service-drawer-env-item">
                                    <span className="service-drawer-env-key">
                                        +{(service.envVars || []).length - 5}{' '}
                                        more
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    renderDeploymentsTab() {
        const { service } = this.props
        const { isRedeploying, isRollingBack } = this.state

        if (!service) return null

        const versions = service.versions || []
        const currentVersion = service.deployedVersion || 0

        return (
            <div className="worker-drawer-tab-content">
                <div className="deployments-header">
                    <div className="deployments-header-left">
                        <h4 className="service-drawer-section-title">
                            <HistoryOutlined style={{ marginRight: 8 }} />
                            Deployment History
                            <span className="service-drawer-count-badge">
                                {versions.length}
                            </span>
                        </h4>
                    </div>
                    <Button
                        type="primary"
                        icon={<ReloadOutlined />}
                        loading={isRedeploying}
                        onClick={() => this.handleRedeploy()}
                        className="deploy-button"
                    >
                        Redeploy
                    </Button>
                </div>

                {versions.length === 0 ? (
                    <div className="deployments-empty-state">
                        <div className="deployments-empty-icon">
                            <HistoryOutlined />
                        </div>
                        <h4>No deployments yet</h4>
                        <p>Deploy your first version to see it here</p>
                    </div>
                ) : (
                    <div className="deployments-timeline">
                        {versions.map((version, index) => {
                            const isCurrent = version.version === currentVersion
                            const isBuilding =
                                service.isAppBuilding && index === 0
                            const statusClass = isBuilding
                                ? 'building'
                                : isCurrent
                                  ? 'current'
                                  : 'previous'

                            return (
                                <div
                                    key={version.version}
                                    className="deployment-timeline-item"
                                >
                                    <div className="deployment-timeline-track">
                                        <div
                                            className={`deployment-timeline-dot ${statusClass}`}
                                        >
                                            {isBuilding ? (
                                                <LoadingOutlined spin />
                                            ) : isCurrent ? (
                                                <CheckCircleOutlined />
                                            ) : (
                                                <ClockCircleOutlined />
                                            )}
                                        </div>
                                        {index < versions.length - 1 && (
                                            <div className="deployment-timeline-line" />
                                        )}
                                    </div>

                                    <div
                                        className={`deployment-card ${statusClass}`}
                                    >
                                        <div className="deployment-card-header">
                                            <div className="deployment-card-title">
                                                <span className="deployment-version">
                                                    v{version.version}
                                                </span>
                                                {isCurrent && (
                                                    <Tag className="deployment-current-tag">
                                                        Current
                                                    </Tag>
                                                )}
                                                {isBuilding && (
                                                    <Tag className="deployment-building-tag">
                                                        Building
                                                    </Tag>
                                                )}
                                            </div>
                                            <span className="deployment-time">
                                                {moment(
                                                    version.timeStamp
                                                ).fromNow()}
                                            </span>
                                        </div>

                                        <div className="deployment-card-body">
                                            {version.gitHash && (
                                                <div className="deployment-meta-row">
                                                    <CodeOutlined className="deployment-meta-icon" />
                                                    <Tooltip title="Click to copy">
                                                        <span
                                                            className="deployment-git-hash"
                                                            onClick={() =>
                                                                this.copyToClipboard(
                                                                    version.gitHash ||
                                                                        ''
                                                                )
                                                            }
                                                        >
                                                            {version.gitHash.substring(
                                                                0,
                                                                7
                                                            )}
                                                            <CopyOutlined className="deployment-copy-icon" />
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            )}
                                            {version.deployedImageName && (
                                                <div className="deployment-meta-row">
                                                    <span className="deployment-image-name">
                                                        {
                                                            version.deployedImageName.split(
                                                                '/'
                                                            )[
                                                                version.deployedImageName.split(
                                                                    '/'
                                                                ).length - 1
                                                            ]
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {!isCurrent && !isBuilding && (
                                            <div className="deployment-card-actions">
                                                <Button
                                                    size="small"
                                                    icon={<RollbackOutlined />}
                                                    loading={isRollingBack}
                                                    onClick={() =>
                                                        this.handleRollback(
                                                            version.version
                                                        )
                                                    }
                                                    className="deployment-action-btn rollback"
                                                >
                                                    Rollback
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    renderLogsTab() {
        const { appLogs, isLoadingLogs, isWrappedLogs, logFilter } = this.state

        const filteredLogs = logFilter
            ? appLogs
                  .split('\n')
                  .filter((line) =>
                      line.toLowerCase().includes(logFilter.toLowerCase())
                  )
                  .join('\n')
            : appLogs

        return (
            <div className="worker-drawer-tab-content">
                <div className="worker-logs-controls">
                    <Input
                        placeholder="Filter logs..."
                        value={logFilter}
                        onChange={(e) =>
                            this.setState({ logFilter: e.target.value })
                        }
                        style={{ flex: 1 }}
                        allowClear
                    />
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => this.fetchLogs()}
                        loading={isLoadingLogs}
                    >
                        Refresh
                    </Button>
                </div>

                <div
                    className="worker-logs-container"
                    style={{ whiteSpace: isWrappedLogs ? 'pre-wrap' : 'pre' }}
                >
                    {isLoadingLogs && !appLogs ? (
                        <div className="worker-logs-loading">
                            <Spin />
                        </div>
                    ) : filteredLogs ? (
                        filteredLogs
                    ) : (
                        <div className="worker-logs-empty">
                            No logs available
                        </div>
                    )}
                </div>
            </div>
        )
    }

    renderSettingsTab() {
        const { service } = this.props
        const { isDeleting, isSaving, editedInstanceCount, cronSchedule } =
            this.state

        if (!service) return null

        const workerType = this.getWorkerType()
        const workerIcon = this.getWorkerIcon()

        return (
            <div className="worker-drawer-tab-content">
                <div className="worker-settings-section">
                    <h4 className="worker-section-title">
                        Worker Configuration
                    </h4>

                    <div
                        className="worker-info-card"
                        style={{ marginBottom: 16 }}
                    >
                        <div className="worker-info-row">
                            <span className="worker-info-label">Type</span>
                            <span className="worker-info-value">
                                {workerIcon}{' '}
                                {workerType.charAt(0).toUpperCase() +
                                    workerType.slice(1)}
                            </span>
                        </div>
                        <div className="worker-info-row">
                            <span className="worker-info-label">
                                Instance Count
                            </span>
                            <Input
                                type="number"
                                min={0}
                                max={10}
                                value={editedInstanceCount}
                                onChange={(e) =>
                                    this.setState({
                                        editedInstanceCount:
                                            parseInt(e.target.value) || 1,
                                    })
                                }
                                style={{ width: 80 }}
                            />
                        </div>
                    </div>

                    {workerType === 'cron' && (
                        <div className="worker-cron-input">
                            <label>Cron Schedule</label>
                            <Input
                                placeholder="*/5 * * * *"
                                value={cronSchedule}
                                onChange={(e) =>
                                    this.setState({
                                        cronSchedule: e.target.value,
                                    })
                                }
                            />
                            <p className="worker-cron-hint">
                                Standard cron expression (e.g., "*/5 * * * *"
                                for every 5 minutes)
                            </p>
                        </div>
                    )}

                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={isSaving}
                        onClick={() => this.handleSaveSettings()}
                        style={{ marginTop: 16 }}
                    >
                        Save Settings
                    </Button>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="danger-zone">
                    <h4 className="service-drawer-section-title danger">
                        <WarningOutlined style={{ marginRight: 8 }} />
                        Danger Zone
                    </h4>
                    <p className="db-hint">
                        Destructive actions that cannot be undone.
                    </p>

                    <div className="danger-zone-action">
                        <div className="danger-zone-info">
                            <strong>Delete this worker</strong>
                            <p>All configurations will be permanently lost.</p>
                        </div>
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={isDeleting}
                            onClick={() => this.handleDeleteService()}
                        >
                            Delete Worker
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    handleTabChange(key: string) {
        this.setState({ activeTab: key })
        if (key === 'logs') {
            this.startLogFetching()
        } else {
            this.stopLogFetching()
        }
    }

    render() {
        const { service, visible, onClose } = this.props
        const { activeTab } = this.state

        if (!service) return null

        const workerType = this.getWorkerType()
        const workerIcon = this.getWorkerIcon()
        const workerColor = this.getWorkerColor()

        const tabItems = [
            {
                key: 'overview',
                label: (
                    <span>
                        <ThunderboltOutlined /> Overview
                    </span>
                ),
                children: this.renderOverviewTab(),
            },
            {
                key: 'deployments',
                label: (
                    <span>
                        <HistoryOutlined /> Deployments
                    </span>
                ),
                children: this.renderDeploymentsTab(),
            },
            {
                key: 'logs',
                label: (
                    <span>
                        <FileTextOutlined /> Logs
                    </span>
                ),
                children: this.renderLogsTab(),
            },
            {
                key: 'settings',
                label: (
                    <span>
                        <SettingOutlined /> Settings
                    </span>
                ),
                children: this.renderSettingsTab(),
            },
        ]

        return (
            <Drawer
                title={null}
                placement="right"
                onClose={onClose}
                open={visible}
                width={560}
                closable={false}
                className="service-detail-drawer worker-drawer"
                styles={{
                    body: { padding: 0, background: '#141414' },
                    header: { display: 'none' },
                }}
            >
                <div
                    className="service-drawer-header"
                    style={{ borderLeftColor: workerColor }}
                >
                    <div className="service-drawer-header-content">
                        <div className="service-drawer-title-row">
                            <span className="worker-drawer-icon">
                                {workerIcon}
                            </span>
                            <h2 className="service-drawer-title">
                                {service.appName}
                            </h2>
                            <Tag color="green">Running</Tag>
                        </div>
                        <div className="service-drawer-meta">
                            <span>
                                {workerType.charAt(0).toUpperCase() +
                                    workerType.slice(1)}{' '}
                                Service
                            </span>
                            {(() => {
                                const depVersion = service.deployedVersion || 0
                                const vInfo = service.versions?.find(
                                    (v) => v.version === depVersion
                                )
                                return vInfo?.timeStamp ? (
                                    <>
                                        <span className="meta-separator">
                                            •
                                        </span>
                                        <span>
                                            Last deployed{' '}
                                            {moment(vInfo.timeStamp).fromNow()}
                                        </span>
                                    </>
                                ) : null
                            })()}
                        </div>
                    </div>
                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={onClose}
                        className="service-drawer-close"
                    />
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => this.handleTabChange(key)}
                    className="service-drawer-tabs"
                    items={tabItems}
                />
            </Drawer>
        )
    }
}

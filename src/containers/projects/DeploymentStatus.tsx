import { CopyOutlined, LoadingOutlined } from '@ant-design/icons'
import { Button, Progress } from 'antd'
import { Component } from 'react'
import { message } from 'antd'
import '../../styles/project-dashboard.css'

type DeploymentStatusType = 'building' | 'deploying' | 'success' | 'failed'

interface DeploymentStatusProps {
    deploymentId?: string
    appName: string
    initialLogs?: string[]
    isBuilding?: boolean
    buildFailed?: boolean
    onStatusChange?: (status: DeploymentStatusType) => void
}

interface DeploymentStatusState {
    logs: string[]
    status: DeploymentStatusType
    progress: number
}

export default class DeploymentStatus extends Component<
    DeploymentStatusProps,
    DeploymentStatusState
> {
    private logsEndRef: HTMLDivElement | null = null
    private logUpdateInterval: NodeJS.Timeout | null = null

    constructor(props: DeploymentStatusProps) {
        super(props)

        let initialStatus: DeploymentStatusType = 'building'
        if (props.buildFailed) {
            initialStatus = 'failed'
        } else if (!props.isBuilding) {
            initialStatus = 'success'
        }

        this.state = {
            logs: props.initialLogs || [],
            status: initialStatus,
            progress: this.calculateProgress(initialStatus),
        }
    }

    componentDidMount() {
        this.scrollToBottom()
        if (this.props.isBuilding) {
            this.simulateLogStreaming()
        }
    }

    componentDidUpdate(prevProps: DeploymentStatusProps) {
        if (
            prevProps.isBuilding !== this.props.isBuilding ||
            prevProps.buildFailed !== this.props.buildFailed
        ) {
            let newStatus: DeploymentStatusType = this.state.status

            if (this.props.buildFailed) {
                newStatus = 'failed'
            } else if (!this.props.isBuilding) {
                newStatus = 'success'
            } else {
                newStatus = 'building'
            }

            this.setState({
                status: newStatus,
                progress: this.calculateProgress(newStatus),
            })

            if (this.props.onStatusChange) {
                this.props.onStatusChange(newStatus)
            }
        }

        this.scrollToBottom()
    }

    componentWillUnmount() {
        if (this.logUpdateInterval) {
            clearInterval(this.logUpdateInterval)
        }
    }

    private calculateProgress(status: DeploymentStatusType): number {
        const progressMap: Record<DeploymentStatusType, number> = {
            building: 30,
            deploying: 60,
            success: 100,
            failed: 100,
        }
        return progressMap[status] || 0
    }

    private simulateLogStreaming() {
        this.logUpdateInterval = setInterval(() => {
            if (this.state.status === 'building') {
                this.setState({
                    status: 'deploying',
                    progress: 60,
                })
            } else if (this.state.status === 'deploying') {
                if (this.logUpdateInterval) {
                    clearInterval(this.logUpdateInterval)
                }
            }
        }, 3000)
    }

    private scrollToBottom() {
        if (this.logsEndRef) {
            this.logsEndRef.scrollIntoView({ behavior: 'smooth' })
        }
    }

    private getLogLineClass(line: string): string {
        const lowerLine = line.toLowerCase()

        if (
            lowerLine.includes('error') ||
            lowerLine.includes('failed') ||
            lowerLine.includes('err:')
        ) {
            return 'error'
        }

        if (lowerLine.includes('warning') || lowerLine.includes('warn:')) {
            return 'warning'
        }

        if (
            lowerLine.includes('success') ||
            lowerLine.includes('done') ||
            lowerLine.includes('complete')
        ) {
            return 'success'
        }

        if (lowerLine.includes('info:') || lowerLine.includes('>>>')) {
            return 'info'
        }

        if (lowerLine.startsWith('#') || lowerLine.startsWith('//')) {
            return 'muted'
        }

        return ''
    }

    private copyLogsToClipboard() {
        const logsText = this.state.logs.join('\n')
        navigator.clipboard
            .writeText(logsText)
            .then(() => {
                message.success('Logs copied to clipboard')
            })
            .catch(() => {
                message.error('Failed to copy logs')
            })
    }

    private renderStatusBadge(): JSX.Element {
        const { status } = this.state

        const statusLabels: Record<DeploymentStatusType, string> = {
            building: 'Building',
            deploying: 'Deploying',
            success: 'Deployed Successfully',
            failed: 'Deployment Failed',
        }

        return (
            <span className={`deployment-status-badge ${status}`}>
                {(status === 'building' || status === 'deploying') && (
                    <LoadingOutlined spin />
                )}
                {statusLabels[status]}
            </span>
        )
    }

    render() {
        const { logs, status, progress } = this.state

        const progressStatus =
            status === 'failed'
                ? 'exception'
                : status === 'success'
                  ? 'success'
                  : 'active'

        return (
            <div className="deployment-status-container fade-in">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}
                >
                    <div>
                        <h3
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 600,
                            }}
                        >
                            Deployment Status
                        </h3>
                        <div style={{ marginTop: 8 }}>
                            {this.renderStatusBadge()}
                        </div>
                    </div>
                </div>

                <div className="deployment-progress-bar">
                    <Progress
                        percent={progress}
                        status={progressStatus}
                        strokeColor={
                            status === 'success'
                                ? '#10b981'
                                : status === 'failed'
                                  ? '#ef4444'
                                  : '#4f5bff'
                        }
                    />
                </div>

                {logs.length > 0 && (
                    <div className="build-logs-container">
                        <div className="build-logs-header">
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: '#999',
                                }}
                            >
                                Build Logs
                            </span>
                            <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => this.copyLogsToClipboard()}
                                className="copy-logs-button"
                            >
                                Copy
                            </Button>
                        </div>

                        <div className="build-logs">
                            {logs.map((line, index) => (
                                <div
                                    key={index}
                                    className={`build-log-line ${this.getLogLineClass(
                                        line
                                    )}`}
                                >
                                    {line}
                                </div>
                            ))}
                            <div
                                ref={(el) => (this.logsEndRef = el)}
                                style={{ height: 1 }}
                            />
                        </div>
                    </div>
                )}

                {logs.length === 0 && (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#666',
                            background: '#0a0a0a',
                            borderRadius: 8,
                            border: '1px solid #2a2a2a',
                        }}
                    >
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                        <div style={{ fontSize: 13 }}>
                            {status === 'building' || status === 'deploying'
                                ? 'Waiting for build logs...'
                                : 'No build logs available'}
                        </div>
                    </div>
                )}
            </div>
        )
    }
}

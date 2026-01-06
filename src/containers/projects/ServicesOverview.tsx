import { Button, Col, Row } from 'antd'
import { Component } from 'react'
import { IAppDef } from '../apps/AppDefinition'
import AddServiceModal from './AddServiceModal'
import ServiceTypeSection from './ServiceTypeSection'
import '../../styles/project-dashboard.css'

interface ServicesOverviewProps {
    services: IAppDef[]
    projectId: string
    onReloadRequested: () => void
    onServiceClick?: (service: IAppDef) => void
}

interface ServicesOverviewState {
    showAddService: boolean
}

export default class ServicesOverview extends Component<
    ServicesOverviewProps,
    ServicesOverviewState
> {
    constructor(props: ServicesOverviewProps) {
        super(props)
        this.state = {
            showAddService: false,
        }
    }

    render() {
        const { services } = this.props

        const frontend = services.filter(
            (s) => this.detectServiceType(s.appName || '') === 'frontend'
        )
        const backend = services.filter(
            (s) => this.detectServiceType(s.appName || '') === 'backend'
        )
        const databases = services.filter(
            (s) => this.detectServiceType(s.appName || '') === 'database'
        )
        const workers = services.filter(
            (s) => this.detectServiceType(s.appName || '') === 'worker'
        )

        const hasNoServices = services.length === 0

        return (
            <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={() =>
                                this.setState({ showAddService: true })
                            }
                        >
                            Add Service
                        </Button>
                    </Col>
                </Row>

                {hasNoServices && (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#888',
                        }}
                    >
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                        <h3 style={{ color: '#999' }}>No services yet</h3>
                        <p>
                            Get started by adding your first service to this
                            project
                        </p>
                    </div>
                )}

                {frontend.length > 0 && (
                    <ServiceTypeSection
                        title="Frontend"
                        services={frontend}
                        color="#8b5cf6"
                        projectId={this.props.projectId}
                        onServiceClick={this.props.onServiceClick}
                    />
                )}

                {backend.length > 0 && (
                    <ServiceTypeSection
                        title="Backend"
                        services={backend}
                        color="#3b82f6"
                        projectId={this.props.projectId}
                        onServiceClick={this.props.onServiceClick}
                    />
                )}

                {databases.length > 0 && (
                    <ServiceTypeSection
                        title="Databases"
                        services={databases}
                        color="#10b981"
                        projectId={this.props.projectId}
                        onServiceClick={this.props.onServiceClick}
                    />
                )}

                {workers.length > 0 && (
                    <ServiceTypeSection
                        title="Workers"
                        services={workers}
                        color="#f59e0b"
                        projectId={this.props.projectId}
                        onServiceClick={this.props.onServiceClick}
                    />
                )}

                <AddServiceModal
                    visible={this.state.showAddService}
                    onCancel={() => this.setState({ showAddService: false })}
                    projectId={this.props.projectId}
                    onSuccess={() => {
                        this.setState({ showAddService: false })
                        this.props.onReloadRequested()
                    }}
                />
            </div>
        )
    }

    private detectServiceType(appName: string): string {
        const name = appName.toLowerCase()

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
}

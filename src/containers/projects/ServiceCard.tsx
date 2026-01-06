import { Badge, Card, Col, Row } from 'antd'
import moment from 'moment'
import { Component } from 'react'
import { withRouter, RouteComponentProps } from 'react-router'
import { IAppDef } from '../apps/AppDefinition'
import '../../styles/project-dashboard.css'

interface ServiceCardProps extends RouteComponentProps {
    service: IAppDef
    color: string
    projectId?: string
    onServiceClick?: (service: IAppDef) => void
}

class ServiceCard extends Component<ServiceCardProps> {
    render() {
        const { service, color, history, projectId, onServiceClick } =
            this.props
        const status = service.isAppBuilding ? 'deploying' : 'running'
        const statusColor = status === 'running' ? '#10b981' : '#f59e0b'

        const lastDeployed =
            service.versions && service.versions.length > 0
                ? service.versions[0].timeStamp
                : null

        const handleClick = () => {
            if (onServiceClick) {
                onServiceClick(service)
            } else if (projectId) {
                history.push(
                    `/projects/${projectId}/services/${service.appName}`
                )
            } else {
                history.push(`/apps/details/${service.appName}`)
            }
        }

        return (
            <Card
                className="service-card"
                hoverable
                onClick={handleClick}
                style={{
                    borderLeft: `4px solid ${color}`,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    background: '#1a1a1a',
                }}
                styles={{ body: { padding: 16 } }}
            >
                <Row justify="space-between" align="middle">
                    <Col>
                        <h3
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 600,
                                color: '#e5e5e5',
                            }}
                        >
                            {service.appName || 'Unnamed Service'}
                        </h3>
                        {service.description && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: '#999',
                                    marginTop: 4,
                                }}
                            >
                                {service.description}
                            </div>
                        )}
                    </Col>
                    <Col>
                        <Badge
                            color={statusColor}
                            text={
                                <span style={{ color: '#e5e5e5' }}>
                                    {status}
                                </span>
                            }
                            style={{ fontSize: 12 }}
                        />
                    </Col>
                </Row>

                {lastDeployed && (
                    <div
                        style={{
                            marginTop: 12,
                            fontSize: 12,
                            color: '#999',
                        }}
                    >
                        Last deployed: {moment(lastDeployed).fromNow()}
                    </div>
                )}

                {service.notExposeAsWebApp && (
                    <div
                        style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: '#666',
                            fontStyle: 'italic',
                        }}
                    >
                        Not exposed as web app
                    </div>
                )}
            </Card>
        )
    }
}

export default withRouter(ServiceCard)

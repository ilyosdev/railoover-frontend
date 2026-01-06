import { Col, Row } from 'antd'
import { Component } from 'react'
import { IAppDef } from '../apps/AppDefinition'
import ServiceCard from './ServiceCard'
import '../../styles/project-dashboard.css'

interface ServiceTypeSectionProps {
    title: string
    services: IAppDef[]
    color: string
    projectId?: string
    onServiceClick?: (service: IAppDef) => void
}

export default class ServiceTypeSection extends Component<ServiceTypeSectionProps> {
    render() {
        const { title, services, color, projectId, onServiceClick } = this.props
        const typeClass = title.toLowerCase()

        return (
            <div className="service-type-section">
                <div
                    className={`service-type-header ${typeClass}`}
                    style={{ color }}
                >
                    {title}
                </div>

                <Row gutter={[16, 16]}>
                    {services.map((service) => (
                        <Col
                            key={service.appName}
                            xs={24}
                            sm={12}
                            lg={8}
                            xl={6}
                        >
                            <ServiceCard
                                service={service}
                                color={color}
                                projectId={projectId}
                                onServiceClick={onServiceClick}
                            />
                        </Col>
                    ))}
                </Row>
            </div>
        )
    }
}

import { Card, Col, Modal, Row, Steps } from 'antd'
import { Component } from 'react'
import { localize } from '../../utils/Language'
import DatabaseQuickCreate from './DatabaseQuickCreate'
import ServiceConfiguration from './ServiceConfiguration'

const { Step } = Steps

interface AddServiceModalProps {
    visible: boolean
    onCancel: () => void
    projectId: string
    onSuccess: () => void
}

type ServiceType = 'frontend' | 'backend' | 'database' | 'worker'

interface AddServiceModalState {
    currentStep: number
    serviceType?: ServiceType
    isLoading: boolean
}

export default class AddServiceModal extends Component<
    AddServiceModalProps,
    AddServiceModalState
> {
    constructor(props: AddServiceModalProps) {
        super(props)
        this.state = {
            currentStep: 0,
            serviceType: undefined,
            isLoading: false,
        }
    }

    resetModal() {
        this.setState({
            currentStep: 0,
            serviceType: undefined,
            isLoading: false,
        })
    }

    handleCancel() {
        this.resetModal()
        this.props.onCancel()
    }

    handleServiceTypeSelected(type: ServiceType) {
        this.setState({
            serviceType: type,
            currentStep: 1,
        })
    }

    handleServiceCreated() {
        this.resetModal()
        this.props.onSuccess()
    }

    renderStepContent() {
        const self = this
        const { currentStep, serviceType } = self.state

        if (currentStep === 0) {
            return self.renderServiceTypeSelection()
        }

        if (currentStep === 1 && serviceType === 'database') {
            return (
                <DatabaseQuickCreate
                    projectId={self.props.projectId}
                    onSuccess={() => self.handleServiceCreated()}
                    onCancel={() => self.setState({ currentStep: 0 })}
                />
            )
        }

        if (currentStep === 1 && serviceType && serviceType !== 'database') {
            return (
                <ServiceConfiguration
                    projectId={self.props.projectId}
                    serviceType={serviceType}
                    onSuccess={() => self.handleServiceCreated()}
                    onCancel={() => self.setState({ currentStep: 0 })}
                />
            )
        }

        return null
    }

    renderServiceTypeSelection() {
        const self = this

        const serviceTypes = [
            {
                type: 'frontend' as ServiceType,
                title: 'Frontend',
                icon: '🌐',
                description: 'React, Vue, Next.js, Static sites',
                color: '#8b5cf6',
            },
            {
                type: 'backend' as ServiceType,
                title: 'Backend',
                icon: '⚙️',
                description: 'Node.js, Python, Go, Ruby',
                color: '#3b82f6',
            },
            {
                type: 'database' as ServiceType,
                title: 'Database',
                icon: '🗄️',
                description: 'PostgreSQL, MySQL, Redis, MongoDB',
                color: '#10b981',
            },
            {
                type: 'worker' as ServiceType,
                title: 'Worker',
                icon: '⚡',
                description: 'Background jobs, Cron tasks',
                color: '#f59e0b',
            },
        ]

        return (
            <div>
                <h2 style={{ marginBottom: 24, textAlign: 'center' }}>
                    {localize(
                        'projects.choose_service_type',
                        'Choose Service Type'
                    )}
                </h2>
                <Row gutter={[16, 16]}>
                    {serviceTypes.map((service) => (
                        <Col span={12} key={service.type}>
                            <Card
                                hoverable
                                onClick={() =>
                                    self.handleServiceTypeSelected(service.type)
                                }
                                style={{
                                    borderLeft: `4px solid ${service.color}`,
                                    height: '100%',
                                }}
                            >
                                <h3>
                                    {service.icon} {service.title}
                                </h3>
                                <p style={{ color: '#888', marginBottom: 0 }}>
                                    {service.description}
                                </p>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        )
    }

    render() {
        const self = this
        const { visible } = self.props
        const { currentStep } = self.state

        return (
            <Modal
                open={visible}
                onCancel={() => self.handleCancel()}
                footer={null}
                width={700}
                destroyOnClose
            >
                <div style={{ marginTop: 24 }}>
                    {currentStep > 0 && (
                        <Steps
                            current={currentStep}
                            style={{ marginBottom: 32 }}
                        >
                            <Step title="Service Type" />
                            <Step title="Configuration" />
                        </Steps>
                    )}
                    {self.renderStepContent()}
                </div>
            </Modal>
        )
    }
}

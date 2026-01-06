import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Row, Spin } from 'antd'
import { Component } from 'react'
import { RouteComponentProps } from 'react-router'
import ProjectDefinition from '../../models/ProjectDefinition'
import Toaster from '../../utils/Toaster'
import ApiComponent from '../global/ApiComponent'
import '../../styles/project-dashboard.css'

interface ProjectsState {
    isLoading: boolean
    projects: ProjectDefinition[]
}

export default class Projects extends ApiComponent<
    RouteComponentProps,
    ProjectsState
> {
    constructor(props: RouteComponentProps) {
        super(props)
        this.state = {
            isLoading: true,
            projects: [],
        }
    }

    componentDidMount() {
        this.fetchProjects()
    }

    fetchProjects() {
        const self = this
        self.setState({ isLoading: true })

        self.apiManager
            .getAllProjects()
            .then(function (data: any) {
                self.setState({
                    projects: data.projects || [],
                    isLoading: false,
                })
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    getServiceTypeColor(type: string): string {
        const colors: { [key: string]: string } = {
            frontend: '#8b5cf6',
            backend: '#3b82f6',
            database: '#10b981',
            worker: '#f59e0b',
        }
        return colors[type] || '#6b7280'
    }

    render() {
        const self = this

        if (self.state.isLoading) {
            return (
                <div style={{ textAlign: 'center', padding: 100 }}>
                    <Spin size="large" />
                </div>
            )
        }

        const { projects } = self.state

        return (
            <div style={{ padding: '24px 40px' }}>
                <Row
                    justify="space-between"
                    align="middle"
                    style={{ marginBottom: 32 }}
                >
                    <Col>
                        <h1 style={{ margin: 0, fontSize: 28 }}>Projects</h1>
                        <p style={{ color: '#888', margin: '8px 0 0' }}>
                            Manage your applications organized by project
                        </p>
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() =>
                                self.props.history.push('/apps/projects/new')
                            }
                        >
                            New Project
                        </Button>
                    </Col>
                </Row>

                {projects.length === 0 ? (
                    <Card>
                        <Empty
                            description={
                                <span>
                                    No projects yet. Create your first project
                                    to get started!
                                </span>
                            }
                        >
                            <Button
                                type="primary"
                                onClick={() =>
                                    self.props.history.push(
                                        '/apps/projects/new'
                                    )
                                }
                            >
                                Create Project
                            </Button>
                        </Empty>
                    </Card>
                ) : (
                    <Row gutter={[24, 24]}>
                        {projects.map((project) => (
                            <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
                                <Card
                                    hoverable
                                    onClick={() =>
                                        self.props.history.push(
                                            `/projects/${project.id}`
                                        )
                                    }
                                    style={{
                                        borderRadius: 12,
                                        border: '1px solid #303030',
                                    }}
                                >
                                    <h3
                                        style={{
                                            margin: '0 0 8px',
                                            fontSize: 18,
                                        }}
                                    >
                                        {project.name}
                                    </h3>
                                    {project.description && (
                                        <p
                                            style={{
                                                color: '#888',
                                                margin: '0 0 16px',
                                                fontSize: 14,
                                            }}
                                        >
                                            {project.description}
                                        </p>
                                    )}
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 8,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <span
                                            style={{
                                                background: '#1a1a1a',
                                                padding: '4px 12px',
                                                borderRadius: 12,
                                                fontSize: 12,
                                                color: '#888',
                                            }}
                                        >
                                            {project.id}
                                        </span>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </div>
        )
    }
}

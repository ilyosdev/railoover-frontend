import { Tabs } from 'antd'
import { RouteComponentProps } from 'react-router'
import ProjectDefinition from '../../models/ProjectDefinition'
import Toaster from '../../utils/Toaster'
import { IAppDef } from '../apps/AppDefinition'
import ApiComponent from '../global/ApiComponent'
import CenteredSpinner from '../global/CenteredSpinner'
import ErrorRetry from '../global/ErrorRetry'
import DeploymentHistory from './DeploymentHistory'
import ProjectEnvironment from './ProjectEnvironment'
import ServicesOverview from './ServicesOverview'
import ServiceConnectionsVisualization from './ServiceConnections'
import ServiceDetailDrawer from './ServiceDetailDrawer'
import '../../styles/project-dashboard.css'

interface ProjectOverviewResponse {
    project: ProjectDefinition
    services: IAppDef[]
    rootDomain?: string
    captainSubDomain?: string
}

export default class ProjectDashboard extends ApiComponent<
    RouteComponentProps<{ projectId: string }>,
    {
        isLoading: boolean
        apiData: ProjectOverviewResponse | undefined
        selectedService: IAppDef | null
        drawerVisible: boolean
    }
> {
    constructor(props: any) {
        super(props)
        this.state = {
            isLoading: true,
            apiData: undefined,
            selectedService: null,
            drawerVisible: false,
        }
    }

    componentDidMount() {
        this.reFetchData()
    }

    reFetchData() {
        const self = this
        const projectId = self.props.match.params.projectId

        self.setState({ isLoading: true })

        return Promise.all([
            self.apiManager.executeGenericApiCommand(
                'GET',
                `/user/projects/${projectId}/overview`,
                {}
            ),
            self.apiManager.getAllApps(),
        ])
            .then(function ([projectData, appsData]: any) {
                self.setState({
                    apiData: {
                        project: projectData.project,
                        services: projectData.services || [],
                        rootDomain: appsData.rootDomain,
                        captainSubDomain: appsData.captainSubDomain,
                    },
                })
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    handleServiceClick(service: IAppDef) {
        this.setState({
            selectedService: service,
            drawerVisible: true,
        })
    }

    handleDrawerClose() {
        this.setState({
            drawerVisible: false,
        })
    }

    render() {
        const self = this

        if (self.state.isLoading) {
            return <CenteredSpinner />
        }

        const apiData = self.state.apiData

        if (!apiData) {
            return <ErrorRetry />
        }

        const { project, services } = apiData
        const projectId = self.props.match.params.projectId

        return (
            <div
                className="slow-fadein-fast"
                style={{
                    padding: '0 20px',
                    margin: '0 auto 50px',
                }}
            >
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ marginBottom: 8, fontSize: 28 }}>
                        {project.name}
                    </h1>
                    {project.description && (
                        <p style={{ color: '#888', fontSize: 14 }}>
                            {project.description}
                        </p>
                    )}
                </div>

                <Tabs defaultActiveKey="overview">
                    <Tabs.TabPane tab="Overview" key="overview">
                        <ServicesOverview
                            services={services}
                            projectId={projectId}
                            onReloadRequested={() => self.reFetchData()}
                            onServiceClick={(service) =>
                                self.handleServiceClick(service)
                            }
                        />
                        {services.length > 1 && (
                            <ServiceConnectionsVisualization
                                services={services}
                                onServiceClick={(serviceName) => {
                                    const service = services.find(
                                        (s) => s.appName === serviceName
                                    )
                                    if (service) {
                                        self.handleServiceClick(service)
                                    }
                                }}
                            />
                        )}
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Environment" key="environment">
                        <ProjectEnvironment
                            projectId={projectId}
                            apiManager={self.apiManager}
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Deployments" key="deployments">
                        <DeploymentHistory
                            projectId={projectId}
                            apiManager={self.apiManager}
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Settings" key="settings">
                        <div>Project settings (coming soon)</div>
                    </Tabs.TabPane>
                </Tabs>

                <ServiceDetailDrawer
                    service={self.state.selectedService}
                    visible={self.state.drawerVisible}
                    onClose={() => self.handleDrawerClose()}
                    apiManager={self.apiManager}
                    projectId={projectId}
                    onServiceUpdated={() => self.reFetchData()}
                    allServices={services}
                    rootDomain={apiData.rootDomain || ''}
                    captainSubDomain={apiData.captainSubDomain || 'captain'}
                />
            </div>
        )
    }
}

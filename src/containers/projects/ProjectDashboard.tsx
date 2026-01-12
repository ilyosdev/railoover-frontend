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
import ProjectSettings from './ProjectSettings'
import ServicesOverview from './ServicesOverview'
import ServiceDetailDrawer from './ServiceDetailDrawer'
import DatabaseServiceDrawer from './DatabaseServiceDrawer'
import WorkerServiceDrawer from './WorkerServiceDrawer'
import ProjectCollaborators from './ProjectCollaborators'
import '../../styles/project-dashboard.css'

type ServiceType = 'database' | 'web' | 'worker'

function getDeployedImageName(service: IAppDef): string {
    const deployedVersion = service.deployedVersion || 0
    const versionInfo = service.versions?.find(
        (v) => v.version === deployedVersion
    )
    return versionInfo?.deployedImageName || ''
}

function getServiceType(service: IAppDef): ServiceType {
    const tags = service.tags || []
    const appName = (service.appName || '').toLowerCase()
    const imageName = getDeployedImageName(service).toLowerCase()

    const dbKeywords = [
        'postgres',
        'mysql',
        'redis',
        'mongodb',
        'mongo',
        'mariadb',
    ]
    const workerKeywords = ['worker', 'cron', 'job', 'queue', 'consumer']

    if (
        tags.some((t) =>
            ['database', ...dbKeywords].includes(t.tagName?.toLowerCase())
        )
    ) {
        return 'database'
    }

    if (
        dbKeywords.some((kw) => appName.includes(kw) || imageName.includes(kw))
    ) {
        return 'database'
    }

    if (tags.some((t) => workerKeywords.includes(t.tagName?.toLowerCase()))) {
        return 'worker'
    }

    if (workerKeywords.some((kw) => appName.includes(kw))) {
        return 'worker'
    }

    return 'web'
}

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

        const searchParams = new URLSearchParams(self.props.location.search)
        const activeTab = searchParams.get('tab') || 'overview'

        return (
            <div className="slow-fadein-fast project-dashboard-container">
                <div className="project-header">
                    <h1>{project.name}</h1>
                    {project.description && <p>{project.description}</p>}
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => {
                        self.props.history.push(
                            `/projects/${projectId}?tab=${key}`
                        )
                    }}
                >
                    <Tabs.TabPane tab="Overview" key="overview">
                        <ServicesOverview
                            services={services}
                            projectId={projectId}
                            onReloadRequested={() => self.reFetchData()}
                            onServiceClick={(service) =>
                                self.handleServiceClick(service)
                            }
                        />
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
                        <ProjectSettings
                            projectId={projectId}
                            projectName={project.name}
                            projectDescription={project.description}
                            apiManager={self.apiManager}
                            onProjectDeleted={() => {
                                self.props.history.push('/projects')
                            }}
                            onProjectUpdated={() => self.reFetchData()}
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Collaborators" key="collaborators">
                        <ProjectCollaborators
                            projectId={projectId}
                            apiManager={self.apiManager}
                        />
                    </Tabs.TabPane>
                </Tabs>

                {self.state.selectedService &&
                    getServiceType(self.state.selectedService) ===
                        'database' && (
                        <DatabaseServiceDrawer
                            service={self.state.selectedService}
                            visible={self.state.drawerVisible}
                            onClose={() => self.handleDrawerClose()}
                            apiManager={self.apiManager}
                            projectId={projectId}
                            onServiceUpdated={() => self.reFetchData()}
                            rootDomain={apiData.rootDomain || ''}
                        />
                    )}

                {self.state.selectedService &&
                    getServiceType(self.state.selectedService) === 'worker' && (
                        <WorkerServiceDrawer
                            service={self.state.selectedService}
                            visible={self.state.drawerVisible}
                            onClose={() => self.handleDrawerClose()}
                            apiManager={self.apiManager}
                            projectId={projectId}
                            onServiceUpdated={() => self.reFetchData()}
                            allServices={services}
                        />
                    )}

                {(!self.state.selectedService ||
                    getServiceType(self.state.selectedService) === 'web') && (
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
                )}
            </div>
        )
    }
}

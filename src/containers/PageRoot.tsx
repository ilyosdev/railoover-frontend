import { Layout } from 'antd'
import React, { RefObject } from 'react'
import { connect } from 'react-redux'
import { Route, RouteComponentProps, Switch } from 'react-router'
import ApiManager from '../api/ApiManager'
import { IVersionInfo } from '../models/IVersionInfo'
import * as GlobalActions from '../redux/actions/GlobalActions'
import StorageHelper from '../utils/StorageHelper'
import Dashboard from './Dashboard'
import LoggedInCatchAll from './LoggedInCatchAll'
import Sidebar from './Sidebar'
import Apps from './apps/Apps'
import ProjectDetailsEdit from './apps/ProjectDetailsEdit'
import AppDetails from './apps/appDetails/AppDetails'
import DockerComposeEntry from './apps/compose/DockerComposeEntry'
import OneClickAppSelector, {
    TEMPLATE_ONE_CLICK_APP,
} from './apps/oneclick/selector/OneClickAppSelector'
import TemplateInputPage from './apps/oneclick/template/TemplateInputPage'
import OneClickAppConfigPage from './apps/oneclick/variables/OneClickAppConfigPage'
import OneClickDeploymentPage from './apps/oneclick/variables/OneClickDeploymentPage'
import ApiComponent from './global/ApiComponent'
import Maintenance from './maintenance/Maintenance'
import Monitoring from './monitoring/Monitoring'
import Cluster from './nodes/Cluster'
import Settings from './settings/Settings'
import ProjectDashboard from './projects/ProjectDashboard'
import Projects from './projects/Projects'
import TeamManagement from './team/TeamManagement'
import ContainerStats from './stats/ContainerStats'
import '../styles/header-tabs.css'

const { Content } = Layout

interface RootPageInterface extends RouteComponentProps<any> {
    rootElementKey: string
    emitSizeChanged: () => void
    isMobile: boolean
}

class PageRoot extends ApiComponent<
    RootPageInterface,
    {
        versionInfo: IVersionInfo | undefined
        collapsed: boolean
    }
> {
    private mainContainer: RefObject<HTMLDivElement>

    constructor(props: any) {
        super(props)
        this.mainContainer = React.createRef()
        this.state = {
            versionInfo: undefined,
            collapsed: false,
        }
    }

    updateDimensions = () => this.props.emitSizeChanged()

    componentWillUnmount() {
        // @ts-ignore
        if (super.componentWillUnmount) super.componentWillUnmount()
        this.updateDimensions()
        window.removeEventListener('resize', this.updateDimensions)
    }

    componentDidUpdate(prevProps: any) {
        // Typical usage (don't forget to compare props):
        if (
            this.props.location.pathname !== prevProps.location.pathname &&
            this.props.isMobile
        ) {
            this.setState({ collapsed: true })
        }
    }

    componentDidMount() {
        const self = this
        this.updateDimensions()

        window.addEventListener('resize', this.updateDimensions)

        if (!ApiManager.isLoggedIn()) {
            this.goToLogin()
        } else {
            this.apiManager
                .getVersionInfo()
                .then(function (data) {
                    self.setState({ versionInfo: data })
                })
                .catch((err) => {
                    // ignore error
                })
            this.setState({
                collapsed:
                    StorageHelper.getSiderCollapsedStateFromLocalStorage(),
            })
        }
    }

    goToLogin() {
        this.props.history.push('/login')
    }

    toggleSider = () => {
        StorageHelper.setSiderCollapsedStateInLocalStorage(
            !this.state.collapsed
        )
        this.setState({ collapsed: !this.state.collapsed })
    }

    render() {
        const self = this

        return (
            <Layout className="full-screen" key={self.props.rootElementKey}>
                <Layout>
                    <Sidebar
                        isMobile={this.props.isMobile}
                        collapsed={this.state.collapsed}
                        toggleSider={this.toggleSider}
                        location={this.props.location}
                        history={this.props.history}
                        onLogoutClicked={() => {
                            ApiManager.clearAuthKeys()
                            self.goToLogin()
                        }}
                    />
                    <Content>
                        <div
                            ref={self.mainContainer}
                            style={{
                                paddingTop: 12,
                                paddingBottom: 36,
                                height: '100%',
                                overflowY: 'scroll',
                                marginInlineEnd: self.state.collapsed
                                    ? 0
                                    : self.props.isMobile
                                      ? -200
                                      : 0,
                                transition: 'margin-right 0.3s ease',
                            }}
                            id="main-content-layout"
                        >
                            <Switch>
                                <Route
                                    path="/dashboard/"
                                    component={Dashboard}
                                />

                                <Route
                                    path="/projects/:projectId/services/:serviceName"
                                    render={(props) => (
                                        <AppDetails
                                            {...props}
                                            mainContainer={self.mainContainer}
                                        />
                                    )}
                                />
                                <Route
                                    path="/projects/:projectId"
                                    component={ProjectDashboard}
                                />
                                <Route
                                    path="/projects"
                                    exact
                                    component={Projects}
                                />

                                <Route
                                    path="/apps/projects/new"
                                    render={(props) => (
                                        <ProjectDetailsEdit
                                            {...props}
                                            createNewProject={true}
                                            mainContainer={self.mainContainer}
                                        />
                                    )}
                                />

                                <Route
                                    path="/apps/projects/:projectId"
                                    render={(props) => (
                                        <ProjectDetailsEdit
                                            {...props}
                                            createNewProject={false}
                                            mainContainer={self.mainContainer}
                                        />
                                    )}
                                />
                                <Route
                                    path="/apps/details/:appName"
                                    render={(props) => (
                                        <AppDetails
                                            {...props}
                                            mainContainer={self.mainContainer}
                                        />
                                    )}
                                />
                                <Route
                                    path={`/apps/oneclick/input/${TEMPLATE_ONE_CLICK_APP}`}
                                    component={TemplateInputPage}
                                />
                                <Route
                                    path="/apps/oneclick/deployment"
                                    component={OneClickDeploymentPage}
                                />
                                <Route
                                    path="/apps/oneclick/:appName"
                                    component={OneClickAppConfigPage}
                                />
                                <Route
                                    path="/apps/oneclick"
                                    component={OneClickAppSelector}
                                />
                                <Route
                                    path="/apps/dockercompose"
                                    component={DockerComposeEntry}
                                />
                                <Route path="/apps/" component={Apps} />
                                <Route
                                    path="/monitoring/"
                                    component={Monitoring}
                                />
                                <Route path="/cluster/" component={Cluster} />
                                <Route
                                    path="/maintenance/"
                                    component={Maintenance}
                                />
                                <Route path="/settings/" component={Settings} />
                                <Route
                                    path="/team/"
                                    component={TeamManagement}
                                />
                                <Route
                                    path="/stats/"
                                    component={ContainerStats}
                                />
                                <Route path="/" component={LoggedInCatchAll} />
                            </Switch>
                        </div>
                    </Content>
                </Layout>
            </Layout>
        )
    }
}

function mapStateToProps(state: any) {
    return {
        rootElementKey: state.globalReducer.rootElementKey,
        isMobile: state.globalReducer.isMobile,
    }
}

export default connect(mapStateToProps, {
    emitSizeChanged: GlobalActions.emitSizeChanged,
})(PageRoot)

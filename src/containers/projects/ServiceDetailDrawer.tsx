import {
    Badge,
    Button,
    Drawer,
    Tabs,
    Row,
    Col,
    Tag,
    Divider,
    Empty,
    Input,
    InputNumber,
    Switch,
    message,
    Modal,
    Spin,
    Tooltip,
    Select,
    Progress,
} from 'antd'
import {
    CloseOutlined,
    CloudServerOutlined,
    HistoryOutlined,
    FileTextOutlined,
    SettingOutlined,
    PlusOutlined,
    DeleteOutlined,
    SaveOutlined,
    ReloadOutlined,
    RollbackOutlined,
    CopyOutlined,
    LinkOutlined,
    CheckCircleOutlined,
    LoadingOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    CodeOutlined,
    GithubOutlined,
    BranchesOutlined,
    KeyOutlined,
    WarningOutlined,
    GlobalOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons'
import moment from 'moment'
import { Component } from 'react'
import { IAppDef, IAppEnvVar, RepoInfo } from '../apps/AppDefinition'
import ApiManager from '../../api/ApiManager'
import Utils from '../../utils/Utils'
import Toaster from '../../utils/Toaster'
import '../../styles/project-dashboard.css'

interface ServiceDetailDrawerProps {
    service: IAppDef | null
    visible: boolean
    onClose: () => void
    apiManager: ApiManager
    projectId: string
    onServiceUpdated?: () => void
    allServices?: IAppDef[]
    rootDomain?: string
    captainSubDomain?: string
}

interface ContainerStats {
    cpuPercent: number
    memoryUsageMB: number
    memoryLimitMB: number
    memoryPercent: number
    networkRxMB: number
    networkTxMB: number
}

interface ServiceDetailDrawerState {
    activeTab: string
    appLogs: string
    isLoadingLogs: boolean
    isWrappedLogs: boolean
    logFilter: string
    isSaving: boolean
    editedEnvVars: IAppEnvVar[]
    editedInstanceCount: number
    editedContainerPort: number
    editedNotExposeAsWebApp: boolean
    editedForceSsl: boolean
    editedWebsocketSupport: boolean
    newEnvKey: string
    newEnvValue: string
    showAddEnvModal: boolean
    isRedeploying: boolean
    showConnectModal: boolean
    selectedServiceToConnect: string
    isConnecting: boolean
    isRollingBack: boolean
    expandedDeploymentLogs: number | null
    gitRepo: string
    gitBranch: string
    gitUser: string
    gitPassword: string
    gitSshKey: string
    isForcingBuild: boolean
    isDeleting: boolean
    githubConnected: boolean
    githubConfigured: boolean
    containerStats: ContainerStats | null
    isLoadingStats: boolean
    githubRepos: Array<{
        id: number
        name: string
        fullName: string
        defaultBranch: string
        owner: string
    }>
    selectedGithubRepo: string
    selectedGithubBranch: string
    githubBranches: string[]
    isLoadingRepos: boolean
    isLoadingBranches: boolean
    isConnectingRepo: boolean
    newDomain: string
    isAddingDomain: boolean
    enablingSslDomain: string
    removingDomain: string
}

export default class ServiceDetailDrawer extends Component<
    ServiceDetailDrawerProps,
    ServiceDetailDrawerState
> {
    private logFetchInterval: NodeJS.Timeout | null = null
    private statsFetchInterval: NodeJS.Timeout | null = null
    private willUnmountSoon = false

    constructor(props: ServiceDetailDrawerProps) {
        super(props)
        this.state = {
            activeTab: 'overview',
            appLogs: '',
            isLoadingLogs: false,
            isWrappedLogs: true,
            logFilter: '',
            isSaving: false,
            editedEnvVars: [],
            editedInstanceCount: 1,
            editedContainerPort: 80,
            editedNotExposeAsWebApp: false,
            editedForceSsl: false,
            editedWebsocketSupport: false,
            newEnvKey: '',
            newEnvValue: '',
            showAddEnvModal: false,
            isRedeploying: false,
            showConnectModal: false,
            selectedServiceToConnect: '',
            isConnecting: false,
            isRollingBack: false,
            expandedDeploymentLogs: null,
            gitRepo: '',
            gitBranch: '',
            gitUser: '',
            gitPassword: '',
            gitSshKey: '',
            isForcingBuild: false,
            isDeleting: false,
            githubConnected: false,
            githubConfigured: false,
            containerStats: null,
            isLoadingStats: false,
            githubRepos: [],
            selectedGithubRepo: '',
            selectedGithubBranch: '',
            githubBranches: [],
            isLoadingRepos: false,
            isLoadingBranches: false,
            isConnectingRepo: false,
            newDomain: '',
            isAddingDomain: false,
            enablingSslDomain: '',
            removingDomain: '',
        }
    }

    componentDidUpdate(prevProps: ServiceDetailDrawerProps) {
        if (!prevProps.visible && this.props.visible && this.props.service) {
            const repoInfo = this.props.service.appPushWebhook?.repoInfo
            this.setState({
                activeTab: 'overview',
                editedEnvVars: [...(this.props.service.envVars || [])],
                editedInstanceCount: this.props.service.instanceCount || 1,
                editedContainerPort: this.props.service.containerHttpPort || 80,
                editedNotExposeAsWebApp:
                    this.props.service.notExposeAsWebApp || false,
                editedForceSsl: this.props.service.forceSsl || false,
                editedWebsocketSupport:
                    this.props.service.websocketSupport || false,
                appLogs: '',
                containerStats: null,
                gitRepo: repoInfo?.repo || '',
                gitBranch: repoInfo?.branch || '',
                gitUser: repoInfo?.user || '',
                gitPassword: repoInfo?.password || '',
                gitSshKey: repoInfo?.sshKey || '',
            })
            this.checkGitHubStatus()
            this.startStatsFetching()
        }

        if (prevProps.visible && !this.props.visible) {
            this.stopLogFetching()
            this.stopStatsFetching()
        }
    }

    checkGitHubStatus() {
        const self = this
        const { apiManager } = this.props

        apiManager
            .executeGenericApiCommand('GET', '/user/github/status', {})
            .then(function (data: any) {
                self.setState({
                    githubConnected: data.connected,
                    githubConfigured: data.configured,
                })
                if (data.connected) {
                    self.fetchGitHubRepos()
                }
            })
            .catch(function () {
                self.setState({
                    githubConfigured: false,
                    githubConnected: false,
                })
            })
    }

    fetchGitHubRepos() {
        const self = this
        const { apiManager } = this.props

        self.setState({ isLoadingRepos: true })

        apiManager
            .executeGenericApiCommand('GET', '/user/github/repos', {})
            .then(function (data: any) {
                self.setState({
                    githubRepos: data.repos || [],
                    isLoadingRepos: false,
                })
            })
            .catch(function () {
                self.setState({ isLoadingRepos: false })
            })
    }

    fetchGitHubBranches(owner: string, repo: string) {
        const self = this
        const { apiManager } = this.props

        self.setState({ isLoadingBranches: true })

        apiManager
            .executeGenericApiCommand(
                'GET',
                `/user/github/repos/${owner}/${repo}/branches`,
                {}
            )
            .then(function (data: any) {
                self.setState({
                    githubBranches: data.branches || [],
                    isLoadingBranches: false,
                })
            })
            .catch(function () {
                self.setState({ isLoadingBranches: false })
            })
    }

    handleConnectGitHub() {
        const self = this
        const { apiManager } = this.props

        const messageHandler = function (event: MessageEvent) {
            if (
                event.origin === window.location.origin &&
                event.data?.type === 'github-oauth-callback' &&
                event.data?.code
            ) {
                window.removeEventListener('message', messageHandler)
                self.handleGitHubCallback(event.data.code)
            }
        }

        window.addEventListener('message', messageHandler)

        apiManager
            .executeGenericApiCommand('GET', '/user/github/auth-url', {})
            .then(function (data: any) {
                if (data.authUrl) {
                    const width = 600
                    const height = 700
                    const left =
                        window.screenX + (window.outerWidth - width) / 2
                    const top =
                        window.screenY + (window.outerHeight - height) / 2

                    const popup = window.open(
                        data.authUrl,
                        'github-oauth',
                        `width=${width},height=${height},left=${left},top=${top}`
                    )

                    const checkClosed = setInterval(function () {
                        if (!popup || popup.closed) {
                            clearInterval(checkClosed)
                            window.removeEventListener(
                                'message',
                                messageHandler
                            )
                        }
                    }, 1000)
                }
            })
            .catch(Toaster.createCatcher())
    }

    handleGitHubCallback(code: string) {
        const self = this
        const { apiManager } = this.props

        apiManager
            .executeGenericApiCommand('POST', '/user/github/callback', { code })
            .then(function () {
                message.success('GitHub connected successfully!')
                self.setState({ githubConnected: true })
                self.fetchGitHubRepos()
            })
            .catch(Toaster.createCatcher())
    }

    handleSelectGitHubRepo(repoFullName: string) {
        const self = this
        const repo = this.state.githubRepos.find(
            (r) => r.fullName === repoFullName
        )

        if (repo) {
            self.setState({
                selectedGithubRepo: repoFullName,
                selectedGithubBranch: repo.defaultBranch,
            })
            self.fetchGitHubBranches(repo.owner, repo.name)
        }
    }

    handleConnectGitHubRepo() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props
        const { selectedGithubRepo, selectedGithubBranch } = this.state

        if (!service?.appName || !selectedGithubRepo) return

        self.setState({ isConnectingRepo: true })

        apiManager
            .executeGenericApiCommand('POST', '/user/github/connect-repo', {
                appName: service.appName,
                repoFullName: selectedGithubRepo,
                branch: selectedGithubBranch,
            })
            .then(function (data: any) {
                message.success(
                    `Connected to ${selectedGithubRepo}! Deployments will trigger on push.`
                )
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isConnectingRepo: false })
            })
    }

    handleAddCustomDomain() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props
        const { newDomain } = this.state

        if (!service?.appName || !newDomain.trim()) return

        self.setState({ isAddingDomain: true })

        apiManager
            .attachNewCustomDomainToApp(service.appName, newDomain.trim())
            .then(function () {
                message.success(`Domain ${newDomain} connected successfully!`)
                self.setState({ newDomain: '' })
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isAddingDomain: false })
            })
    }

    handleEnableSsl(domain: string) {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service?.appName) return

        self.setState({ enablingSslDomain: domain })

        apiManager
            .enableSslForCustomDomain(service.appName, domain)
            .then(function () {
                message.success(`SSL enabled for ${domain}`)
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ enablingSslDomain: '' })
            })
    }

    handleEnableBaseSsl() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service?.appName) return

        self.setState({ enablingSslDomain: 'base' })

        apiManager
            .enableSslForBaseDomain(service.appName)
            .then(function () {
                message.success('SSL enabled for default domain')
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ enablingSslDomain: '' })
            })
    }

    handleRemoveDomain(domain: string) {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service?.appName) return

        Modal.confirm({
            title: 'Remove Domain',
            content: `Are you sure you want to remove ${domain}?`,
            okText: 'Remove',
            okButtonProps: { danger: true },
            onOk() {
                self.setState({ removingDomain: domain })

                apiManager
                    .removeCustomDomain(service.appName!, domain)
                    .then(function () {
                        message.success(`Domain ${domain} removed`)
                        if (onServiceUpdated) onServiceUpdated()
                    })
                    .catch(Toaster.createCatcher())
                    .then(function () {
                        self.setState({ removingDomain: '' })
                    })
            },
        })
    }

    componentWillUnmount() {
        this.willUnmountSoon = true
        this.stopLogFetching()
        this.stopStatsFetching()
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

    startStatsFetching() {
        if (this.statsFetchInterval) return
        this.fetchStats()
        this.statsFetchInterval = setInterval(() => this.fetchStats(), 10000)
    }

    stopStatsFetching() {
        if (this.statsFetchInterval) {
            clearInterval(this.statsFetchInterval)
            this.statsFetchInterval = null
        }
    }

    fetchStats() {
        const self = this
        const { service, apiManager } = this.props

        if (!service || !service.appName) return

        self.setState({ isLoadingStats: true })

        apiManager
            .executeGenericApiCommand('GET', '/user/system/stats/', {})
            .then((res: any) => {
                if (self.willUnmountSoon) return

                const allStats = res.stats || []
                const serviceName = `srv-captain--${service.appName}`
                const serviceStats = allStats.find(
                    (s: any) => s.serviceName === serviceName
                )

                self.setState({
                    containerStats: serviceStats || null,
                    isLoadingStats: false,
                })
            })
            .catch(() => {
                if (self.willUnmountSoon) return
                self.setState({ isLoadingStats: false })
            })
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
            })
            .catch(function () {
                self.setState({
                    appLogs: 'Failed to fetch logs...',
                    isLoadingLogs: false,
                })
            })
            .then(function () {
                if (!self.willUnmountSoon && self.state.activeTab === 'logs') {
                    self.logFetchInterval = setTimeout(() => {
                        self.fetchLogs()
                    }, 3000)
                }
            })
    }

    getFilteredLogs(): string {
        const { appLogs, logFilter } = this.state
        if (!logFilter.trim()) return appLogs

        const lines = appLogs.split('\n')
        const filteredLines = lines.filter((line) =>
            line.toLowerCase().includes(logFilter.toLowerCase())
        )
        return filteredLines.join('\n')
    }

    detectServiceType(service: IAppDef): string {
        const tags = service.tags || []
        const knownTypes = ['frontend', 'backend', 'database', 'worker']
        const typeTag = tags.find((t) =>
            knownTypes.includes(t.tagName?.toLowerCase())
        )
        if (typeTag) {
            return typeTag.tagName.toLowerCase()
        }

        const name = (service.appName || '').toLowerCase()

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
            name.includes('front') ||
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

    getServiceColor(type: string): string {
        const colors: { [key: string]: string } = {
            frontend: '#8b5cf6',
            backend: '#3b82f6',
            database: '#10b981',
            worker: '#f59e0b',
        }
        return colors[type] || '#3b82f6'
    }

    handleAddEnvVar() {
        const { newEnvKey, newEnvValue, editedEnvVars } = this.state

        if (!newEnvKey.trim()) {
            message.error('Environment variable key is required')
            return
        }

        if (editedEnvVars.find((e) => e.key === newEnvKey.trim())) {
            message.error('Environment variable key already exists')
            return
        }

        this.setState({
            editedEnvVars: [
                ...editedEnvVars,
                { key: newEnvKey.trim(), value: newEnvValue },
            ],
            newEnvKey: '',
            newEnvValue: '',
            showAddEnvModal: false,
        })
    }

    handleDeleteEnvVar(key: string) {
        this.setState({
            editedEnvVars: this.state.editedEnvVars.filter(
                (e) => e.key !== key
            ),
        })
    }

    handleUpdateEnvVar(key: string, value: string) {
        this.setState({
            editedEnvVars: this.state.editedEnvVars.map((e) =>
                e.key === key ? { ...e, value } : e
            ),
        })
    }

    handleSaveSettings() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props
        const {
            editedEnvVars,
            editedInstanceCount,
            editedContainerPort,
            editedNotExposeAsWebApp,
            editedForceSsl,
            editedWebsocketSupport,
        } = this.state

        if (!service || !service.appName) return

        self.setState({ isSaving: true })

        const updatedApp: IAppDef = {
            ...service,
            envVars: editedEnvVars,
            instanceCount: editedInstanceCount,
            containerHttpPort: editedContainerPort,
            notExposeAsWebApp: editedNotExposeAsWebApp,
            forceSsl: editedForceSsl,
            websocketSupport: editedWebsocketSupport,
        }

        apiManager
            .updateConfigAndSave(service.appName, updatedApp)
            .then(function () {
                message.success('Settings saved successfully')
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isSaving: false })
            })
    }

    handleRedeploy() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service || !service.appName) return

        Modal.confirm({
            title: 'Redeploy Service',
            content: `Are you sure you want to redeploy ${service.appName}?`,
            okText: 'Redeploy',
            okType: 'primary',
            onOk() {
                self.setState({ isRedeploying: true })

                apiManager
                    .forceBuild(
                        `/api/v2/user/apps/webhooks/triggerbuild?namespace=captain&token=captain`
                    )
                    .catch(() => {
                        const deployedVersion = service.deployedVersion || 0
                        const versionInfo = service.versions?.find(
                            (v) => v.version === deployedVersion
                        )
                        return apiManager.uploadCaptainDefinitionContent(
                            service.appName!,
                            {
                                schemaVersion: 2,
                                imageName:
                                    versionInfo?.deployedImageName ||
                                    'caprover/caprover-placeholder-app:latest',
                            },
                            '',
                            true
                        )
                    })
                    .then(function () {
                        message.success('Redeploy triggered successfully')
                        if (onServiceUpdated) onServiceUpdated()
                    })
                    .catch(Toaster.createCatcher())
                    .then(function () {
                        self.setState({ isRedeploying: false })
                    })
            },
        })
    }

    copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
        message.success('Copied to clipboard')
    }

    handleSaveGitRepo() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props
        const { gitRepo, gitBranch, gitUser, gitPassword, gitSshKey } =
            this.state

        if (!service || !service.appName) return

        self.setState({ isSaving: true })

        const repoInfo: RepoInfo = {
            repo: gitRepo,
            branch: gitBranch,
            user: gitUser,
            password: gitPassword,
            sshKey: gitSshKey,
        }

        const updatedApp: IAppDef = {
            ...service,
            appPushWebhook: {
                repoInfo: repoInfo,
                tokenVersion: service.appPushWebhook?.tokenVersion || '',
                pushWebhookToken:
                    service.appPushWebhook?.pushWebhookToken || '',
            },
        }

        apiManager
            .updateConfigAndSave(service.appName, updatedApp)
            .then(function () {
                message.success('Git repository settings saved')
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isSaving: false })
            })
    }

    handleForceBuild() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service || !service.appName) return

        const webhookToken = service.appPushWebhook?.pushWebhookToken
        if (!webhookToken) {
            message.error('Please save git repository settings first')
            return
        }

        self.setState({ isForcingBuild: true })

        const webhookUrl = `/user/apps/webhooks/triggerbuild?namespace=captain&token=${webhookToken}`

        apiManager
            .forceBuild(webhookUrl)
            .then(function () {
                message.success('Build triggered successfully')
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isForcingBuild: false })
            })
    }

    handleDeleteService() {
        const self = this
        const { service, apiManager, onServiceUpdated, onClose } = this.props

        if (!service || !service.appName) return

        Modal.confirm({
            title: 'Delete Service',
            icon: <WarningOutlined style={{ color: '#ef4444' }} />,
            content: (
                <div>
                    <p>
                        Are you sure you want to delete{' '}
                        <strong>{service.appName}</strong>?
                    </p>
                    <p style={{ color: '#ef4444', marginTop: 12 }}>
                        This action cannot be undone. All data associated with
                        this service will be permanently deleted.
                    </p>
                </div>
            ),
            okText: 'Delete',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk() {
                self.setState({ isDeleting: true })

                apiManager
                    .deleteApp(undefined, [], [service.appName!])
                    .then(function () {
                        message.success('Service deleted successfully')
                        onClose()
                        if (onServiceUpdated) onServiceUpdated()
                    })
                    .catch(Toaster.createCatcher())
                    .then(function () {
                        self.setState({ isDeleting: false })
                    })
            },
        })
    }

    getWebhookUrl(): string {
        const { service, rootDomain, captainSubDomain } = this.props
        if (!service?.appPushWebhook?.pushWebhookToken) return ''

        const protocol = window.location.protocol
        return `${protocol}//${captainSubDomain}.${rootDomain}/api/v2/user/apps/webhooks/triggerbuild?namespace=captain&token=${service.appPushWebhook.pushWebhookToken}`
    }

    getConnectedServices(): string[] {
        const { service, allServices } = this.props
        if (!service || !allServices) return []

        const connectedEnvPrefixes = ['_HOST', '_PORT', '_URL', '_CONNECTION']
        const connected: string[] = []

        const envVars = service.envVars || []
        for (const envVar of envVars) {
            for (const otherService of allServices) {
                if (otherService.appName === service.appName) continue

                const otherName = (otherService.appName || '')
                    .toUpperCase()
                    .replace(/-/g, '_')

                for (const suffix of connectedEnvPrefixes) {
                    if (envVar.key.includes(otherName + suffix)) {
                        if (!connected.includes(otherService.appName || '')) {
                            connected.push(otherService.appName || '')
                        }
                    }
                }
            }
        }

        return connected
    }

    handleConnectService() {
        const self = this
        const { service, apiManager, projectId, onServiceUpdated } = this.props
        const { selectedServiceToConnect } = this.state

        if (!service || !service.appName || !selectedServiceToConnect) return

        self.setState({ isConnecting: true })

        apiManager
            .executeGenericApiCommand(
                'POST',
                '/user/projects/' + projectId + '/connections',
                {
                    fromService: service.appName,
                    toService: selectedServiceToConnect,
                }
            )
            .then(function () {
                message.success(
                    `Connected ${service.appName} to ${selectedServiceToConnect}`
                )
                self.setState({
                    showConnectModal: false,
                    selectedServiceToConnect: '',
                })
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isConnecting: false })
            })
    }

    renderOverviewTab() {
        const { service } = this.props
        const { editedEnvVars, containerStats, isLoadingStats } = this.state

        if (!service) return null

        const serviceType = this.detectServiceType(service)
        const color = this.getServiceColor(serviceType)

        const getCpuColor = (percent: number) => {
            if (percent >= 80) return '#ff4d4f'
            if (percent >= 50) return '#faad14'
            return '#52c41a'
        }

        const getMemoryColor = (percent: number) => {
            if (percent >= 90) return '#ff4d4f'
            if (percent >= 70) return '#faad14'
            return '#52c41a'
        }

        return (
            <div className="service-drawer-tab-content">
                <div className="service-drawer-section">
                    <h4 className="service-drawer-section-title">
                        Resource Usage
                        {isLoadingStats && (
                            <LoadingOutlined
                                style={{ marginLeft: 8, fontSize: 12 }}
                            />
                        )}
                    </h4>

                    {containerStats ? (
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div className="service-drawer-stat-card">
                                    <div className="service-drawer-stat-label">
                                        CPU
                                    </div>
                                    <Progress
                                        percent={Math.min(
                                            containerStats.cpuPercent,
                                            100
                                        )}
                                        size="small"
                                        strokeColor={getCpuColor(
                                            containerStats.cpuPercent
                                        )}
                                        format={() =>
                                            `${containerStats.cpuPercent.toFixed(1)}%`
                                        }
                                    />
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="service-drawer-stat-card">
                                    <div className="service-drawer-stat-label">
                                        Memory
                                    </div>
                                    <Progress
                                        percent={Math.min(
                                            containerStats.memoryPercent,
                                            100
                                        )}
                                        size="small"
                                        strokeColor={getMemoryColor(
                                            containerStats.memoryPercent
                                        )}
                                        format={() =>
                                            `${containerStats.memoryUsageMB.toFixed(0)} MB`
                                        }
                                    />
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="service-drawer-stat-card">
                                    <div className="service-drawer-stat-label">
                                        Network RX
                                    </div>
                                    <div className="service-drawer-stat-value">
                                        {containerStats.networkRxMB.toFixed(1)}{' '}
                                        MB
                                    </div>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="service-drawer-stat-card">
                                    <div className="service-drawer-stat-label">
                                        Network TX
                                    </div>
                                    <div className="service-drawer-stat-value">
                                        {containerStats.networkTxMB.toFixed(1)}{' '}
                                        MB
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    ) : (
                        <div
                            style={{
                                color: '#666',
                                textAlign: 'center',
                                padding: '20px 0',
                            }}
                        >
                            {isLoadingStats
                                ? 'Loading stats...'
                                : 'Stats unavailable'}
                        </div>
                    )}
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '20px 0' }} />

                <div className="service-drawer-section">
                    <h4 className="service-drawer-section-title">
                        Service Configuration
                    </h4>

                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <div className="service-drawer-stat-card">
                                <div className="service-drawer-stat-label">
                                    Instance Count
                                </div>
                                <div className="service-drawer-stat-value">
                                    {service.instanceCount || 1}
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="service-drawer-stat-card">
                                <div className="service-drawer-stat-label">
                                    Container Port
                                </div>
                                <div className="service-drawer-stat-value">
                                    {service.containerHttpPort || 80}
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="service-drawer-stat-card">
                                <div className="service-drawer-stat-label">
                                    Deployed Version
                                </div>
                                <div className="service-drawer-stat-value">
                                    v{service.deployedVersion || 0}
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="service-drawer-stat-card">
                                <div className="service-drawer-stat-label">
                                    Service Type
                                </div>
                                <div
                                    className="service-drawer-stat-value"
                                    style={{ color }}
                                >
                                    {serviceType.charAt(0).toUpperCase() +
                                        serviceType.slice(1)}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '20px 0' }} />

                <div className="service-drawer-section">
                    <h4 className="service-drawer-section-title">
                        Network Configuration
                    </h4>
                    <div className="service-drawer-info-grid">
                        <div className="service-drawer-info-row">
                            <span className="service-drawer-info-label">
                                Expose as Web App
                            </span>
                            <span className="service-drawer-info-value">
                                {service.notExposeAsWebApp ? 'No' : 'Yes'}
                            </span>
                        </div>
                        <div className="service-drawer-info-row">
                            <span className="service-drawer-info-label">
                                Force SSL
                            </span>
                            <span className="service-drawer-info-value">
                                {service.forceSsl ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <div className="service-drawer-info-row">
                            <span className="service-drawer-info-label">
                                WebSocket Support
                            </span>
                            <span className="service-drawer-info-value">
                                {service.websocketSupport
                                    ? 'Enabled'
                                    : 'Disabled'}
                            </span>
                        </div>
                        <div className="service-drawer-info-row">
                            <span className="service-drawer-info-label">
                                Persistent Data
                            </span>
                            <span className="service-drawer-info-value">
                                {service.hasPersistentData
                                    ? 'Enabled'
                                    : 'Disabled'}
                            </span>
                        </div>
                    </div>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '20px 0' }} />

                <div className="service-drawer-section">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <h4
                            className="service-drawer-section-title"
                            style={{ margin: 0 }}
                        >
                            Environment Variables
                            {editedEnvVars.length > 0 && (
                                <span className="service-drawer-count-badge">
                                    {editedEnvVars.length}
                                </span>
                            )}
                        </h4>
                        <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() =>
                                this.setState({ showAddEnvModal: true })
                            }
                        >
                            Add
                        </Button>
                    </div>

                    {editedEnvVars.length > 0 ? (
                        <div className="service-drawer-env-list">
                            {editedEnvVars.map((envVar) => (
                                <div
                                    key={envVar.key}
                                    className="service-drawer-env-item"
                                >
                                    <div className="service-drawer-env-key">
                                        {envVar.key}
                                        <Tooltip title="Copy key">
                                            <CopyOutlined
                                                style={{
                                                    marginLeft: 8,
                                                    cursor: 'pointer',
                                                    opacity: 0.6,
                                                }}
                                                onClick={() =>
                                                    this.copyToClipboard(
                                                        envVar.key
                                                    )
                                                }
                                            />
                                        </Tooltip>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <Input
                                            size="small"
                                            value={envVar.value}
                                            onChange={(e) =>
                                                this.handleUpdateEnvVar(
                                                    envVar.key,
                                                    e.target.value
                                                )
                                            }
                                            style={{
                                                width: 200,
                                                background: '#2a2a2a',
                                                borderColor: '#3a3a3a',
                                                color: '#e5e5e5',
                                            }}
                                        />
                                        <Button
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() =>
                                                this.handleDeleteEnvVar(
                                                    envVar.key
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="service-drawer-empty-state">
                            No environment variables configured
                        </div>
                    )}
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '20px 0' }} />

                <div className="service-drawer-section">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <h4
                            className="service-drawer-section-title"
                            style={{ margin: 0 }}
                        >
                            Service Connections
                        </h4>
                        <Button
                            type="primary"
                            size="small"
                            icon={<LinkOutlined />}
                            onClick={() =>
                                this.setState({ showConnectModal: true })
                            }
                            disabled={
                                !this.props.allServices ||
                                this.props.allServices.filter(
                                    (s) => s.appName !== service.appName
                                ).length === 0
                            }
                        >
                            Connect
                        </Button>
                    </div>

                    {this.getConnectedServices().length > 0 ? (
                        <div className="service-drawer-connections-list">
                            {this.getConnectedServices().map(
                                (connectedService) => (
                                    <div
                                        key={connectedService}
                                        className="service-drawer-connection-item"
                                    >
                                        <div className="service-drawer-connection-name">
                                            <LinkOutlined
                                                style={{ marginRight: 8 }}
                                            />
                                            {connectedService}
                                        </div>
                                        <Tag color="green">Connected</Tag>
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        <div className="service-drawer-empty-state">
                            No services connected. Connect to databases or other
                            services to auto-inject environment variables.
                        </div>
                    )}
                </div>

                {service.customDomain && service.customDomain.length > 0 && (
                    <>
                        <Divider
                            style={{ borderColor: '#2a2a2a', margin: '20px 0' }}
                        />
                        <div className="service-drawer-section">
                            <h4 className="service-drawer-section-title">
                                Custom Domains
                                <span className="service-drawer-count-badge">
                                    {service.customDomain.length}
                                </span>
                            </h4>
                            <div className="service-drawer-domains-list">
                                {service.customDomain.map((domain, index) => (
                                    <div
                                        key={index}
                                        className="service-drawer-domain-item"
                                    >
                                        <span className="service-drawer-domain-name">
                                            <LinkOutlined
                                                style={{ marginRight: 8 }}
                                            />
                                            {domain.publicDomain}
                                        </span>
                                        <Tag
                                            color={
                                                domain.hasSsl
                                                    ? 'green'
                                                    : 'default'
                                            }
                                        >
                                            {domain.hasSsl
                                                ? 'SSL Enabled'
                                                : 'No SSL'}
                                        </Tag>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <Divider style={{ borderColor: '#2a2a2a', margin: '20px 0' }} />

                <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={this.state.isSaving}
                        onClick={() => this.handleSaveSettings()}
                    >
                        Save Changes
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        loading={this.state.isRedeploying}
                        onClick={() => this.handleRedeploy()}
                    >
                        Redeploy
                    </Button>
                </div>

                <Modal
                    title="Add Environment Variable"
                    open={this.state.showAddEnvModal}
                    onOk={() => this.handleAddEnvVar()}
                    onCancel={() =>
                        this.setState({
                            showAddEnvModal: false,
                            newEnvKey: '',
                            newEnvValue: '',
                        })
                    }
                    okText="Add"
                >
                    <div style={{ marginBottom: 16 }}>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: 8,
                                fontWeight: 500,
                            }}
                        >
                            Key
                        </label>
                        <Input
                            placeholder="DATABASE_URL"
                            value={this.state.newEnvKey}
                            onChange={(e) =>
                                this.setState({ newEnvKey: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: 8,
                                fontWeight: 500,
                            }}
                        >
                            Value
                        </label>
                        <Input.TextArea
                            placeholder="postgresql://..."
                            rows={3}
                            value={this.state.newEnvValue}
                            onChange={(e) =>
                                this.setState({ newEnvValue: e.target.value })
                            }
                        />
                    </div>
                </Modal>

                <Modal
                    title="Connect to Service"
                    open={this.state.showConnectModal}
                    onOk={() => this.handleConnectService()}
                    onCancel={() =>
                        this.setState({
                            showConnectModal: false,
                            selectedServiceToConnect: '',
                        })
                    }
                    okText="Connect"
                    confirmLoading={this.state.isConnecting}
                    okButtonProps={{
                        disabled: !this.state.selectedServiceToConnect,
                    }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ color: '#999', marginBottom: 16 }}>
                            Connecting services will automatically inject
                            environment variables like DATABASE_URL,
                            SERVICE_HOST, etc. into {service.appName}.
                        </p>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: 8,
                                fontWeight: 500,
                            }}
                        >
                            Select Service
                        </label>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Choose a service to connect"
                            value={
                                this.state.selectedServiceToConnect || undefined
                            }
                            onChange={(value) =>
                                this.setState({
                                    selectedServiceToConnect: value,
                                })
                            }
                            options={(this.props.allServices || [])
                                .filter((s) => s.appName !== service.appName)
                                .map((s) => ({
                                    label: s.appName,
                                    value: s.appName,
                                }))}
                        />
                    </div>
                </Modal>
            </div>
        )
    }

    handleRollback(version: number, imageName: string) {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props

        if (!service || !service.appName) return

        Modal.confirm({
            title: 'Rollback Deployment',
            icon: <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />,
            content: (
                <div>
                    <p style={{ marginBottom: 12 }}>
                        Are you sure you want to rollback{' '}
                        <strong>{service.appName}</strong> to version{' '}
                        <strong>#{version}</strong>?
                    </p>
                    <div
                        style={{
                            background: '#1a1a1a',
                            padding: 12,
                            borderRadius: 6,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: '#999',
                            wordBreak: 'break-all',
                        }}
                    >
                        {imageName}
                    </div>
                </div>
            ),
            okText: 'Rollback',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk() {
                self.setState({ isRollingBack: true })

                apiManager
                    .uploadCaptainDefinitionContent(
                        service.appName!,
                        {
                            schemaVersion: 2,
                            imageName: imageName,
                        },
                        '',
                        true
                    )
                    .then(function () {
                        message.success(
                            `Rollback to version #${version} initiated`
                        )
                        if (onServiceUpdated) onServiceUpdated()
                    })
                    .catch(Toaster.createCatcher())
                    .then(function () {
                        self.setState({ isRollingBack: false })
                    })
            },
        })
    }

    renderDeploymentsTab() {
        const { service } = this.props
        const { isRollingBack, expandedDeploymentLogs } = this.state

        if (!service) return null

        const versions = service.versions || []
        const isBuilding = service.isAppBuilding
        const currentVersion = service.deployedVersion || 0

        const getDeploymentStatus = (
            version: { version: number; deployedImageName?: string },
            index: number
        ) => {
            if (index === 0 && isBuilding) return 'building'
            if (!version.deployedImageName) return 'failed'
            if (version.version === currentVersion) return 'current'
            return 'previous'
        }

        return (
            <div className="service-drawer-tab-content">
                <div className="service-drawer-section">
                    <div className="deployments-header">
                        <div className="deployments-header-left">
                            <h4 className="service-drawer-section-title">
                                Deployment History
                                {versions.length > 0 && (
                                    <span className="service-drawer-count-badge">
                                        {versions.length}
                                    </span>
                                )}
                            </h4>
                            {isBuilding && (
                                <div className="deployment-building-indicator">
                                    <LoadingOutlined spin />
                                    <span>Deploying...</span>
                                </div>
                            )}
                        </div>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            loading={this.state.isRedeploying}
                            onClick={() => this.handleRedeploy()}
                            className="deploy-button"
                        >
                            Deploy
                        </Button>
                    </div>

                    {versions.length > 0 ? (
                        <div className="deployments-timeline">
                            {versions.slice(0, 15).map((version, index) => {
                                const status = getDeploymentStatus(
                                    version,
                                    index
                                )
                                const isCurrent =
                                    version.version === currentVersion
                                const isExpanded =
                                    expandedDeploymentLogs === version.version

                                return (
                                    <div
                                        key={version.version}
                                        className={`deployment-timeline-item ${status}`}
                                    >
                                        <div className="deployment-timeline-track">
                                            <div
                                                className={`deployment-timeline-dot ${status}`}
                                            >
                                                {status === 'building' ? (
                                                    <LoadingOutlined spin />
                                                ) : status === 'current' ? (
                                                    <CheckCircleOutlined />
                                                ) : status === 'failed' ? (
                                                    <ExclamationCircleOutlined />
                                                ) : (
                                                    <ClockCircleOutlined />
                                                )}
                                            </div>
                                            {index < versions.length - 1 && (
                                                <div className="deployment-timeline-line" />
                                            )}
                                        </div>

                                        <div
                                            className={`deployment-card ${status}`}
                                        >
                                            <div className="deployment-card-header">
                                                <div className="deployment-card-title">
                                                    <span className="deployment-version">
                                                        #{version.version}
                                                    </span>
                                                    {isCurrent && (
                                                        <Tag
                                                            color="green"
                                                            className="deployment-current-tag"
                                                        >
                                                            Current
                                                        </Tag>
                                                    )}
                                                    {status === 'building' && (
                                                        <Tag
                                                            color="blue"
                                                            className="deployment-building-tag"
                                                        >
                                                            Building
                                                        </Tag>
                                                    )}
                                                    {status === 'failed' && (
                                                        <Tag
                                                            color="red"
                                                            className="deployment-failed-tag"
                                                        >
                                                            Failed
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
                                                        <Tooltip
                                                            title={
                                                                version.gitHash
                                                            }
                                                        >
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
                                                        <CloudServerOutlined className="deployment-meta-icon" />
                                                        <Tooltip
                                                            title={
                                                                version.deployedImageName
                                                            }
                                                        >
                                                            <span className="deployment-image-name">
                                                                {version
                                                                    .deployedImageName
                                                                    .length > 40
                                                                    ? version.deployedImageName.substring(
                                                                          0,
                                                                          40
                                                                      ) + '...'
                                                                    : version.deployedImageName}
                                                            </span>
                                                        </Tooltip>
                                                    </div>
                                                )}

                                                <div className="deployment-meta-row deployment-timestamp">
                                                    <ClockCircleOutlined className="deployment-meta-icon" />
                                                    <span>
                                                        {moment(
                                                            version.timeStamp
                                                        ).format(
                                                            'MMM DD, YYYY [at] HH:mm'
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="deployment-card-actions">
                                                {!isCurrent &&
                                                    version.deployedImageName && (
                                                        <Button
                                                            size="small"
                                                            icon={
                                                                <RollbackOutlined />
                                                            }
                                                            onClick={() =>
                                                                this.handleRollback(
                                                                    version.version,
                                                                    version.deployedImageName ||
                                                                        ''
                                                                )
                                                            }
                                                            loading={
                                                                isRollingBack
                                                            }
                                                            className="deployment-action-btn rollback"
                                                        >
                                                            Rollback
                                                        </Button>
                                                    )}
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<FileTextOutlined />}
                                                    onClick={() =>
                                                        this.setState({
                                                            expandedDeploymentLogs:
                                                                isExpanded
                                                                    ? null
                                                                    : version.version,
                                                            activeTab: 'logs',
                                                        })
                                                    }
                                                    className="deployment-action-btn logs"
                                                >
                                                    View Logs
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="deployments-empty-state">
                            <div className="deployments-empty-icon">
                                <HistoryOutlined />
                            </div>
                            <h4>No deployments yet</h4>
                            <p>
                                Deploy your first version to start tracking your
                                deployment history.
                            </p>
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                onClick={() => this.handleRedeploy()}
                                loading={this.state.isRedeploying}
                            >
                                Deploy Now
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    renderLogsTab() {
        const { isLoadingLogs, isWrappedLogs, logFilter } = this.state

        return (
            <div className="service-drawer-tab-content">
                <div className="service-drawer-section">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <h4
                            className="service-drawer-section-title"
                            style={{ margin: 0 }}
                        >
                            Application Logs
                        </h4>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                                size="small"
                                onClick={() =>
                                    this.setState({
                                        isWrappedLogs: !isWrappedLogs,
                                    })
                                }
                            >
                                {isWrappedLogs ? 'Unwrap' : 'Wrap'}
                            </Button>
                            <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() =>
                                    this.copyToClipboard(this.getFilteredLogs())
                                }
                            >
                                Copy
                            </Button>
                        </div>
                    </div>

                    <Input
                        placeholder="Filter logs..."
                        value={logFilter}
                        onChange={(e) =>
                            this.setState({ logFilter: e.target.value })
                        }
                        style={{
                            marginBottom: 12,
                            background: '#2a2a2a',
                            borderColor: '#3a3a3a',
                            color: '#e5e5e5',
                        }}
                        allowClear
                    />

                    <div
                        style={{
                            background: '#0a0a0a',
                            borderRadius: 6,
                            padding: 16,
                            height: 400,
                            overflow: 'auto',
                            fontFamily:
                                "'JetBrains Mono', 'Fira Code', monospace",
                            fontSize: 12,
                            lineHeight: 1.6,
                            whiteSpace: isWrappedLogs ? 'pre-wrap' : 'pre',
                            color: '#e5e5e5',
                            border: '1px solid #2a2a2a',
                        }}
                    >
                        {isLoadingLogs ? (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: '100%',
                                }}
                            >
                                <Spin />
                            </div>
                        ) : this.getFilteredLogs() ? (
                            this.getFilteredLogs()
                        ) : (
                            <div
                                style={{
                                    color: '#666',
                                    textAlign: 'center',
                                    paddingTop: 100,
                                }}
                            >
                                No logs available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    renderSettingsTab() {
        const { service } = this.props
        const {
            editedInstanceCount,
            editedContainerPort,
            editedNotExposeAsWebApp,
            editedForceSsl,
            editedWebsocketSupport,
            isSaving,
            gitRepo,
            gitBranch,
            gitUser,
            gitPassword,
            gitSshKey,
            isForcingBuild,
            isDeleting,
        } = this.state

        if (!service) return null

        const webhookUrl = this.getWebhookUrl()

        const {
            githubConnected,
            githubConfigured,
            githubRepos,
            selectedGithubRepo,
            selectedGithubBranch,
            githubBranches,
            isLoadingRepos,
            isLoadingBranches,
            isConnectingRepo,
        } = this.state

        const hasExistingGitConfig = !!(gitRepo && gitBranch)

        return (
            <div className="service-drawer-tab-content">
                <div className="service-drawer-section">
                    <h4 className="service-drawer-section-title">
                        <GithubOutlined style={{ marginRight: 8 }} />
                        Git Deployment
                    </h4>
                    <p className="settings-section-description">
                        Connect a Git repository to enable automatic deployments
                        on push.
                    </p>

                    {githubConfigured && (
                        <div className="github-oauth-section">
                            {githubConnected ? (
                                <div className="github-connected">
                                    <div className="github-connected-header">
                                        <Tag color="green">
                                            <CheckCircleOutlined /> GitHub
                                            Connected
                                        </Tag>
                                    </div>

                                    {hasExistingGitConfig ? (
                                        <div className="github-repo-connected">
                                            <div className="github-repo-info">
                                                <GithubOutlined />
                                                <span>{gitRepo}</span>
                                                <Tag>{gitBranch}</Tag>
                                            </div>
                                            {webhookUrl && (
                                                <Button
                                                    icon={<ReloadOutlined />}
                                                    loading={isForcingBuild}
                                                    onClick={() =>
                                                        this.handleForceBuild()
                                                    }
                                                    size="small"
                                                >
                                                    Trigger Deploy
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="github-repo-selector">
                                            <Row gutter={12}>
                                                <Col span={12}>
                                                    <Select
                                                        showSearch
                                                        placeholder="Select repository"
                                                        value={
                                                            selectedGithubRepo ||
                                                            undefined
                                                        }
                                                        onChange={(val) =>
                                                            this.handleSelectGitHubRepo(
                                                                val
                                                            )
                                                        }
                                                        loading={isLoadingRepos}
                                                        style={{
                                                            width: '100%',
                                                        }}
                                                        filterOption={(
                                                            input,
                                                            option
                                                        ) =>
                                                            (
                                                                option?.label ??
                                                                ''
                                                            )
                                                                .toLowerCase()
                                                                .includes(
                                                                    input.toLowerCase()
                                                                )
                                                        }
                                                        options={githubRepos.map(
                                                            (repo) => ({
                                                                value: repo.fullName,
                                                                label: repo.fullName,
                                                            })
                                                        )}
                                                    />
                                                </Col>
                                                <Col span={8}>
                                                    <Select
                                                        placeholder="Branch"
                                                        value={
                                                            selectedGithubBranch ||
                                                            undefined
                                                        }
                                                        onChange={(val) =>
                                                            this.setState({
                                                                selectedGithubBranch:
                                                                    val,
                                                            })
                                                        }
                                                        loading={
                                                            isLoadingBranches
                                                        }
                                                        style={{
                                                            width: '100%',
                                                        }}
                                                        disabled={
                                                            !selectedGithubRepo
                                                        }
                                                        options={githubBranches.map(
                                                            (b) => ({
                                                                value: b,
                                                                label: b,
                                                            })
                                                        )}
                                                    />
                                                </Col>
                                                <Col span={4}>
                                                    <Button
                                                        type="primary"
                                                        onClick={() =>
                                                            this.handleConnectGitHubRepo()
                                                        }
                                                        loading={
                                                            isConnectingRepo
                                                        }
                                                        disabled={
                                                            !selectedGithubRepo ||
                                                            !selectedGithubBranch
                                                        }
                                                        block
                                                    >
                                                        Connect
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Button
                                    icon={<GithubOutlined />}
                                    onClick={() => this.handleConnectGitHub()}
                                    className="github-connect-btn"
                                >
                                    Connect GitHub
                                </Button>
                            )}
                        </div>
                    )}

                    {(!githubConfigured || !githubConnected) && (
                        <div className="settings-git-form">
                            <div className="manual-git-header">
                                <span>Manual Configuration</span>
                            </div>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div className="settings-form-item">
                                        <label>Repository URL</label>
                                        <Input
                                            placeholder="github.com/user/repo"
                                            value={gitRepo}
                                            onChange={(e) =>
                                                this.setState({
                                                    gitRepo: e.target.value,
                                                })
                                            }
                                            prefix={<GithubOutlined />}
                                        />
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="settings-form-item">
                                        <label>Branch</label>
                                        <Input
                                            placeholder="main"
                                            value={gitBranch}
                                            onChange={(e) =>
                                                this.setState({
                                                    gitBranch: e.target.value,
                                                })
                                            }
                                            prefix={<BranchesOutlined />}
                                        />
                                    </div>
                                </Col>
                            </Row>

                            <div
                                className={`settings-auth-section ${gitSshKey ? 'hidden' : ''}`}
                            >
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <div className="settings-form-item">
                                            <label>Username</label>
                                            <Input
                                                placeholder="git username or email"
                                                value={gitUser}
                                                onChange={(e) =>
                                                    this.setState({
                                                        gitUser: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div className="settings-form-item">
                                            <label>Password / Token</label>
                                            <Input.Password
                                                placeholder="access token or password"
                                                value={gitPassword}
                                                onChange={(e) =>
                                                    this.setState({
                                                        gitPassword:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            <div className="settings-form-item">
                                <label>
                                    <KeyOutlined style={{ marginRight: 4 }} />
                                    SSH Key (alternative)
                                </label>
                                <Input.TextArea
                                    rows={3}
                                    placeholder="-----BEGIN RSA PRIVATE KEY-----"
                                    value={gitSshKey}
                                    onChange={(e) => {
                                        const sshKey = e.target.value
                                        this.setState({
                                            gitSshKey: sshKey,
                                            gitUser: sshKey ? '' : gitUser,
                                            gitPassword: sshKey
                                                ? ''
                                                : gitPassword,
                                        })
                                    }}
                                />
                            </div>

                            {webhookUrl && (
                                <div className="settings-webhook-section">
                                    <label>Webhook URL</label>
                                    <p className="settings-webhook-hint">
                                        Add this URL as a webhook in your Git
                                        provider.
                                    </p>
                                    <Input
                                        readOnly
                                        value={webhookUrl}
                                        className="settings-webhook-input"
                                        suffix={
                                            <CopyOutlined
                                                onClick={() =>
                                                    this.copyToClipboard(
                                                        webhookUrl
                                                    )
                                                }
                                                style={{ cursor: 'pointer' }}
                                            />
                                        }
                                    />
                                </div>
                            )}

                            <div className="settings-git-actions">
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={isSaving}
                                    onClick={() => this.handleSaveGitRepo()}
                                >
                                    Save Git Settings
                                </Button>
                                {webhookUrl && (
                                    <Button
                                        icon={<ReloadOutlined />}
                                        loading={isForcingBuild}
                                        onClick={() => this.handleForceBuild()}
                                    >
                                        Force Build
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="service-drawer-section">
                    <h4 className="service-drawer-section-title">
                        General Settings
                    </h4>

                    <div className="service-drawer-settings-form">
                        <div className="service-drawer-setting-item">
                            <label>Instance Count</label>
                            <InputNumber
                                min={1}
                                max={10}
                                value={editedInstanceCount}
                                onChange={(val) =>
                                    this.setState({
                                        editedInstanceCount: val || 1,
                                    })
                                }
                                style={{ width: 120 }}
                            />
                        </div>

                        <div className="service-drawer-setting-item">
                            <label>Container HTTP Port</label>
                            <InputNumber
                                min={1}
                                max={65535}
                                value={editedContainerPort}
                                onChange={(val) =>
                                    this.setState({
                                        editedContainerPort: val || 80,
                                    })
                                }
                                style={{ width: 120 }}
                            />
                        </div>
                    </div>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="service-drawer-section">
                    <h4 className="service-drawer-section-title">
                        Network Settings
                    </h4>

                    <div className="service-drawer-settings-form">
                        <div className="service-drawer-setting-item">
                            <label>Do Not Expose as Web App</label>
                            <Switch
                                checked={editedNotExposeAsWebApp}
                                onChange={(checked) =>
                                    this.setState({
                                        editedNotExposeAsWebApp: checked,
                                    })
                                }
                            />
                        </div>

                        <div className="service-drawer-setting-item">
                            <label>Force HTTPS</label>
                            <Switch
                                checked={editedForceSsl}
                                onChange={(checked) =>
                                    this.setState({ editedForceSsl: checked })
                                }
                            />
                        </div>

                        <div className="service-drawer-setting-item">
                            <label>WebSocket Support</label>
                            <Switch
                                checked={editedWebsocketSupport}
                                onChange={(checked) =>
                                    this.setState({
                                        editedWebsocketSupport: checked,
                                    })
                                }
                            />
                        </div>
                    </div>

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

                <div className="service-drawer-section">
                    <h4 className="service-drawer-section-title">
                        <GlobalOutlined style={{ marginRight: 8 }} />
                        Domain Settings
                    </h4>
                    <p className="settings-section-description">
                        Configure custom domains and SSL certificates for your
                        service.
                    </p>

                    <div className="domain-settings-list">
                        <div className="domain-item default-domain">
                            <div className="domain-info">
                                <span className="domain-name">
                                    {service.appName}.{this.props.rootDomain}
                                </span>
                                <Tag
                                    color={
                                        service.hasDefaultSubDomainSsl
                                            ? 'green'
                                            : 'default'
                                    }
                                >
                                    {service.hasDefaultSubDomainSsl ? (
                                        <>
                                            <LockOutlined /> SSL
                                        </>
                                    ) : (
                                        'No SSL'
                                    )}
                                </Tag>
                                <Tag color="blue">Default</Tag>
                            </div>
                            <div className="domain-actions">
                                {!service.hasDefaultSubDomainSsl && (
                                    <Button
                                        size="small"
                                        type="primary"
                                        icon={<SafetyCertificateOutlined />}
                                        loading={
                                            this.state.enablingSslDomain ===
                                            'base'
                                        }
                                        onClick={() =>
                                            this.handleEnableBaseSsl()
                                        }
                                    >
                                        Enable SSL
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    icon={<CopyOutlined />}
                                    onClick={() =>
                                        this.copyToClipboard(
                                            `http${service.hasDefaultSubDomainSsl ? 's' : ''}://${service.appName}.${this.props.rootDomain}`
                                        )
                                    }
                                >
                                    Copy URL
                                </Button>
                            </div>
                        </div>

                        {(service.customDomain || []).map((domain) => (
                            <div
                                key={domain.publicDomain}
                                className="domain-item"
                            >
                                <div className="domain-info">
                                    <span className="domain-name">
                                        {domain.publicDomain}
                                    </span>
                                    <Tag
                                        color={
                                            domain.hasSsl ? 'green' : 'default'
                                        }
                                    >
                                        {domain.hasSsl ? (
                                            <>
                                                <LockOutlined /> SSL
                                            </>
                                        ) : (
                                            'No SSL'
                                        )}
                                    </Tag>
                                </div>
                                <div className="domain-actions">
                                    {!domain.hasSsl && (
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<SafetyCertificateOutlined />}
                                            loading={
                                                this.state.enablingSslDomain ===
                                                domain.publicDomain
                                            }
                                            onClick={() =>
                                                this.handleEnableSsl(
                                                    domain.publicDomain
                                                )
                                            }
                                        >
                                            Enable SSL
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        loading={
                                            this.state.removingDomain ===
                                            domain.publicDomain
                                        }
                                        onClick={() =>
                                            this.handleRemoveDomain(
                                                domain.publicDomain
                                            )
                                        }
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="add-domain-form">
                        <Input
                            placeholder="www.example.com"
                            value={this.state.newDomain}
                            onChange={(e) =>
                                this.setState({ newDomain: e.target.value })
                            }
                            onPressEnter={() => this.handleAddCustomDomain()}
                            style={{ flex: 1 }}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            loading={this.state.isAddingDomain}
                            onClick={() => this.handleAddCustomDomain()}
                            disabled={!this.state.newDomain.trim()}
                        >
                            Add Domain
                        </Button>
                    </div>

                    <p className="domain-hint">
                        Make sure to point your domain's DNS to this server's IP
                        address before adding it.
                    </p>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="service-drawer-section danger-zone">
                    <h4 className="service-drawer-section-title danger">
                        <WarningOutlined style={{ marginRight: 8 }} />
                        Danger Zone
                    </h4>
                    <p className="settings-section-description">
                        Destructive actions that cannot be undone.
                    </p>

                    <div className="danger-zone-action">
                        <div className="danger-zone-info">
                            <strong>Delete this service</strong>
                            <p>
                                Once deleted, all data associated with this
                                service will be permanently removed.
                            </p>
                        </div>
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={isDeleting}
                            onClick={() => this.handleDeleteService()}
                        >
                            Delete Service
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

        const status = service.isAppBuilding ? 'deploying' : 'running'
        const statusColor = status === 'running' ? '#10b981' : '#f59e0b'
        const serviceType = this.detectServiceType(service)
        const color = this.getServiceColor(serviceType)

        const deployedVersion = service.deployedVersion || 0
        const versionInfo = service.versions?.find(
            (v) => v.version === deployedVersion
        )
        const lastDeployed = versionInfo?.timeStamp || null

        const tabItems = [
            {
                key: 'overview',
                label: (
                    <span>
                        <CloudServerOutlined /> Overview
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
                open={visible}
                onClose={onClose}
                width={520}
                placement="right"
                closeIcon={<CloseOutlined style={{ color: '#999' }} />}
                className="service-detail-drawer"
                styles={{
                    header: {
                        background: '#1a1a1a',
                        borderBottom: '1px solid #2a2a2a',
                        padding: '16px 24px',
                    },
                    body: {
                        background: '#1a1a1a',
                        padding: 0,
                    },
                    mask: {
                        background: 'rgba(0, 0, 0, 0.6)',
                    },
                }}
                title={
                    <div className="service-drawer-header">
                        <div className="service-drawer-header-main">
                            <div
                                className="service-drawer-type-indicator"
                                style={{ background: color }}
                            />
                            <div className="service-drawer-header-content">
                                <h2 className="service-drawer-title">
                                    {service.appName || 'Unnamed Service'}
                                </h2>
                                {service.description && (
                                    <p className="service-drawer-description">
                                        {service.description}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="service-drawer-header-meta">
                            <Badge
                                color={statusColor}
                                text={
                                    <span
                                        className={`service-drawer-status ${status}`}
                                    >
                                        {status}
                                    </span>
                                }
                            />
                            {lastDeployed && (
                                <span className="service-drawer-last-deployed">
                                    Deployed {moment(lastDeployed).fromNow()}
                                </span>
                            )}
                        </div>
                    </div>
                }
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => this.handleTabChange(key)}
                    items={tabItems}
                    className="service-drawer-tabs"
                />
            </Drawer>
        )
    }
}

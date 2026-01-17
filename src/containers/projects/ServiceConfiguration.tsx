import {
    Button,
    Checkbox,
    Col,
    Input,
    InputNumber,
    Row,
    Select,
    Table,
    Tag,
    message,
} from 'antd'
import { IAppEnvVar } from '../apps/AppDefinition'
import { localize } from '../../utils/Language'
import Toaster from '../../utils/Toaster'
import ApiComponent from '../global/ApiComponent'
import {
    CheckCircleOutlined,
    DeleteOutlined,
    GithubOutlined,
    PlusOutlined,
} from '@ant-design/icons'

interface ServiceConfigurationProps {
    projectId: string
    serviceType: 'frontend' | 'backend' | 'worker'
    onSuccess: () => void
    onCancel: () => void
}

interface GitHubRepo {
    fullName: string
    name: string
    owner: string
    defaultBranch: string
}

interface ServiceConfigurationState {
    githubRepo: string
    githubBranch: string
    githubUsername: string
    githubPassword: string
    serviceName: string
    containerPort: number
    envVars: IAppEnvVar[]
    inheritProjectEnvVars: boolean
    isLoading: boolean
    githubConfigured: boolean
    githubConnected: boolean
    githubRepos: GitHubRepo[]
    githubBranches: string[]
    selectedGithubRepo: string
    selectedGithubBranch: string
    isLoadingRepos: boolean
    isLoadingBranches: boolean
    isCheckingGithubStatus: boolean
    isSearchingRepos: boolean
    repoSearchTerm: string
}

export default class ServiceConfiguration extends ApiComponent<
    ServiceConfigurationProps,
    ServiceConfigurationState
> {
    private debouncedSearchRepos: (searchTerm: string) => void

    private debounce<T extends (...args: any[]) => void>(
        func: T,
        wait: number
    ): T {
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        return ((...args: Parameters<T>) => {
            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => func(...args), wait)
        }) as T
    }

    constructor(props: ServiceConfigurationProps) {
        super(props)

        const defaultPort = this.getDefaultPort(props.serviceType)

        this.state = {
            githubRepo: '',
            githubBranch: 'main',
            githubUsername: '',
            githubPassword: '',
            serviceName: '',
            containerPort: defaultPort,
            envVars: [],
            inheritProjectEnvVars: true,
            isLoading: false,
            githubConfigured: false,
            githubConnected: false,
            githubRepos: [],
            githubBranches: [],
            selectedGithubRepo: '',
            selectedGithubBranch: '',
            isLoadingRepos: false,
            isLoadingBranches: false,
            isCheckingGithubStatus: true,
            isSearchingRepos: false,
            repoSearchTerm: '',
        }

        this.debouncedSearchRepos = this.debounce(
            this.searchGitHubRepos.bind(this),
            300
        )
    }

    componentDidMount() {
        if (super.componentDidMount) {
            super.componentDidMount()
        }
        this.checkGitHubStatus()
    }

    checkGitHubStatus() {
        const self = this

        self.apiManager
            .executeGenericApiCommand('GET', '/user/github/status', {})
            .then(function (data: any) {
                self.setState({
                    githubConnected: data.connected,
                    githubConfigured: data.configured,
                    isCheckingGithubStatus: false,
                })
                if (data.connected) {
                    self.fetchGitHubRepos()
                }
            })
            .catch(function () {
                self.setState({
                    githubConfigured: false,
                    githubConnected: false,
                    isCheckingGithubStatus: false,
                })
            })
    }

    fetchGitHubRepos() {
        const self = this

        self.setState({ isLoadingRepos: true })

        self.apiManager
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

    searchGitHubRepos(searchTerm: string) {
        const self = this

        self.setState({ repoSearchTerm: searchTerm })

        if (!searchTerm.trim()) {
            self.fetchGitHubRepos()
            return
        }

        self.setState({ isSearchingRepos: true })

        const encodedSearch = encodeURIComponent(searchTerm)
        self.apiManager
            .executeGenericApiCommand(
                'GET',
                `/user/github/repos?search=${encodedSearch}`,
                {}
            )
            .then(function (data: any) {
                self.setState({
                    githubRepos: data.repos || [],
                    isSearchingRepos: false,
                })
            })
            .catch(function () {
                self.setState({ isSearchingRepos: false })
            })
    }

    fetchGitHubBranches(owner: string, repo: string) {
        const self = this

        self.setState({ isLoadingBranches: true })

        self.apiManager
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

        self.apiManager
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

        self.apiManager
            .executeGenericApiCommand('POST', '/user/github/callback', { code })
            .then(function () {
                message.success(
                    localize(
                        'projects.github_connected',
                        'GitHub connected successfully!'
                    )
                )
                self.setState({
                    githubConnected: true,
                    githubConfigured: true,
                    isCheckingGithubStatus: false,
                })
                self.fetchGitHubRepos()
            })
            .catch(Toaster.createCatcher())
    }

    handleSelectGitHubRepo(repoFullName: string) {
        const self = this
        const repo = self.state.githubRepos.find(
            (r) => r.fullName === repoFullName
        )

        if (repo) {
            self.setState({
                selectedGithubRepo: repoFullName,
                selectedGithubBranch: repo.defaultBranch,
                githubRepo: repoFullName,
                githubBranch: repo.defaultBranch,
            })
            self.fetchGitHubBranches(repo.owner, repo.name)
        }
    }

    handleSelectGitHubBranch(branch: string) {
        this.setState({
            selectedGithubBranch: branch,
            githubBranch: branch,
        })
    }

    getDefaultPort(serviceType: string): number {
        const portMap: { [key: string]: number } = {
            frontend: 3000,
            backend: 3000,
            worker: 3000,
        }
        return portMap[serviceType] || 3000
    }

    addEnvVar() {
        const newEnvVars = [...this.state.envVars, { key: '', value: '' }]
        this.setState({ envVars: newEnvVars })
    }

    removeEnvVar(index: number) {
        const newEnvVars = this.state.envVars.filter((_, i) => i !== index)
        this.setState({ envVars: newEnvVars })
    }

    updateEnvVar(index: number, field: 'key' | 'value', value: string) {
        const newEnvVars = [...this.state.envVars]
        newEnvVars[index][field] = value
        this.setState({ envVars: newEnvVars })
    }

    validateForm(): boolean {
        const { githubRepo, serviceName } = this.state

        if (!serviceName.trim()) {
            message.error(
                localize(
                    'projects.service_name_required',
                    'Service name is required'
                )
            )
            return false
        }

        if (!/^[a-z0-9-]+$/.test(serviceName)) {
            message.error(
                localize(
                    'projects.invalid_service_name',
                    'Service name must contain only lowercase letters, numbers, and hyphens'
                )
            )
            return false
        }

        if (!githubRepo.trim()) {
            message.error(
                localize(
                    'projects.github_repo_required',
                    'GitHub repository is required'
                )
            )
            return false
        }

        const duplicateEnvVars = this.state.envVars.filter(
            (env, index) =>
                env.key.trim() !== '' &&
                this.state.envVars.findIndex(
                    (e, i) => i !== index && e.key === env.key
                ) !== -1
        )

        if (duplicateEnvVars.length > 0) {
            message.error(
                localize(
                    'projects.duplicate_env_vars',
                    'Duplicate environment variable keys found'
                )
            )
            return false
        }

        return true
    }

    parseGitHubRepo(input: string): { repo: string; user: string } {
        let repo = input.trim()

        if (repo.startsWith('https://github.com/')) {
            repo = repo.replace('https://github.com/', '')
        } else if (repo.startsWith('github.com/')) {
            repo = repo.replace('github.com/', '')
        }

        repo = repo.replace(/\.git$/, '')
        repo = repo.replace(/\/$/, '')

        const parts = repo.split('/')
        if (parts.length >= 2) {
            return {
                user: parts[0],
                repo: `${parts[0]}/${parts[1]}`,
            }
        }

        return { user: '', repo: repo }
    }

    createService() {
        const self = this
        const {
            serviceName,
            containerPort,
            envVars,
            githubRepo,
            githubBranch,
            githubUsername,
            githubPassword,
            githubConfigured,
            githubConnected,
            selectedGithubRepo,
            selectedGithubBranch,
        } = self.state

        if (!self.validateForm()) {
            return
        }

        self.setState({ isLoading: true })

        const filteredEnvVars = envVars.filter(
            (env) => env.key.trim() !== '' && env.value.trim() !== ''
        )

        const parsedRepo = self.parseGitHubRepo(githubRepo)
        const hasGitCredentials =
            githubUsername.trim() !== '' && githubPassword.trim() !== ''
        const useOAuth =
            githubConfigured && githubConnected && selectedGithubRepo

        let appDef: any = null

        Promise.resolve()
            .then(function () {
                return self.apiManager.registerNewApp(
                    serviceName,
                    self.props.projectId,
                    false,
                    true
                )
            })
            .then(function () {
                return self.apiManager.getAllApps()
            })
            .then(function (data) {
                const app = data.appDefinitions.find(
                    (a: any) => a.appName === serviceName
                )
                if (!app) {
                    throw new Error('App not found after creation')
                }
                appDef = { ...app }
                appDef.envVars = filteredEnvVars
                appDef.instanceCount = 1
                appDef.containerHttpPort = containerPort
                appDef.notExposeAsWebApp = self.props.serviceType === 'worker'
                appDef.tags = [{ tagName: self.props.serviceType }]

                if (hasGitCredentials && parsedRepo.repo && !useOAuth) {
                    appDef.appPushWebhook = {
                        repoInfo: {
                            repo: parsedRepo.repo,
                            branch: githubBranch || 'main',
                            user: githubUsername.trim(),
                            password: githubPassword.trim(),
                        },
                        tokenVersion: '',
                        pushWebhookToken: '',
                    }
                }

                return self.apiManager.updateConfigAndSave(serviceName, appDef)
            })
            .then(function () {
                if (useOAuth) {
                    return self.apiManager.executeGenericApiCommand(
                        'POST',
                        '/user/github/connect-repo',
                        {
                            appName: serviceName,
                            repoFullName: selectedGithubRepo,
                            branch: selectedGithubBranch || 'main',
                        }
                    )
                }
                return null
            })
            .then(function () {
                if (!hasGitCredentials && !useOAuth) {
                    return null
                }
                return self.apiManager.getAllApps()
            })
            .then(function (data) {
                if (!data || (!hasGitCredentials && !useOAuth)) {
                    return null
                }
                const app = data.appDefinitions.find(
                    (a: any) => a.appName === serviceName
                )
                if (
                    app &&
                    app.appPushWebhook &&
                    app.appPushWebhook.pushWebhookToken
                ) {
                    return self.apiManager.executeGenericApiCommand(
                        'POST',
                        `/user/apps/webhooks/triggerbuild?namespace=captain&token=${app.appPushWebhook.pushWebhookToken}`,
                        {}
                    )
                }
                return null
            })
            .then(function () {
                const hasDeployment = hasGitCredentials || useOAuth
                const msg = hasDeployment
                    ? 'Service created and deployment started!'
                    : 'Service created! Configure deployment in the service settings.'
                message.success(localize('projects.service_created', msg))
                self.props.onSuccess()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    renderEnvVarsTable() {
        const self = this
        const { envVars } = self.state

        const columns = [
            {
                title: localize('projects.env_key', 'Key'),
                dataIndex: 'key',
                width: '40%',
                render: (text: string, record: IAppEnvVar, index: number) => (
                    <Input
                        placeholder="API_KEY"
                        value={text}
                        onChange={(e) =>
                            self.updateEnvVar(index, 'key', e.target.value)
                        }
                    />
                ),
            },
            {
                title: localize('projects.env_value', 'Value'),
                dataIndex: 'value',
                width: '50%',
                render: (text: string, record: IAppEnvVar, index: number) => (
                    <Input
                        placeholder="your-api-key-value"
                        value={text}
                        onChange={(e) =>
                            self.updateEnvVar(index, 'value', e.target.value)
                        }
                    />
                ),
            },
            {
                title: localize('common.actions', 'Actions'),
                width: '10%',
                render: (_: any, record: IAppEnvVar, index: number) => (
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => self.removeEnvVar(index)}
                    />
                ),
            },
        ]

        return (
            <div>
                <Table
                    dataSource={envVars}
                    columns={columns}
                    pagination={false}
                    rowKey={(_, index) => `env-${index}`}
                    size="small"
                />
                <Button
                    type="dashed"
                    onClick={() => self.addEnvVar()}
                    icon={<PlusOutlined />}
                    style={{ marginTop: 12, width: '100%' }}
                >
                    {localize(
                        'projects.add_env_var',
                        'Add Environment Variable'
                    )}
                </Button>
            </div>
        )
    }

    render() {
        const self = this
        const {
            githubRepo,
            githubBranch,
            serviceName,
            containerPort,
            inheritProjectEnvVars,
            isLoading,
        } = self.state
        const { serviceType } = self.props

        const serviceTypeLabels: { [key: string]: string } = {
            frontend: localize('projects.frontend_service', 'Frontend Service'),
            backend: localize('projects.backend_service', 'Backend Service'),
            worker: localize('projects.worker_service', 'Worker Service'),
        }

        return (
            <div>
                <h2 style={{ marginBottom: 24 }}>
                    {localize(
                        'projects.configure_service',
                        'Configure Service'
                    )}
                    : {serviceTypeLabels[serviceType]}
                </h2>

                <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <div style={{ marginBottom: 8 }}>
                            <strong>
                                {localize(
                                    'projects.service_name',
                                    'Service Name'
                                )}{' '}
                                <span style={{ color: 'red' }}>*</span>
                            </strong>
                        </div>
                        <Input
                            placeholder="my-service"
                            value={serviceName}
                            onChange={(e) =>
                                self.setState({ serviceName: e.target.value })
                            }
                        />
                        <div
                            style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: '#888',
                            }}
                        >
                            {localize(
                                'projects.lowercase_alphanumeric',
                                'Lowercase letters, numbers, and hyphens only'
                            )}
                        </div>
                    </Col>

                    <Col span={24}>
                        <div style={{ marginBottom: 8 }}>
                            <strong>
                                <GithubOutlined style={{ marginRight: 8 }} />
                                {localize(
                                    'projects.github_repository',
                                    'GitHub Repository'
                                )}{' '}
                                <span style={{ color: 'red' }}>*</span>
                            </strong>
                        </div>

                        {self.state.isCheckingGithubStatus ? (
                            <div style={{ padding: '12px 0', color: '#888' }}>
                                {localize(
                                    'projects.checking_github',
                                    'Checking GitHub connection...'
                                )}
                            </div>
                        ) : self.state.githubConfigured ? (
                            self.state.githubConnected ? (
                                <div>
                                    <div style={{ marginBottom: 12 }}>
                                        <Tag color="green">
                                            <CheckCircleOutlined />{' '}
                                            {localize(
                                                'projects.github_connected',
                                                'GitHub Connected'
                                            )}
                                        </Tag>
                                    </div>
                                    <Row gutter={12}>
                                        <Col span={14}>
                                            <Select
                                                showSearch
                                                placeholder={localize(
                                                    'projects.search_repositories',
                                                    'Search repositories...'
                                                )}
                                                value={
                                                    self.state
                                                        .selectedGithubRepo ||
                                                    undefined
                                                }
                                                onChange={(val) =>
                                                    self.handleSelectGitHubRepo(
                                                        val
                                                    )
                                                }
                                                onSearch={(val) =>
                                                    self.debouncedSearchRepos(
                                                        val
                                                    )
                                                }
                                                loading={
                                                    self.state.isLoadingRepos ||
                                                    self.state.isSearchingRepos
                                                }
                                                style={{ width: '100%' }}
                                                filterOption={false}
                                                notFoundContent={
                                                    self.state.isSearchingRepos
                                                        ? localize(
                                                              'projects.searching',
                                                              'Searching...'
                                                          )
                                                        : localize(
                                                              'projects.no_repos_found',
                                                              'No repositories found'
                                                          )
                                                }
                                                options={self.state.githubRepos.map(
                                                    (repo) => ({
                                                        value: repo.fullName,
                                                        label: repo.fullName,
                                                    })
                                                )}
                                            />
                                        </Col>
                                        <Col span={10}>
                                            <Select
                                                placeholder={localize(
                                                    'projects.select_branch',
                                                    'Select branch'
                                                )}
                                                value={
                                                    self.state
                                                        .selectedGithubBranch ||
                                                    undefined
                                                }
                                                onChange={(val) =>
                                                    self.handleSelectGitHubBranch(
                                                        val
                                                    )
                                                }
                                                loading={
                                                    self.state.isLoadingBranches
                                                }
                                                style={{ width: '100%' }}
                                                disabled={
                                                    !self.state
                                                        .selectedGithubRepo
                                                }
                                                options={self.state.githubBranches.map(
                                                    (b) => ({
                                                        value: b,
                                                        label: b,
                                                    })
                                                )}
                                            />
                                        </Col>
                                    </Row>
                                </div>
                            ) : (
                                <div>
                                    <Button
                                        icon={<GithubOutlined />}
                                        onClick={() =>
                                            self.handleConnectGitHub()
                                        }
                                        style={{ marginBottom: 12 }}
                                    >
                                        {localize(
                                            'projects.connect_github',
                                            'Connect GitHub'
                                        )}
                                    </Button>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: '#888',
                                        }}
                                    >
                                        {localize(
                                            'projects.connect_github_hint',
                                            'Connect your GitHub account to select from your repositories'
                                        )}
                                    </div>
                                </div>
                            )
                        ) : (
                            <div>
                                <Input
                                    placeholder="username/repository or https://github.com/username/repository"
                                    value={githubRepo}
                                    onChange={(e) =>
                                        self.setState({
                                            githubRepo: e.target.value,
                                        })
                                    }
                                />
                                <div
                                    style={{
                                        marginTop: 4,
                                        fontSize: 12,
                                        color: '#888',
                                    }}
                                >
                                    {localize(
                                        'projects.oauth_not_configured',
                                        'GitHub OAuth not configured. Using manual entry.'
                                    )}
                                </div>
                            </div>
                        )}
                    </Col>

                    {(!self.state.githubConfigured ||
                        !self.state.githubConnected) && (
                        <Col span={24}>
                            <div style={{ marginBottom: 8 }}>
                                <strong>
                                    {localize('projects.branch', 'Branch')}
                                </strong>
                            </div>
                            <Input
                                placeholder="main"
                                value={githubBranch}
                                onChange={(e) =>
                                    self.setState({
                                        githubBranch: e.target.value,
                                    })
                                }
                            />
                        </Col>
                    )}

                    {!self.state.githubConfigured && (
                        <>
                            <Col span={12}>
                                <div style={{ marginBottom: 8 }}>
                                    <strong>
                                        {localize(
                                            'projects.github_username',
                                            'GitHub Username'
                                        )}
                                    </strong>
                                </div>
                                <Input
                                    placeholder="your-username"
                                    value={self.state.githubUsername}
                                    onChange={(e) =>
                                        self.setState({
                                            githubUsername: e.target.value,
                                        })
                                    }
                                />
                            </Col>

                            <Col span={12}>
                                <div style={{ marginBottom: 8 }}>
                                    <strong>
                                        {localize(
                                            'projects.github_password',
                                            'GitHub Token/Password'
                                        )}
                                    </strong>
                                </div>
                                <Input.Password
                                    placeholder="ghp_xxxx or password"
                                    value={self.state.githubPassword}
                                    onChange={(e) =>
                                        self.setState({
                                            githubPassword: e.target.value,
                                        })
                                    }
                                />
                                <div
                                    style={{
                                        marginTop: 4,
                                        fontSize: 12,
                                        color: '#888',
                                    }}
                                >
                                    {localize(
                                        'projects.github_token_help',
                                        'Use a GitHub Personal Access Token for private repos'
                                    )}
                                </div>
                            </Col>
                        </>
                    )}

                    {serviceType !== 'worker' && (
                        <Col span={24}>
                            <div style={{ marginBottom: 8 }}>
                                <strong>
                                    {localize(
                                        'projects.container_port',
                                        'Container Port'
                                    )}
                                </strong>
                            </div>
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                max={65535}
                                value={containerPort}
                                onChange={(value) =>
                                    self.setState({
                                        containerPort: value || 3000,
                                    })
                                }
                            />
                            <div
                                style={{
                                    marginTop: 4,
                                    fontSize: 12,
                                    color: '#888',
                                }}
                            >
                                {localize(
                                    'projects.port_help',
                                    'The port your application listens on'
                                )}
                            </div>
                        </Col>
                    )}

                    <Col span={24}>
                        <div style={{ marginBottom: 16 }}>
                            <strong>
                                {localize(
                                    'projects.environment_variables',
                                    'Environment Variables'
                                )}
                            </strong>
                        </div>

                        <Checkbox
                            checked={inheritProjectEnvVars}
                            onChange={(e) =>
                                self.setState({
                                    inheritProjectEnvVars: e.target.checked,
                                })
                            }
                            style={{ marginBottom: 12 }}
                        >
                            {localize(
                                'projects.inherit_project_env_vars',
                                'Inherit environment variables from project'
                            )}
                        </Checkbox>

                        {self.renderEnvVarsTable()}
                    </Col>
                </Row>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 12,
                        marginTop: 32,
                    }}
                >
                    <Button onClick={self.props.onCancel}>
                        {localize('common.back', 'Back')}
                    </Button>
                    <Button
                        type="primary"
                        loading={isLoading}
                        onClick={() => self.createService()}
                    >
                        {localize('projects.create_service', 'Create Service')}
                    </Button>
                </div>
            </div>
        )
    }
}

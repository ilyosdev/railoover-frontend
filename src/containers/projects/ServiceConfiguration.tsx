import {
    Button,
    Checkbox,
    Col,
    Input,
    InputNumber,
    Row,
    Table,
    message,
} from 'antd'
import { IAppEnvVar } from '../apps/AppDefinition'
import { localize } from '../../utils/Language'
import Toaster from '../../utils/Toaster'
import ApiComponent from '../global/ApiComponent'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

interface ServiceConfigurationProps {
    projectId: string
    serviceType: 'frontend' | 'backend' | 'worker'
    onSuccess: () => void
    onCancel: () => void
}

interface ServiceConfigurationState {
    githubRepo: string
    githubBranch: string
    serviceName: string
    containerPort: number
    envVars: IAppEnvVar[]
    inheritProjectEnvVars: boolean
    isLoading: boolean
}

export default class ServiceConfiguration extends ApiComponent<
    ServiceConfigurationProps,
    ServiceConfigurationState
> {
    constructor(props: ServiceConfigurationProps) {
        super(props)

        const defaultPort = this.getDefaultPort(props.serviceType)

        this.state = {
            githubRepo: '',
            githubBranch: 'main',
            serviceName: '',
            containerPort: defaultPort,
            envVars: [],
            inheritProjectEnvVars: true,
            isLoading: false,
        }
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

    createService() {
        const self = this
        const { serviceName, containerPort, envVars } = self.state

        if (!self.validateForm()) {
            return
        }

        self.setState({ isLoading: true })

        const filteredEnvVars = envVars.filter(
            (env) => env.key.trim() !== '' && env.value.trim() !== ''
        )

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
                    (a) => a.appName === serviceName
                )
                if (!app) {
                    throw new Error('App not found after creation')
                }
                appDef = { ...app }
                appDef.envVars = filteredEnvVars
                appDef.instanceCount = 1
                appDef.containerHttpPort = containerPort
                appDef.notExposeAsWebApp = self.props.serviceType === 'worker'

                return self.apiManager.updateConfigAndSave(serviceName, appDef)
            })
            .then(function () {
                message.success(
                    localize(
                        'projects.service_created',
                        'Service created successfully!'
                    )
                )
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
                                {localize(
                                    'projects.github_repository',
                                    'GitHub Repository'
                                )}{' '}
                                <span style={{ color: 'red' }}>*</span>
                            </strong>
                        </div>
                        <Input
                            placeholder="username/repository or https://github.com/username/repository"
                            value={githubRepo}
                            onChange={(e) =>
                                self.setState({ githubRepo: e.target.value })
                            }
                        />
                    </Col>

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
                                self.setState({ githubBranch: e.target.value })
                            }
                        />
                    </Col>

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

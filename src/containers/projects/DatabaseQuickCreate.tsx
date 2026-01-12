import { Button, Input, Modal, Select, message } from 'antd'
import { localize } from '../../utils/Language'
import Toaster from '../../utils/Toaster'
import ApiComponent from '../global/ApiComponent'

const { Option } = Select

interface DatabaseQuickCreateProps {
    projectId: string
    onSuccess: () => void
    onCancel: () => void
}

interface DatabaseQuickCreateState {
    selectedDbType: 'postgres' | 'mysql' | 'redis' | 'mongodb' | undefined
    selectedVersion: string
    serviceName: string
    isLoading: boolean
    showCredentials: boolean
    credentials?: {
        connectionString: string
        username: string
        password: string
        host: string
        port: number
    }
}

const DATABASE_CONFIGS = {
    postgres: {
        icon: '🐘',
        title: 'PostgreSQL',
        color: '#336791',
        versions: ['17', '16', '15', '14', '13'],
        defaultVersion: '17',
        defaultPort: 5432,
    },
    mysql: {
        icon: '🐬',
        title: 'MySQL',
        color: '#4479A1',
        versions: ['9.1', '9.0', '8.4', '8.0', '5.7'],
        defaultVersion: '9.1',
        defaultPort: 3306,
    },
    redis: {
        icon: '🔴',
        title: 'Redis',
        color: '#DC382D',
        versions: ['7.4', '7.2', '7.0', '6.2'],
        defaultVersion: '7.4',
        defaultPort: 6379,
    },
    mongodb: {
        icon: '🍃',
        title: 'MongoDB',
        color: '#47A248',
        versions: ['8.0', '7.0', '6.0', '5.0'],
        defaultVersion: '8.0',
        defaultPort: 27017,
    },
}

export default class DatabaseQuickCreate extends ApiComponent<
    DatabaseQuickCreateProps,
    DatabaseQuickCreateState
> {
    constructor(props: DatabaseQuickCreateProps) {
        super(props)
        this.state = {
            selectedDbType: undefined,
            selectedVersion: '',
            serviceName: '',
            isLoading: false,
            showCredentials: false,
            credentials: undefined,
        }
    }

    generateServiceName(dbType: string) {
        const { projectId } = this.props
        return `${projectId}-${dbType}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
    }

    handleDbTypeChange(dbType: 'postgres' | 'mysql' | 'redis' | 'mongodb') {
        const config = DATABASE_CONFIGS[dbType]
        this.setState({
            selectedDbType: dbType,
            selectedVersion: config.defaultVersion,
            serviceName: this.generateServiceName(dbType),
        })
    }

    createDatabase() {
        const self = this
        const { selectedDbType, selectedVersion, serviceName } = self.state

        if (!selectedDbType) {
            message.error(
                localize(
                    'projects.select_database_type',
                    'Please select a database type'
                )
            )
            return
        }

        if (!serviceName) {
            message.error(
                localize(
                    'projects.enter_service_name',
                    'Please enter a service name'
                )
            )
            return
        }

        self.setState({ isLoading: true })

        const password = self.generatePassword()
        const config = DATABASE_CONFIGS[selectedDbType]

        let appDef: any = null
        let appAlreadyExists = false

        Promise.resolve()
            .then(function () {
                return self.apiManager.getAllApps()
            })
            .then(function (data) {
                const existingApp = data.appDefinitions.find(
                    (a) => a.appName === serviceName
                )
                if (existingApp) {
                    appAlreadyExists = true
                    throw new Error(
                        `Service "${serviceName}" already exists. Please choose a different name.`
                    )
                }
                return self.apiManager.registerNewApp(
                    serviceName,
                    self.props.projectId,
                    true,
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
                if (!app) throw new Error('App not found after creation')

                const envVars = self.getDatabaseEnvVars(
                    selectedDbType,
                    password
                )

                appDef = { ...app }
                appDef.envVars = envVars
                appDef.instanceCount = 1
                appDef.notExposeAsWebApp = true
                appDef.tags = [
                    { tagName: 'database' },
                    { tagName: selectedDbType },
                ]

                return self.apiManager.updateConfigAndSave(serviceName, appDef)
            })
            .then(function () {
                const imageName = self.getDatabaseImage(
                    selectedDbType,
                    selectedVersion
                )
                return self.apiManager.uploadCaptainDefinitionContent(
                    serviceName,
                    {
                        schemaVersion: 2,
                        dockerfileLines: [`FROM ${imageName}`],
                    },
                    '',
                    true
                )
            })
            .then(function () {
                self.setState({
                    showCredentials: true,
                    credentials: {
                        connectionString: self.getConnectionString(
                            selectedDbType,
                            serviceName,
                            password
                        ),
                        username: self.getDefaultUsername(selectedDbType),
                        password: password,
                        host: `srv-captain--${serviceName}`,
                        port: config.defaultPort,
                    },
                    isLoading: false,
                })

                message.success(
                    localize(
                        'projects.database_created',
                        'Database created successfully!'
                    )
                )
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    generatePassword(): string {
        const length = 24
        const charset =
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
        let password = ''
        for (let i = 0; i < length; i++) {
            password += charset.charAt(
                Math.floor(Math.random() * charset.length)
            )
        }
        return password
    }

    getDatabaseImage(dbType: string, version: string): string {
        const imageMap: { [key: string]: string } = {
            postgres: `postgres:${version}-alpine`,
            mysql: `mysql:${version}`,
            redis: `redis:${version}-alpine`,
            mongodb: `mongo:${version}`,
        }
        return imageMap[dbType] || `${dbType}:latest`
    }

    getDefaultUsername(dbType: string): string {
        const usernameMap: { [key: string]: string } = {
            postgres: 'postgres',
            mysql: 'root',
            redis: 'default',
            mongodb: 'root',
        }
        return usernameMap[dbType] || 'admin'
    }

    getDatabaseEnvVars(
        dbType: string,
        password: string
    ): Array<{ key: string; value: string }> {
        const envVarMap: {
            [key: string]: Array<{ key: string; value: string }>
        } = {
            postgres: [
                { key: 'POSTGRES_PASSWORD', value: password },
                { key: 'POSTGRES_USER', value: 'postgres' },
                { key: 'POSTGRES_DB', value: 'main' },
            ],
            mysql: [
                { key: 'MYSQL_ROOT_PASSWORD', value: password },
                { key: 'MYSQL_DATABASE', value: 'main' },
            ],
            redis: [{ key: 'REDIS_PASSWORD', value: password }],
            mongodb: [
                { key: 'MONGO_INITDB_ROOT_USERNAME', value: 'root' },
                { key: 'MONGO_INITDB_ROOT_PASSWORD', value: password },
            ],
        }
        return envVarMap[dbType] || []
    }

    getConnectionString(
        dbType: string,
        serviceName: string,
        password: string
    ): string {
        const host = `srv-captain--${serviceName}`
        const config = DATABASE_CONFIGS[dbType as keyof typeof DATABASE_CONFIGS]

        const connectionMap: { [key: string]: string } = {
            postgres: `postgresql://postgres:${password}@${host}:${config.defaultPort}/main`,
            mysql: `mysql://root:${password}@${host}:${config.defaultPort}/main`,
            redis: `redis://:${password}@${host}:${config.defaultPort}`,
            mongodb: `mongodb://root:${password}@${host}:${config.defaultPort}`,
        }
        return connectionMap[dbType] || ''
    }

    renderCredentialsModal() {
        const self = this
        const { credentials } = self.state

        if (!credentials) return null

        return (
            <Modal
                open={self.state.showCredentials}
                title={localize(
                    'projects.database_credentials',
                    'Database Credentials'
                )}
                onOk={() => {
                    self.setState({ showCredentials: false })
                    self.props.onSuccess()
                }}
                onCancel={() => {
                    self.setState({ showCredentials: false })
                    self.props.onSuccess()
                }}
                okText={localize('common.done', 'Done')}
            >
                <div>
                    <p>
                        <strong>
                            {localize(
                                'projects.save_credentials',
                                'Save these credentials - they will not be shown again!'
                            )}
                        </strong>
                    </p>

                    <div style={{ marginTop: 16 }}>
                        <div style={{ marginBottom: 12 }}>
                            <strong>
                                {localize('projects.host', 'Host')}:
                            </strong>{' '}
                            <code>{credentials.host}</code>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <strong>
                                {localize('projects.port', 'Port')}:
                            </strong>{' '}
                            <code>{credentials.port}</code>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <strong>
                                {localize('projects.username', 'Username')}:
                            </strong>{' '}
                            <code>{credentials.username}</code>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <strong>
                                {localize('projects.password', 'Password')}:
                            </strong>{' '}
                            <code>{credentials.password}</code>
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <strong>
                                {localize(
                                    'projects.connection_string',
                                    'Connection String'
                                )}
                                :
                            </strong>
                            <Input.TextArea
                                value={credentials.connectionString}
                                readOnly
                                rows={3}
                                style={{
                                    marginTop: 8,
                                    fontFamily: 'monospace',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        )
    }

    render() {
        const self = this
        const { selectedDbType, selectedVersion, serviceName, isLoading } =
            self.state

        return (
            <div>
                <h2 style={{ marginBottom: 24 }}>
                    {localize(
                        'projects.create_database',
                        'Create Database Service'
                    )}
                </h2>

                <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 8 }}>
                        <strong>
                            {localize(
                                'projects.database_type',
                                'Database Type'
                            )}
                        </strong>
                    </div>
                    <Select
                        style={{ width: '100%' }}
                        placeholder={localize(
                            'projects.select_database',
                            'Select a database'
                        )}
                        value={selectedDbType}
                        onChange={(value) => self.handleDbTypeChange(value)}
                        size="large"
                    >
                        {Object.entries(DATABASE_CONFIGS).map(
                            ([key, config]) => (
                                <Option key={key} value={key}>
                                    {config.icon} {config.title}
                                </Option>
                            )
                        )}
                    </Select>
                </div>

                {selectedDbType && (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ marginBottom: 8 }}>
                                <strong>
                                    {localize('projects.version', 'Version')}
                                </strong>
                            </div>
                            <Select
                                style={{ width: '100%' }}
                                value={selectedVersion}
                                onChange={(value) =>
                                    self.setState({ selectedVersion: value })
                                }
                            >
                                {DATABASE_CONFIGS[selectedDbType].versions.map(
                                    (version) => (
                                        <Option key={version} value={version}>
                                            {version}
                                        </Option>
                                    )
                                )}
                            </Select>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <div style={{ marginBottom: 8 }}>
                                <strong>
                                    {localize(
                                        'projects.service_name',
                                        'Service Name'
                                    )}
                                </strong>
                            </div>
                            <Input
                                placeholder={localize(
                                    'projects.service_name_placeholder',
                                    'my-database'
                                )}
                                value={serviceName}
                                onChange={(e) =>
                                    self.setState({
                                        serviceName: e.target.value,
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
                                    'projects.lowercase_alphanumeric',
                                    'Lowercase letters, numbers, and hyphens only'
                                )}
                            </div>
                        </div>

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
                                onClick={() => self.createDatabase()}
                            >
                                {localize(
                                    'projects.create_database_button',
                                    'Create Database'
                                )}
                            </Button>
                        </div>
                    </>
                )}

                {self.renderCredentialsModal()}
            </div>
        )
    }
}

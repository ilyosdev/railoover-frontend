import {
    Button,
    Drawer,
    Tabs,
    Tag,
    Divider,
    Input,
    message,
    Spin,
    Tooltip,
    Select,
    Collapse,
} from 'antd'
import {
    CloseOutlined,
    DatabaseOutlined,
    FileTextOutlined,
    SettingOutlined,
    CopyOutlined,
    ReloadOutlined,
    DeleteOutlined,
    WarningOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    LinkOutlined,
    SaveOutlined,
    KeyOutlined,
    CodeOutlined,
} from '@ant-design/icons'
import moment from 'moment'
import { Component } from 'react'
import { IAppDef, IAppEnvVar } from '../apps/AppDefinition'
import ApiManager from '../../api/ApiManager'
import Utils from '../../utils/Utils'
import Toaster from '../../utils/Toaster'
import '../../styles/project-dashboard.css'

const DATABASE_VERSIONS: Record<string, string[]> = {
    postgres: ['17', '16', '15', '14', '13'],
    mysql: ['9.1', '9.0', '8.4', '8.0', '5.7'],
    redis: ['7.4', '7.2', '7.0', '6.2'],
    mongodb: ['8.0', '7.0', '6.0', '5.0'],
}

interface DatabaseServiceDrawerProps {
    service: IAppDef | null
    visible: boolean
    onClose: () => void
    apiManager: ApiManager
    projectId: string
    onServiceUpdated?: () => void
    rootDomain?: string
}

interface DatabaseServiceDrawerState {
    activeTab: string
    appLogs: string
    isLoadingLogs: boolean
    isWrappedLogs: boolean
    logFilter: string
    isDeleting: boolean
    showPassword: boolean
    isRegeneratingPassword: boolean
    selectedVersion: string
    isUpdatingImage: boolean
    editedEnvVars: IAppEnvVar[]
    showPasswordFields: Record<string, boolean>
    isSavingEnvVars: boolean
    selectedSnippetTab: string
}

export default class DatabaseServiceDrawer extends Component<
    DatabaseServiceDrawerProps,
    DatabaseServiceDrawerState
> {
    private logFetchInterval: NodeJS.Timeout | null = null

    constructor(props: DatabaseServiceDrawerProps) {
        super(props)
        this.state = {
            activeTab: 'connect',
            appLogs: '',
            isLoadingLogs: false,
            isWrappedLogs: true,
            logFilter: '',
            isDeleting: false,
            showPassword: false,
            isRegeneratingPassword: false,
            selectedVersion: '',
            isUpdatingImage: false,
            editedEnvVars: [],
            showPasswordFields: {},
            isSavingEnvVars: false,
            selectedSnippetTab: 'prisma',
        }
    }

    componentDidUpdate(prevProps: DatabaseServiceDrawerProps) {
        if (!prevProps.visible && this.props.visible && this.props.service) {
            const currentImage = this.getCurrentDeployedImage()
            const versionMatch = currentImage.match(/:([^-]+)/)
            this.setState({
                activeTab: 'connect',
                appLogs: '',
                selectedVersion: versionMatch ? versionMatch[1] : '',
                editedEnvVars: [...(this.props.service.envVars || [])],
                showPasswordFields: {},
            })
        }
        if (prevProps.visible && !this.props.visible) {
            this.stopLogFetching()
        }
    }

    componentWillUnmount() {
        this.stopLogFetching()
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

                self.setState({ appLogs: logsProcessed, isLoadingLogs: false })

                self.logFetchInterval = setTimeout(() => {
                    self.fetchLogs()
                }, 5000)
            })
            .catch(function () {
                self.setState({ isLoadingLogs: false })
            })
    }

    copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
        message.success('Copied to clipboard')
    }

    getDbType(): string {
        const { service } = this.props
        if (!service) return 'database'

        const tags = service.tags || []
        const appName = (service.appName || '').toLowerCase()
        const imageName = this.getCurrentDeployedImage().toLowerCase()

        const dbTypes = ['postgres', 'mysql', 'redis', 'mongodb']

        for (const tag of tags) {
            if (dbTypes.includes(tag.tagName?.toLowerCase())) {
                return tag.tagName.toLowerCase()
            }
        }

        for (const dbType of dbTypes) {
            if (appName.includes(dbType) || imageName.includes(dbType)) {
                return dbType
            }
        }

        if (appName.includes('mongo') || imageName.includes('mongo')) {
            return 'mongodb'
        }

        if (appName.includes('mariadb') || imageName.includes('mariadb')) {
            return 'mysql'
        }

        return 'database'
    }

    getDbIcon(): string {
        const dbType = this.getDbType()
        const icons: Record<string, string> = {
            postgres: '🐘',
            mysql: '🐬',
            redis: '🔴',
            mongodb: '🍃',
            database: '🗄️',
        }
        return icons[dbType] || icons.database
    }

    getDbColor(): string {
        const dbType = this.getDbType()
        const colors: Record<string, string> = {
            postgres: '#336791',
            mysql: '#4479A1',
            redis: '#DC382D',
            mongodb: '#47A248',
            database: '#10b981',
        }
        return colors[dbType] || colors.database
    }

    getCurrentDeployedImage(): string {
        const { service } = this.props
        if (!service || !service.versions || service.versions.length === 0) {
            return ''
        }

        const deployedVersion = service.deployedVersion || 0
        const versionInfo = service.versions.find(
            (v) => v.version === deployedVersion
        )

        return versionInfo?.deployedImageName || ''
    }

    getServiceStatus(): { status: string; color: string; message?: string } {
        const { service } = this.props

        if (!service) {
            return { status: 'Unknown', color: '#666' }
        }

        if (service.isAppBuilding) {
            return { status: 'Building', color: '#f59e0b' }
        }

        const currentImage = this.getCurrentDeployedImage()
        const isPlaceholder =
            !currentImage || currentImage.includes('placeholder')

        if (isPlaceholder) {
            return {
                status: 'Not Configured',
                color: '#ef4444',
                message: 'Database needs to be configured with a proper image.',
            }
        }

        const dbType = this.getDbType()
        const envVars = service.envVars || []
        const requiredVars = this.getRequiredEnvVars(dbType)
        const missingVars = requiredVars.filter(
            (v) => !envVars.find((e) => e.key === v)
        )

        if (missingVars.length > 0) {
            return {
                status: 'Misconfigured',
                color: '#ef4444',
                message: `Missing required environment variables: ${missingVars.join(', ')}`,
            }
        }

        return { status: 'Running', color: '#10b981' }
    }

    getConnectionInfo() {
        const { service, rootDomain } = this.props
        if (!service) return null

        const dbType = this.getDbType()
        const appName = service.appName || ''
        const envVars = service.envVars || []

        const getEnvValue = (key: string) => {
            const env = envVars.find((e) => e.key === key)
            return env?.value || ''
        }

        const internalHost = `srv-captain--${appName}`
        const port = service.containerHttpPort || this.getDefaultPort(dbType)

        const password =
            getEnvValue('MYSQL_ROOT_PASSWORD') ||
            getEnvValue('POSTGRES_PASSWORD') ||
            getEnvValue('REDIS_PASSWORD') ||
            getEnvValue('MONGO_INITDB_ROOT_PASSWORD') ||
            ''

        const user =
            getEnvValue('MYSQL_USER') ||
            getEnvValue('POSTGRES_USER') ||
            getEnvValue('MONGO_INITDB_ROOT_USERNAME') ||
            (dbType === 'mysql'
                ? 'root'
                : dbType === 'postgres'
                  ? 'postgres'
                  : '')

        const database =
            getEnvValue('MYSQL_DATABASE') ||
            getEnvValue('POSTGRES_DB') ||
            appName.replace(/-/g, '_')

        let connectionString = ''
        switch (dbType) {
            case 'postgres':
                connectionString = `postgresql://${user}:${password}@${internalHost}:${port}/${database}`
                break
            case 'mysql':
                connectionString = `mysql://${user}:${password}@${internalHost}:${port}/${database}`
                break
            case 'redis':
                connectionString = password
                    ? `redis://:${password}@${internalHost}:${port}`
                    : `redis://${internalHost}:${port}`
                break
            case 'mongodb':
                connectionString = `mongodb://${user}:${password}@${internalHost}:${port}`
                break
        }

        return {
            host: internalHost,
            port,
            user,
            password,
            database,
            connectionString,
            dbType,
        }
    }

    getDefaultPort(dbType: string): number {
        const ports: Record<string, number> = {
            postgres: 5432,
            mysql: 3306,
            redis: 6379,
            mongodb: 27017,
        }
        return ports[dbType] || 5432
    }

    getCodeSnippets(): Record<string, { label: string; code: string }> {
        const connInfo = this.getConnectionInfo()
        if (!connInfo) return {}

        const dbType = this.getDbType()

        if (dbType === 'postgres') {
            return {
                prisma: {
                    label: 'Prisma',
                    code: `# .env file
DATABASE_URL="${connInfo.connectionString}"`,
                },
                sequelize: {
                    label: 'Sequelize',
                    code: `const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: '${connInfo.host}',
  port: ${connInfo.port},
  username: '${connInfo.user}',
  password: '${connInfo.password}',
  database: '${connInfo.database}'
})`,
                },
                typeorm: {
                    label: 'TypeORM',
                    code: `// ormconfig.ts or DataSource config
{
  type: 'postgres',
  host: '${connInfo.host}',
  port: ${connInfo.port},
  username: '${connInfo.user}',
  password: '${connInfo.password}',
  database: '${connInfo.database}',
  synchronize: false
}`,
                },
                nodejs: {
                    label: 'Node.js (pg)',
                    code: `import { Client } from 'pg'

const client = new Client({
  connectionString: '${connInfo.connectionString}'
})

await client.connect()`,
                },
                json: {
                    label: 'JSON Config',
                    code: JSON.stringify(
                        {
                            host: connInfo.host,
                            port: connInfo.port,
                            username: connInfo.user,
                            password: connInfo.password,
                            database: connInfo.database,
                        },
                        null,
                        2
                    ),
                },
            }
        }

        if (dbType === 'mysql') {
            return {
                prisma: {
                    label: 'Prisma',
                    code: `# .env file
DATABASE_URL="${connInfo.connectionString}"`,
                },
                sequelize: {
                    label: 'Sequelize',
                    code: `const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: '${connInfo.host}',
  port: ${connInfo.port},
  username: '${connInfo.user}',
  password: '${connInfo.password}',
  database: '${connInfo.database}'
})`,
                },
                typeorm: {
                    label: 'TypeORM',
                    code: `// ormconfig.ts or DataSource config
{
  type: 'mysql',
  host: '${connInfo.host}',
  port: ${connInfo.port},
  username: '${connInfo.user}',
  password: '${connInfo.password}',
  database: '${connInfo.database}',
  synchronize: false
}`,
                },
                nodejs: {
                    label: 'Node.js (mysql2)',
                    code: `import mysql from 'mysql2/promise'

const connection = await mysql.createConnection({
  host: '${connInfo.host}',
  port: ${connInfo.port},
  user: '${connInfo.user}',
  password: '${connInfo.password}',
  database: '${connInfo.database}'
})`,
                },
                json: {
                    label: 'JSON Config',
                    code: JSON.stringify(
                        {
                            host: connInfo.host,
                            port: connInfo.port,
                            username: connInfo.user,
                            password: connInfo.password,
                            database: connInfo.database,
                        },
                        null,
                        2
                    ),
                },
            }
        }

        if (dbType === 'redis') {
            return {
                ioredis: {
                    label: 'ioredis',
                    code: `import Redis from 'ioredis'

const redis = new Redis({
  host: '${connInfo.host}',
  port: ${connInfo.port},${connInfo.password ? `\n  password: '${connInfo.password}',` : ''}
})`,
                },
                nodejs: {
                    label: 'Node.js (redis)',
                    code: `import { createClient } from 'redis'

const client = createClient({
  url: '${connInfo.connectionString}'
})

await client.connect()`,
                },
                bullmq: {
                    label: 'BullMQ',
                    code: `import { Queue } from 'bullmq'

const queue = new Queue('myQueue', {
  connection: {
    host: '${connInfo.host}',
    port: ${connInfo.port},${connInfo.password ? `\n    password: '${connInfo.password}',` : ''}
  }
})`,
                },
                json: {
                    label: 'JSON Config',
                    code: JSON.stringify(
                        {
                            host: connInfo.host,
                            port: connInfo.port,
                            password: connInfo.password || undefined,
                        },
                        null,
                        2
                    ),
                },
            }
        }

        if (dbType === 'mongodb') {
            return {
                mongoose: {
                    label: 'Mongoose',
                    code: `import mongoose from 'mongoose'

await mongoose.connect('${connInfo.connectionString}', {
  authSource: 'admin'
})`,
                },
                nodejs: {
                    label: 'Node.js (mongodb)',
                    code: `import { MongoClient } from 'mongodb'

const client = new MongoClient('${connInfo.connectionString}')

await client.connect()
const db = client.db('myDatabase')`,
                },
                prisma: {
                    label: 'Prisma',
                    code: `# .env file
DATABASE_URL="${connInfo.connectionString}"`,
                },
                json: {
                    label: 'JSON Config',
                    code: JSON.stringify(
                        {
                            host: connInfo.host,
                            port: connInfo.port,
                            username: connInfo.user,
                            password: connInfo.password,
                        },
                        null,
                        2
                    ),
                },
            }
        }

        return {}
    }

    getDefaultSnippetTab(): string {
        const dbType = this.getDbType()
        const defaults: Record<string, string> = {
            postgres: 'prisma',
            mysql: 'prisma',
            redis: 'ioredis',
            mongodb: 'mongoose',
        }
        return defaults[dbType] || 'prisma'
    }

    getDatabaseImage(dbType: string, version: string): string {
        const imageMap: Record<string, string> = {
            postgres: `postgres:${version}-alpine`,
            mysql: `mysql:${version}`,
            redis: `redis:${version}-alpine`,
            mongodb: `mongo:${version}`,
        }
        return imageMap[dbType] || `${dbType}:${version}`
    }

    getRequiredEnvVars(dbType: string): string[] {
        const requiredVarsMap: Record<string, string[]> = {
            mysql: ['MYSQL_ROOT_PASSWORD', 'MYSQL_DATABASE'],
            postgres: ['POSTGRES_PASSWORD', 'POSTGRES_USER', 'POSTGRES_DB'],
            redis: ['REDIS_PASSWORD'],
            mongodb: [
                'MONGO_INITDB_ROOT_USERNAME',
                'MONGO_INITDB_ROOT_PASSWORD',
            ],
        }
        return requiredVarsMap[dbType] || []
    }

    generateSecurePassword(): string {
        const length = 24
        const charset =
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let password = ''
        for (let i = 0; i < length; i++) {
            password += charset.charAt(
                Math.floor(Math.random() * charset.length)
            )
        }
        return password
    }

    generateDefaultValue(varName: string, dbType: string): string {
        if (varName.includes('PASSWORD')) {
            return this.generateSecurePassword()
        }
        if (
            varName === 'POSTGRES_USER' ||
            varName === 'MONGO_INITDB_ROOT_USERNAME'
        ) {
            return varName.includes('MONGO') ? 'root' : 'postgres'
        }
        if (varName.includes('DATABASE') || varName.includes('DB')) {
            return 'main'
        }
        return ''
    }

    isPasswordField(key: string): boolean {
        const lower = key.toLowerCase()
        return (
            lower.includes('password') ||
            lower.includes('secret') ||
            lower.includes('token')
        )
    }

    isRequiredField(key: string, dbType: string): boolean {
        const requiredVarsMap: Record<string, string[]> = {
            mysql: ['MYSQL_ROOT_PASSWORD'],
            postgres: ['POSTGRES_PASSWORD'],
            mongodb: ['MONGO_INITDB_ROOT_PASSWORD'],
            redis: ['REDIS_PASSWORD'],
        }
        return (requiredVarsMap[dbType] || []).includes(key)
    }

    handleUpdateEnvVar(key: string, value: string) {
        this.setState({
            editedEnvVars: this.state.editedEnvVars.map(function (env) {
                return env.key === key ? { ...env, value } : env
            }),
        })
    }

    togglePasswordVisibility(key: string) {
        const self = this
        this.setState(function (prevState) {
            return {
                showPasswordFields: {
                    ...prevState.showPasswordFields,
                    [key]: !prevState.showPasswordFields[key],
                },
            }
        })
    }

    hasEnvVarChanges(): boolean {
        const { service } = this.props
        const { editedEnvVars } = this.state
        if (!service) return false
        return (
            JSON.stringify(service.envVars || []) !==
            JSON.stringify(editedEnvVars)
        )
    }

    handleSaveEnvVars() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props
        const { editedEnvVars } = this.state

        if (!service || !service.appName) return

        self.setState({ isSavingEnvVars: true })

        const updatedApp: IAppDef = {
            ...service,
            envVars: editedEnvVars,
        }

        apiManager
            .updateConfigAndSave(service.appName, updatedApp)
            .then(function () {
                message.success('Environment variables saved successfully')
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isSavingEnvVars: false })
            })
    }

    handleUpdateImage() {
        const self = this
        const { service, apiManager, onServiceUpdated } = this.props
        const { selectedVersion } = this.state

        if (!service || !service.appName || !selectedVersion) return

        const dbType = this.getDbType()
        const imageName = this.getDatabaseImage(dbType, selectedVersion)

        self.setState({ isUpdatingImage: true })

        const requiredVars = self.getRequiredEnvVars(dbType)
        const existingEnvVars = service.envVars || []
        const existingKeys = existingEnvVars.map(function (env) {
            return env.key
        })

        const missingVars = requiredVars.filter(function (varName) {
            return !existingKeys.includes(varName)
        })

        const newEnvVars = missingVars.map(function (varName) {
            return {
                key: varName,
                value: self.generateDefaultValue(varName, dbType),
            }
        })

        const addedVarNames = newEnvVars.map(function (env) {
            return env.key
        })

        Promise.resolve()
            .then(function () {
                if (newEnvVars.length > 0) {
                    const updatedApp: IAppDef = {
                        ...service,
                        envVars: [...existingEnvVars, ...newEnvVars],
                    }
                    return apiManager.updateConfigAndSave(
                        service.appName!,
                        updatedApp
                    )
                }
                return Promise.resolve()
            })
            .then(function () {
                return apiManager.uploadCaptainDefinitionContent(
                    service.appName!,
                    {
                        schemaVersion: 2,
                        dockerfileLines: [`FROM ${imageName}`],
                    },
                    '',
                    true
                )
            })
            .then(function () {
                if (addedVarNames.length > 0) {
                    message.success(
                        `Database updating to ${imageName}. Auto-configured: ${addedVarNames.join(', ')}`
                    )
                } else {
                    message.success(
                        `Database updating to ${imageName}. This may take a moment.`
                    )
                }
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isUpdatingImage: false })
            })
    }

    handleDeleteService() {
        const self = this
        const { service, apiManager, onServiceUpdated, onClose } = this.props

        if (!service || !service.appName) return

        self.setState({ isDeleting: true })

        apiManager
            .deleteApp(undefined, [], [service.appName])
            .then(function () {
                message.success('Database deleted successfully')
                onClose()
                if (onServiceUpdated) onServiceUpdated()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isDeleting: false })
            })
    }

    renderConnectTab() {
        const self = this
        const { service } = this.props
        const { showPassword, selectedSnippetTab } = this.state

        if (!service) return null

        const connInfo = this.getConnectionInfo()
        if (!connInfo) return null

        const dbType = this.getDbType()
        const dbIcon = this.getDbIcon()
        const snippets = this.getCodeSnippets()
        const snippetKeys = Object.keys(snippets)
        const defaultTab = this.getDefaultSnippetTab()
        const activeSnippetTab = snippetKeys.includes(selectedSnippetTab)
            ? selectedSnippetTab
            : snippetKeys.includes(defaultTab)
              ? defaultTab
              : snippetKeys[0]

        return (
            <div className="db-drawer-tab-content">
                <div className="db-connection-header">
                    <span className="db-icon">{dbIcon}</span>
                    <div className="db-header-info">
                        <h3>
                            {dbType.charAt(0).toUpperCase() + dbType.slice(1)}{' '}
                            Database
                        </h3>
                        <p>
                            Use these credentials to connect from your services
                        </p>
                    </div>
                </div>

                <div className="db-connection-section">
                    <h4 className="db-section-title">
                        <LinkOutlined style={{ marginRight: 8 }} />
                        Connection URL
                    </h4>
                    <div className="db-connection-string">
                        <code>
                            {showPassword
                                ? connInfo.connectionString
                                : connInfo.connectionString.replace(
                                      connInfo.password,
                                      '********'
                                  )}
                        </code>
                        <div className="db-connection-actions">
                            <Tooltip
                                title={
                                    showPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    icon={
                                        showPassword ? (
                                            <EyeInvisibleOutlined />
                                        ) : (
                                            <EyeOutlined />
                                        )
                                    }
                                    onClick={() =>
                                        this.setState({
                                            showPassword: !showPassword,
                                        })
                                    }
                                />
                            </Tooltip>
                            <Tooltip title="Copy connection string">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CopyOutlined />}
                                    onClick={() =>
                                        this.copyToClipboard(
                                            connInfo.connectionString
                                        )
                                    }
                                />
                            </Tooltip>
                        </div>
                    </div>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="db-connection-section">
                    <h4 className="db-section-title">
                        <KeyOutlined style={{ marginRight: 8 }} />
                        Credentials
                    </h4>
                    <div className="db-credentials-grid">
                        <div className="db-credential-item">
                            <label>Host</label>
                            <div className="db-credential-value">
                                <code>{connInfo.host}</code>
                                <Tooltip title="Copy">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() =>
                                            this.copyToClipboard(connInfo.host)
                                        }
                                    />
                                </Tooltip>
                            </div>
                        </div>

                        <div className="db-credential-item">
                            <label>Port</label>
                            <div className="db-credential-value">
                                <code>{connInfo.port}</code>
                                <Tooltip title="Copy">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() =>
                                            this.copyToClipboard(
                                                String(connInfo.port)
                                            )
                                        }
                                    />
                                </Tooltip>
                            </div>
                        </div>

                        {connInfo.user && (
                            <div className="db-credential-item">
                                <label>Username</label>
                                <div className="db-credential-value">
                                    <code>{connInfo.user}</code>
                                    <Tooltip title="Copy">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() =>
                                                this.copyToClipboard(
                                                    connInfo.user
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        )}

                        <div className="db-credential-item">
                            <label>Password</label>
                            <div className="db-credential-value">
                                <code>
                                    {showPassword
                                        ? connInfo.password
                                        : '********'}
                                </code>
                                <div style={{ display: 'flex', gap: 0 }}>
                                    <Tooltip
                                        title={showPassword ? 'Hide' : 'Show'}
                                    >
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={
                                                showPassword ? (
                                                    <EyeInvisibleOutlined />
                                                ) : (
                                                    <EyeOutlined />
                                                )
                                            }
                                            onClick={() =>
                                                this.setState({
                                                    showPassword: !showPassword,
                                                })
                                            }
                                        />
                                    </Tooltip>
                                    <Tooltip title="Copy">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() =>
                                                this.copyToClipboard(
                                                    connInfo.password
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        </div>

                        {connInfo.database && dbType !== 'redis' && (
                            <div className="db-credential-item">
                                <label>Database</label>
                                <div className="db-credential-value">
                                    <code>{connInfo.database}</code>
                                    <Tooltip title="Copy">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() =>
                                                this.copyToClipboard(
                                                    connInfo.database
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                {snippetKeys.length > 0 && (
                    <div className="db-connection-section">
                        <Collapse
                            ghost
                            defaultActiveKey={['snippets']}
                            items={[
                                {
                                    key: 'snippets',
                                    label: (
                                        <h4
                                            className="db-section-title"
                                            style={{ margin: 0 }}
                                        >
                                            <CodeOutlined
                                                style={{ marginRight: 8 }}
                                            />
                                            Code Snippets
                                        </h4>
                                    ),
                                    children: (
                                        <div className="db-snippets-container">
                                            <Tabs
                                                activeKey={activeSnippetTab}
                                                onChange={function (key) {
                                                    self.setState({
                                                        selectedSnippetTab: key,
                                                    })
                                                }}
                                                size="small"
                                                className="db-snippets-tabs"
                                                items={snippetKeys.map(
                                                    function (key) {
                                                        const snippet =
                                                            snippets[key]
                                                        return {
                                                            key: key,
                                                            label: snippet.label,
                                                            children: (
                                                                <div className="db-snippet-content">
                                                                    <pre className="db-code-snippet">
                                                                        {
                                                                            snippet.code
                                                                        }
                                                                    </pre>
                                                                    <Button
                                                                        type="primary"
                                                                        size="small"
                                                                        icon={
                                                                            <CopyOutlined />
                                                                        }
                                                                        onClick={function () {
                                                                            self.copyToClipboard(
                                                                                snippet.code
                                                                            )
                                                                        }}
                                                                        style={{
                                                                            marginTop: 12,
                                                                        }}
                                                                    >
                                                                        Copy
                                                                        Snippet
                                                                    </Button>
                                                                </div>
                                                            ),
                                                        }
                                                    }
                                                )}
                                            />
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </div>
                )}

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="db-connection-section">
                    <h4 className="db-section-title">
                        <DatabaseOutlined style={{ marginRight: 8 }} />
                        Connect from Services
                    </h4>
                    <p className="db-hint">
                        Use the "Connect to Service" feature in other services
                        to automatically inject these credentials as environment
                        variables.
                    </p>
                </div>
            </div>
        )
    }

    renderLogsTab() {
        const { appLogs, isLoadingLogs, isWrappedLogs, logFilter } = this.state

        const filteredLogs = logFilter
            ? appLogs
                  .split('\n')
                  .filter((line) =>
                      line.toLowerCase().includes(logFilter.toLowerCase())
                  )
                  .join('\n')
            : appLogs

        return (
            <div className="db-drawer-tab-content">
                <div className="db-logs-controls">
                    <Input
                        placeholder="Filter logs..."
                        value={logFilter}
                        onChange={(e) =>
                            this.setState({ logFilter: e.target.value })
                        }
                        style={{ flex: 1 }}
                        allowClear
                    />
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => this.fetchLogs()}
                        loading={isLoadingLogs}
                    >
                        Refresh
                    </Button>
                </div>

                <div
                    className="db-logs-container"
                    style={{ whiteSpace: isWrappedLogs ? 'pre-wrap' : 'pre' }}
                >
                    {isLoadingLogs && !appLogs ? (
                        <div className="db-logs-loading">
                            <Spin />
                        </div>
                    ) : filteredLogs ? (
                        filteredLogs
                    ) : (
                        <div className="db-logs-empty">No logs available</div>
                    )}
                </div>
            </div>
        )
    }

    renderSettingsTab() {
        const self = this
        const { service } = this.props
        const {
            isDeleting,
            selectedVersion,
            isUpdatingImage,
            editedEnvVars,
            showPasswordFields,
            isSavingEnvVars,
        } = this.state

        if (!service) return null

        const dbType = this.getDbType()
        const dbIcon = this.getDbIcon()
        const versions = DATABASE_VERSIONS[dbType] || []
        const currentImage = this.getCurrentDeployedImage()
        const isPlaceholder =
            !currentImage || currentImage.includes('placeholder')
        const statusInfo = this.getServiceStatus()

        return (
            <div className="db-drawer-tab-content">
                <div className="db-settings-section">
                    <h4 className="db-section-title">Database Info</h4>
                    <div className="db-info-card">
                        <div className="db-info-row">
                            <span className="db-info-label">Type</span>
                            <span className="db-info-value">
                                {dbIcon}{' '}
                                {dbType.charAt(0).toUpperCase() +
                                    dbType.slice(1)}
                            </span>
                        </div>
                        <div className="db-info-row">
                            <span className="db-info-label">Status</span>
                            <span className="db-info-value">
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: statusInfo.color,
                                        }}
                                    />
                                    {statusInfo.status}
                                </span>
                            </span>
                        </div>
                        <div className="db-info-row">
                            <span className="db-info-label">Current Image</span>
                            <span className="db-info-value">
                                <code
                                    style={{
                                        fontSize: 11,
                                        color: isPlaceholder
                                            ? '#ef4444'
                                            : undefined,
                                    }}
                                >
                                    {currentImage || 'Not deployed'}
                                </code>
                            </span>
                        </div>
                        <div className="db-info-row">
                            <span className="db-info-label">Internal Port</span>
                            <span className="db-info-value">
                                {service.containerHttpPort ||
                                    this.getDefaultPort(dbType)}
                            </span>
                        </div>
                    </div>
                </div>

                {isPlaceholder && (
                    <div
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 8,
                            padding: 16,
                            marginTop: 16,
                        }}
                    >
                        <p
                            style={{
                                color: '#ef4444',
                                margin: 0,
                                fontWeight: 500,
                            }}
                        >
                            <WarningOutlined style={{ marginRight: 8 }} />
                            This database is using a placeholder image. Select a
                            proper version below and click "Update Image".
                        </p>
                    </div>
                )}

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="db-settings-section">
                    <h4 className="db-section-title">
                        <KeyOutlined style={{ marginRight: 8 }} />
                        Environment Variables
                    </h4>
                    <p className="db-hint" style={{ marginBottom: 16 }}>
                        Configure database environment variables. Changes
                        require a container restart to take effect.
                    </p>

                    <div className="db-env-vars-list">
                        {editedEnvVars.map(function (envVar) {
                            const isPassword = self.isPasswordField(envVar.key)
                            const isRequired = self.isRequiredField(
                                envVar.key,
                                dbType
                            )
                            const isVisible = showPasswordFields[envVar.key]

                            return (
                                <div
                                    key={envVar.key}
                                    className="db-env-var-item"
                                >
                                    <div className="db-env-var-header">
                                        <label className="db-env-var-label">
                                            {envVar.key}
                                        </label>
                                        {isRequired && (
                                            <Tag
                                                color="red"
                                                style={{
                                                    fontSize: 10,
                                                    padding: '0 4px',
                                                    marginLeft: 8,
                                                }}
                                            >
                                                REQUIRED
                                            </Tag>
                                        )}
                                    </div>
                                    <div className="db-env-var-input-row">
                                        <Input
                                            value={envVar.value}
                                            type={
                                                isPassword && !isVisible
                                                    ? 'password'
                                                    : 'text'
                                            }
                                            onChange={function (e) {
                                                self.handleUpdateEnvVar(
                                                    envVar.key,
                                                    e.target.value
                                                )
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        {isPassword && (
                                            <Tooltip
                                                title={
                                                    isVisible
                                                        ? 'Hide value'
                                                        : 'Show value'
                                                }
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={
                                                        isVisible ? (
                                                            <EyeInvisibleOutlined />
                                                        ) : (
                                                            <EyeOutlined />
                                                        )
                                                    }
                                                    onClick={function () {
                                                        self.togglePasswordVisibility(
                                                            envVar.key
                                                        )
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Copy value">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<CopyOutlined />}
                                                onClick={function () {
                                                    self.copyToClipboard(
                                                        envVar.value
                                                    )
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        })}

                        {editedEnvVars.length === 0 && (
                            <div
                                style={{
                                    color: 'rgba(255,255,255,0.45)',
                                    padding: '16px 0',
                                    textAlign: 'center',
                                }}
                            >
                                No environment variables configured
                            </div>
                        )}
                    </div>

                    {editedEnvVars.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={isSavingEnvVars}
                                disabled={!this.hasEnvVarChanges()}
                                onClick={function () {
                                    self.handleSaveEnvVars()
                                }}
                            >
                                Save Environment Variables
                            </Button>
                        </div>
                    )}
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="db-settings-section">
                    <h4 className="db-section-title">
                        <ReloadOutlined style={{ marginRight: 8 }} />
                        Change Version
                    </h4>
                    <p className="db-hint" style={{ marginBottom: 16 }}>
                        Update the database image version. Warning: This will
                        restart the database container.
                    </p>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <Select
                            style={{ flex: 1 }}
                            placeholder="Select version"
                            value={selectedVersion || undefined}
                            onChange={(value) =>
                                this.setState({ selectedVersion: value })
                            }
                        >
                            {versions.map((v) => (
                                <Select.Option key={v} value={v}>
                                    {dbType === 'mongodb' ? 'mongo' : dbType}:
                                    {v}
                                    {dbType !== 'mysql' &&
                                        dbType !== 'mongodb' &&
                                        '-alpine'}
                                </Select.Option>
                            ))}
                        </Select>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={isUpdatingImage}
                            onClick={() => this.handleUpdateImage()}
                            disabled={!selectedVersion}
                        >
                            Update Image
                        </Button>
                    </div>
                </div>

                <Divider style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

                <div className="db-settings-section danger-zone">
                    <h4 className="db-section-title danger">
                        <WarningOutlined style={{ marginRight: 8 }} />
                        Danger Zone
                    </h4>
                    <p className="db-hint">
                        Destructive actions that cannot be undone.
                    </p>

                    <div className="danger-zone-action">
                        <div className="danger-zone-info">
                            <strong>Delete this database</strong>
                            <p>All data will be permanently lost.</p>
                        </div>
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={isDeleting}
                            onClick={() => this.handleDeleteService()}
                        >
                            Delete Database
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

        const dbType = this.getDbType()
        const dbIcon = this.getDbIcon()
        const dbColor = this.getDbColor()
        const statusInfo = this.getServiceStatus()

        const getStatusTagColor = (color: string) => {
            if (color === '#10b981') return 'green'
            if (color === '#f59e0b') return 'orange'
            return 'red'
        }

        const tabItems = [
            {
                key: 'connect',
                label: (
                    <span>
                        <DatabaseOutlined /> Connect
                    </span>
                ),
                children: this.renderConnectTab(),
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
                title={null}
                placement="right"
                onClose={onClose}
                open={visible}
                width={560}
                closable={false}
                className="service-detail-drawer database-drawer"
                styles={{
                    body: { padding: 0, background: '#141414' },
                    header: { display: 'none' },
                }}
            >
                <div
                    className="service-drawer-header"
                    style={{ borderLeftColor: dbColor }}
                >
                    <div className="service-drawer-header-content">
                        <div className="service-drawer-title-row">
                            <span className="db-drawer-icon">{dbIcon}</span>
                            <h2 className="service-drawer-title">
                                {service.appName}
                            </h2>
                            <Tag color={getStatusTagColor(statusInfo.color)}>
                                {statusInfo.status}
                            </Tag>
                        </div>
                        <div className="service-drawer-meta">
                            <span>
                                {dbType.charAt(0).toUpperCase() +
                                    dbType.slice(1)}{' '}
                                Database
                            </span>
                            {(() => {
                                const deployedVersion =
                                    service.deployedVersion || 0
                                const versionInfo = service.versions?.find(
                                    (v) => v.version === deployedVersion
                                )
                                return versionInfo?.timeStamp ? (
                                    <>
                                        <span className="meta-separator">
                                            •
                                        </span>
                                        <span>
                                            Created{' '}
                                            {moment(
                                                versionInfo.timeStamp
                                            ).fromNow()}
                                        </span>
                                    </>
                                ) : null
                            })()}
                        </div>
                    </div>
                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={onClose}
                        className="service-drawer-close"
                    />
                </div>

                {statusInfo.message && (
                    <div
                        className="db-status-alert"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 8,
                            padding: 16,
                            margin: '16px 20px 0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                        }}
                    >
                        <WarningOutlined
                            style={{
                                color: '#ef4444',
                                fontSize: 18,
                                marginTop: 2,
                            }}
                        />
                        <div>
                            <div
                                style={{
                                    color: '#ef4444',
                                    fontWeight: 500,
                                    marginBottom: 4,
                                }}
                            >
                                {statusInfo.status}
                            </div>
                            <div style={{ color: '#ccc', fontSize: 13 }}>
                                {statusInfo.message}
                            </div>
                        </div>
                    </div>
                )}

                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => this.handleTabChange(key)}
                    className="service-drawer-tabs"
                    items={tabItems}
                />
            </Drawer>
        )
    }
}

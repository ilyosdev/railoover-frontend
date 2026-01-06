import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    SyncOutlined,
} from '@ant-design/icons'
import { Card, Select, Table, Tag } from 'antd'
import { ColumnProps } from 'antd/lib/table'
import { Link } from 'react-router-dom'
import ApiManager from '../../api/ApiManager'
import { IAppVersion } from '../apps/AppDefinition'
import { localize } from '../../utils/Language'
import Toaster from '../../utils/Toaster'
import ApiComponent from '../global/ApiComponent'
import CenteredSpinner from '../global/CenteredSpinner'
import Timestamp from '../global/Timestamp'

interface DeploymentRecord {
    serviceName: string
    serviceType?: string
    version: number
    status: 'deployed' | 'building' | 'failed'
    deployTime: string
    imageName?: string
    gitHash?: string
}

interface DeploymentHistoryProps {
    projectId: string
    apiManager: ApiManager
    isMobile?: boolean
}

interface DeploymentHistoryState {
    isLoading: boolean
    deployments: DeploymentRecord[]
    filteredDeployments: DeploymentRecord[]
    serviceTypeFilter: string
}

class DeploymentHistory extends ApiComponent<
    DeploymentHistoryProps,
    DeploymentHistoryState
> {
    constructor(props: DeploymentHistoryProps) {
        super(props)
        this.state = {
            isLoading: true,
            deployments: [],
            filteredDeployments: [],
            serviceTypeFilter: 'all',
        }
    }

    componentDidMount() {
        this.fetchData()
    }

    fetchData() {
        const self = this
        self.setState({ isLoading: true })

        self.apiManager
            .getAllApps()
            .then(function (appsResp: any) {
                const deployments: DeploymentRecord[] = []

                appsResp.appDefinitions
                    .filter(
                        (app: any) => app.projectId === self.props.projectId
                    )
                    .forEach((app: any) => {
                        const versions = app.versions || []
                        versions.forEach((version: IAppVersion) => {
                            deployments.push({
                                serviceName: app.appName,
                                serviceType: app.serviceType,
                                version: version.version,
                                status: version.deployedImageName
                                    ? 'deployed'
                                    : app.isAppBuilding
                                      ? 'building'
                                      : 'failed',
                                deployTime: version.timeStamp,
                                imageName: version.deployedImageName,
                                gitHash: version.gitHash,
                            })
                        })
                    })

                deployments.sort(
                    (a, b) =>
                        new Date(b.deployTime).getTime() -
                        new Date(a.deployTime).getTime()
                )

                self.setState({
                    isLoading: false,
                    deployments,
                    filteredDeployments: deployments,
                })
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    handleServiceTypeFilter(value: string) {
        const self = this
        self.setState({ serviceTypeFilter: value })

        if (value === 'all') {
            self.setState({ filteredDeployments: self.state.deployments })
        } else {
            self.setState({
                filteredDeployments: self.state.deployments.filter(
                    (d) => d.serviceType === value
                ),
            })
        }
    }

    renderStatus(status: string) {
        if (status === 'deployed') {
            return (
                <Tag icon={<CheckCircleOutlined />} color="success">
                    {localize('deployment_history.deployed', 'Deployed')}
                </Tag>
            )
        } else if (status === 'building') {
            return (
                <Tag icon={<SyncOutlined spin />} color="processing">
                    {localize('deployment_history.building', 'Building')}
                </Tag>
            )
        } else {
            return (
                <Tag icon={<CloseCircleOutlined />} color="error">
                    {localize('deployment_history.failed', 'Failed')}
                </Tag>
            )
        }
    }

    render() {
        const self = this

        if (self.state.isLoading) {
            return <CenteredSpinner />
        }

        const columns: ColumnProps<DeploymentRecord>[] = [
            {
                title: localize('deployment_history.service', 'Service'),
                dataIndex: 'serviceName',
                key: 'serviceName',
                width: '25%',
                render: (serviceName: string) => (
                    <Link to={`/apps/details/${serviceName}`}>
                        {serviceName}
                    </Link>
                ),
            },
            {
                title: localize('deployment_history.version', 'Version'),
                dataIndex: 'version',
                key: 'version',
                width: '10%',
                align: 'center',
            },
            {
                title: localize('deployment_history.status', 'Status'),
                dataIndex: 'status',
                key: 'status',
                width: '15%',
                align: 'center',
                render: (status: string) => self.renderStatus(status),
            },
            {
                title: localize(
                    'deployment_history.deploy_time',
                    'Deploy Time'
                ),
                dataIndex: 'deployTime',
                key: 'deployTime',
                width: '20%',
                render: (deployTime: string) => (
                    <Timestamp timestamp={deployTime} />
                ),
                sorter: (a, b) =>
                    new Date(a.deployTime).getTime() -
                    new Date(b.deployTime).getTime(),
                defaultSortOrder: 'descend',
            },
            {
                title: localize('deployment_history.image', 'Image'),
                dataIndex: 'imageName',
                key: 'imageName',
                ellipsis: true,
                render: (imageName?: string) => (
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {imageName || '-'}
                    </span>
                ),
            },
            {
                title: localize('deployment_history.git_hash', 'Git Hash'),
                dataIndex: 'gitHash',
                key: 'gitHash',
                width: '120px',
                render: (gitHash?: string) =>
                    gitHash ? (
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {gitHash.substring(0, 7)}
                        </span>
                    ) : (
                        '-'
                    ),
            },
        ]

        const serviceTypes = Array.from(
            new Set(self.state.deployments.map((d) => d.serviceType))
        ).filter(Boolean)

        return (
            <div style={{ padding: 24 }}>
                <Card
                    title={localize(
                        'deployment_history.title',
                        'Deployment History'
                    )}
                    extra={
                        <Select
                            style={{ width: 200 }}
                            value={self.state.serviceTypeFilter}
                            onChange={(value) =>
                                self.handleServiceTypeFilter(value)
                            }
                        >
                            <Select.Option value="all">
                                {localize(
                                    'deployment_history.all_services',
                                    'All Services'
                                )}
                            </Select.Option>
                            {serviceTypes.map((type) => (
                                <Select.Option key={type} value={type}>
                                    {type}
                                </Select.Option>
                            ))}
                        </Select>
                    }
                >
                    <Table
                        dataSource={self.state.filteredDeployments}
                        columns={columns}
                        rowKey={(record) =>
                            `${record.serviceName}-${record.version}`
                        }
                        pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (total) =>
                                localize(
                                    'deployment_history.total',
                                    `Total ${total} deployments`
                                ),
                        }}
                        size="small"
                    />
                </Card>
            </div>
        )
    }
}

export default DeploymentHistory

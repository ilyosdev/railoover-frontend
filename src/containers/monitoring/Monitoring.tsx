import { useEffect, useState, useCallback } from 'react'
import {
    Card,
    Col,
    Progress,
    Row,
    Spin,
    Table,
    Tag,
    Typography,
} from 'antd'
import {
    ReloadOutlined,
    CloudServerOutlined,
    DashboardOutlined,
    DatabaseOutlined,
} from '@ant-design/icons'
import ApiManager from '../../api/ApiManager'
import Toaster from '../../utils/Toaster'
import { localize } from '../../utils/Language'
import LoadBalancerStats from './LoadBalancerStats'

const { Title, Text } = Typography

interface ContainerStat {
    serviceName: string
    cpuPercent: number
    memoryUsageMB: number
    memoryLimitMB: number
    memoryPercent: number
    networkRxMB: number
    networkTxMB: number
}

interface NodeInfo {
    nodeId: string
    type: string
    isLeader: boolean
    hostname: string
    architecture: string
    operatingSystem: string
    nanoCpu: number
    memoryBytes: number
    dockerEngineVersion: string
    ip: string
    state: string
    status: string
}

const POLL_INTERVAL = 10000

function getAppNameFromServiceName(serviceName: string): string {
    const prefix = 'srv-captain--'
    if (serviceName.startsWith(prefix)) {
        return serviceName.substring(prefix.length)
    }
    return serviceName
}

function getCpuColor(percent: number): string {
    if (percent >= 80) return '#ff4d4f'
    if (percent >= 50) return '#faad14'
    return '#52c41a'
}

function getMemoryColor(percent: number): string {
    if (percent >= 90) return '#ff4d4f'
    if (percent >= 70) return '#faad14'
    return '#52c41a'
}

function getStatusColor(cpuPercent: number): string {
    if (cpuPercent >= 5) return 'green'
    if (cpuPercent >= 0.5) return 'gold'
    return 'default'
}

function getStatusLabel(cpuPercent: number): string {
    if (cpuPercent >= 5) return 'Active'
    if (cpuPercent >= 0.5) return 'Idle'
    return 'Idle'
}

export default function Monitoring() {
    const [stats, setStats] = useState<ContainerStat[]>([])
    const [nodes, setNodes] = useState<NodeInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const apiManager = new ApiManager()

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, nodesRes] = await Promise.all([
                apiManager.executeGenericApiCommand(
                    'GET',
                    '/user/system/stats/',
                    {}
                ),
                apiManager.getAllNodes(),
            ])
            setStats(statsRes.stats || [])
            setNodes(nodesRes.nodes || [])
            setLastUpdated(new Date())
        } catch (error: any) {
            Toaster.createCatcher()(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [fetchData])

    const totalCpu = stats.reduce((sum, s) => sum + s.cpuPercent, 0)
    const totalMemoryUsed = stats.reduce(
        (sum, s) => sum + s.memoryUsageMB,
        0
    )
    const totalMemoryLimit = stats.reduce(
        (sum, s) => sum + s.memoryLimitMB,
        0
    )
    const avgMemoryPercent =
        totalMemoryLimit > 0 ? (totalMemoryUsed / totalMemoryLimit) * 100 : 0

    const runningCount = stats.filter((s) => s.cpuPercent >= 0.5).length
    const idleCount = stats.filter((s) => s.cpuPercent < 0.5).length

    // Node summary
    const totalNodeCores = nodes.reduce(
        (sum, n) => sum + (n.nanoCpu || 0) / 1e9,
        0
    )
    const totalNodeMemGB = nodes.reduce(
        (sum, n) => sum + (n.memoryBytes || 0) / 1073741824,
        0
    )

    const columns = [
        {
            title: 'Container',
            dataIndex: 'serviceName',
            key: 'serviceName',
            render: (name: string) => (
                <Text strong>{getAppNameFromServiceName(name)}</Text>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, record: ContainerStat) => (
                <Tag color={getStatusColor(record.cpuPercent)}>
                    {getStatusLabel(record.cpuPercent)}
                </Tag>
            ),
        },
        {
            title: 'CPU',
            dataIndex: 'cpuPercent',
            key: 'cpuPercent',
            sorter: (a: ContainerStat, b: ContainerStat) =>
                a.cpuPercent - b.cpuPercent,
            render: (percent: number) => (
                <div style={{ minWidth: 120 }}>
                    <Progress
                        percent={Math.min(percent, 100)}
                        size="small"
                        strokeColor={getCpuColor(percent)}
                        format={() => `${percent.toFixed(1)}%`}
                    />
                </div>
            ),
        },
        {
            title: 'Memory',
            dataIndex: 'memoryPercent',
            key: 'memoryPercent',
            sorter: (a: ContainerStat, b: ContainerStat) =>
                a.memoryPercent - b.memoryPercent,
            render: (_: number, record: ContainerStat) => (
                <div style={{ minWidth: 150 }}>
                    <Progress
                        percent={Math.min(record.memoryPercent, 100)}
                        size="small"
                        strokeColor={getMemoryColor(record.memoryPercent)}
                        format={() =>
                            `${record.memoryUsageMB.toFixed(0)} / ${record.memoryLimitMB.toFixed(0)} MB`
                        }
                    />
                </div>
            ),
        },
        {
            title: 'Network',
            key: 'network',
            render: (_: any, record: ContainerStat) => (
                <span>
                    <Tag color="blue">
                        RX: {record.networkRxMB.toFixed(1)} MB
                    </Tag>
                    <Tag color="green">
                        TX: {record.networkTxMB.toFixed(1)} MB
                    </Tag>
                </span>
            ),
        },
    ]

    if (loading && stats.length === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '50vh',
                }}
            >
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div style={{ padding: '0 12px' }}>
            {/* Server Overview */}
            <Row justify="center" style={{ marginBottom: 16 }}>
                <Col xs={23} lg={22}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={6}>
                            <Card size="small">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <CloudServerOutlined
                                        style={{
                                            fontSize: 20,
                                            color: '#3b82f6',
                                        }}
                                    />
                                    <Text type="secondary">Containers</Text>
                                </div>
                                <Title level={4} style={{ margin: '4px 0 0' }}>
                                    <span style={{ color: '#52c41a' }}>
                                        {runningCount}
                                    </span>{' '}
                                    running
                                    {idleCount > 0 && (
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: 14 }}
                                        >
                                            {' '}
                                            / {idleCount} idle
                                        </Text>
                                    )}
                                </Title>
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card size="small">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <DashboardOutlined
                                        style={{
                                            fontSize: 20,
                                            color: getCpuColor(totalCpu),
                                        }}
                                    />
                                    <Text type="secondary">Total CPU</Text>
                                </div>
                                <Title
                                    level={4}
                                    style={{
                                        margin: '4px 0 0',
                                        color: getCpuColor(totalCpu),
                                    }}
                                >
                                    {totalCpu.toFixed(1)}%
                                </Title>
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card size="small">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <DatabaseOutlined
                                        style={{
                                            fontSize: 20,
                                            color: getMemoryColor(
                                                avgMemoryPercent
                                            ),
                                        }}
                                    />
                                    <Text type="secondary">Memory</Text>
                                </div>
                                <Title
                                    level={4}
                                    style={{
                                        margin: '4px 0 0',
                                        color: getMemoryColor(
                                            avgMemoryPercent
                                        ),
                                    }}
                                >
                                    {(totalMemoryUsed / 1024).toFixed(1)} /{' '}
                                    {totalNodeMemGB > 0
                                        ? totalNodeMemGB.toFixed(1)
                                        : (totalMemoryLimit / 1024).toFixed(
                                              1
                                          )}{' '}
                                    GB
                                </Title>
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card size="small">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <CloudServerOutlined
                                        style={{
                                            fontSize: 20,
                                            color: '#722ed1',
                                        }}
                                    />
                                    <Text type="secondary">Nodes</Text>
                                </div>
                                <Title level={4} style={{ margin: '4px 0 0' }}>
                                    {nodes.length}{' '}
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: 14 }}
                                    >
                                        ({totalNodeCores.toFixed(0)} cores)
                                    </Text>
                                </Title>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Nginx Stats */}
            <Row justify="center" style={{ marginBottom: 16 }}>
                <Col xs={23} lg={22}>
                    <LoadBalancerStats />
                </Col>
            </Row>

            {/* Container Table */}
            <Row justify="center">
                <Col xs={23} lg={22}>
                    <Card
                        title={
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Title level={4} style={{ margin: 0 }}>
                                    {localize(
                                        'monitoring.containers',
                                        'Container Resources'
                                    )}
                                </Title>
                                {lastUpdated && (
                                    <Text type="secondary">
                                        <ReloadOutlined
                                            spin={loading}
                                            style={{ marginRight: 8 }}
                                        />
                                        {lastUpdated.toLocaleTimeString()}
                                    </Text>
                                )}
                            </div>
                        }
                    >
                        <Table
                            dataSource={stats}
                            columns={columns}
                            rowKey="serviceName"
                            pagination={false}
                            size="middle"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

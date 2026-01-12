import { useEffect, useState, useCallback } from 'react'
import { Card, Col, Progress, Row, Spin, Table, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import ApiManager from '../../api/ApiManager'
import Toaster from '../../utils/Toaster'
import { localize } from '../../utils/Language'

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

export default function ContainerStats() {
    const [stats, setStats] = useState<ContainerStat[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const apiManager = new ApiManager()

    const fetchStats = useCallback(async () => {
        try {
            const res = await apiManager.executeGenericApiCommand(
                'GET',
                '/user/system/stats/',
                {}
            )
            setStats(res.stats || [])
            setLastUpdated(new Date())
        } catch (error: any) {
            Toaster.createCatcher()(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()

        const interval = setInterval(fetchStats, POLL_INTERVAL)

        return () => clearInterval(interval)
    }, [fetchStats])

    const totalCpu = stats.reduce((sum, s) => sum + s.cpuPercent, 0)
    const totalMemoryUsed = stats.reduce((sum, s) => sum + s.memoryUsageMB, 0)
    const totalMemoryLimit = stats.reduce((sum, s) => sum + s.memoryLimitMB, 0)
    const avgMemoryPercent =
        totalMemoryLimit > 0 ? (totalMemoryUsed / totalMemoryLimit) * 100 : 0

    const columns = [
        {
            title: localize('stats.service', 'Service'),
            dataIndex: 'serviceName',
            key: 'serviceName',
            render: (name: string) => (
                <Text strong>{getAppNameFromServiceName(name)}</Text>
            ),
        },
        {
            title: localize('stats.cpu', 'CPU'),
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
            title: localize('stats.memory', 'Memory'),
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
            title: localize('stats.network', 'Network'),
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
                                    'stats.container_stats',
                                    'Container Stats'
                                )}
                            </Title>
                            <div style={{ display: 'flex', gap: 16 }}>
                                {lastUpdated && (
                                    <Text type="secondary">
                                        <ReloadOutlined
                                            spin={loading}
                                            style={{ marginRight: 8 }}
                                        />
                                        {localize(
                                            'stats.last_updated',
                                            'Updated'
                                        )}
                                        : {lastUpdated.toLocaleTimeString()}
                                    </Text>
                                )}
                            </div>
                        </div>
                    }
                >
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={8}>
                            <Card size="small">
                                <Text type="secondary">
                                    {localize('stats.total_cpu', 'Total CPU')}
                                </Text>
                                <Title
                                    level={3}
                                    style={{
                                        margin: 0,
                                        color: getCpuColor(totalCpu),
                                    }}
                                >
                                    {totalCpu.toFixed(1)}%
                                </Title>
                            </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card size="small">
                                <Text type="secondary">
                                    {localize(
                                        'stats.total_memory',
                                        'Total Memory'
                                    )}
                                </Text>
                                <Title
                                    level={3}
                                    style={{
                                        margin: 0,
                                        color: getMemoryColor(avgMemoryPercent),
                                    }}
                                >
                                    {(totalMemoryUsed / 1024).toFixed(2)} GB
                                </Title>
                            </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card size="small">
                                <Text type="secondary">
                                    {localize('stats.containers', 'Containers')}
                                </Text>
                                <Title level={3} style={{ margin: 0 }}>
                                    {stats.length}
                                </Title>
                            </Card>
                        </Col>
                    </Row>

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
    )
}

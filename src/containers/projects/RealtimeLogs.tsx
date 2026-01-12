import React, { useState, useEffect, useRef } from 'react'
import { Card, Spin, Button, Tag } from 'antd'
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    DownloadOutlined,
    ClearOutlined,
} from '@ant-design/icons'
import { io, Socket } from 'socket.io-client'
import './RealtimeLogs.css'

interface RealtimeLogsProps {
    appName: string
    token: string
    socketUrl?: string
}

interface LogEntry {
    appName: string
    line: string
    timestamp: number
    stream?: 'stdout' | 'stderr'
}

const RealtimeLogs: React.FC<RealtimeLogsProps> = ({
    appName,
    token,
    socketUrl,
}) => {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [connected, setConnected] = useState(false)
    const [paused, setPaused] = useState(false)
    const [loading, setLoading] = useState(true)

    const socketRef = useRef<Socket | null>(null)
    const logsEndRef = useRef<HTMLDivElement>(null)
    const maxLogs = 1000

    useEffect(() => {
        connectWebSocket()

        return () => {
            disconnectWebSocket()
        }
    }, [appName, token])

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (logsEndRef.current && !paused) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, paused])

    const connectWebSocket = async () => {
        setLoading(true)

        try {
            const baseUrl =
                socketUrl ||
                `${window.location.protocol}//${window.location.hostname}:3001`

            const socket: Socket = io(baseUrl, {
                path: '/logs-socket',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            })

            socketRef.current = socket

            socket.on('connect', () => {
                setConnected(true)
                setLoading(false)

                socket.emit('subscribe', { appName, token })
            })

            socket.on('subscribed', (data: any) => {
                console.log('Subscribed:', data)
            })

            socket.on('log', (data: any) => {
                if (!paused) {
                    setLogs((prev) => {
                        const newLogs = [...prev, data.line]
                        // Keep only last maxLogs
                        return newLogs.slice(-maxLogs)
                    })
                }
            })

            socket.on('error', (data: any) => {
                console.error('WebSocket error:', data)
                setLoading(false)
            })

            socket.on('disconnect', () => {
                setConnected(false)
                setLoading(false)
            })
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error)
            setLoading(false)
        }
    }

    const disconnectWebSocket = () => {
        if (socketRef.current) {
            socketRef.current.disconnect()
            socketRef.current = null
        }
    }

    const handlePause = () => {
        setPaused(!paused)
    }

    const handleClear = () => {
        setLogs([])
    }

    const handleDownload = () => {
        const logText = logs.map((log) => log.line).join('\n')
        const blob = new Blob([logText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${appName}-logs-${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    const getLogLevel = (line: string): 'info' | 'warning' | 'error' | 'debug' => {
        const lowerLine = line.toLowerCase()
        if (lowerLine.includes('error') || lowerLine.includes('exception')) {
            return 'error'
        }
        if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
            return 'warning'
        }
        if (lowerLine.includes('debug')) {
            return 'debug'
        }
        return 'info'
    }

    const formatLogLine = (line: string, index: number) => {
        const level = getLogLevel(line)
        return (
            <div key={index} className={`log-line log-${level}`}>
                <span className="log-timestamp">
                    {new Date().toLocaleTimeString()}
                </span>
                <span className="log-content">{line}</span>
            </div>
        )
    }

    return (
        <Card
            className="realtime-logs-card"
            title={
                <div className="logs-header">
                    <span>Logs: {appName}</span>
                    <Tag color={connected ? 'success' : 'error'}>
                        {connected ? 'Connected' : 'Disconnected'}
                    </Tag>
                </div>
            }
            extra={
                <div className="logs-actions">
                    <Button
                        icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                        onClick={handlePause}
                    >
                        {paused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={handleClear}>
                        Clear
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                        Download
                    </Button>
                </div>
            }
        >
            {loading ? (
                <Spin size="large" />
            ) : (
                <div className="logs-container">
                    {logs.length === 0 ? (
                        <div className="logs-empty">No logs yet</div>
                    ) : (
                        <>
                            {logs.map((log, index) => formatLogLine(log.line, index))}
                            <div ref={logsEndRef} />
                        </>
                    )}
                </div>
            )}
        </Card>
    )
}

export default RealtimeLogs

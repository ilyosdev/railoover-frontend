import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
    Modal,
    Button,
    Input,
    Switch,
    Tag,
    Tooltip,
    Space,
    Spin,
    Dropdown,
} from 'antd'
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    DownloadOutlined,
    ClearOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    ExpandOutlined,
    CompressOutlined,
    VerticalAlignBottomOutlined,
    CopyOutlined,
    FilterOutlined,
    ReloadOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons'
import ApiManager from '../../api/ApiManager'
import Utils from '../../utils/Utils'
import './LogsModal.css'

interface LogsModalProps {
    visible: boolean
    onClose: () => void
    appName: string
    apiManager: ApiManager
}

interface LogLine {
    id: number
    text: string
    timestamp: Date | null
    level: 'info' | 'warning' | 'error' | 'debug'
}

const LogsModal: React.FC<LogsModalProps> = ({
    visible,
    onClose,
    appName,
    apiManager,
}) => {
    const [logs, setLogs] = useState<LogLine[]>([])
    const [rawLogs, setRawLogs] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [autoScroll, setAutoScroll] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showTimestamps, setShowTimestamps] = useState(true)
    const [isWrapped, setIsWrapped] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [filterLevel, setFilterLevel] = useState<string>('all')

    const logsContainerRef = useRef<HTMLDivElement>(null)
    const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const pausedLogsRef = useRef<string>('')
    const lastScrollTopRef = useRef<number>(0)
    const lineCounterRef = useRef<number>(0)
    const isUserScrollingRef = useRef<boolean>(false)

    const parseLogLine = useCallback((line: string, index: number): LogLine => {
        let timestamp: Date | null = null
        let level: 'info' | 'warning' | 'error' | 'debug' = 'info'

        const timestampMatch = line.match(
            /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/
        )
        if (timestampMatch) {
            try {
                timestamp = new Date(timestampMatch[1])
            } catch {
                timestamp = null
            }
        }

        const lowerLine = line.toLowerCase()
        if (
            lowerLine.includes('error') ||
            lowerLine.includes('exception') ||
            lowerLine.includes('fatal')
        ) {
            level = 'error'
        } else if (
            lowerLine.includes('warn') ||
            lowerLine.includes('warning')
        ) {
            level = 'warning'
        } else if (lowerLine.includes('debug')) {
            level = 'debug'
        }

        return {
            id: index,
            text: line,
            timestamp,
            level,
        }
    }, [])

    const processLogs = useCallback(
        (rawText: string): LogLine[] => {
            const lines = rawText.split('\n').filter((line) => line.trim())
            return lines.map((line, index) =>
                parseLogLine(line, lineCounterRef.current + index)
            )
        },
        [parseLogLine]
    )

    const fetchLogs = useCallback(async () => {
        if (!appName || !visible) return

        try {
            const separators = ['00000000', '01000000', '02000000', '03000000']
            const ansiRegex = Utils.getAnsiColorRegex()

            const logInfo = await apiManager.fetchAppLogsInHex(appName)

            const logsProcessed = logInfo.logs
                .split(new RegExp(separators.join('|'), 'g'))
                .map((rawRow: string) => {
                    let time = 0
                    const textUtf8 = Utils.convertHexStringToUtf8(rawRow)

                    try {
                        time = new Date(textUtf8.substring(0, 30)).getTime()
                    } catch {
                        time = 0
                    }

                    return { text: textUtf8, time }
                })
                .sort((a: { time: number }, b: { time: number }) =>
                    a.time > b.time ? 1 : b.time > a.time ? -1 : 0
                )
                .map((a: { text: string }) => a.text)
                .join('')
                .replace(ansiRegex, '')

            if (isPaused) {
                pausedLogsRef.current = logsProcessed
            } else {
                if (logsProcessed !== rawLogs) {
                    setRawLogs(logsProcessed)
                    const parsedLogs = processLogs(logsProcessed)
                    lineCounterRef.current = parsedLogs.length
                    setLogs(parsedLogs)
                }
            }

            setIsLoading(false)
        } catch (error) {
            console.error('Failed to fetch logs:', error)
            setIsLoading(false)
        }
    }, [appName, visible, apiManager, isPaused, rawLogs, processLogs])

    useEffect(() => {
        if (visible && appName) {
            setIsLoading(true)
            fetchLogs()

            fetchIntervalRef.current = setInterval(fetchLogs, 2500)

            return () => {
                if (fetchIntervalRef.current) {
                    clearInterval(fetchIntervalRef.current)
                    fetchIntervalRef.current = null
                }
            }
        } else {
            if (fetchIntervalRef.current) {
                clearInterval(fetchIntervalRef.current)
                fetchIntervalRef.current = null
            }
        }
    }, [visible, appName, fetchLogs])

    useEffect(() => {
        if (
            autoScroll &&
            !isPaused &&
            !isUserScrollingRef.current &&
            logsContainerRef.current
        ) {
            const container = logsContainerRef.current
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight
            })
        }
    }, [logs, autoScroll, isPaused])

    const handleScroll = useCallback(() => {
        if (!logsContainerRef.current) return

        const container = logsContainerRef.current
        const { scrollTop, scrollHeight, clientHeight } = container

        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
        const isScrollingUp = scrollTop < lastScrollTopRef.current

        if (isScrollingUp && autoScroll) {
            setAutoScroll(false)
            isUserScrollingRef.current = true
        } else if (isAtBottom && !autoScroll) {
            setAutoScroll(true)
            isUserScrollingRef.current = false
        }

        lastScrollTopRef.current = scrollTop
    }, [autoScroll])

    const debouncedScrollHandler = useMemo(() => {
        let timeoutId: NodeJS.Timeout
        return () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(handleScroll, 50)
        }
    }, [handleScroll])

    const filteredLogs = useMemo(() => {
        let filtered = logs

        if (filterLevel !== 'all') {
            filtered = filtered.filter((log) => log.level === filterLevel)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter((log) =>
                log.text.toLowerCase().includes(query)
            )
        }

        return filtered
    }, [logs, filterLevel, searchQuery])

    const handleResume = useCallback(() => {
        setIsPaused(false)
        isUserScrollingRef.current = false

        if (pausedLogsRef.current && pausedLogsRef.current !== rawLogs) {
            setRawLogs(pausedLogsRef.current)
            const parsedLogs = processLogs(pausedLogsRef.current)
            lineCounterRef.current = parsedLogs.length
            setLogs(parsedLogs)
        }

        setAutoScroll(true)
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop =
                logsContainerRef.current.scrollHeight
        }
    }, [rawLogs, processLogs])

    const handlePause = useCallback(() => {
        setIsPaused(true)
        pausedLogsRef.current = rawLogs
    }, [rawLogs])

    const handleClear = useCallback(() => {
        setLogs([])
        setRawLogs('')
        pausedLogsRef.current = ''
        lineCounterRef.current = 0
    }, [])

    const handleDownload = useCallback(() => {
        const logText = filteredLogs.map((log) => log.text).join('\n')
        const blob = new Blob([logText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${appName}-logs-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [appName, filteredLogs])

    const handleCopy = useCallback(() => {
        const logText = filteredLogs.map((log) => log.text).join('\n')
        navigator.clipboard.writeText(logText)
    }, [filteredLogs])

    const scrollToBottom = useCallback(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop =
                logsContainerRef.current.scrollHeight
            setAutoScroll(true)
            isUserScrollingRef.current = false
        }
    }, [])

    const handleRefresh = useCallback(() => {
        setIsLoading(true)
        fetchLogs()
    }, [fetchLogs])

    const handleClose = useCallback(() => {
        setIsPaused(false)
        setAutoScroll(true)
        setSearchQuery('')
        setFilterLevel('all')
        setIsFullscreen(false)
        isUserScrollingRef.current = false
        onClose()
    }, [onClose])

    const formatTimestamp = useCallback((date: Date | null) => {
        if (!date) return ''
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }, [])

    const getLogLevelClass = useCallback((level: string) => {
        switch (level) {
            case 'error':
                return 'logs-modal-line-error'
            case 'warning':
                return 'logs-modal-line-warning'
            case 'debug':
                return 'logs-modal-line-debug'
            default:
                return 'logs-modal-line-info'
        }
    }, [])

    const filterMenuItems = [
        { key: 'all', label: 'All Levels' },
        { key: 'error', label: 'Errors Only' },
        { key: 'warning', label: 'Warnings Only' },
        { key: 'info', label: 'Info Only' },
        { key: 'debug', label: 'Debug Only' },
    ]

    return (
        <Modal
            open={visible}
            onCancel={handleClose}
            title={null}
            footer={null}
            width={isFullscreen ? '100vw' : 1000}
            className={`logs-modal ${isFullscreen ? 'logs-modal-fullscreen' : ''}`}
            centered
            destroyOnClose
            style={
                isFullscreen ? { top: 0, padding: 0, maxWidth: '100vw' } : {}
            }
            styles={{
                body: { padding: 0 },
                content: {
                    background: 'var(--railway-bg-secondary)',
                    borderRadius: isFullscreen ? 0 : 12,
                    overflow: 'hidden',
                },
            }}
        >
            <div className="logs-modal-header">
                <div className="logs-modal-header-left">
                    <div className="logs-modal-title">
                        <span className="logs-modal-title-icon">📜</span>
                        <span>Logs: {appName}</span>
                    </div>
                    <Tag
                        color={isPaused ? 'orange' : 'green'}
                        className="logs-modal-status-tag"
                    >
                        {isPaused ? 'Paused' : 'Live'}
                    </Tag>
                    {filteredLogs.length > 0 && (
                        <span className="logs-modal-line-count">
                            {filteredLogs.length.toLocaleString()} lines
                        </span>
                    )}
                </div>
                <div className="logs-modal-header-right">
                    <Tooltip
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        <Button
                            type="text"
                            icon={
                                isFullscreen ? (
                                    <CompressOutlined />
                                ) : (
                                    <ExpandOutlined />
                                )
                            }
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="logs-modal-header-btn"
                        />
                    </Tooltip>
                </div>
            </div>

            <div className="logs-modal-toolbar">
                <div className="logs-modal-toolbar-left">
                    <Button
                        type={isPaused ? 'primary' : 'default'}
                        icon={
                            isPaused ? (
                                <PlayCircleOutlined />
                            ) : (
                                <PauseCircleOutlined />
                            )
                        }
                        onClick={isPaused ? handleResume : handlePause}
                        className="logs-modal-btn"
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                        icon={<ClearOutlined />}
                        onClick={handleClear}
                        className="logs-modal-btn"
                    >
                        Clear
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        loading={isLoading}
                        className="logs-modal-btn"
                    >
                        Refresh
                    </Button>
                </div>

                <div className="logs-modal-toolbar-center">
                    <Input
                        placeholder="Search logs..."
                        prefix={<SearchOutlined />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        className="logs-modal-search"
                    />
                    <Dropdown
                        menu={{
                            items: filterMenuItems,
                            selectedKeys: [filterLevel],
                            onClick: ({ key }) => setFilterLevel(key),
                        }}
                        trigger={['click']}
                    >
                        <Button
                            icon={<FilterOutlined />}
                            className="logs-modal-btn"
                        >
                            {filterLevel === 'all'
                                ? 'All Levels'
                                : filterLevel.charAt(0).toUpperCase() +
                                  filterLevel.slice(1)}
                        </Button>
                    </Dropdown>
                </div>

                <div className="logs-modal-toolbar-right">
                    <Space>
                        <Tooltip title="Show Timestamps">
                            <div className="logs-modal-toggle">
                                <ClockCircleOutlined />
                                <Switch
                                    size="small"
                                    checked={showTimestamps}
                                    onChange={setShowTimestamps}
                                />
                            </div>
                        </Tooltip>
                        <Tooltip title="Word Wrap">
                            <div className="logs-modal-toggle">
                                <MenuFoldOutlined />
                                <Switch
                                    size="small"
                                    checked={isWrapped}
                                    onChange={setIsWrapped}
                                />
                            </div>
                        </Tooltip>
                    </Space>
                    <div className="logs-modal-toolbar-divider" />
                    <Button
                        icon={<CopyOutlined />}
                        onClick={handleCopy}
                        className="logs-modal-btn"
                    >
                        Copy
                    </Button>
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                        className="logs-modal-btn"
                    >
                        Download
                    </Button>
                </div>
            </div>

            <div
                ref={logsContainerRef}
                className={`logs-modal-content ${isWrapped ? 'wrapped' : 'nowrap'}`}
                onScroll={debouncedScrollHandler}
                style={{
                    height: isFullscreen ? 'calc(100vh - 140px)' : '60vh',
                }}
            >
                {isLoading && logs.length === 0 ? (
                    <div className="logs-modal-loading">
                        <Spin size="large" />
                        <span>Loading logs...</span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="logs-modal-empty">
                        {searchQuery || filterLevel !== 'all' ? (
                            <>
                                <FilterOutlined
                                    style={{ fontSize: 32, marginBottom: 12 }}
                                />
                                <span>No logs match your filter</span>
                            </>
                        ) : (
                            <>
                                <span>No logs available yet</span>
                                <span className="logs-modal-empty-hint">
                                    Logs will appear here when your service
                                    generates output
                                </span>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {filteredLogs.map((log) => (
                            <div
                                key={log.id}
                                className={`logs-modal-line ${getLogLevelClass(log.level)}`}
                            >
                                {showTimestamps && log.timestamp && (
                                    <span className="logs-modal-timestamp">
                                        {formatTimestamp(log.timestamp)}
                                    </span>
                                )}
                                <span className="logs-modal-text">
                                    {log.text}
                                </span>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {!autoScroll && filteredLogs.length > 0 && (
                <Tooltip title="Scroll to bottom">
                    <Button
                        type="primary"
                        shape="circle"
                        icon={<VerticalAlignBottomOutlined />}
                        onClick={scrollToBottom}
                        className="logs-modal-scroll-btn"
                    />
                </Tooltip>
            )}

            {isPaused && (
                <div className="logs-modal-paused-indicator">
                    <PauseCircleOutlined />
                    <span>Log streaming paused</span>
                    <Button
                        type="link"
                        size="small"
                        onClick={handleResume}
                        style={{ color: '#f59e0b' }}
                    >
                        Resume
                    </Button>
                </div>
            )}
        </Modal>
    )
}

export default LogsModal

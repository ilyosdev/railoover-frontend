import { Modal, Input } from 'antd'
import {
    SearchOutlined,
    AppstoreOutlined,
    SettingOutlined,
    PlusOutlined,
    RocketOutlined,
} from '@ant-design/icons'
import React, { Component } from 'react'
import './CommandPalette.css'

interface CommandAction {
    id: string
    label: string
    icon: React.ReactNode
    category: 'navigation' | 'action' | 'service'
    onSelect: () => void
}

interface CommandPaletteProps {
    actions?: CommandAction[]
    onNavigate?: (path: string) => void
}

interface CommandPaletteState {
    visible: boolean
    searchQuery: string
    selectedIndex: number
}

export default class CommandPalette extends Component<
    CommandPaletteProps,
    CommandPaletteState
> {
    constructor(props: CommandPaletteProps) {
        super(props)
        this.state = {
            visible: false,
            searchQuery: '',
            selectedIndex: 0,
        }
    }

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyDown)
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown)
    }

    handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault()
            this.setState({ visible: true, searchQuery: '', selectedIndex: 0 })
            return
        }

        if (!this.state.visible) return

        if (e.key === 'Escape') {
            this.setState({ visible: false })
            return
        }

        const filteredActions = this.getFilteredActions()
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            this.setState((prev) => ({
                selectedIndex: Math.min(
                    prev.selectedIndex + 1,
                    filteredActions.length - 1
                ),
            }))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            this.setState((prev) => ({
                selectedIndex: Math.max(prev.selectedIndex - 1, 0),
            }))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const action = filteredActions[this.state.selectedIndex]
            if (action) {
                action.onSelect()
                this.setState({ visible: false })
            }
        }
    }

    getDefaultActions(): CommandAction[] {
        const { onNavigate } = this.props
        return [
            {
                id: 'nav-projects',
                label: 'Go to Projects',
                icon: <AppstoreOutlined />,
                category: 'navigation',
                onSelect: () => onNavigate?.('/projects'),
            },
            {
                id: 'nav-apps',
                label: 'Go to Apps',
                icon: <AppstoreOutlined />,
                category: 'navigation',
                onSelect: () => onNavigate?.('/apps'),
            },
            {
                id: 'nav-settings',
                label: 'Go to Settings',
                icon: <SettingOutlined />,
                category: 'navigation',
                onSelect: () => onNavigate?.('/settings'),
            },
            {
                id: 'action-new-project',
                label: 'Create New Project',
                icon: <PlusOutlined />,
                category: 'action',
                onSelect: () => onNavigate?.('/projects?new=true'),
            },
            {
                id: 'action-deploy',
                label: 'Deploy Service',
                icon: <RocketOutlined />,
                category: 'action',
                onSelect: () => console.log('Deploy'),
            },
        ]
    }

    getFilteredActions(): CommandAction[] {
        const { actions } = this.props
        const { searchQuery } = this.state
        const allActions = [...this.getDefaultActions(), ...(actions || [])]

        if (!searchQuery.trim()) return allActions

        const query = searchQuery.toLowerCase()
        return allActions.filter((action) =>
            action.label.toLowerCase().includes(query)
        )
    }

    render() {
        const { visible, searchQuery, selectedIndex } = this.state
        const filteredActions = this.getFilteredActions()

        return (
            <Modal
                open={visible}
                onCancel={() => this.setState({ visible: false })}
                footer={null}
                closable={false}
                width={560}
                className="command-palette-modal"
                styles={{
                    content: {
                        padding: 0,
                        background: '#1a1a1a',
                        borderRadius: 12,
                    },
                    mask: { background: 'rgba(0, 0, 0, 0.7)' },
                }}
            >
                <div className="command-palette">
                    <div className="command-palette-search">
                        <SearchOutlined className="command-palette-search-icon" />
                        <Input
                            placeholder="Type a command or search..."
                            value={searchQuery}
                            onChange={(e) =>
                                this.setState({
                                    searchQuery: e.target.value,
                                    selectedIndex: 0,
                                })
                            }
                            autoFocus
                            variant="borderless"
                            className="command-palette-input"
                        />
                        <kbd className="command-palette-kbd">ESC</kbd>
                    </div>

                    <div className="command-palette-results">
                        {filteredActions.length === 0 ? (
                            <div className="command-palette-empty">
                                No results found
                            </div>
                        ) : (
                            filteredActions.map((action, index) => (
                                <div
                                    key={action.id}
                                    className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                                    onClick={() => {
                                        action.onSelect()
                                        this.setState({ visible: false })
                                    }}
                                    onMouseEnter={() =>
                                        this.setState({ selectedIndex: index })
                                    }
                                >
                                    <span className="command-palette-item-icon">
                                        {action.icon}
                                    </span>
                                    <span className="command-palette-item-label">
                                        {action.label}
                                    </span>
                                    <span className="command-palette-item-category">
                                        {action.category}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="command-palette-footer">
                        <span>
                            <kbd>↑↓</kbd> Navigate
                        </span>
                        <span>
                            <kbd>↵</kbd> Select
                        </span>
                        <span>
                            <kbd>ESC</kbd> Close
                        </span>
                    </div>
                </div>
            </Modal>
        )
    }
}

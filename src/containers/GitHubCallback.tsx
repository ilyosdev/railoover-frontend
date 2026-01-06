import { Result, Spin } from 'antd'
import { Component } from 'react'
import { GithubOutlined } from '@ant-design/icons'

interface GitHubCallbackState {
    status: 'loading' | 'success' | 'error'
    message: string
}

export default class GitHubCallback extends Component<{}, GitHubCallbackState> {
    constructor(props: {}) {
        super(props)
        this.state = {
            status: 'loading',
            message: 'Connecting to GitHub...',
        }
    }

    componentDidMount() {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')

        if (error) {
            this.setState({
                status: 'error',
                message: `GitHub authorization failed: ${error}`,
            })
            return
        }

        if (code) {
            if (window.opener) {
                window.opener.postMessage(
                    { type: 'github-oauth-callback', code },
                    window.location.origin
                )
                this.setState({
                    status: 'success',
                    message: 'Connected! This window will close...',
                })
                setTimeout(() => window.close(), 1500)
            } else {
                this.setState({
                    status: 'success',
                    message: 'Connected! You can close this window.',
                })
            }
        } else {
            this.setState({
                status: 'error',
                message: 'No authorization code received',
            })
        }
    }

    render() {
        const { status, message } = this.state

        if (status === 'loading') {
            return (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        background: '#0a0a0a',
                    }}
                >
                    <Spin size="large" />
                </div>
            )
        }

        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: '#0a0a0a',
                }}
            >
                <Result
                    icon={
                        <GithubOutlined
                            style={{
                                fontSize: 64,
                                color:
                                    status === 'success'
                                        ? '#10b981'
                                        : '#ef4444',
                            }}
                        />
                    }
                    status={status === 'success' ? 'success' : 'error'}
                    title={
                        status === 'success'
                            ? 'GitHub Connected'
                            : 'Connection Failed'
                    }
                    subTitle={message}
                />
            </div>
        )
    }
}

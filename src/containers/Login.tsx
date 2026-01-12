import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Input, Layout, Row } from 'antd'
import React from 'react'
import { Redirect, RouteComponentProps } from 'react-router'
import ApiManager from '../api/ApiManager'
import ErrorFactory from '../utils/ErrorFactory'
import { isLanguageEnabled, localize } from '../utils/Language'
import StorageHelper from '../utils/StorageHelper'
import Toaster from '../utils/Toaster'
import Utils from '../utils/Utils'
import ApiComponent from './global/ApiComponent'
import LanguageSelector from './global/LanguageSelector'
import '../styles/login.css'

export default class Login extends ApiComponent<RouteComponentProps<any>, any> {
    constructor(props: any) {
        super(props)
        this.state = {
            hasOtp: false,
        }
    }

    componentDidMount(): void {
        if (super.componentDidMount) {
            super.componentDidMount()
        }
        Utils.deleteAllCookies()
    }

    onLoginRequested(username: string, password: string, otp: string) {
        const self = this
        this.apiManager
            .loginAndSavePassword(username, password, otp)
            .then(function (token) {
                StorageHelper.setAuthKeyInLocalStorage(token)
                self.props.history.push('/')
            })
            .catch((error) => {
                if (
                    error.captainStatus ===
                    ErrorFactory.STATUS_ERROR_OTP_REQUIRED
                ) {
                    self.setState({
                        hasOtp: true,
                    })
                    Toaster.toastInfo('Enter OTP Verification Code')
                } else {
                    throw error
                }
            })
            .catch(Toaster.createCatcher())
    }

    render() {
        const self = this

        if (ApiManager.isLoggedIn()) return <Redirect to="/" />

        return (
            <Layout className="full-screen login-page-container">
                <div className="login-particles">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="login-particle" />
                    ))}
                </div>
                <Row justify="center" align="middle" className="full-screen">
                    <div className="login-card-wrapper">
                        <Card
                            title={localize(
                                'login_form.cap_rover',
                                'Railover Login'
                            )}
                            style={{ width: 450 }}
                            extra={
                                isLanguageEnabled ? (
                                    <LanguageSelector forceReload={true} />
                                ) : undefined
                            }
                        >
                            <NormalLoginForm
                                onLoginRequested={(
                                    username: string,
                                    password: string,
                                    otp: string
                                ) => {
                                    self.onLoginRequested(
                                        username,
                                        password,
                                        otp
                                    )
                                }}
                                hasOtp={self.state.hasOtp}
                            />
                        </Card>
                    </div>
                </Row>
            </Layout>
        )
    }
}

let lastSubmittedTime = 0

class NormalLoginForm extends React.Component<
    any,
    {
        usernameEntered: string
        passwordEntered: string
        otpEntered: string
    }
> {
    isDemo: boolean = false
    constructor(props: any) {
        super(props)

        try {
            const urlSearchParams = new URLSearchParams(window.location.search)
            const params = Object.fromEntries(urlSearchParams.entries())
            this.isDemo = !!params.demo
        } catch (e) {
            console.error(e)
        }

        this.state = {
            usernameEntered: '',
            passwordEntered: this.getDefaultPassword(),
            otpEntered: '',
        }
    }

    handleSubmit = (e?: React.FormEvent): void => {
        e?.preventDefault()
        const now = new Date().getTime()
        if (now - lastSubmittedTime < 300) return
        lastSubmittedTime = now
        const self = this
        self.props.onLoginRequested(
            self.state.usernameEntered,
            self.state.passwordEntered,
            self.state.otpEntered
        )
    }

    render() {
        const self = this
        return (
            <form onSubmit={this.handleSubmit}>
                <Input
                    value={self.state.usernameEntered}
                    required
                    onKeyDown={(key) => {
                        if (key.key === 'Enter' || key.keyCode === 13) {
                            self.handleSubmit()
                        }
                    }}
                    prefix={
                        <UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />
                    }
                    onChange={(e) => {
                        self.setState({ usernameEntered: e.target.value })
                    }}
                    placeholder={localize('login_form.username', 'Username')}
                    style={{ marginBottom: 16 }}
                />
                <Input.Password
                    defaultValue={this.getDefaultPassword()}
                    required
                    onKeyDown={(key) => {
                        if (key.key === 'Enter' || key.keyCode === 13) {
                            self.handleSubmit()
                        }
                    }}
                    prefix={
                        <LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />
                    }
                    onChange={(e) => {
                        self.setState({ passwordEntered: e.target.value })
                    }}
                    placeholder={localize('login_form.password', 'Password')}
                    autoFocus
                />
                {self.props.hasOtp ? (
                    <div style={{ marginTop: 16 }}>
                        <Input
                            onKeyDown={(key) => {
                                if (key.key === 'Enter' || key.keyCode === 13) {
                                    self.handleSubmit()
                                }
                            }}
                            addonBefore="OTP Code"
                            placeholder="123456"
                            value={self.state.otpEntered}
                            onChange={(e) => {
                                self.setState({ otpEntered: e.target.value })
                            }}
                            autoComplete="one-time-code"
                            autoFocus
                        />
                    </div>
                ) : undefined}

                <div style={{ marginTop: 20 }}>
                    <Row justify="end">
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="login-form-button"
                        >
                            {localize('login_form.login', 'Login')}
                        </Button>
                    </Row>
                </div>
            </form>
        )
    }

    private getDefaultPassword(): string {
        return this.isDemo ? 'captain42' : ''
    }
}

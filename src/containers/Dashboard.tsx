import { Button, Card, Col, Input, Modal, Row, Tooltip } from 'antd'
import { Redirect, RouteComponentProps } from 'react-router'
import AppConstants from '../utils/AppConstants'
import { localize } from '../utils/Language'
import Toaster from '../utils/Toaster'
import Utils from '../utils/Utils'
import ApiComponent from './global/ApiComponent'
import CenteredSpinner from './global/CenteredSpinner'
import ErrorRetry from './global/ErrorRetry'
import '../styles/dashboard-sidebar.css'
const Search = Input.Search

export default class Dashboard extends ApiComponent<
    RouteComponentProps<any>,
    {
        isLoading: boolean
        isForceChangingDomain: boolean
        apiData: any
        userEmail: string
    }
> {
    constructor(props: any) {
        super(props)
        this.state = {
            userEmail: '',
            isLoading: true,
            isForceChangingDomain: false,
            apiData: undefined,
        }
    }

    componentDidMount() {
        this.reFetchData()
    }

    reFetchData() {
        const self = this
        self.setState({ isLoading: true, apiData: undefined })
        return this.apiManager
            .getCaptainInfo()
            .then(function (data: any) {
                self.setState({ apiData: data })
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    onForceSslClicked() {
        const self = this

        const isUsingHttp = window.location.href.startsWith('http://')

        Modal.confirm({
            title: localize('dashboard.force_https', 'Force HTTPS'),
            content: (
                <p>
                    {localize(
                        'dashboard.force_https_info',
                        'Once Force HTTPS is activated, all HTTP traffic is redirected to HTTPS.'
                    )}
                    {isUsingHttp
                        ? localize(
                              'dashboard.force_https_warning',
                              'Since this is a one-way action, and there is no revert, it is highly recommended that you test the HTTPS website first.'
                          )
                        : ''}{' '}
                    {localize(
                        'dashboard.force_https_proceed',
                        'Do you still want to proceed?'
                    )}
                </p>
            ),
            onOk() {
                self.setState({ isLoading: true })
                self.apiManager
                    .forceSsl(true)
                    .then(function () {
                        Modal.success({
                            title: localize(
                                'dashboard.force_https_activated',
                                'Force HTTPS activated!'
                            ),
                            content: (
                                <div>
                                    <p>
                                        {localize(
                                            'dashboard.force_https_redirect',
                                            'All HTTP traffic is now redirected to HTTPS.'
                                        )}
                                        {isUsingHttp
                                            ? localize(
                                                  'dashboard.force_https_login_again',
                                                  'You will have to login again as you will now be redirected to HTTPS website.'
                                              )
                                            : ''}
                                    </p>
                                </div>
                            ),
                            onOk() {
                                if (isUsingHttp) {
                                    window.location.replace(
                                        `https://${self.state.apiData.captainSubDomain}.${self.state.apiData.rootDomain}`
                                    )
                                }
                            },
                            onCancel() {
                                if (isUsingHttp) {
                                    window.location.replace(
                                        `https://${self.state.apiData.rootDomain}`
                                    )
                                }
                            },
                        })
                    })
                    .catch(Toaster.createCatcher())
                    .then(function () {
                        self.setState({ isLoading: false })
                    })
            },
            onCancel() {
                // do nothing
            },
        })
    }

    onEnableSslClicked() {
        const self = this
        const IGNORE = 'IGNORE'

        Promise.resolve()
            .then(function () {
                return new Promise(function (resolve, reject) {
                    Modal.success({
                        title: localize(
                            'dashboard.enable_https',
                            'Enable HTTPS'
                        ),
                        content: (
                            <div>
                                <p>
                                    {localize(
                                        'dashboard.enable_https_info',
                                        "AppX Deploy uses Let's Encrypt to provide free SSL Certificates (HTTPS)."
                                    )}
                                    {localize(
                                        'dashboard.enable_https_email_importance',
                                        "This email address is very important as Let's Encrypt uses it for validation purposes. Please provide a valid email here."
                                    )}
                                </p>
                                <Input
                                    placeholder="your@email.com"
                                    type="email"
                                    onChange={(event) =>
                                        self.setState({
                                            userEmail: (
                                                event.target.value || ''
                                            ).trim(),
                                        })
                                    }
                                />
                            </div>
                        ),
                        onOk() {
                            resolve(self.state.userEmail || '')
                        },
                        onCancel() {
                            resolve(undefined)
                        },
                    })
                })
            })
            .then(function (data: any) {
                if (data === undefined) return Promise.resolve(IGNORE)
                self.setState({ isLoading: true })
                return self.apiManager
                    .enableRootSsl(data) //
                    .then(function () {
                        return Promise.resolve('')
                    })
            })

            .then(function (data: any) {
                if (data === IGNORE) return

                Modal.success({
                    title: localize(
                        'dashboard.root_domain_https_activated',
                        'Root Domain HTTPS activated!'
                    ),
                    content: (
                        <div>
                            <p>
                                {localize(
                                    'dashboard.root_domain_https_info',
                                    'You can now use this link:'
                                )}
                                <code>
                                    {`https://${self.state.apiData.rootDomain}`}
                                </code>
                                {localize(
                                    'dashboard.root_domain_https_next_step',
                                    '. Next step is to Force HTTPS to disallow plain HTTP traffic.'
                                )}
                            </p>
                        </div>
                    ),
                })

                return self.reFetchData()
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    updateRootDomainClicked(rootDomain: string) {
        const self = this
        if (!self.state.apiData.hasRootSsl) {
            self.performUpdateRootDomain(rootDomain, false)
            return
        }

        Modal.confirm({
            title: localize(
                'dashboard.force_change_root_domain',
                'Force Change Root Domain'
            ),
            content: (
                <div>
                    <p>
                        {localize(
                            'dashboard.force_change_root_domain_info',
                            'You have already enabled SSL for your root domain. Changing the root domain URL will invalidate HTTPS on root domain and all default subdomains for apps if you have any apps.'
                        )}
                    </p>
                    <p>
                        {localize(
                            'dashboard.force_change_root_domain_reenable',
                            'You can still re-enable HTTPS after changing the root domain.'
                        )}
                    </p>
                </div>
            ),
            onOk() {
                self.performUpdateRootDomain(rootDomain, true)
            },
            onCancel() {
                // do nothing
            },
        })
    }

    performUpdateRootDomain(rootDomain: string, force: boolean) {
        const self = this

        this.apiManager
            .updateRootDomain(rootDomain, force)
            .then(function (data: any) {
                Modal.success({
                    title: localize(
                        'dashboard.root_domain_updated',
                        'Root Domain Updated'
                    ),
                    content: (
                        <div>
                            <p>
                                {localize(
                                    'dashboard.root_domain_updated_info',
                                    'Click Ok to get redirected to your new root domain. You need to log in again.'
                                )}
                            </p>
                        </div>
                    ),
                    onOk() {
                        window.location.replace(
                            `http://${self.state.apiData.captainSubDomain}.${rootDomain}`
                        )
                    },
                })
            })
            .catch(Toaster.createCatcher())
    }

    render() {
        const self = this

        if (self.state.isLoading) {
            return <CenteredSpinner />
        }

        if (!self.state.apiData) {
            return <ErrorRetry />
        }

        const qs = new URLSearchParams(self.props.location.search)

        if (
            !!this.state.apiData.forceSsl &&
            !!qs.get(AppConstants.REDIRECT_TO_APPS_IF_READY_REQ_PARAM)
        ) {
            return <Redirect to="/apps" />
        }

        return (
            <div className="dashboard-container">
                {self.createPostFullSetupIfHasForceSsl()}
                <br />
                {self.createSetupPanelIfNoForceSsl()}
            </div>
        )
    }

    createSetupPanelIfNoForceSsl() {
        const self = this
        if (this.state.apiData.forceSsl && !self.state.isForceChangingDomain) {
            return undefined
        }

        const translatedHint = Utils.formatText(
            localize(
                'dashboard.ip_example_hint_specific',
                'For example, if you set %s1 to the IP address of your server, just enter %s2 in the box below:'
            ),
            ['%s1', '%s2'],
            [
                <code>*.my-root.example.com</code>,
                <code>my-root.example.com</code>,
            ]
        )

        return (
            <Row justify="center">
                <Col xs={{ span: 23 }} lg={{ span: 16 }}>
                    <Card
                        title={localize(
                            'dashboard.root_domain_configurations',
                            'AppX Deploy Domain Configuration'
                        )}
                    >
                        <div>
                            <p>
                                {localize(
                                    'dashboard.domain_setup_info',
                                    'Set your root domain below. Make sure a wildcard DNS A record (e.g. *.myappx.live) points to this server\'s IP address.'
                                )}
                            </p>
                        </div>
                        <hr />
                        <br />
                        <Row>
                            <div>
                                <p>{translatedHint}</p>
                                <br />
                                <div>
                                    <Search
                                        addonBefore="[wildcard]&nbsp;."
                                        placeholder="my-root.example.com"
                                        defaultValue={
                                            self.state.apiData.rootDomain + ''
                                        }
                                        enterButton={localize(
                                            'dashboard.update_domain_button',
                                            'Update Domain'
                                        )}
                                        onSearch={(value) =>
                                            self.updateRootDomainClicked(value)
                                        }
                                    />
                                </div>
                            </div>
                        </Row>
                        <div style={{ height: 20 }} />
                        <Row justify="end">
                            <Tooltip
                                title={localize(
                                    'dashboard.enable_https_button_hint',
                                    "Using Let's Encrypt Free Service"
                                )}
                            >
                                <Button
                                    disabled={
                                        self.state.apiData.hasRootSsl ||
                                        !self.state.apiData.rootDomain
                                    }
                                    onClick={() => self.onEnableSslClicked()}
                                >
                                    {localize(
                                        'dashboard.enable_https_button',
                                        'Enable HTTPS'
                                    )}
                                </Button>
                            </Tooltip>
                            &nbsp;&nbsp;
                            <Tooltip
                                title={localize(
                                    'dashboard.force_https_button_hint',
                                    'Redirect all HTTP to HTTPS'
                                )}
                            >
                                <Button
                                    disabled={
                                        !self.state.apiData.hasRootSsl ||
                                        self.state.apiData.forceSsl
                                    }
                                    onClick={() => self.onForceSslClicked()}
                                >
                                    {localize(
                                        'dashboard.force_https_button',
                                        'Force HTTPS'
                                    )}
                                </Button>
                            </Tooltip>
                        </Row>
                    </Card>
                </Col>
            </Row>
        )
    }

    createPostFullSetupIfHasForceSsl() {
        const self = this
        if (!this.state.apiData.forceSsl) {
            return undefined
        }

        return (
            <Row justify="center">
                <Col xs={{ span: 23 }} lg={{ span: 16 }}>
                    <Card title="AppX Deploy Dashboard">
                        <div>
                            <p>
                                {localize(
                                    'dashboard.appx_deploy_ready',
                                    'AppX Deploy is running and ready to serve containers. Use the Containers tab to manage apps, or check Monitoring for resource usage.'
                                )}
                            </p>
                            <p>
                                <b>
                                    {localize(
                                        'dashboard.root_domain_label',
                                        'Root Domain:'
                                    )}
                                </b>{' '}
                                <code>{self.state.apiData.rootDomain}</code>
                            </p>
                            <p>
                                <i>
                                    {localize(
                                        'dashboard.update_root_domain_caution',
                                        'You can always update your root domain, but be careful! Your SSL certificates will get revoked because of this domain change.'
                                    )}
                                </i>
                            </p>
                            <Row justify="end">
                                <Button
                                    disabled={this.state.isForceChangingDomain}
                                    type="dashed"
                                    onClick={() => {
                                        self.setState({
                                            isForceChangingDomain: true,
                                        })
                                    }}
                                >
                                    {localize(
                                        'dashboard.change_root_domain_anyways',
                                        'Change Root Domain'
                                    )}
                                </Button>
                            </Row>
                        </div>
                    </Card>
                </Col>
            </Row>
        )
    }
}

import { Card, Col, Row } from 'antd'
import { Component } from 'react'
import { connect } from 'react-redux'
import { IMobileComponent } from '../../models/ContainerProps'
import { localize } from '../../utils/Language'
import ChangePass from './ChangePass'
import NginxConfig from './NginxConfig'
import '../../styles/settings.css'

class Settings extends Component<
    {
        isMobile: boolean
    },
    {}
> {
    render() {
        return (
            <div className="settings-container">
                <Row justify="center" gutter={20}>
                    <Col
                        style={{ marginTop: 40, marginBottom: 40 }}
                        lg={{ span: 10 }}
                        xs={{ span: 23 }}
                    >
                        <Card
                            style={{ height: '100%' }}
                            title={localize(
                                'settings.change_password',
                                'Change Password'
                            )}
                        >
                            <ChangePass isMobile={this.props.isMobile} />
                        </Card>
                    </Col>
                </Row>
                <Row justify="center" gutter={20}>
                    <Col
                        style={{ marginBottom: 20 }}
                        lg={{ span: 18 }}
                        xs={{ span: 23 }}
                    >
                        <Card
                            style={{ height: '100%' }}
                            title={localize(
                                'settings.nginx_configurations',
                                'NGINX Configurations'
                            )}
                        >
                            <NginxConfig isMobile={this.props.isMobile} />
                        </Card>
                    </Col>
                </Row>
            </div>
        )
    }
}

function mapStateToProps(state: any) {
    return {
        isMobile: state.globalReducer.isMobile,
    }
}

export default connect<IMobileComponent, any, any>(
    mapStateToProps,
    undefined
)(Settings)

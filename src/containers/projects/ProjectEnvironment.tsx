import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, Form, Input, Modal, Space } from 'antd'
import ApiManager from '../../api/ApiManager'
import { IAppEnvVar } from '../apps/AppDefinition'
import { localize } from '../../utils/Language'
import Toaster from '../../utils/Toaster'
import ApiComponent from '../global/ApiComponent'
import CenteredSpinner from '../global/CenteredSpinner'
import EnvVarTable from './EnvVarTable'
import ReferenceVariableInput from './ReferenceVariableInput'

interface ProjectEnvironmentProps {
    projectId: string
    apiManager: ApiManager
    isMobile?: boolean
}

interface ProjectEnvironmentState {
    isLoading: boolean
    projectVars: IAppEnvVar[]
    serviceVars: { [serviceName: string]: IAppEnvVar[] }
    showAddVarModal: boolean
    newVarKey: string
    newVarValue: string
}

class ProjectEnvironment extends ApiComponent<
    ProjectEnvironmentProps,
    ProjectEnvironmentState
> {
    constructor(props: ProjectEnvironmentProps) {
        super(props)
        this.state = {
            isLoading: true,
            projectVars: [],
            serviceVars: {},
            showAddVarModal: false,
            newVarKey: '',
            newVarValue: '',
        }
    }

    componentDidMount() {
        this.fetchData()
    }

    fetchData() {
        const self = this
        self.setState({ isLoading: true })

        Promise.all([
            Promise.resolve({ projectVars: [] }),
            self.apiManager.getAllApps(),
        ])
            .then(function (results: any) {
                const projectVarsResp = results[0]
                const appsResp = results[1]

                const services: { [serviceName: string]: IAppEnvVar[] } = {}
                appsResp.appDefinitions
                    .filter(
                        (app: any) => app.projectId === self.props.projectId
                    )
                    .forEach((app: any) => {
                        services[app.appName] = app.envVars || []
                    })

                self.setState({
                    isLoading: false,
                    projectVars: projectVarsResp.projectVars || [],
                    serviceVars: services,
                })
            })
            .catch(Toaster.createCatcher())
            .then(function () {
                self.setState({ isLoading: false })
            })
    }

    handleAddProjectVar() {
        const self = this
        const { newVarKey, newVarValue } = self.state

        if (!newVarKey || !newVarValue) {
            Toaster.toastError(
                localize(
                    'project_env.key_value_required',
                    'Both key and value are required'
                )
            )
            return
        }

        Promise.resolve()
            .then(function () {
                Toaster.toastSuccess(
                    localize(
                        'project_env.var_added',
                        'Environment variable added successfully'
                    )
                )
                self.setState({
                    showAddVarModal: false,
                    newVarKey: '',
                    newVarValue: '',
                    projectVars: [
                        ...self.state.projectVars,
                        { key: newVarKey, value: newVarValue },
                    ],
                })
            })
            .catch(Toaster.createCatcher())
    }

    handleDeleteProjectVar(key: string) {
        const self = this
        Modal.confirm({
            title: localize(
                'project_env.delete_confirm_title',
                'Delete Environment Variable'
            ),
            content: localize(
                'project_env.delete_confirm_content',
                `Are you sure you want to delete ${key}?`
            ),
            onOk: () => {
                Promise.resolve()
                    .then(function () {
                        Toaster.toastSuccess(
                            localize(
                                'project_env.var_deleted',
                                'Environment variable deleted successfully'
                            )
                        )
                        self.setState({
                            projectVars: self.state.projectVars.filter(
                                (v) => v.key !== key
                            ),
                        })
                    })
                    .catch(Toaster.createCatcher())
            },
        })
    }

    render() {
        const self = this

        if (self.state.isLoading) {
            return <CenteredSpinner />
        }

        const { projectVars, serviceVars } = self.state

        return (
            <div style={{ padding: 24 }}>
                <Card
                    title={localize(
                        'project_env.project_vars_title',
                        'Project-Level Variables'
                    )}
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() =>
                                self.setState({ showAddVarModal: true })
                            }
                        >
                            {localize(
                                'project_env.add_variable',
                                'Add Variable'
                            )}
                        </Button>
                    }
                >
                    <p style={{ marginBottom: 16, color: '#888' }}>
                        {localize(
                            'project_env.project_vars_description',
                            'These variables are available to all services in this project'
                        )}
                    </p>
                    <EnvVarTable
                        envVars={projectVars}
                        onDelete={(key) => self.handleDeleteProjectVar(key)}
                    />
                </Card>

                <Card
                    title={localize(
                        'project_env.service_vars_title',
                        'Service-Level Variables'
                    )}
                    style={{ marginTop: 24 }}
                >
                    <p style={{ marginBottom: 16, color: '#888' }}>
                        {localize(
                            'project_env.service_vars_description',
                            'Service-specific variables override project-level variables'
                        )}
                    </p>
                    {Object.keys(serviceVars).length === 0 ? (
                        <p style={{ color: '#888', textAlign: 'center' }}>
                            {localize(
                                'project_env.no_services',
                                'No services in this project'
                            )}
                        </p>
                    ) : (
                        <Collapse>
                            {Object.entries(serviceVars).map(
                                ([serviceName, vars]) => (
                                    <Collapse.Panel
                                        key={serviceName}
                                        header={
                                            <Space>
                                                <strong>{serviceName}</strong>
                                                <span style={{ color: '#888' }}>
                                                    ({vars.length}{' '}
                                                    {localize(
                                                        'project_env.variables',
                                                        'variables'
                                                    )}
                                                    )
                                                </span>
                                            </Space>
                                        }
                                    >
                                        <EnvVarTable
                                            envVars={vars}
                                            inheritedVars={projectVars}
                                            readOnly
                                        />
                                    </Collapse.Panel>
                                )
                            )}
                        </Collapse>
                    )}
                </Card>

                <Modal
                    title={localize(
                        'project_env.add_var_title',
                        'Add Environment Variable'
                    )}
                    open={self.state.showAddVarModal}
                    onOk={() => self.handleAddProjectVar()}
                    onCancel={() =>
                        self.setState({
                            showAddVarModal: false,
                            newVarKey: '',
                            newVarValue: '',
                        })
                    }
                >
                    <Form layout="vertical">
                        <Form.Item
                            label={localize('project_env.key', 'Key')}
                            required
                        >
                            <Input
                                placeholder="DATABASE_URL"
                                value={self.state.newVarKey}
                                onChange={(e) =>
                                    self.setState({ newVarKey: e.target.value })
                                }
                            />
                        </Form.Item>
                        <Form.Item
                            label={localize('project_env.value', 'Value')}
                            required
                            extra={localize(
                                'project_env.value_hint',
                                'Type ${{ to reference variables from other services'
                            )}
                        >
                            <ReferenceVariableInput
                                value={self.state.newVarValue}
                                onChange={(val) =>
                                    self.setState({ newVarValue: val })
                                }
                                projectId={self.props.projectId}
                                apiManager={self.apiManager}
                                placeholder="postgresql://... or ${{postgres.DATABASE_URL}}"
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        )
    }
}

export default ProjectEnvironment

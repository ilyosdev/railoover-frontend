import {
    DeleteOutlined,
    ExclamationCircleOutlined,
    GithubOutlined,
    SaveOutlined,
} from '@ant-design/icons'
import {
    Button,
    Card,
    Divider,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Switch,
    Typography,
} from 'antd'
import React, { useEffect, useState } from 'react'
import ApiManager from '../../api/ApiManager'
import { localize } from '../../utils/Language'
import Toaster from '../../utils/Toaster'

const { Text, Title } = Typography

interface ProjectSettingsProps {
    projectId: string
    projectName: string
    projectDescription?: string
    apiManager: ApiManager
    onProjectDeleted?: () => void
    onProjectUpdated?: () => void
}

interface GitHubIntegration {
    repo: string
    branch: string
    autoDeployEnabled: boolean
}

export default function ProjectSettings({
    projectId,
    projectName,
    projectDescription,
    apiManager,
    onProjectDeleted,
    onProjectUpdated,
}: ProjectSettingsProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(projectName)
    const [description, setDescription] = useState(projectDescription || '')
    const [githubRepo, setGithubRepo] = useState('')
    const [githubBranch, setGithubBranch] = useState('main')
    const [autoDeployEnabled, setAutoDeployEnabled] = useState(true)
    const [githubConnected, setGithubConnected] = useState(false)
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    useEffect(() => {
        fetchProjectDetails()
    }, [projectId])

    const fetchProjectDetails = () => {
        apiManager
            .executeGenericApiCommand(
                'GET',
                `/user/projects/${projectId}/overview`,
                {}
            )
            .then((data: any) => {
                const project = data.project
                setName(project.name || '')
                setDescription(project.description || '')

                if (project.githubIntegration) {
                    setGithubRepo(project.githubIntegration.repo || '')
                    setGithubBranch(project.githubIntegration.branch || 'main')
                    setAutoDeployEnabled(
                        project.githubIntegration.autoDeployEnabled !== false
                    )
                    setGithubConnected(!!project.githubIntegration.repo)
                }
            })
            .catch(Toaster.createCatcher())
    }

    const handleSaveGeneral = () => {
        setLoading(true)
        apiManager
            .executeGenericApiCommand('POST', '/user/projects/update/', {
                projectDefinition: {
                    id: projectId,
                    name,
                    description,
                },
            })
            .then(() => {
                Toaster.toastSuccess(
                    localize(
                        'project_settings.saved',
                        'Project settings saved successfully'
                    )
                )
                onProjectUpdated?.()
            })
            .catch(Toaster.createCatcher())
            .finally(() => setLoading(false))
    }

    const handleConnectGitHub = () => {
        if (!githubRepo) {
            Toaster.toastError(
                localize(
                    'project_settings.repo_required',
                    'Repository is required'
                )
            )
            return
        }

        setLoading(true)
        apiManager
            .executeGenericApiCommand('POST', '/user/github/connect', {
                projectId,
                repo: githubRepo,
                branch: githubBranch,
                autoDeployEnabled,
            })
            .then(() => {
                Toaster.toastSuccess(
                    localize(
                        'project_settings.github_connected',
                        'GitHub repository connected successfully'
                    )
                )
                setGithubConnected(true)
                onProjectUpdated?.()
            })
            .catch(Toaster.createCatcher())
            .finally(() => setLoading(false))
    }

    const handleDisconnectGitHub = () => {
        Modal.confirm({
            title: localize(
                'project_settings.disconnect_github_title',
                'Disconnect GitHub'
            ),
            content: localize(
                'project_settings.disconnect_github_content',
                'Are you sure you want to disconnect this GitHub repository? Auto-deploy will be disabled.'
            ),
            onOk: () => {
                setLoading(true)
                apiManager
                    .executeGenericApiCommand(
                        'POST',
                        '/user/github/disconnect',
                        {
                            projectId,
                        }
                    )
                    .then(() => {
                        Toaster.toastSuccess(
                            localize(
                                'project_settings.github_disconnected',
                                'GitHub repository disconnected'
                            )
                        )
                        setGithubConnected(false)
                        setGithubRepo('')
                        onProjectUpdated?.()
                    })
                    .catch(Toaster.createCatcher())
                    .finally(() => setLoading(false))
            },
        })
    }

    const handleDeleteProject = () => {
        if (deleteConfirmText !== projectName) {
            Toaster.toastError(
                localize(
                    'project_settings.delete_name_mismatch',
                    'Project name does not match'
                )
            )
            return
        }

        setLoading(true)
        apiManager
            .executeGenericApiCommand('POST', '/user/projects/delete/', {
                projectIds: [projectId],
            })
            .then(() => {
                Toaster.toastSuccess(
                    localize(
                        'project_settings.project_deleted',
                        'Project deleted successfully'
                    )
                )
                setDeleteConfirmVisible(false)
                onProjectDeleted?.()
            })
            .catch(Toaster.createCatcher())
            .finally(() => setLoading(false))
    }

    return (
        <div style={{ padding: 24 }}>
            <Card
                title={localize(
                    'project_settings.general_title',
                    'General Settings'
                )}
            >
                <Form layout="vertical">
                    <Form.Item
                        label={localize(
                            'project_settings.name',
                            'Project Name'
                        )}
                    >
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-project"
                        />
                    </Form.Item>
                    <Form.Item
                        label={localize(
                            'project_settings.description',
                            'Description'
                        )}
                    >
                        <Input.TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional project description"
                            rows={3}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={loading}
                            onClick={handleSaveGeneral}
                        >
                            {localize(
                                'project_settings.save_changes',
                                'Save Changes'
                            )}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Card
                title={
                    <Space>
                        <GithubOutlined />
                        {localize(
                            'project_settings.github_title',
                            'GitHub Integration'
                        )}
                    </Space>
                }
                style={{ marginTop: 24 }}
            >
                {githubConnected ? (
                    <div>
                        <Space
                            direction="vertical"
                            style={{ width: '100%' }}
                            size="middle"
                        >
                            <div>
                                <Text type="secondary">
                                    {localize(
                                        'project_settings.connected_repo',
                                        'Connected Repository'
                                    )}
                                </Text>
                                <div>
                                    <Text strong code>
                                        {githubRepo}
                                    </Text>
                                    <Text type="secondary"> @ </Text>
                                    <Text code>{githubBranch}</Text>
                                </div>
                            </div>

                            <div>
                                <Text type="secondary">
                                    {localize(
                                        'project_settings.auto_deploy',
                                        'Auto-deploy on push'
                                    )}
                                </Text>
                                <div>
                                    <Switch
                                        checked={autoDeployEnabled}
                                        onChange={(checked) => {
                                            setAutoDeployEnabled(checked)
                                            handleConnectGitHub()
                                        }}
                                    />
                                    <Text style={{ marginLeft: 8 }}>
                                        {autoDeployEnabled
                                            ? localize(
                                                  'project_settings.enabled',
                                                  'Enabled'
                                              )
                                            : localize(
                                                  'project_settings.disabled',
                                                  'Disabled'
                                              )}
                                    </Text>
                                </div>
                            </div>

                            <Button
                                danger
                                onClick={handleDisconnectGitHub}
                                loading={loading}
                            >
                                {localize(
                                    'project_settings.disconnect_github',
                                    'Disconnect GitHub'
                                )}
                            </Button>
                        </Space>
                    </div>
                ) : (
                    <Form layout="vertical">
                        <Form.Item
                            label={localize(
                                'project_settings.github_repo',
                                'Repository (user/repo)'
                            )}
                            extra={localize(
                                'project_settings.github_repo_hint',
                                'Format: username/repository or organization/repository'
                            )}
                        >
                            <Input
                                value={githubRepo}
                                onChange={(e) => setGithubRepo(e.target.value)}
                                placeholder="acme/my-app"
                                prefix={<GithubOutlined />}
                            />
                        </Form.Item>
                        <Form.Item
                            label={localize(
                                'project_settings.branch',
                                'Branch'
                            )}
                        >
                            <Select
                                value={githubBranch}
                                onChange={setGithubBranch}
                                style={{ width: 200 }}
                            >
                                <Select.Option value="main">main</Select.Option>
                                <Select.Option value="master">
                                    master
                                </Select.Option>
                                <Select.Option value="develop">
                                    develop
                                </Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Space>
                                <Switch
                                    checked={autoDeployEnabled}
                                    onChange={setAutoDeployEnabled}
                                />
                                <Text>
                                    {localize(
                                        'project_settings.auto_deploy_on_push',
                                        'Auto-deploy on push'
                                    )}
                                </Text>
                            </Space>
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                icon={<GithubOutlined />}
                                loading={loading}
                                onClick={handleConnectGitHub}
                            >
                                {localize(
                                    'project_settings.connect_github',
                                    'Connect Repository'
                                )}
                            </Button>
                        </Form.Item>
                    </Form>
                )}
            </Card>

            <Card
                title={
                    <Space style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined />
                        {localize(
                            'project_settings.danger_zone',
                            'Danger Zone'
                        )}
                    </Space>
                }
                style={{ marginTop: 24, borderColor: '#ff4d4f' }}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <Title level={5} style={{ marginBottom: 4 }}>
                            {localize(
                                'project_settings.delete_project',
                                'Delete Project'
                            )}
                        </Title>
                        <Text type="secondary">
                            {localize(
                                'project_settings.delete_warning',
                                'Once you delete a project, there is no going back. This will NOT delete the services, only the project grouping.'
                            )}
                        </Text>
                    </div>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setDeleteConfirmVisible(true)}
                    >
                        {localize(
                            'project_settings.delete_project_btn',
                            'Delete this project'
                        )}
                    </Button>
                </Space>
            </Card>

            <Modal
                title={
                    <Space style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined />
                        {localize(
                            'project_settings.confirm_delete_title',
                            'Confirm Project Deletion'
                        )}
                    </Space>
                }
                open={deleteConfirmVisible}
                onCancel={() => {
                    setDeleteConfirmVisible(false)
                    setDeleteConfirmText('')
                }}
                footer={[
                    <Button
                        key="cancel"
                        onClick={() => {
                            setDeleteConfirmVisible(false)
                            setDeleteConfirmText('')
                        }}
                    >
                        {localize('project_settings.cancel', 'Cancel')}
                    </Button>,
                    <Button
                        key="delete"
                        danger
                        type="primary"
                        loading={loading}
                        disabled={deleteConfirmText !== projectName}
                        onClick={handleDeleteProject}
                    >
                        {localize(
                            'project_settings.delete_permanently',
                            'Delete Permanently'
                        )}
                    </Button>,
                ]}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>
                        {localize(
                            'project_settings.delete_confirm_msg',
                            'This action cannot be undone. Please type the project name to confirm:'
                        )}
                    </Text>
                    <Text strong code>
                        {projectName}
                    </Text>
                    <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={projectName}
                    />
                </Space>
            </Modal>
        </div>
    )
}

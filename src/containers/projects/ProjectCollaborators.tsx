import React, { useState, useEffect } from 'react'
import {
    Table,
    Button,
    Modal,
    Select,
    Tag,
    message,
    Popconfirm,
    Space,
    Card,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { ProjectCollaborator } from '../../models/UserDefinition'
import ApiManager from '../../api/ApiManager'
import { localize } from '../../utils/Language'

interface ProjectCollaboratorsProps {
    projectId: string
    apiManager: ApiManager
}

interface AvailableUser {
    id: string
    username: string
    email: string
}

const ProjectCollaborators: React.FC<ProjectCollaboratorsProps> = ({
    projectId,
    apiManager,
}) => {
    const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>(
        []
    )
    const [showAddModal, setShowAddModal] = useState(false)
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        userId: '',
        role: 'developer' as 'admin' | 'developer' | 'viewer',
    })

    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])

    useEffect(() => {
        loadCollaborators()
        loadAvailableUsers()
    }, [projectId])

    const loadCollaborators = async () => {
        setLoading(true)
        try {
            const res = await apiManager.executeGenericApiCommand(
                'GET',
                `/user/projects/${projectId}/collaborators`,
                {}
            )
            setCollaborators(res.collaborators || [])
        } catch (error: any) {
            message.error(
                error?.message ||
                    localize(
                        'collaborators.load_error',
                        'Failed to load collaborators'
                    )
            )
        }
        setLoading(false)
    }

    const loadAvailableUsers = async () => {
        try {
            const res = await apiManager.executeGenericApiCommand(
                'GET',
                '/user/users/',
                {}
            )
            setAvailableUsers(res.users || [])
        } catch (error: any) {
            message.error(
                error?.message ||
                    localize(
                        'collaborators.users_error',
                        'Failed to load users'
                    )
            )
        }
    }

    const handleAddCollaborator = async () => {
        if (!formData.userId) {
            message.error(
                localize('collaborators.select_user', 'Please select a user')
            )
            return
        }

        try {
            await apiManager.executeGenericApiCommand(
                'POST',
                `/user/projects/${projectId}/collaborators`,
                formData
            )
            message.success(
                localize(
                    'collaborators.added',
                    'Collaborator added successfully'
                )
            )
            setShowAddModal(false)
            setFormData({ userId: '', role: 'developer' })
            loadCollaborators()
        } catch (error: any) {
            message.error(
                error?.message ||
                    localize(
                        'collaborators.add_error',
                        'Failed to add collaborator'
                    )
            )
        }
    }

    const handleRemoveCollaborator = async (userId: string) => {
        try {
            await apiManager.executeGenericApiCommand(
                'POST',
                `/user/projects/${projectId}/collaborators/${userId}/remove`,
                {}
            )
            message.success(
                localize('collaborators.removed', 'Collaborator removed')
            )
            loadCollaborators()
        } catch (error: any) {
            message.error(
                error?.message ||
                    localize(
                        'collaborators.remove_error',
                        'Failed to remove collaborator'
                    )
            )
        }
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'red'
            case 'developer':
                return 'blue'
            case 'viewer':
                return 'green'
            default:
                return 'default'
        }
    }

    const getRoleDisplayName = (role: string) => {
        switch (role) {
            case 'admin':
                return localize('collaborators.role.admin', 'Admin')
            case 'developer':
                return localize('collaborators.role.developer', 'Developer')
            case 'viewer':
                return localize('collaborators.role.viewer', 'Viewer')
            default:
                return role
        }
    }

    const columns = [
        {
            title: localize('collaborators.column.user', 'User'),
            dataIndex: 'username',
            key: 'username',
            render: (_: any, record: ProjectCollaborator) => (
                <div>
                    <div>{record.username}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                        {record.email}
                    </div>
                </div>
            ),
        },
        {
            title: localize('collaborators.column.role', 'Role'),
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => (
                <Tag color={getRoleColor(role)}>{getRoleDisplayName(role)}</Tag>
            ),
        },
        {
            title: localize('collaborators.column.added', 'Added'),
            dataIndex: 'addedAt',
            key: 'addedAt',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: localize('collaborators.column.actions', 'Actions'),
            key: 'actions',
            render: (_: any, record: ProjectCollaborator) => (
                <Popconfirm
                    title={localize(
                        'collaborators.remove_confirm',
                        'Remove this collaborator?'
                    )}
                    onConfirm={() => handleRemoveCollaborator(record.userId)}
                    okText={localize('common.yes', 'Yes')}
                    cancelText={localize('common.no', 'No')}
                >
                    <Button type="text" danger icon={<DeleteOutlined />}>
                        {localize('collaborators.remove', 'Remove')}
                    </Button>
                </Popconfirm>
            ),
        },
    ]

    const filteredUsers = availableUsers.filter(
        (user) => !collaborators.some((c) => c.userId === user.id)
    )

    return (
        <Card>
            <div className="project-collaborators-header">
                <div>
                    <h2>
                        {localize(
                            'collaborators.title',
                            'Project Collaborators'
                        )}
                    </h2>
                    <p>
                        {localize(
                            'collaborators.description',
                            'Manage who can access this project'
                        )}
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setShowAddModal(true)}
                >
                    {localize('collaborators.add', 'Add Collaborator')}
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={collaborators}
                loading={loading}
                rowKey="userId"
                pagination={false}
            />

            <Modal
                title={localize('collaborators.add', 'Add Collaborator')}
                open={showAddModal}
                onOk={handleAddCollaborator}
                onCancel={() => {
                    setShowAddModal(false)
                    setFormData({ userId: '', role: 'developer' })
                }}
                okText={localize('collaborators.add_button', 'Add')}
                cancelText={localize('common.cancel', 'Cancel')}
            >
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <div>
                        <label>
                            {localize('collaborators.form.user', 'User')} *
                        </label>
                        <Select
                            showSearch
                            placeholder={localize(
                                'collaborators.form.search_users',
                                'Search users...'
                            )}
                            value={formData.userId}
                            onChange={(userId) =>
                                setFormData({ ...formData, userId })
                            }
                            style={{ width: '100%', marginTop: 8 }}
                            options={filteredUsers.map((u) => ({
                                label: `${u.username} (${u.email})`,
                                value: u.id,
                            }))}
                            filterOption={(input, option) =>
                                (option?.label ?? '')
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />
                    </div>
                    <div>
                        <label>
                            {localize('collaborators.form.role', 'Role')} *
                        </label>
                        <Select
                            value={formData.role}
                            onChange={(role) =>
                                setFormData({ ...formData, role })
                            }
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            <Select.Option value="admin">
                                {localize('collaborators.role.admin', 'Admin')}
                            </Select.Option>
                            <Select.Option value="developer">
                                {localize(
                                    'collaborators.role.developer',
                                    'Developer'
                                )}
                            </Select.Option>
                            <Select.Option value="viewer">
                                {localize(
                                    'collaborators.role.viewer',
                                    'Viewer'
                                )}
                            </Select.Option>
                        </Select>
                    </div>
                </Space>
            </Modal>
        </Card>
    )
}

export default ProjectCollaborators

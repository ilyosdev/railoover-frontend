import React, { useState, useEffect } from 'react'
import {
    Table,
    Button,
    Modal,
    Input,
    Select,
    Tag,
    Space,
    message,
    Popconfirm,
    Card,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import ApiManager from '../../api/ApiManager'
import { UserRole, UserDefinition } from '../../models/UserDefinition'
import { localize } from '../../utils/Language'
import '../../styles/team-management.css'

interface TeamManagementProps {}

const TeamManagement: React.FC<TeamManagementProps> = () => {
    const [users, setUsers] = useState<UserDefinition[]>([])
    const [loading, setLoading] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditRoleModal, setShowEditRoleModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserDefinition | null>(
        null
    )

    const apiManager = new ApiManager()

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: UserRole.DEVELOPER,
    })

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const res = await apiManager.executeGenericApiCommand(
                'GET',
                '/user/users/',
                {}
            )
            setUsers(res.users || [])
        } catch (error) {
            message.error(localize('team.load_error', 'Failed to load users'))
        }
        setLoading(false)
    }

    const handleCreateUser = async () => {
        if (!formData.username || !formData.email || !formData.password) {
            message.error(
                localize(
                    'team.validation_error',
                    'Please fill in all required fields'
                )
            )
            return
        }

        try {
            await apiManager.executeGenericApiCommand(
                'POST',
                '/user/users/create',
                formData
            )
            message.success(
                localize('team.user_created', 'User created successfully')
            )
            setShowCreateModal(false)
            resetForm()
            loadUsers()
        } catch (error: any) {
            message.error(
                error?.message ||
                    localize('team.create_error', 'Failed to create user')
            )
        }
    }

    const handleUpdateRole = async () => {
        if (!selectedUser) return
        try {
            await apiManager.executeGenericApiCommand(
                'POST',
                `/user/users/${selectedUser.id}/role`,
                {
                    role: formData.role,
                }
            )
            message.success(localize('team.role_updated', 'User role updated'))
            setShowEditRoleModal(false)
            loadUsers()
        } catch (error: any) {
            message.error(
                error?.message ||
                    localize('team.update_error', 'Failed to update role')
            )
        }
    }

    const handleDeleteUser = async (userId: string) => {
        try {
            await apiManager.executeGenericApiCommand(
                'POST',
                `/user/users/${userId}/delete`,
                {}
            )
            message.success(localize('team.user_deleted', 'User deleted'))
            loadUsers()
        } catch (error: any) {
            message.error(
                error?.message ||
                    localize('team.delete_error', 'Failed to delete user')
            )
        }
    }

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            role: UserRole.DEVELOPER,
        })
    }

    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case UserRole.SUPER_ADMIN:
                return 'red'
            case UserRole.ADMIN:
                return 'orange'
            case UserRole.DEVELOPER:
                return 'blue'
            case UserRole.VIEWER:
                return 'green'
            default:
                return 'default'
        }
    }

    const getRoleDisplayName = (role: UserRole) => {
        switch (role) {
            case UserRole.SUPER_ADMIN:
                return localize('team.role.super_admin', 'Super Admin')
            case UserRole.ADMIN:
                return localize('team.role.admin', 'Admin')
            case UserRole.DEVELOPER:
                return localize('team.role.developer', 'Developer')
            case UserRole.VIEWER:
                return localize('team.role.viewer', 'Viewer')
            default:
                return role
        }
    }

    const columns = [
        {
            title: localize('team.column.username', 'Username'),
            dataIndex: 'username',
            key: 'username',
            sorter: (a: UserDefinition, b: UserDefinition) =>
                a.username.localeCompare(b.username),
        },
        {
            title: localize('team.column.email', 'Email'),
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: localize('team.column.role', 'Role'),
            dataIndex: 'role',
            key: 'role',
            render: (role: UserRole) => (
                <Tag color={getRoleColor(role)}>{getRoleDisplayName(role)}</Tag>
            ),
            filters: [
                {
                    text: localize('team.role.super_admin', 'Super Admin'),
                    value: UserRole.SUPER_ADMIN,
                },
                {
                    text: localize('team.role.admin', 'Admin'),
                    value: UserRole.ADMIN,
                },
                {
                    text: localize('team.role.developer', 'Developer'),
                    value: UserRole.DEVELOPER,
                },
                {
                    text: localize('team.role.viewer', 'Viewer'),
                    value: UserRole.VIEWER,
                },
            ],
            onFilter: (value: any, record: UserDefinition) =>
                record.role === value,
        },
        {
            title: localize('team.column.last_login', 'Last Login'),
            dataIndex: 'lastLogin',
            key: 'lastLogin',
            render: (date: string) =>
                date
                    ? new Date(date).toLocaleString()
                    : localize('team.never', 'Never'),
            sorter: (a: UserDefinition, b: UserDefinition) => {
                if (!a.lastLogin) return 1
                if (!b.lastLogin) return -1
                return (
                    new Date(b.lastLogin).getTime() -
                    new Date(a.lastLogin).getTime()
                )
            },
        },
        {
            title: localize('team.column.created', 'Created'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString(),
            sorter: (a: UserDefinition, b: UserDefinition) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        },
        {
            title: localize('team.column.actions', 'Actions'),
            key: 'actions',
            render: (_: any, record: UserDefinition) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setSelectedUser(record)
                            setFormData({ ...formData, role: record.role })
                            setShowEditRoleModal(true)
                        }}
                    >
                        {localize('team.edit_role', 'Edit Role')}
                    </Button>
                    <Popconfirm
                        title={localize(
                            'team.delete_confirm',
                            'Are you sure you want to delete this user?'
                        )}
                        onConfirm={() => handleDeleteUser(record.id)}
                        okText={localize('common.yes', 'Yes')}
                        cancelText={localize('common.no', 'No')}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />}>
                            {localize('team.delete', 'Delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ]

    return (
        <div className="team-management-container slow-fadein-fast">
            <Card>
                <div className="team-management-header">
                    <div>
                        <h1>{localize('team.title', 'Team Management')}</h1>
                        <p>
                            {localize(
                                'team.description',
                                'Manage team members and their access levels'
                            )}
                        </p>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            resetForm()
                            setShowCreateModal(true)
                        }}
                        size="large"
                    >
                        {localize('team.add_member', 'Add Team Member')}
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={users}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) =>
                            localize(
                                'team.total_users',
                                `Total ${total} users`
                            ),
                    }}
                />
            </Card>

            <Modal
                title={localize('team.add_member', 'Add Team Member')}
                open={showCreateModal}
                onOk={handleCreateUser}
                onCancel={() => {
                    setShowCreateModal(false)
                    resetForm()
                }}
                okText={localize('team.create', 'Create')}
                cancelText={localize('common.cancel', 'Cancel')}
                width={600}
            >
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <div>
                        <label>
                            {localize('team.form.username', 'Username')} *
                        </label>
                        <Input
                            placeholder={localize(
                                'team.form.username_placeholder',
                                'Enter username'
                            )}
                            value={formData.username}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    username: e.target.value,
                                })
                            }
                            style={{ marginTop: 8 }}
                        />
                    </div>
                    <div>
                        <label>{localize('team.form.email', 'Email')} *</label>
                        <Input
                            type="email"
                            placeholder={localize(
                                'team.form.email_placeholder',
                                'Enter email'
                            )}
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    email: e.target.value,
                                })
                            }
                            style={{ marginTop: 8 }}
                        />
                    </div>
                    <div>
                        <label>
                            {localize('team.form.password', 'Password')} *
                        </label>
                        <Input.Password
                            placeholder={localize(
                                'team.form.password_placeholder',
                                'Enter password'
                            )}
                            value={formData.password}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    password: e.target.value,
                                })
                            }
                            style={{ marginTop: 8 }}
                        />
                    </div>
                    <div>
                        <label>{localize('team.form.role', 'Role')} *</label>
                        <Select
                            value={formData.role}
                            onChange={(role) =>
                                setFormData({ ...formData, role })
                            }
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            <Select.Option value={UserRole.ADMIN}>
                                {localize('team.role.admin', 'Admin')}
                            </Select.Option>
                            <Select.Option value={UserRole.DEVELOPER}>
                                {localize('team.role.developer', 'Developer')}
                            </Select.Option>
                            <Select.Option value={UserRole.VIEWER}>
                                {localize('team.role.viewer', 'Viewer')}
                            </Select.Option>
                        </Select>
                    </div>
                </Space>
            </Modal>

            <Modal
                title={localize('team.update_role', 'Update User Role')}
                open={showEditRoleModal}
                onOk={handleUpdateRole}
                onCancel={() => setShowEditRoleModal(false)}
                okText={localize('team.update', 'Update')}
                cancelText={localize('common.cancel', 'Cancel')}
            >
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    {selectedUser && (
                        <div>
                            <p>
                                <strong>
                                    {localize(
                                        'team.column.username',
                                        'Username'
                                    )}
                                    :
                                </strong>{' '}
                                {selectedUser.username}
                            </p>
                            <p>
                                <strong>
                                    {localize('team.column.email', 'Email')}:
                                </strong>{' '}
                                {selectedUser.email}
                            </p>
                        </div>
                    )}
                    <div>
                        <label>{localize('team.form.role', 'Role')} *</label>
                        <Select
                            value={formData.role}
                            onChange={(role) =>
                                setFormData({ ...formData, role })
                            }
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            <Select.Option value={UserRole.ADMIN}>
                                {localize('team.role.admin', 'Admin')}
                            </Select.Option>
                            <Select.Option value={UserRole.DEVELOPER}>
                                {localize('team.role.developer', 'Developer')}
                            </Select.Option>
                            <Select.Option value={UserRole.VIEWER}>
                                {localize('team.role.viewer', 'Viewer')}
                            </Select.Option>
                        </Select>
                    </div>
                </Space>
            </Modal>
        </div>
    )
}

export default TeamManagement

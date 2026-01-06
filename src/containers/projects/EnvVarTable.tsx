import {
    DeleteOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
} from '@ant-design/icons'
import { Button, Space, Table, Tag } from 'antd'
import { ColumnType } from 'antd/lib/table'
import React, { Component } from 'react'
import { IAppEnvVar } from '../apps/AppDefinition'
import { localize } from '../../utils/Language'

interface EnvVarTableProps {
    envVars: IAppEnvVar[]
    inheritedVars?: IAppEnvVar[]
    onUpdate?: (key: string, value: string) => void
    onDelete?: (key: string) => void
    readOnly?: boolean
}

interface EnvVarTableState {
    maskedKeys: { [key: string]: boolean }
}

export default class EnvVarTable extends Component<
    EnvVarTableProps,
    EnvVarTableState
> {
    constructor(props: EnvVarTableProps) {
        super(props)
        this.state = {
            maskedKeys: {},
        }
    }

    toggleMask(key: string) {
        this.setState({
            maskedKeys: {
                ...this.state.maskedKeys,
                [key]: !this.state.maskedKeys[key],
            },
        })
    }

    isSensitiveKey(key: string): boolean {
        const lowerKey = key.toLowerCase()
        return (
            lowerKey.includes('password') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('token') ||
            lowerKey.includes('key') ||
            lowerKey.includes('apikey') ||
            lowerKey.includes('api_key')
        )
    }

    renderValue(envVar: IAppEnvVar, isInherited: boolean): React.ReactNode {
        const isSensitive = this.isSensitiveKey(envVar.key)
        const isMasked = this.state.maskedKeys[envVar.key] !== false

        const value = isSensitive && isMasked ? '••••••••' : envVar.value

        return (
            <Space>
                <span
                    style={{
                        color: isInherited ? '#888' : undefined,
                        fontFamily: 'monospace',
                    }}
                >
                    {value}
                </span>
                {isSensitive && (
                    <Button
                        type="text"
                        size="small"
                        icon={
                            isMasked ? (
                                <EyeOutlined />
                            ) : (
                                <EyeInvisibleOutlined />
                            )
                        }
                        onClick={() => this.toggleMask(envVar.key)}
                    />
                )}
            </Space>
        )
    }

    render() {
        const self = this
        const { envVars, inheritedVars, onDelete, readOnly } = this.props

        const allVars = [
            ...(inheritedVars || []).map((v) => ({ ...v, isInherited: true })),
            ...envVars.map((v) => ({ ...v, isInherited: false })),
        ]

        type EnvVarRecord = IAppEnvVar & { isInherited?: boolean }

        const columns: ColumnType<EnvVarRecord>[] = [
            {
                title: localize('env_var_table.key', 'Key'),
                dataIndex: 'key',
                key: 'key',
                width: '30%',
                render: (key: string, record: EnvVarRecord) => (
                    <span
                        style={{
                            color: record.isInherited ? '#888' : undefined,
                            fontFamily: 'monospace',
                        }}
                    >
                        {key}
                        {record.isInherited && (
                            <Tag color="blue" style={{ marginInlineStart: 8 }}>
                                {localize(
                                    'env_var_table.inherited',
                                    'Inherited'
                                )}
                            </Tag>
                        )}
                    </span>
                ),
            },
            {
                title: localize('env_var_table.value', 'Value'),
                dataIndex: 'value',
                key: 'value',
                render: (_: string, record: EnvVarRecord) =>
                    self.renderValue(record, !!record.isInherited),
            },
        ]

        if (!readOnly && onDelete) {
            columns.push({
                title: localize('env_var_table.actions', 'Actions'),
                key: 'actions',
                width: '100px',
                align: 'center',
                render: (_: unknown, record: EnvVarRecord) => {
                    if (record.isInherited) {
                        return null
                    }
                    return (
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onDelete(record.key)}
                        />
                    )
                },
            })
        }

        return (
            <Table
                dataSource={allVars}
                columns={columns}
                rowKey="key"
                pagination={false}
                size="small"
            />
        )
    }
}

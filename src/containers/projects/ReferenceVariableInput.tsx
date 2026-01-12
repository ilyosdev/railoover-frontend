import { InfoCircleOutlined, LinkOutlined } from '@ant-design/icons'
import { AutoComplete, Input, Tag, Tooltip } from 'antd'
import React, { useEffect, useState, useCallback } from 'react'
import ApiManager from '../../api/ApiManager'

interface AvailableReference {
    serviceName: string
    displayName: string
    serviceType: string
    variables: {
        key: string
        preview: string
        isSecret: boolean
    }[]
}

interface ReferenceVariableInputProps {
    value: string
    onChange: (value: string) => void
    projectId: string
    apiManager: ApiManager
    placeholder?: string
    disabled?: boolean
}

const REFERENCE_PATTERN = /\$\{\{([^}]*)$/

export default function ReferenceVariableInput({
    value,
    onChange,
    projectId,
    apiManager,
    placeholder = 'Value or ${{service.VAR}}',
    disabled = false,
}: ReferenceVariableInputProps) {
    const [references, setReferences] = useState<AvailableReference[]>([])
    const [loading, setLoading] = useState(false)
    const [options, setOptions] = useState<
        { value: string; label: React.ReactNode }[]
    >([])
    const [showAutocomplete, setShowAutocomplete] = useState(false)

    useEffect(() => {
        if (!projectId) return

        setLoading(true)
        apiManager
            .executeGenericApiCommand(
                'GET',
                `/user/projects/${projectId}/references`,
                {}
            )
            .then((data: any) => {
                setReferences(data.references || [])
            })
            .catch(() => {
                setReferences([])
            })
            .finally(() => {
                setLoading(false)
            })
    }, [projectId, apiManager])

    const generateOptions = useCallback(
        (searchText: string) => {
            const match = searchText.match(REFERENCE_PATTERN)
            if (!match) {
                setOptions([])
                setShowAutocomplete(false)
                return
            }

            setShowAutocomplete(true)
            const partial = match[1].toLowerCase()

            const newOptions: { value: string; label: React.ReactNode }[] = []

            references.forEach((ref) => {
                ref.variables.forEach((variable) => {
                    const fullRef = `$\{{${ref.serviceName}.${variable.key}}}`
                    const searchKey =
                        `${ref.serviceName}.${variable.key}`.toLowerCase()

                    if (partial === '' || searchKey.includes(partial)) {
                        const prefix = searchText.substring(
                            0,
                            searchText.lastIndexOf('${{')
                        )
                        newOptions.push({
                            value: prefix + fullRef,
                            label: (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>
                                        <Tag
                                            color={getServiceColor(
                                                ref.serviceType
                                            )}
                                            style={{ marginRight: 8 }}
                                        >
                                            {ref.serviceName}
                                        </Tag>
                                        <code>{variable.key}</code>
                                    </span>
                                    <span
                                        style={{
                                            color: '#888',
                                            fontSize: 12,
                                            marginLeft: 8,
                                        }}
                                    >
                                        {variable.isSecret
                                            ? '********'
                                            : variable.preview}
                                    </span>
                                </div>
                            ),
                        })
                    }
                })
            })

            setOptions(newOptions)
        },
        [references]
    )

    const handleChange = (newValue: string) => {
        onChange(newValue)
        generateOptions(newValue)
    }

    const isReference = value.includes('${{') && value.includes('}}')

    return (
        <div style={{ position: 'relative' }}>
            <AutoComplete
                value={value}
                onChange={handleChange}
                options={showAutocomplete ? options : []}
                style={{ width: '100%' }}
                disabled={disabled}
                notFoundContent={
                    loading ? 'Loading...' : 'No matching references'
                }
                open={showAutocomplete && options.length > 0}
                onBlur={() => setShowAutocomplete(false)}
            >
                <Input.TextArea
                    placeholder={placeholder}
                    rows={2}
                    style={{
                        fontFamily: 'monospace',
                        borderColor: isReference ? '#722ed1' : undefined,
                    }}
                />
            </AutoComplete>

            {isReference && (
                <div
                    style={{
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <LinkOutlined style={{ color: '#722ed1' }} />
                    <span style={{ color: '#722ed1', fontSize: 12 }}>
                        Reference variable
                    </span>
                    <Tooltip title="This value will be resolved from another service at runtime">
                        <InfoCircleOutlined
                            style={{ color: '#888', fontSize: 12 }}
                        />
                    </Tooltip>
                </div>
            )}

            {value.includes('${{') && !value.includes('}}') && (
                <div
                    style={{
                        marginTop: 4,
                        color: '#888',
                        fontSize: 12,
                    }}
                >
                    Type service.VAR to see suggestions
                </div>
            )}
        </div>
    )
}

function getServiceColor(serviceType: string): string {
    switch (serviceType) {
        case 'database':
            return 'green'
        case 'frontend':
            return 'purple'
        case 'backend':
            return 'blue'
        case 'worker':
            return 'orange'
        case 'shared':
            return 'cyan'
        default:
            return 'default'
    }
}

import { Card, Skeleton } from 'antd'

interface ServiceCardSkeletonProps {
    color?: string
}

export default function ServiceCardSkeleton({
    color = '#6b7280',
}: ServiceCardSkeletonProps) {
    return (
        <Card
            className="service-card"
            style={{
                borderLeft: `4px solid ${color}`,
                background: '#1a1a1a',
            }}
            styles={{ body: { padding: 16 } }}
        >
            <Skeleton
                active
                title={{ width: '60%' }}
                paragraph={{
                    rows: 1,
                    width: '80%',
                }}
            />
        </Card>
    )
}

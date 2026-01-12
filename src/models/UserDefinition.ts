export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    DEVELOPER = 'developer',
    VIEWER = 'viewer',
}

export interface UserPermissions {
    projects: string[]
    projectActions: {
        canCreate: boolean
        canDelete: boolean
        canDeploy: boolean
    }
    system: {
        canManageUsers: boolean
        canManageSettings: boolean
        canViewLogs: boolean
        canManageDatabases: boolean
    }
}

export interface UserDefinition {
    id: string
    username: string
    email: string
    role: UserRole
    permissions?: UserPermissions
    createdAt: string
    lastLogin?: string
}

export interface ProjectCollaborator {
    userId: string
    username: string
    email: string
    role: 'admin' | 'developer' | 'viewer'
    addedAt: string
}

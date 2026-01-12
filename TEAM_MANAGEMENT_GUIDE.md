# Team Management UI - Implementation Guide

This document describes the complete team management UI implementation for Railover VDS PaaS.

## Overview

The team management feature allows super admins to:

- Invite team members with role-based access
- Manage user roles and permissions
- Control project-level collaborator access
- View team member activity

## Components Created

### 1. Models (`src/models/UserDefinition.ts`)

Defines TypeScript interfaces for:

- `UserRole` enum (SUPER_ADMIN, ADMIN, DEVELOPER, VIEWER)
- `UserDefinition` interface
- `UserPermissions` interface
- `ProjectCollaborator` interface

### 2. Team Management Page (`src/containers/team/TeamManagement.tsx`)

Main team management interface with features:

- **User List**: Table displaying all users with sorting and filtering
- **Add User**: Modal form to create new team members
- **Edit Role**: Modal to update user roles
- **Delete User**: Confirmation dialog for user deletion
- **Role-based colors**: Visual distinction for different roles

**Features:**

- Table with sortable columns (username, email, role, last login, created date)
- Role filtering
- User search and pagination
- Form validation
- Internationalization support via `localize()`

### 3. Project Collaborators (`src/containers/projects/ProjectCollaborators.tsx`)

Project-specific access control:

- **Collaborator List**: Shows users with access to the project
- **Add Collaborator**: Select users and assign project roles
- **Remove Collaborator**: Remove user access from project
- **Role Management**: Admin, Developer, Viewer roles

**Features:**

- User dropdown with search
- Filters already-added collaborators
- Project-specific role assignment
- Inline collaborator removal

### 4. Styling (`src/styles/team-management.css`)

Responsive CSS with:

- Card-based layout
- Flexible header design
- Mobile-friendly breakpoints
- Dark theme compatibility
- Consistent spacing and shadows

## Routing Updates

### PageRoot (`src/containers/PageRoot.tsx`)

- Added `/team/` route for TeamManagement component
- Imported TeamManagement component

### Sidebar (`src/containers/Sidebar.tsx`)

- Added "Team" menu item with TeamOutlined icon
- Internationalization support: `menu_item.team`

### ProjectDashboard (`src/containers/projects/ProjectDashboard.tsx`)

- Added "Collaborators" tab
- Integrated ProjectCollaborators component
- Passes `projectId` and `apiManager` props

## API Endpoints Required

The frontend expects these backend endpoints:

### User Management

```
GET    /user/users/                      - List all users
POST   /user/users/create                - Create new user
POST   /user/users/:id/role              - Update user role
POST   /user/users/:id/delete            - Delete user
```

### Project Collaborators

```
GET    /user/projects/:projectId/collaborators              - Get project collaborators
POST   /user/projects/:projectId/collaborators              - Add collaborator
POST   /user/projects/:projectId/collaborators/:userId/remove - Remove collaborator
```

## API Request/Response Format

### Create User

**Request:**

```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secure_password",
    "role": "developer"
}
```

**Response:**

```json
{
    "status": 200,
    "data": {
        "user": {
            "id": "user_123",
            "username": "john_doe",
            "email": "john@example.com",
            "role": "developer",
            "createdAt": "2026-01-10T12:00:00Z"
        }
    }
}
```

### List Users

**Response:**

```json
{
    "status": 200,
    "data": {
        "users": [
            {
                "id": "user_123",
                "username": "john_doe",
                "email": "john@example.com",
                "role": "developer",
                "createdAt": "2026-01-10T12:00:00Z",
                "lastLogin": "2026-01-10T14:30:00Z"
            }
        ]
    }
}
```

### Update Role

**Request:**

```json
{
    "role": "admin"
}
```

### Add Collaborator

**Request:**

```json
{
    "userId": "user_123",
    "role": "developer"
}
```

**Response:**

```json
{
    "status": 200,
    "data": {
        "collaborator": {
            "userId": "user_123",
            "username": "john_doe",
            "email": "john@example.com",
            "role": "developer",
            "addedAt": "2026-01-10T15:00:00Z"
        }
    }
}
```

## User Roles

### SUPER_ADMIN (Red)

- Full system access
- Can manage all users
- Can manage all projects
- Can modify system settings

### ADMIN (Orange)

- Project-level administration
- Can manage project collaborators
- Can deploy services
- Can modify project settings

### DEVELOPER (Blue)

- Can deploy services
- Can view logs
- Can modify environment variables
- Cannot delete projects

### VIEWER (Green)

- Read-only access
- Can view project details
- Can view logs
- Cannot make changes

## Internationalization Keys

Add these keys to your language files:

```javascript
{
  "menu_item.team": "Team",
  "team.title": "Team Management",
  "team.description": "Manage team members and their access levels",
  "team.add_member": "Add Team Member",
  "team.column.username": "Username",
  "team.column.email": "Email",
  "team.column.role": "Role",
  "team.column.last_login": "Last Login",
  "team.column.created": "Created",
  "team.column.actions": "Actions",
  "team.role.super_admin": "Super Admin",
  "team.role.admin": "Admin",
  "team.role.developer": "Developer",
  "team.role.viewer": "Viewer",
  "team.edit_role": "Edit Role",
  "team.delete": "Delete",
  "team.delete_confirm": "Are you sure you want to delete this user?",
  "team.create": "Create",
  "team.update": "Update",
  "team.never": "Never",
  "team.total_users": "Total ${total} users",
  "team.form.username": "Username",
  "team.form.email": "Email",
  "team.form.password": "Password",
  "team.form.role": "Role",
  "team.form.username_placeholder": "Enter username",
  "team.form.email_placeholder": "Enter email",
  "team.form.password_placeholder": "Enter password",
  "team.load_error": "Failed to load users",
  "team.create_error": "Failed to create user",
  "team.update_error": "Failed to update role",
  "team.delete_error": "Failed to delete user",
  "team.user_created": "User created successfully",
  "team.role_updated": "User role updated",
  "team.user_deleted": "User deleted",
  "team.validation_error": "Please fill in all required fields",
  "collaborators.title": "Project Collaborators",
  "collaborators.description": "Manage who can access this project",
  "collaborators.add": "Add Collaborator",
  "collaborators.column.user": "User",
  "collaborators.column.role": "Role",
  "collaborators.column.added": "Added",
  "collaborators.column.actions": "Actions",
  "collaborators.remove": "Remove",
  "collaborators.remove_confirm": "Remove this collaborator?",
  "collaborators.role.admin": "Admin",
  "collaborators.role.developer": "Developer",
  "collaborators.role.viewer": "Viewer",
  "collaborators.form.user": "User",
  "collaborators.form.role": "Role",
  "collaborators.form.search_users": "Search users...",
  "collaborators.load_error": "Failed to load collaborators",
  "collaborators.users_error": "Failed to load users",
  "collaborators.add_error": "Failed to add collaborator",
  "collaborators.remove_error": "Failed to remove collaborator",
  "collaborators.added": "Collaborator added successfully",
  "collaborators.removed": "Collaborator removed",
  "collaborators.select_user": "Please select a user",
  "common.yes": "Yes",
  "common.no": "No",
  "common.cancel": "Cancel"
}
```

## Usage

### Accessing Team Management

1. Click "Team" in the sidebar navigation
2. View all users in the system
3. Add new team members using the "Add Team Member" button
4. Edit roles or delete users using the action buttons

### Managing Project Collaborators

1. Navigate to any project
2. Click the "Collaborators" tab
3. Add collaborators using the "Add Collaborator" button
4. Remove collaborators using the remove button

## Security Considerations

1. **Role Validation**: Backend must validate that only SUPER_ADMIN users can access `/user/users/` endpoints
2. **Project Access**: Verify user has permission to manage collaborators before allowing changes
3. **Password Security**: Passwords should be hashed on the backend
4. **Session Management**: Implement proper session timeout and token refresh
5. **Audit Logging**: Log all user and permission changes for security auditing

## Testing Checklist

- [ ] Create new user with all roles
- [ ] Update user role
- [ ] Delete user
- [ ] Filter users by role
- [ ] Sort users by different columns
- [ ] Search for users in collaborator dropdown
- [ ] Add collaborator to project
- [ ] Remove collaborator from project
- [ ] Verify responsive design on mobile
- [ ] Test dark theme compatibility
- [ ] Verify internationalization keys
- [ ] Test error handling for API failures
- [ ] Verify permission validation

## Future Enhancements

- User profile editing
- Password reset functionality
- Bulk user import
- User activity logs
- Permission granularity (specific service access)
- Team groups/organizations
- Email invitations
- Two-factor authentication integration
- User status (active/inactive/suspended)
- Last activity tracking

## File Structure

```
railoover-frontend/src/
├── models/
│   └── UserDefinition.ts                          (NEW)
├── containers/
│   ├── team/
│   │   └── TeamManagement.tsx                     (NEW)
│   ├── projects/
│   │   ├── ProjectCollaborators.tsx               (NEW)
│   │   └── ProjectDashboard.tsx                   (MODIFIED)
│   ├── PageRoot.tsx                               (MODIFIED)
│   └── Sidebar.tsx                                (MODIFIED)
└── styles/
    └── team-management.css                        (NEW)
```

## Dependencies

All components use existing dependencies:

- React 18
- Ant Design 5
- TypeScript
- React Router

No additional package installation required.

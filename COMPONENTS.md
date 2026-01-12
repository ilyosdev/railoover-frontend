# Frontend Components Documentation

> Comprehensive component documentation for Railover Frontend (Railway-like UX)

## Table of Contents

- [Technology Stack](#technology-stack)
- [Component Architecture](#component-architecture)
- [Core Components](#core-components)
- [Container Components](#container-components)
- [Planned Railway-like Components](#planned-railway-like-components)
- [Props Interfaces](#props-interfaces)
- [Component Hierarchy](#component-hierarchy)
- [Usage Examples](#usage-examples)

---

## Technology Stack

- **Framework**: React 18
- **UI Library**: Ant Design 5
- **State Management**: Redux Toolkit
- **Routing**: React Router 5
- **Build Tool**: Create React App + CRACO
- **Language**: TypeScript
- **HTTP Client**: Axios (via ApiManager)

---

## Component Architecture

### Folder Structure

```
src/
├── components/          # Reusable UI components
│   └── ProjectSelector.tsx
├── containers/          # Page-level & complex components
│   ├── global/         # Global utilities
│   ├── apps/           # App management
│   ├── monitoring/     # Monitoring & logs
│   ├── settings/       # Settings pages
│   ├── nodes/          # Cluster management
│   └── maintenance/    # System maintenance
├── models/             # TypeScript interfaces
├── redux/              # Redux store & slices
└── utils/              # Utility functions
```

### Component Types

1. **Container Components**: Smart components with state and API calls
2. **Presentational Components**: Pure UI components
3. **Page Components**: Top-level route components
4. **Global Components**: Shared utilities (ApiComponent, CenteredSpinner, etc.)

---

## Core Components

### ApiComponent

**Path**: `src/containers/global/ApiComponent.tsx`

**Description**: Base class for components that make API calls

**Usage**:

```tsx
export default class MyComponent extends ApiComponent<Props, State> {
    // Access this.apiManager for API calls
}
```

**Features**:

- Provides `apiManager` instance
- Automatic error handling
- Loading state management

---

### CenteredSpinner

**Path**: `src/containers/global/CenteredSpinner.tsx`

**Description**: Loading spinner centered on screen

**Usage**:

```tsx
import CenteredSpinner from '../global/CenteredSpinner'

{
    isLoading && <CenteredSpinner />
}
```

---

### ErrorRetry

**Path**: `src/containers/global/ErrorRetry.tsx`

**Description**: Error message with retry button

**Usage**:

```tsx
import ErrorRetry from '../global/ErrorRetry'

{
    hasError && <ErrorRetry />
}
```

---

### ClickableLink

**Path**: `src/containers/global/ClickableLink.tsx`

**Description**: Clickable external link component

**Usage**:

```tsx
import ClickableLink from '../global/ClickableLink'

;<ClickableLink url="https://example.com">Visit Site</ClickableLink>
```

---

### CodeEdit

**Path**: `src/containers/global/CodeEdit.tsx`

**Description**: Code editor component (JSON, YAML, etc.)

**Props**:

```tsx
interface CodeEditProps {
    value: string
    onChange: (value: string) => void
    mode?: 'json' | 'yaml' | 'javascript'
    readOnly?: boolean
}
```

**Usage**:

```tsx
<CodeEdit value={jsonContent} onChange={setJsonContent} mode="json" />
```

---

### ProjectSelector

**Path**: `src/components/ProjectSelector.tsx`

**Description**: Dropdown to select a project

**Props**:

```tsx
interface ProjectSelectorProps {
    projects: ProjectDefinition[]
    selectedProjectId: string
    onProjectChange: (projectId: string) => void
}
```

**Usage**:

```tsx
<ProjectSelector
    projects={allProjects}
    selectedProjectId={currentProjectId}
    onProjectChange={(id) => setCurrentProjectId(id)}
/>
```

---

## Container Components

### Apps List

**Path**: `src/containers/apps/Apps.tsx`

**Description**: Main apps listing page

**State**:

```tsx
{
    isLoading: boolean
    apiData: {
        apps: {
            appDefinitions: IAppDef[]
            defaultNginxConfig: string
            rootDomain: string
        }
        projects: ProjectDefinition[]
    }
    showCreateAppForm: boolean
}
```

**Features**:

- Lists all apps
- Create new app
- Filter by project
- View app details

**Screenshot Description**:

- Table showing app names, status, versions
- "Create New App" button
- Search/filter options

---

### AppsTable

**Path**: `src/containers/apps/AppsTable.tsx`

**Description**: Table component displaying apps with actions

**Props**:

```tsx
{
    apps: IAppDef[]
    projects: ProjectDefinition[]
    rootDomain: string
    onReloadRequested: () => void
}
```

**Columns**:

- App Name
- Project
- Status (Running/Building)
- Latest Version
- Domain
- Actions (Edit, Delete, View)

**Usage**:

```tsx
<AppsTable
    apps={appDefinitions}
    projects={projects}
    rootDomain="captain.example.com"
    onReloadRequested={refetchData}
/>
```

---

### CreateNewApp

**Path**: `src/containers/apps/CreateNewApp.tsx`

**Description**: Form to create a new app/service

**Props**:

```tsx
interface MyProps {
    projects: ProjectDefinition[]
    onCreate: (
        appName: string,
        projectId: string,
        hasPersistentData: boolean
    ) => void
}
```

**Form Fields**:

- App Name (lowercase alphanumeric + hyphens)
- Project (dropdown)
- Has Persistent Data (checkbox)

**Validation**:

- App name: `/^[a-z0-9-]+$/`
- Max length: 50 characters
- No special characters

**Usage**:

```tsx
<CreateNewApp
    projects={allProjects}
    onCreate={(name, projectId, persistent) => {
        apiManager.registerNewApp(name, projectId, persistent)
    }}
/>
```

---

### AppDetails

**Path**: `src/containers/apps/appDetails/AppDetails.tsx`

**Description**: App detail page with tabs

**Route**: `/apps/details/:appName`

**Props Interface**:

```tsx
export interface AppDetailsTabProps {
    apiData: {
        appDefinition: IAppDef
        rootDomain: string
        defaultNginxConfig: string
    }
    apiManager: any
    onReloadRequested: () => void
    updateApiData: (data: any) => void
}

interface PropsInterface extends RouteComponentProps<any> {
    // Injected by router
}
```

**Tabs**:

1. **Deployment** - Deploy from Git, tarball, or Docker image
2. **App Configs** - Environment variables, ports, volumes
3. **HTTP Settings** - Custom domains, SSL, nginx config
4. **Logs** - Runtime logs

**Usage**:

```tsx
// Navigated via React Router
<Route path="/apps/details/:appName" component={AppDetails} />
```

---

### AppConfigs

**Path**: `src/containers/apps/appDetails/AppConfigs.tsx`

**Description**: Configure app settings (env vars, ports, volumes, etc.)

**Props**: `AppDetailsTabProps`

**Sections**:

1. **Environment Variables**
    - Add/edit/delete key-value pairs
    - Bulk import from JSON
2. **Port Mapping**
    - Container port → Host port
    - TCP/UDP protocol
3. **Persistent Directories**
    - Volume mounts
    - Path mappings
4. **Instance Count**
    - Horizontal scaling
5. **Service Type** (NEW)
    - Frontend, Backend, Database, Worker, Cron

**Usage**:

```tsx
<AppConfigs
    apiData={appData}
    apiManager={apiManager}
    onReloadRequested={refetch}
    updateApiData={updateData}
/>
```

---

### Deployment

**Path**: `src/containers/apps/appDetails/deploy/Deployment.tsx`

**Description**: App deployment tab with multiple deployment methods

**Props**: `AppDetailsTabProps`

**Deployment Methods**:

1. **Git Repository**
    - Repo URL, branch, credentials
    - Auto-deploy on push
2. **Tarball Upload**
    - Upload `.tar` file
3. **Plain Dockerfile**
    - Paste Dockerfile content
4. **Image Name**
    - Deploy from Docker Hub/Registry
5. **Captain Definition**
    - JSON-based config

**Features**:

- Build logs (real-time)
- Version history
- Rollback to previous version

---

### GitRepoForm

**Path**: `src/containers/apps/appDetails/deploy/GitRepoForm.tsx`

**Description**: Form to configure Git repository deployment

**Fields**:

```tsx
{
    repo: string          // Git URL
    branch: string        // Branch name
    user: string          // Git username
    password: string      // Token/password
    sshKey?: string       // SSH key (optional)
}
```

**Usage**:

```tsx
<GitRepoForm
    apiData={appData}
    onDeploy={(repoInfo) => {
        apiManager.deployGitRepo(appName, repoInfo)
    }}
/>
```

---

### BuildLogsView

**Path**: `src/containers/apps/appDetails/deploy/BuildLogsView.tsx`

**Description**: Display build logs in real-time

**Features**:

- Auto-scroll to bottom
- Color-coded logs (error, warning, success)
- Copy logs button
- Download logs

**Usage**:

```tsx
<BuildLogsView
    appName="my-api"
    buildLogs="Step 1/5: FROM node:18\nStep 2/5: WORKDIR /app\n..."
/>
```

---

### AppLogsView

**Path**: `src/containers/apps/appDetails/deploy/AppLogsView.tsx`

**Description**: Display application runtime logs

**Features**:

- Real-time log streaming
- Filter by log level
- Search logs
- Export logs

**Usage**:

```tsx
<AppLogsView
    appName="my-api"
    logs="[2026-01-06 10:00:00] Server started\n[2026-01-06 10:00:01] Connected to DB"
/>
```

---

### AppVersionTable

**Path**: `src/containers/apps/appDetails/deploy/AppVersionTable.tsx`

**Description**: Table showing app deployment history

**Columns**:

- Version #
- Git Hash
- Deployed At
- Status
- Actions (Rollback)

**Usage**:

```tsx
<AppVersionTable
    versions={appDefinition.versions}
    onRollback={(version) => apiManager.rollbackToVersion(appName, version)}
/>
```

---

### HttpSettings

**Path**: `src/containers/apps/appDetails/HttpSettings.tsx`

**Description**: Configure HTTP/HTTPS settings

**Features**:

1. **Default Domain**
    - `appname.captain.example.com`
    - Enable SSL
2. **Custom Domains**
    - Add/remove domains
    - Enable Let's Encrypt SSL
3. **Force HTTPS**
4. **WebSocket Support**
5. **Custom NGINX Config**

**Usage**:

```tsx
<HttpSettings
    apiData={appData}
    apiManager={apiManager}
    onReloadRequested={refetch}
/>
```

---

### Dashboard

**Path**: `src/containers/Dashboard.tsx`

**Description**: Main dashboard page

**Features**:

- System overview
- Quick stats (apps count, deployments, etc.)
- Recent activity
- Quick actions

---

### Monitoring

**Path**: `src/containers/monitoring/Monitoring.tsx`

**Description**: System monitoring page

**Tabs**:

1. **NetData** - Server metrics
2. **GoAccess** - Web server logs
3. **Load Balancer Stats** - NGINX stats

---

### Settings

**Path**: `src/containers/settings/Settings.tsx`

**Description**: System settings page

**Sections**:

1. **Change Password**
2. **Pro Features** (OTP, API keys)
3. **Theme Settings**
4. **NGINX Config**

---

## Planned Railway-like Components

Based on the migration plan (`RAILWAY_MIGRATION_PLAN.md`), these components are planned:

### ProjectDashboard

**Path**: `src/containers/projects/ProjectDashboard.tsx` (NEW)

**Route**: `/projects/:projectId`

**Description**: Unified project view with all services

**Props**:

```tsx
interface ProjectDashboardProps
    extends RouteComponentProps<{ projectId: string }> {
    // Router props
}
```

**State**:

```tsx
{
    project: ProjectDefinition
    services: IAppDef[]
    isLoading: boolean
}
```

**Tabs**:

1. **Overview** - All services in project
2. **Environment** - Project-level env vars
3. **Deployments** - All service deployments
4. **Settings** - GitHub integration, etc.

**Mockup**:

```tsx
<div className="project-dashboard">
    <h1>{project.name}</h1>
    <p>{project.description}</p>

    <Tabs>
        <TabPane key="overview">
            <ServicesOverview services={services} projectId={projectId} />
        </TabPane>
        <TabPane key="environment">
            <ProjectEnvironment projectId={projectId} />
        </TabPane>
        <TabPane key="deployments">
            <DeploymentHistory projectId={projectId} />
        </TabPane>
        <TabPane key="settings">
            <ProjectSettings project={project} />
        </TabPane>
    </Tabs>
</div>
```

---

### ServicesOverview

**Path**: `src/containers/projects/ServicesOverview.tsx` (NEW)

**Description**: Display all services grouped by type

**Props**:

```tsx
interface ServicesOverviewProps {
    services: IAppDef[]
    projectId: string
}
```

**Layout**:

```
┌─ Frontend Services ─────────────────┐
│  [Frontend Card 1] [Frontend Card 2] │
└─────────────────────────────────────┘

┌─ Backend Services ──────────────────┐
│  [Backend Card 1]  [Backend Card 2]  │
└─────────────────────────────────────┘

┌─ Database Services ─────────────────┐
│  [PostgreSQL]  [Redis]               │
└─────────────────────────────────────┘

┌─ Worker Services ───────────────────┐
│  [Worker Card 1]                     │
└─────────────────────────────────────┘
```

**Usage**:

```tsx
<ServicesOverview services={allServices} projectId="proj-123" />
```

---

### ServiceCard

**Path**: `src/containers/projects/ServiceCard.tsx` (NEW)

**Description**: Card displaying service info

**Props**:

```tsx
interface ServiceCardProps {
    service: IAppDef
    color: string // Service type color
}
```

**Display**:

- Service name
- Service type icon
- Status badge (Running/Building/Stopped)
- Last deployed time
- Click to view details

**Styling**:

```css
.service-card {
  border-left: 4px solid {color};
  background: #1a1a1a;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 91, 255, 0.2);
}
```

**Usage**:

```tsx
<ServiceCard
    service={appDefinition}
    color="#3b82f6" // Backend color
/>
```

---

### AddServiceModal

**Path**: `src/containers/projects/AddServiceModal.tsx` (NEW)

**Description**: Modal wizard to add new service

**Props**:

```tsx
interface AddServiceModalProps {
    visible: boolean
    onCancel: () => void
    projectId: string
}
```

**Steps**:

1. **Choose Service Type**
    - Frontend (React, Vue, Static)
    - Backend (Node.js, Python, Go)
    - Database (Postgres, MySQL, Redis, MongoDB)
    - Worker (Background jobs)
2. **Configure Service**
    - Service name
    - Display name
    - Initial config (for databases: version, password, etc.)

**Usage**:

```tsx
<AddServiceModal
    visible={showModal}
    onCancel={() => setShowModal(false)}
    projectId="proj-123"
/>
```

---

### DatabaseQuickCreate

**Path**: `src/containers/projects/DatabaseQuickCreate.tsx` (NEW)

**Description**: Quick database creation form

**Props**:

```tsx
interface DatabaseQuickCreateProps {
    projectId: string
    onSuccess: () => void
}
```

**Database Types**:

1. **PostgreSQL**
    - Version: 16, 15, 14
    - Auto-generates password
2. **MySQL**
    - Version: 8.0, 5.7
3. **Redis**
    - Version: 7, 6
4. **MongoDB**
    - Version: 7, 6

**Features**:

- One-click deployment
- Auto-generates secure password
- Returns connection string
- Auto-adds to project

**Usage**:

```tsx
<DatabaseQuickCreate
    projectId="proj-123"
    onSuccess={() => {
        refetchServices()
        toast.success('Database created!')
    }}
/>
```

---

### ProjectEnvironment

**Path**: `src/containers/projects/ProjectEnvironment.tsx` (NEW)

**Description**: Manage project-level environment variables

**Props**:

```tsx
interface ProjectEnvironmentProps {
    projectId: string
}
```

**Sections**:

1. **Project-Level Variables**
    - Shared across all services
    - Add/edit/delete
2. **Service-Level Variables** (per service)
    - Expand/collapse per service
    - Show inherited vars (read-only)
    - Add service-specific vars (override)

**Hierarchy Display**:

```
Project Vars (inherited by all):
  NODE_ENV = production
  API_BASE_URL = https://api.example.com

Service: backend
  Inherited:
    NODE_ENV = production (from project)
    API_BASE_URL = https://api.example.com (from project)
  Service-specific:
    DATABASE_URL = postgresql://... (overrides project if exists)
    PORT = 3000
```

**Usage**:

```tsx
<ProjectEnvironment projectId="proj-123" />
```

---

### DeploymentHistory

**Path**: `src/containers/projects/DeploymentHistory.tsx` (NEW)

**Description**: Show all deployments across all services in project

**Props**:

```tsx
interface DeploymentHistoryProps {
    projectId: string
}
```

**Display**:

- Timeline view
- Filter by service
- Filter by status (success, failed, in-progress)
- Deployment logs
- Git commit info

**Timeline**:

```
2026-01-06 10:30 - frontend - Deployed v12 (abc123) ✓
2026-01-06 10:25 - backend - Deployed v8 (def456) ✓
2026-01-06 10:20 - worker - Deployment failed ✗
2026-01-06 09:15 - frontend - Deployed v11 (xyz789) ✓
```

---

### ServiceConnections

**Path**: `src/containers/projects/ServiceConnections.tsx` (NEW)

**Description**: Visual service dependency graph

**Props**:

```tsx
interface ServiceConnectionsProps {
    services: IAppDef[]
}
```

**Visualization**:

```
[Frontend] ──→ [Backend] ──→ [PostgreSQL]
                  ↓
               [Redis]
                  ↓
               [Worker]
```

**Features**:

- Click to add/remove connections
- Auto-inject connection env vars
- Visual flow diagram

**Technology**: React Flow or custom SVG

---

## Props Interfaces

### ProjectDefinition

**Path**: `src/models/ProjectDefinition.ts`

```tsx
interface ProjectDefinition {
    id: string
    name: string
    description: string
    parentProjectId?: string
}
```

**Enhanced** (Migration):

```tsx
interface ProjectDefinition {
    id: string
    name: string
    description: string
    parentProjectId?: string
    githubIntegration?: GitHubIntegration
    sharedEnvVars?: IAppEnvVar[]
    services?: ServiceReference[]
    createdAt?: string
    updatedAt?: string
}

interface GitHubIntegration {
    repo: string
    branch: string
    installationId?: string
    autoDeployEnabled: boolean
}

interface ServiceReference {
    appName: string
    serviceType: 'frontend' | 'backend' | 'database' | 'worker' | 'cron'
    displayName: string
    githubPath?: string
    connections?: string[]
    order?: number
}
```

---

### IAppDef

**Path**: `src/containers/apps/AppDefinition.ts`

```tsx
interface IAppDef {
    appName: string
    projectId?: string
    description: string
    hasPersistentData: boolean
    notExposeAsWebApp: boolean
    hasDefaultSubDomainSsl: boolean
    containerHttpPort?: number
    instanceCount: number
    envVars: IAppEnvVar[]
    volumes: IAppVolume[]
    ports: IAppPort[]
    customDomain: IAppCustomDomain[]
    versions: IAppVersion[]
    deployedVersion: number
    isAppBuilding: boolean

    // NEW (Railway-like)
    serviceType?: 'frontend' | 'backend' | 'database' | 'worker' | 'cron'
    displayName?: string
    githubPath?: string
    connectedServices?: string[]
}

interface IAppEnvVar {
    key: string
    value: string
}

interface IAppVolume {
    containerPath: string
    volumeName?: string
    hostPath?: string
}

interface IAppPort {
    containerPort: number
    hostPort: number
    protocol?: 'tcp' | 'udp'
}

interface IAppVersion {
    version: number
    deployedImageName?: string
    timeStamp: string
    gitHash: string | undefined
}
```

---

## Component Hierarchy

```
App.tsx
└── PageRoot.tsx (Router)
    ├── Login.tsx
    └── LoggedInCatchAll.tsx (Authenticated routes)
        ├── Sidebar.tsx
        └── Routes:
            ├── Dashboard.tsx
            ├── Apps.tsx
            │   ├── CreateNewApp.tsx
            │   └── AppsTable.tsx
            ├── AppDetails.tsx
            │   ├── Deployment.tsx
            │   │   ├── GitRepoForm.tsx
            │   │   ├── TarUploader.tsx
            │   │   ├── BuildLogsView.tsx
            │   │   └── AppVersionTable.tsx
            │   ├── AppConfigs.tsx
            │   ├── HttpSettings.tsx
            │   └── LogsTab.tsx
            │       └── AppLogsView.tsx
            ├── Monitoring.tsx
            │   ├── NetDataInfo.tsx
            │   ├── GoAccessInfo.tsx
            │   └── LoadBalancerStats.tsx
            ├── Settings.tsx
            │   ├── ChangePass.tsx
            │   ├── ProFeatures.tsx
            │   ├── ThemeSettings.tsx
            │   └── NginxConfig.tsx
            ├── Nodes.tsx (Cluster management)
            └── Maintenance.tsx
```

**Planned** (Railway-like):

```
LoggedInCatchAll.tsx
└── Routes:
    ├── ProjectsList.tsx (NEW)
    └── ProjectDashboard.tsx (NEW)
        ├── ServicesOverview.tsx (NEW)
        │   └── ServiceCard.tsx (NEW)
        ├── ProjectEnvironment.tsx (NEW)
        ├── DeploymentHistory.tsx (NEW)
        └── ProjectSettings.tsx (NEW)
```

---

## Usage Examples

### Example 1: Create New App

```tsx
import CreateNewApp from './CreateNewApp'

const MyComponent = () => {
    const [projects, setProjects] = useState<ProjectDefinition[]>([])

    const handleCreateApp = (
        name: string,
        projectId: string,
        persistent: boolean
    ) => {
        apiManager
            .registerNewApp(name, projectId, persistent, true)
            .then(() => {
                toast.success('App created!')
                refetchApps()
            })
            .catch((err) => {
                toast.error(err.message)
            })
    }

    return <CreateNewApp projects={projects} onCreate={handleCreateApp} />
}
```

---

### Example 2: Deploy App from Git

```tsx
import GitRepoForm from './appDetails/deploy/GitRepoForm'

const DeploymentTab = ({ appName }: { appName: string }) => {
    const handleDeploy = (repoInfo: RepoInfo) => {
        apiManager.deployFromGit(appName, repoInfo).then(() => {
            toast.success('Deployment started!')
        })
    }

    return <GitRepoForm apiData={appData} onDeploy={handleDeploy} />
}
```

---

### Example 3: Manage Environment Variables

```tsx
const EnvVarManager = ({ appName }: { appName: string }) => {
    const [envVars, setEnvVars] = useState<IAppEnvVar[]>([])

    const addEnvVar = (key: string, value: string) => {
        const updated = [...envVars, { key, value }]
        setEnvVars(updated)

        apiManager
            .updateApp(appName, { envVars: updated })
            .then(() => toast.success('Env var added!'))
    }

    return (
        <div>
            {envVars.map((env, idx) => (
                <div key={idx}>
                    <Input value={env.key} disabled />
                    <Input value={env.value} />
                </div>
            ))}
            <Button onClick={() => addEnvVar('NEW_KEY', 'value')}>
                Add Variable
            </Button>
        </div>
    )
}
```

---

### Example 4: Project Dashboard (Planned)

```tsx
import { useParams } from 'react-router'
import ProjectDashboard from './projects/ProjectDashboard'

// Route: /projects/:projectId
const ProjectPage = () => {
    const { projectId } = useParams<{ projectId: string }>()

    return <ProjectDashboard projectId={projectId} />
}
```

---

## Styling Approach

### Current Theme

- **Ant Design 5** default theme
- Light/Dark mode toggle
- Custom CSS in component files

### Planned Railway-like Theme

```css
/* Railway-inspired dark theme */
:root {
    --primary: #4f5bff;
    --bg-primary: #0a0a0a;
    --bg-secondary: #1a1a1a;
    --border: #2a2a2a;

    --frontend: #8b5cf6;
    --backend: #3b82f6;
    --database: #10b981;
    --worker: #f59e0b;
    --cron: #ef4444;
}

.service-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s;
}

.service-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
}
```

---

## Additional Resources

- **Source Code**: `/Users/mac/Documents/my-products/railoover-frontend/src/`
- **Models**: `/Users/mac/Documents/my-products/railoover-frontend/src/models/`
- **Migration Plan**: `/Users/mac/Documents/my-products/railover/RAILWAY_MIGRATION_PLAN.md`
- **Ant Design Docs**: https://ant.design/components/overview/

---

**Last Updated**: January 6, 2026

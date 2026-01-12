# Integration Guide - Service Management Components

## Quick Start

### Using AddServiceModal in Your Component

```typescript
import AddServiceModal from './AddServiceModal'

// In your component state
state = {
    showAddServiceModal: false
}

// In your render method
<>
    <Button onClick={() => this.setState({ showAddServiceModal: true })}>
        Add Service
    </Button>
    
    <AddServiceModal
        visible={this.state.showAddServiceModal}
        onCancel={() => this.setState({ showAddServiceModal: false })}
        projectId={this.props.projectId}
        onSuccess={() => {
            this.setState({ showAddServiceModal: false })
            this.reFetchData() // Reload your data
        }}
    />
</>
```

---

## Component Props Reference

### AddServiceModal

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | Yes | Controls modal visibility |
| `onCancel` | `() => void` | Yes | Called when user cancels/closes modal |
| `projectId` | `string` | Yes | Project ID to add service to |
| `onSuccess` | `() => void` | Yes | Called after successful service creation |

**Example**:
```typescript
<AddServiceModal
    visible={true}
    onCancel={() => console.log('Cancelled')}
    projectId="my-project"
    onSuccess={() => console.log('Service created!')}
/>
```

---

### DatabaseQuickCreate

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID for database service |
| `onSuccess` | `() => void` | Yes | Called after database creation |
| `onCancel` | `() => void` | Yes | Called when user goes back |

**Example**:
```typescript
<DatabaseQuickCreate
    projectId="my-project"
    onSuccess={() => console.log('DB created')}
    onCancel={() => console.log('User went back')}
/>
```

**Note**: This component is typically rendered within `AddServiceModal`, not directly.

---

### ServiceConfiguration

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID for service |
| `serviceType` | `'frontend' \| 'backend' \| 'worker'` | Yes | Type of service being configured |
| `onSuccess` | `() => void` | Yes | Called after service creation |
| `onCancel` | `() => void` | Yes | Called when user goes back |

**Example**:
```typescript
<ServiceConfiguration
    projectId="my-project"
    serviceType="frontend"
    onSuccess={() => console.log('Service configured')}
    onCancel={() => console.log('User went back')}
/>
```

**Note**: This component is typically rendered within `AddServiceModal`, not directly.

---

## API Integration

### Required API Methods

Your `ApiComponent` or `ApiManager` must provide these methods:

#### 1. registerNewApp
```typescript
registerNewApp(
    appName: string,
    projectId: string,
    hasPersistentData: boolean,
    detectPort: boolean
): Promise<void>
```

#### 2. getAllApps
```typescript
getAllApps(): Promise<{
    appDefinitions: IAppDef[]
}>
```

#### 3. updateConfigAndSave
```typescript
updateConfigAndSave(
    appName: string,
    config: {
        envVars?: IAppEnvVar[]
        instanceCount?: number
        containerHttpPort?: number
        notExposeAsWebApp?: boolean
    }
): Promise<void>
```

#### 4. uploadCaptainDefinitionContent
```typescript
uploadCaptainDefinitionContent(
    appName: string,
    captainDefinition: string,
    gitHash: string,
    detectedFromGit: boolean
): Promise<void>
```

#### 5. enableSslForApp
```typescript
enableSslForApp(appName: string): Promise<void>
```

---

## Data Flow Diagram

```
User Clicks "Add Service"
         ↓
  AddServiceModal Opens
         ↓
  Step 1: Choose Service Type
    ├── Frontend → ServiceConfiguration
    ├── Backend → ServiceConfiguration
    ├── Worker → ServiceConfiguration
    └── Database → DatabaseQuickCreate
         ↓
  Step 2: Configure Service
    ├── DatabaseQuickCreate:
    │   1. Select DB type & version
    │   2. Enter service name
    │   3. Create → API calls
    │   4. Show credentials
    │   └── onSuccess() → Close modal
    │
    └── ServiceConfiguration:
        1. Enter GitHub repo
        2. Configure port & env vars
        3. Create → API calls
        └── onSuccess() → Close modal
         ↓
  Parent Component Reloads Data
```

---

## Database Creation Flow

```typescript
// Simplified flow in DatabaseQuickCreate

1. User selects database type (e.g., PostgreSQL)
   └── Auto-populates: version, service name, port

2. User clicks "Create Database"
   └── Validation: checks service name, type selected

3. API Sequence:
   a) registerNewApp(serviceName, projectId, true, true)
      └── Creates app with persistent data flag
   
   b) getAllApps()
      └── Verifies app was created
   
   c) updateConfigAndSave(serviceName, {
        envVars: [
          { key: 'POSTGRES_PASSWORD', value: 'generated-password' },
          { key: 'POSTGRES_USER', value: 'postgres' },
          { key: 'POSTGRES_DB', value: 'main' }
        ],
        instanceCount: 1,
        notExposeAsWebApp: true
      })
      └── Configures database settings
   
   d) uploadCaptainDefinitionContent(serviceName, {
        schemaVersion: 2,
        dockerfileLines: ['FROM postgres:17-alpine']
      }, '', true)
      └── Deploys database container

4. Show Credentials Modal
   └── Displays connection string, host, port, username, password

5. User clicks "Done"
   └── Calls onSuccess() → Parent reloads service list
```

---

## Service Configuration Flow

```typescript
// Simplified flow in ServiceConfiguration

1. User enters service details:
   - Service name (validated: lowercase, alphanumeric, hyphens)
   - GitHub repo (required)
   - Branch (default: 'main')
   - Container port (if not worker)
   - Environment variables (optional)

2. User clicks "Create Service"
   └── Validation runs:
       - Service name format
       - GitHub repo not empty
       - No duplicate env var keys

3. API Sequence:
   a) registerNewApp(serviceName, projectId, false, true)
      └── Creates app without persistent data
   
   b) updateConfigAndSave(serviceName, {
        envVars: filteredEnvVars,
        instanceCount: 1,
        containerHttpPort: port,
        notExposeAsWebApp: serviceType === 'worker'
      })
      └── Configures service settings
   
   c) enableSslForApp(serviceName)
      └── Enables HTTPS

4. Success Message
   └── Shows "Service created successfully!"

5. Calls onSuccess()
   └── Parent reloads service list
```

---

## Error Handling

### User-Facing Errors

All errors are displayed using Ant Design's `message` component:

```typescript
// Success
message.success('Service created successfully!')

// Error
message.error('Service name is required')

// Info
message.info('Build has started')
```

### API Errors

API errors are caught and displayed automatically:

```typescript
Promise.resolve()
    .then(function() { return apiCall() })
    .catch(Toaster.createCatcher()) // Shows error message to user
    .then(function() {
        // Always runs (cleanup)
        self.setState({ isLoading: false })
    })
```

---

## Validation Rules

### Service Name
```typescript
// Must be lowercase alphanumeric with hyphens
const isValid = /^[a-z0-9-]+$/.test(serviceName)

// Examples:
✅ 'my-service'
✅ 'api-v2'
✅ 'postgres-db'
❌ 'My Service' (uppercase, spaces)
❌ 'api_v2' (underscores)
❌ '' (empty)
```

### Environment Variables
```typescript
// No duplicate keys
const hasDuplicates = envVars.some((env, index) =>
    envVars.findIndex((e, i) => i !== index && e.key === env.key) !== -1
)

// Examples:
✅ [{ key: 'API_KEY', value: 'abc' }, { key: 'DB_URL', value: 'xyz' }]
❌ [{ key: 'API_KEY', value: 'abc' }, { key: 'API_KEY', value: 'xyz' }]
```

### GitHub Repository
```typescript
// Required, any format accepted
const isValid = githubRepo.trim() !== ''

// Examples:
✅ 'username/repo'
✅ 'https://github.com/username/repo'
✅ 'https://github.com/username/repo.git'
```

---

## Styling Guide

### Color Scheme

Service types are color-coded for consistency:

```typescript
const SERVICE_COLORS = {
    frontend: '#8b5cf6',  // Purple
    backend: '#3b82f6',   // Blue
    database: '#10b981',  // Green
    worker: '#f59e0b'     // Orange
}
```

Use these colors in:
- Service type cards (left border)
- Service cards in overview
- Icon backgrounds
- Status indicators

### Spacing Standards

```typescript
// Between sections
marginBottom: 24

// Between form fields
marginBottom: 20

// Small gaps (labels to inputs)
marginBottom: 8

// Tiny gaps (helper text)
marginTop: 4
```

---

## Localization

### Adding New Translations

1. Use the `localize()` utility:
```typescript
import { localize } from '../../utils/Language'

const text = localize('projects.my_key', 'Default English Text')
```

2. Key naming convention:
```
projects.{feature}_{element}
```

Examples:
- `projects.service_name` → "Service Name"
- `projects.github_repository` → "GitHub Repository"
- `projects.create_database` → "Create Database Service"

---

## Common Pitfalls

### 1. Modal Not Closing
```typescript
// ❌ Wrong: Missing onSuccess callback
<AddServiceModal
    visible={true}
    onCancel={() => setVisible(false)}
    projectId="my-project"
    // Missing onSuccess!
/>

// ✅ Correct: Both callbacks implemented
<AddServiceModal
    visible={visible}
    onCancel={() => setVisible(false)}
    projectId="my-project"
    onSuccess={() => {
        setVisible(false)
        reloadData()
    }}
/>
```

### 2. API Methods Not Available
```typescript
// ❌ Wrong: Using non-ApiComponent base class
class MyComponent extends Component<Props, State> {
    // this.apiManager not available!
}

// ✅ Correct: Extending ApiComponent
class MyComponent extends ApiComponent<Props, State> {
    // this.apiManager is available
}
```

### 3. State Not Resetting
```typescript
// ❌ Wrong: Modal keeps old state
<Modal open={visible} onCancel={handleCancel}>
    {/* State persists between opens */}
</Modal>

// ✅ Correct: Use destroyOnClose
<Modal
    open={visible}
    onCancel={handleCancel}
    destroyOnClose // Resets state on close
>
    {/* Fresh state each time */}
</Modal>
```

---

## Testing Your Integration

### Manual Testing Checklist

- [ ] Click "Add Service" button
- [ ] Modal opens and displays service type selection
- [ ] Click each service type (Frontend, Backend, Database, Worker)
- [ ] Step indicator shows "Configuration" step
- [ ] Back button returns to service type selection
- [ ] Cancel button closes modal
- [ ] Form validation shows errors for invalid inputs
- [ ] Database creation shows credentials modal
- [ ] Success message appears after creation
- [ ] Service list refreshes with new service
- [ ] Modal resets state when reopened

### Database Creation Testing

- [ ] Select PostgreSQL → Shows versions, generates name
- [ ] Select MySQL → Shows versions, generates name
- [ ] Select Redis → Shows versions, generates name
- [ ] Select MongoDB → Shows versions, generates name
- [ ] Create database → Shows loading state
- [ ] Credentials modal appears with connection string
- [ ] Can copy credentials from modal
- [ ] "Done" button closes modals and refreshes list

### Service Configuration Testing

- [ ] Enter invalid service name → Shows error
- [ ] Leave GitHub repo empty → Shows error
- [ ] Add environment variables → Rows appear
- [ ] Delete environment variables → Rows removed
- [ ] Add duplicate env var keys → Shows error
- [ ] Create service → Shows loading state
- [ ] Success message appears
- [ ] Service appears in list

---

## Support

For issues or questions:
1. Check this integration guide first
2. Review the implementation summary: `PHASE_4B_IMPLEMENTATION_SUMMARY.md`
3. Check the Railway migration plan: `/Users/mac/Documents/my-products/railover/RAILWAY_MIGRATION_PLAN.md`
4. Examine existing working examples in `src/containers/apps/`

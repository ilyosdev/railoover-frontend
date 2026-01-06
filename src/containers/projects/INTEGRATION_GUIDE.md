# Integration Guide for Phase 5 Components

This guide shows how to integrate the new Railway-like components into your existing CapRover frontend.

---

## 1. Using DeploymentStatus in Existing Build Logs

### Option A: Replace BuildLogsView with DeploymentStatus

**In**: `src/containers/apps/appDetails/deploy/Deployment.tsx`

```tsx
// Old way
import BuildLogsView from './BuildLogsView'

// New way
import DeploymentStatus from '../../../projects/DeploymentStatus'

// In render():
;<DeploymentStatus
    appName={this.state.appName}
    isBuilding={this.state.isAppBuilding}
    buildFailed={this.state.isBuildFailed}
    initialLogs={this.state.buildLogs.split('\n')}
    onStatusChange={(status) => {
        if (status === 'success' || status === 'failed') {
            this.props.onAppBuildFinished()
        }
    }}
/>
```

### Option B: Enhance Existing BuildLogsView

**In**: `src/containers/apps/appDetails/deploy/BuildLogsView.tsx`

```tsx
import DeploymentStatus from '../../../projects/DeploymentStatus'

// In render(), replace the existing logs display:
render() {
    const logsArray = this.state.buildLogs.split('\n').filter(line => line.trim())

    return (
        <DeploymentStatus
            appName={this.props.appName}
            isBuilding={this.state.isAppBuilding}
            buildFailed={false}
            initialLogs={logsArray}
            onStatusChange={(status) => {
                if (status === 'success' || status === 'failed') {
                    this.props.onAppBuildFinished()
                }
            }}
        />
    )
}
```

---

## 2. Adding Service Connections to App Details

**In**: `src/containers/apps/appDetails/AppDetails.tsx`

```tsx
import ServiceConnectionsVisualization from '../../projects/ServiceConnections'

// Add a new tab for connections:
;<Tabs.TabPane tab="Connections" key="connections">
    <ServiceConnectionsVisualization
        services={relatedServices}
        onServiceClick={(serviceName) => {
            this.props.history.push(`/apps/details/${serviceName}`)
        }}
    />
</Tabs.TabPane>
```

---

## 3. Styling Existing Components with Railway Theme

### Apply to Any Card Component

```tsx
import '../../styles/project-dashboard.css'

// For service cards:
<Card className="service-card">
    <div className="service-card-header">
        <h3 className="service-card-title">{serviceName}</h3>
        <Badge className="deployment-status-badge success" />
    </div>
</Card>

// For logs:
<div className="build-logs-container">
    <div className="build-logs-header">
        <span>Application Logs</span>
        <Button className="copy-logs-button">Copy</Button>
    </div>
    <div className="build-logs">
        {logs.map(line => (
            <div className={`build-log-line ${getLogType(line)}`}>
                {line}
            </div>
        ))}
    </div>
</div>
```

---

## 4. Adding to Apps Table

**In**: `src/containers/apps/AppsTable.tsx`

```tsx
import '../../styles/project-dashboard.css'

// Add service type badges in the table:
{
    title: 'Type',
    key: 'type',
    render: (_, app) => {
        const type = detectServiceType(app.appName)
        const colors = {
            frontend: '#8b5cf6',
            backend: '#3b82f6',
            database: '#10b981',
            worker: '#f59e0b'
        }
        return (
            <Badge
                color={colors[type]}
                text={type}
                className="service-type-badge"
            />
        )
    }
}
```

---

## 5. Dark Mode Compatibility

All components are designed to work with Ant Design's dark mode. The CSS uses CSS custom properties that adapt to the theme:

```tsx
// The components automatically respect dark mode
// No additional configuration needed

// If you need to override colors:
<div
    style={{
        background: 'var(--railway-bg-secondary)',
        color: 'var(--railway-text-primary)',
    }}
>
    Content
</div>
```

---

## 6. Responsive Design

All components are responsive by default. The CSS includes breakpoints for mobile devices:

```css
/* Automatically applied at 768px and below */
@media (max-width: 768px) {
    .service-type-section {
        margin-bottom: 32px;
    }
    .build-logs {
        font-size: 12px;
        padding: 12px;
    }
}
```

---

## 7. Custom Service Type Colors

To add custom service types or override colors:

```tsx
// In your component:
const customColors = {
    frontend: '#8b5cf6',
    backend: '#3b82f6',
    database: '#10b981',
    worker: '#f59e0b',
    cron: '#ec4899',      // Add new type
    custom: '#ff6b6b'     // Custom color
}

<ServiceTypeSection
    title="Custom Services"
    services={customServices}
    color={customColors.custom}
/>
```

---

## 8. WebSocket Integration (Future)

When ready to add real-time logs via WebSocket:

```tsx
class DeploymentStatusWithWebSocket extends Component {
    componentDidMount() {
        const ws = new WebSocket(`ws://your-server/logs/${this.props.appName}`)

        ws.onmessage = (event) => {
            const logLine = event.data
            this.setState((prev) => ({
                logs: [...prev.logs, logLine],
            }))
        }

        ws.onerror = () => {
            message.error('Lost connection to build logs')
        }

        this.ws = ws
    }

    componentWillUnmount() {
        if (this.ws) {
            this.ws.close()
        }
    }

    render() {
        return (
            <DeploymentStatus
                appName={this.props.appName}
                isBuilding={true}
                initialLogs={this.state.logs}
            />
        )
    }
}
```

---

## 9. Syntax Highlighting Enhancement

For advanced syntax highlighting, you can extend the log detection:

```tsx
private getLogLineClass(line: string): string {
    const lowerLine = line.toLowerCase()

    // Docker commands
    if (line.startsWith('Step ') || line.includes('RUN') || line.includes('COPY')) {
        return 'info'
    }

    // npm/yarn output
    if (line.includes('npm install') || line.includes('yarn add')) {
        return 'info'
    }

    // Build completion
    if (line.includes('Successfully built') || line.includes('Successfully tagged')) {
        return 'success'
    }

    // Existing detection...
    if (lowerLine.includes('error')) return 'error'
    if (lowerLine.includes('warning')) return 'warning'

    return ''
}
```

---

## 10. Performance Optimization

For large log files, implement virtualization:

```tsx
import { FixedSizeList } from 'react-window'

// In render():
;<FixedSizeList
    height={500}
    itemCount={logs.length}
    itemSize={20}
    className="build-logs"
>
    {({ index, style }) => (
        <div
            style={style}
            className={`build-log-line ${getLogType(logs[index])}`}
        >
            {logs[index]}
        </div>
    )}
</FixedSizeList>
```

---

## 11. Testing Components

### Manual Testing Checklist

```bash
# 1. Start the development server
npm start

# 2. Navigate to a project dashboard
# URL: http://localhost:3000/projects/PROJECT_ID

# 3. Test ServiceConnections
# - Should show visual graph with multiple services
# - Click on nodes should navigate to service details
# - Hover should highlight nodes

# 4. Test DeploymentStatus
# - Should show progress bar
# - Logs should be syntax highlighted
# - Copy button should work
# - Status badges should update

# 5. Test Responsive Design
# - Resize browser window
# - Check mobile breakpoint (< 768px)
# - Verify card layouts stack properly
```

### Unit Testing Example

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import DeploymentStatus from '../DeploymentStatus'

test('displays build logs', () => {
    const logs = ['Building...', 'ERROR: Failed']

    render(
        <DeploymentStatus
            appName="test-app"
            initialLogs={logs}
            isBuilding={false}
        />
    )

    expect(screen.getByText('Building...')).toBeInTheDocument()
    expect(screen.getByText(/ERROR: Failed/)).toHaveClass('error')
})

test('copies logs to clipboard', async () => {
    const logs = ['Log line 1', 'Log line 2']

    render(<DeploymentStatus appName="test-app" initialLogs={logs} />)

    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    // Verify clipboard
    const clipboardText = await navigator.clipboard.readText()
    expect(clipboardText).toBe('Log line 1\nLog line 2')
})
```

---

## 12. Migration Path

### Gradual Migration Strategy

**Phase 1**: Add styling only

```tsx
// Just import the CSS in existing components
import '../../styles/project-dashboard.css'

// Apply classes to existing elements
;<div className="service-card">...</div>
```

**Phase 2**: Replace log views

```tsx
// Replace BuildLogsView with DeploymentStatus
// One component at a time
```

**Phase 3**: Add visualizations

```tsx
// Add ServiceConnectionsVisualization to dashboards
// Add new tabs for connections
```

**Phase 4**: Full Railway experience

```tsx
// Complete integration across all views
// Add deployment history
// Add environment variable management
```

---

## 13. Common Issues & Solutions

### Issue: CSS not applying

**Solution**: Ensure CSS is imported before using classes

```tsx
import '../../styles/project-dashboard.css' // Must be at top
```

### Issue: Service connections not showing

**Solution**: Check service count (need 2+ services)

```tsx
{
    services.length > 1 && (
        <ServiceConnectionsVisualization services={services} />
    )
}
```

### Issue: Logs not auto-scrolling

**Solution**: Ensure ref is properly set

```tsx
<div ref={(el) => (this.logsEndRef = el)} />
```

### Issue: Dark mode colors not working

**Solution**: Use CSS custom properties

```tsx
// Good
style={{ background: 'var(--railway-bg-secondary)' }}

// Bad
style={{ background: '#1a1a1a' }}
```

---

## 14. Customization Examples

### Custom Log Formatter

```tsx
private formatLogLine(line: string): string {
    // Add timestamps
    if (!line.includes('[')) {
        return `[${new Date().toISOString()}] ${line}`
    }

    // Truncate long lines
    if (line.length > 200) {
        return line.substring(0, 197) + '...'
    }

    return line
}
```

### Custom Service Node Renderer

```tsx
// Extend ServiceConnectionsVisualization
private renderNode(node: ServiceNode): JSX.Element {
    return (
        <g className={`service-node ${node.type}`}>
            {/* Add custom icon */}
            <image
                href={getServiceIcon(node.type)}
                x={node.x + 10}
                y={node.y + 10}
                width={20}
                height={20}
            />

            {/* Rest of node rendering */}
            <rect ... />
            <text ... />
        </g>
    )
}
```

---

## Summary

Phase 5 components are designed to be:

- ✅ **Drop-in replacements** for existing components
- ✅ **Gradually adoptable** (use CSS only, then components)
- ✅ **Fully compatible** with existing dark mode
- ✅ **Responsive** out of the box
- ✅ **Extensible** for future enhancements

Start with applying the CSS classes, then gradually replace components as needed.

---

**Last Updated**: January 6, 2026
**Version**: 1.0.0

# Implementation Plan: System Alert Card

## Overview
Add a "System Alerts" card to the SuperChase dashboard that displays real-time notifications for spoke failures, deployment events, and threshold breaches.

## Files to Modify

### 1. `frontend/src/App.jsx`
- Add `AlertItem` component with severity-based styling
- Add `AlertCard` component with alert history list
- Add `alerts` state and mock alert generation from spoke status changes
- Insert card in right column above System Status

### 2. `frontend/src/index.css`
- Add alert severity color classes (`.alert-critical`, `.alert-warning`, `.alert-info`)
- Add pulse animation for new critical alerts

### 3. `frontend/tests/smoke.spec.js`
- Add test: "system alerts card renders"
- Add test: "alerts show correct severity styling"

## Implementation Steps

### Step 1: Add CSS for alert severities
```css
.alert-critical { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.alert-warning { border-left-color: #eab308; background: rgba(234, 179, 8, 0.1); }
.alert-info { border-left-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

@keyframes alert-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}
.alert-new { animation: alert-pulse 2s ease-in-out 3; }
```

### Step 2: Create AlertItem component
```jsx
function AlertItem({ alert }) {
  const severityStyles = {
    critical: 'alert-critical border-l-red-500',
    warning: 'alert-warning border-l-yellow-500',
    info: 'alert-info border-l-blue-500'
  }
  const icons = {
    critical: AlertTriangle,
    warning: AlertCircle,
    info: Info
  }
  const Icon = icons[alert.severity]

  return (
    <motion.div className={`border-l-2 pl-3 py-2 rounded-r ${severityStyles[alert.severity]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm text-zinc-200">{alert.message}</span>
      </div>
      <div className="text-xs text-zinc-500 mt-1">{alert.timestamp}</div>
    </motion.div>
  )
}
```

### Step 3: Create alerts state with generation logic
```jsx
const [alerts, setAlerts] = useState([])

// Generate alerts from spoke status changes
useEffect(() => {
  const newAlerts = []
  Object.entries(spokeStatus.spokes || {}).forEach(([key, spoke]) => {
    if (spoke.status === 'offline') {
      newAlerts.push({
        id: `${key}-offline`,
        severity: 'critical',
        message: `${key} spoke is offline`,
        timestamp: new Date().toLocaleTimeString()
      })
    } else if (spoke.status === 'warning') {
      newAlerts.push({
        id: `${key}-warning`,
        severity: 'warning',
        message: spoke.message,
        timestamp: new Date().toLocaleTimeString()
      })
    }
  })
  if (newAlerts.length > 0) setAlerts(prev => [...newAlerts, ...prev].slice(0, 10))
}, [spokeStatus])
```

### Step 4: Add AlertCard to dashboard
```jsx
<Card title="System Alerts" icon={Bell} accentColor="#ef4444">
  <div className="space-y-2 max-h-48 overflow-y-auto">
    {alerts.length > 0 ? (
      alerts.map((alert, i) => <AlertItem key={alert.id || i} alert={alert} />)
    ) : (
      <div className="text-center py-4 text-zinc-500 text-sm">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
        All systems operational
      </div>
    )}
  </div>
</Card>
```

### Step 5: Add Playwright test
```javascript
test('system alerts card renders', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=System Alerts')).toBeVisible();
});

test('alerts show all-clear when no issues', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // If all spokes online, should show "All systems operational"
  const alertCard = page.locator('text=System Alerts').locator('..');
  await expect(alertCard.locator('text=All systems operational')).toBeVisible();
});
```

## Verification
1. Run `npm run dev` and verify card appears
2. Run `npm run test:smoke` - all tests should pass
3. Deploy and verify on production

## Estimated Changes
- ~50 lines CSS
- ~80 lines JSX
- ~20 lines test code

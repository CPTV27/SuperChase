# Anticipatory Design: Predictive Work Context

## Problem
The SuperChase dashboard is **reactive** - it shows what's urgent/overdue but doesn't predict what Chase is likely to work on next.

## Proposed Solution: Memory-Injected Prediction Engine

### Data Sources for Prediction

1. **Time Patterns** (from audit logs)
   - What tasks does Chase typically work on at 9am vs 3pm?
   - What business units are active on which days?
   - Meeting-free blocks = deep work on which projects?

2. **Sequence Patterns** (from task completion order)
   - After completing an S2P quote, Chase usually does X
   - After a client call, Chase usually creates Y

3. **Context Signals** (from recent activity)
   - Last 3 George queries → topic interest
   - Last Quick Ingest → current focus area
   - Calendar next event → preparation needed

4. **External Triggers**
   - New email from key person → likely follow-up
   - Slack mention → context switch incoming

### Implementation: `/api/predict` Endpoint

```javascript
// GET /api/predict
// Returns predicted next actions with confidence scores

{
  "predictions": [
    {
      "action": "Review Blues Room contract",
      "business": "studio",
      "confidence": 0.85,
      "reasoning": "Miles emailed 2h ago, Studio C active in AM, contract mentioned in last briefing"
    },
    {
      "action": "Quote follow-up for 123 Main St",
      "business": "s2p",
      "confidence": 0.72,
      "reasoning": "Quote sent 3 days ago, typical follow-up window, no response logged"
    },
    {
      "action": "Upload weekly content to CPTV",
      "business": "cptv",
      "confidence": 0.65,
      "reasoning": "Monday pattern: content upload typically happens, last upload 8 days ago"
    }
  ],
  "suggestedFilter": "studio",
  "suggestedFilterReason": "Studio C has 3 pending items requiring attention, Miles communication active"
}
```

### Dashboard Integration

**New Component: "Up Next" Card**

```jsx
<Card title="Up Next" icon={Sparkles} accentColor="#8b5cf6">
  {predictions.map(p => (
    <PredictionItem
      action={p.action}
      business={p.business}
      confidence={p.confidence}
      onAccept={() => quickIngest(p.action)}
      onDismiss={() => dismissPrediction(p.id)}
    />
  ))}
</Card>
```

**Auto-Filter Enhancement:**
- On dashboard load, check `suggestedFilter`
- If confidence > 0.7, auto-select that business filter
- Show subtle indicator: "Focused on Studio C based on recent activity"

### Memory Schema Addition

Add to `memory/patterns.json`:

```json
{
  "workPatterns": {
    "timeOfDay": {
      "09:00-12:00": { "s2p": 0.6, "studio": 0.3, "other": 0.1 },
      "13:00-17:00": { "studio": 0.5, "cptv": 0.3, "other": 0.2 },
      "evening": { "cptv": 0.7, "tuthill": 0.2, "other": 0.1 }
    },
    "dayOfWeek": {
      "monday": ["content-upload", "week-planning"],
      "friday": ["invoicing", "week-review"]
    },
    "sequences": [
      { "after": "client-call", "then": "follow-up-email", "probability": 0.82 },
      { "after": "quote-sent", "then": "follow-up-3d", "probability": 0.75 }
    ]
  },
  "personPriority": {
    "Miles": { "business": "studio", "responseExpectation": "same-day" },
    "Jake": { "business": "s2p", "responseExpectation": "24h" }
  }
}
```

### Learning Loop

1. Track what Chase actually does after seeing predictions
2. If prediction accepted → reinforce pattern weight
3. If prediction dismissed → reduce pattern weight
4. Weekly: George generates pattern summary for review

## Implementation Priority

1. **Phase 1**: Add time-of-day business filter suggestion (Zero-UI)
2. **Phase 2**: Add "Up Next" card with simple heuristics
3. **Phase 3**: Full pattern learning from audit log analysis

## Success Metrics

- Prediction acceptance rate > 60%
- Time to first meaningful action reduced by 30%
- "What should I work on?" queries to George reduced by 50%

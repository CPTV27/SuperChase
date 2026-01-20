# Sub-Agent Manifest Protocol (SAMP)

You are a specialized sub-agent. To maintain context and minimize token waste, you MUST append a single JSONL line to `manifest.jsonl` after every significant action.

## Format

```json
{ "timestamp": "2026-01-20T12:00:00Z", "agent": "[Role]", "finding": "[Short Insight]", "status": "[Hand-off/Complete]", "linked_task": "[Asana_ID]", "marketing_trigger": true/false }
```

## Fields

| Field | Description |
|-------|-------------|
| `timestamp` | UTC ISO8601 timestamp |
| `agent` | Your role (Strategist, Copywriter, Editor, Publisher, Explorer, etc.) |
| `finding` | Single sentence describing the key insight or action |
| `status` | "Hand-off" if passing to next agent, "Complete" if task finished |
| `linked_task` | Asana task ID if relevant, null otherwise |
| `marketing_trigger` | true if this finding should generate marketing content |

## Rules

1. **Do not summarize the whole project** - only write the delta (the change)
2. If `marketing_trigger` is true, the Marketing Department skill will automatically draft a post based on `finding`
3. **Keep your internal monologue under 3 sentences** to preserve tokens
4. One manifest entry per significant action (not per tool call)
5. Findings should be externally meaningful, not internal process notes

## Examples

### Good Entry
```json
{"timestamp":"2026-01-20T12:30:00Z","agent":"Explorer","finding":"Discovered CPQ module reduces quoting time by 80%","status":"Hand-off","linked_task":"1234567890","marketing_trigger":true}
```

### Bad Entry (Too Verbose)
```json
{"timestamp":"2026-01-20T12:30:00Z","agent":"Explorer","finding":"I searched through many files and found that the CPQ module which is located in the modules directory has various functions that when combined together can reduce the overall time spent on quoting by approximately 80% based on the metrics I calculated","status":"Hand-off","linked_task":"1234567890","marketing_trigger":true}
```

## Reading Manifest

To read recent activity:
```bash
tail -10 ~/SuperChase/manifest.jsonl | jq -r '.agent + ": " + .finding'
```

## Appending to Manifest

Use Bash to append:
```bash
echo '{"timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'","agent":"YourRole","finding":"Your insight","status":"Complete","linked_task":null,"marketing_trigger":false}' >> ~/SuperChase/manifest.jsonl
```

---
name: s2p-northeast-scout
description: |
  Business Development Intelligence Agent for Scan2Plan. Monitors the 
  DC-to-Maine corridor for high-intent signals from architecture firms.
  Invoke with /s2p-scout to run a Northeast corridor scan.
author: Claude Code
version: 1.0.0
invocable: true
user-invocable: true
tenant: s2p
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - WebFetch
---

# S2P Northeast Scout

Business Development Intelligence Agent for the DC-to-Maine corridor.

## Usage

```
/s2p-scout              # Full Northeast corridor scan
/s2p-scout --list 80    # List prospects with score >= 80
/s2p-scout --signals    # Get live signals for UI
```

## Technical Hub

**Location:** Troy, NY
**Coverage:** DC → Maine corridor
**Priority Markets:** Metro NY, Capital Region, Boston Metro

## Signal Sources

| Source | Type | Signals |
|--------|------|---------|
| LinkedIn | Architecture firms | Hiring, project awards, team expansions |
| Architectural Journals | Publications | Project announcements, awards |
| Permit Databases | NYC DOB, Boston ISD, DC DCRA | Major renovations, alterations |

## Distance to Meeting Score

The "Distance to Meeting" score (0-100) predicts conversion likelihood:

| Score | Status | Action |
|-------|--------|--------|
| 80+ | 🔥 HOT | Draft intro immediately |
| 60-79 | ⚡ WARM | Queue for prospectus |
| 40-59 | 📋 COOL | Monitor for changes |
| <40 | ❄️ COLD | Low priority |

### Scoring Factors

- **Project Type Alignment** (+30 for historic/renovation)
- **Geographic Proximity** (+25 if <50 miles from Troy)
- **Signal Strength** (+25 for direct RFP/seeking)
- **Firm Quality** (+15 for prestigious firms)
- **Timeline Urgency** (+15 for immediate needs)

## Output Files

| File | Purpose |
|------|---------|
| `memory/s2p_prospect_vault.jsonl` | All prospects with scores |
| `manifest.jsonl` | Event log (shared) |

## Prospect Vault Schema

```json
{
  "id": "s2p_prospect_xxx",
  "timestamp": "ISO8601",
  "tenant": "s2p",
  "source": "LinkedIn|Permit|Journal",
  "firmName": "Architect Firm Name",
  "principalArchitect": "Key decision maker",
  "signalType": "Historic Renovation|Seeking As-Built|etc",
  "location": "City, State",
  "projectType": "Historic|Commercial|Residential",
  "distanceFromTroy": 150,
  "distanceToMeeting": 85,
  "technicalNeeds": ["Point cloud", "BIM", "LOD 300"],
  "status": "new|contacted|meeting_scheduled|proposal_sent",
  "outreachHistory": []
}
```

## Execution Steps

When user invokes `/s2p-scout`:

1. **Run the scan**
   ```bash
   cd ~/SuperChase && node spokes/s2p/northeast-scout.js scan
   ```

2. **Review hot leads**
   ```bash
   node spokes/s2p/northeast-scout.js list 80
   ```

3. **Present findings**
   ```
   ## Northeast Scout Results
   
   🔥 **Hot Leads (80+)**
   - Beyer Blinder Belle [92] - Brooklyn, NY
   - Gensler Boston [88] - Boston, MA
   
   ⚡ **Warm Leads (60-79)**
   - Hartman-Cox Architects [75] - DC
   
   Next: Run /s2p-prospectus to generate technical intros
   ```

## Next Steps Integration

After scanning:
- Hot leads → `/s2p-prospectus {firm}` to generate 1-pager
- Warm leads → Add to CRM for monitoring
- All leads → Visible in Lead Radar UI component

## Isolation Constraint

⚠️ **IMPORTANT**: S2P business logic is isolated from other tenants.
Do not mix S2P prospects with @bigmuddy, @tuthill, or @utopia assets.
All S2P data is tagged with `tenant: "s2p"`.

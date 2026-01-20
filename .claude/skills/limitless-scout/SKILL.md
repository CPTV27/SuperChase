---
name: Limitless Scout
description: Autonomous agent that extracts strategic insights from Limitless Pendant lifelogs
---

# Limitless Scout - Pendant Integration

You are the **Limitless Scout**, an autonomous agent that processes real-world conversations captured by the Limitless Pendant and extracts strategic intelligence for SuperChase.

## Hardware Setup

### Getting Your API Key
1. Open Limitless Web or Desktop app
2. Go to **Settings > Developer**
3. Create a new **API Key**
4. Add to SuperChase: `echo "LIMITLESS_API_KEY=your_key" >> .env`

### MCP Integration (Optional)
For Claude Desktop or Cursor integration:
```bash
npx @anthropic-ai/mcp install limitless
```

## Workflow

### Daily Processing (Automated)

```bash
npm run limitless           # Process yesterday's lifelogs
npm run limitless -- today  # Process today's lifelogs
```

### Search Mode

```bash
npm run limitless:search "TikTok marketing"
npm run limitless:search "@bigmuddy"
```

## Trigger Keywords

The Scout filters lifelogs for these SuperChase-relevant keywords:

| Category | Keywords |
|----------|----------|
| **Agents** | george, superchase |
| **Clients** | @bigmuddy, @s2p, scan2plan, studio c, cptv, tuthill |
| **Content** | tiktok, marketing, purist |
| **Ideas** | idea, should we, what if |

## Output Format

### Manifest Entry
```json
{
  "timestamp": "2026-01-20T09:00:00Z",
  "agent": "Limitless_Scout",
  "finding": "Client mentioned interest in virtual staging",
  "type": "SCOUT_FINDING",
  "status": "PENDING_REVIEW",
  "marketing_trigger": true,
  "source": "Pendant_Lifelog"
}
```

### Detailed Finding (saved to `manual/docs/brainstorm/`)
```json
{
  "id": "limitless-2026-01-20-abc123",
  "type": "MARKETING_OPPORTUNITY",
  "agent": "Limitless_Scout",
  "title": "Client Interested in Virtual Staging",
  "category": "Client Experience",
  "insights": ["Client pain point identified", "Competitor doing X"],
  "actionItems": ["Follow up on virtual staging", "Research competitors"],
  "clientMentions": ["@bigmuddy"],
  "marketingTrigger": true,
  "priority": 4,
  "status": "PENDING_REVIEW"
}
```

## Safety Constraints

1. **READ-ONLY**: The Scout only reads lifelogs, never modifies them
2. **NO AUTO-EXECUTION**: Findings are logged with `PENDING_REVIEW` status
3. **PRIVACY FIRST**: Transcripts are processed locally, not stored raw
4. **HUMAN APPROVAL**: Action items require explicit move to `/manual/docs/projects/`

## "Zero-Click" Voice Trigger

When you say these phrases to your Pendant, the Scout will catch them:

- "George, I just learned on TikTok that..."
- "Idea for Scan2Plan..."
- "@bigmuddy needs..."
- "What if we..."

## Integration with Morning Briefing

The Scout findings automatically feed into your George Morning Briefing:

```javascript
// In spokes/voice/george_bridge.js
import { processLifelogs } from '../limitless/scout.js';

// Fetch yesterday's findings for briefing context
const findings = await processLifelogs({ dryRun: true });
```

## API Reference

### getLifelogs(options)
Fetch lifelogs for a specific date.

```javascript
import { getLifelogs } from './spokes/limitless/scout.js';

const logs = await getLifelogs({
  date: '2026-01-20',
  timezone: 'America/Chicago',
  limit: 50
});
```

### searchLifelogs(query)
Natural language search through lifelogs.

```javascript
import { searchLifelogs } from './spokes/limitless/scout.js';

const results = await searchLifelogs('TikTok marketing');
```

### processLifelogs(options)
Full pipeline: fetch → filter → extract → log.

```javascript
import { processLifelogs } from './spokes/limitless/scout.js';

const result = await processLifelogs({
  date: '2026-01-19',      // Yesterday
  keywords: ['tiktok'],     // Additional filters
  dryRun: false             // Write to manifest
});
```

## Cron Schedule (Recommended)

Add to your crontab for automated daily processing:

```bash
# Process yesterday's lifelogs at 6 AM
0 6 * * * cd /path/to/SuperChase && npm run limitless >> logs/limitless.log 2>&1
```

## Example Session

```
🎙️ SuperChase Limitless Scout v2.1

═════════════════════════════════════════════════

📅 Processing: 2026-01-19
🔍 Keywords: george, superchase, tiktok, bigmuddy, s2p...

[1/4] Fetching lifelogs from Limitless API...
      Found 47 lifelogs

[2/4] Filtering for SuperChase-relevant content...
      8 relevant conversations found

[3/4] Extracting strategic insights...
      💡 Morning coffee with team
      📢 TikTok trend for real estate
      💡 Client call with @bigmuddy
      📢 Marketing idea for Purist

[4/4] Logging findings to manifest...
      ✅ 4 entries written to manifest.jsonl
      ✅ Detailed findings saved to manual/docs/brainstorm/limitless_2026-01-19.json

═════════════════════════════════════════════════
🏁 Scout Complete
   Processed: 47 lifelogs
   Relevant:  8
   Findings:  4
   Marketing: 2

⚠️ Findings logged for review - NOT auto-executed
```

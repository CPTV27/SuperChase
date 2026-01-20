---
name: Brainstorm Ingest
description: Ideation agent that processes brainstorm notes from Google Docs, categorizes ideas, and flags strategic matches
---

# SuperChase Brainstorm Ingest Skill

You are the **SuperChase Ideation Agent**. Your role is to process raw ideation content and organize it for strategic decision-making.

## Workflow

### Step 1: Source Content

Read the Google Doc titled **"SuperChase Brainstorm & TikTok Notes"**.

```bash
# The brainstorm content is typically synced to:
# /memory/brainstorms/ or ingested via spokes/brainstorm/ingest.js
```

If accessing Google Docs directly is needed, use the Google Docs API or manual export.

### Step 2: Categorize Entries

Process each new entry and assign it to ONE of these categories:

| Category | Description | Examples |
|----------|-------------|----------|
| **Infrastructure** | Technical systems, architecture, tooling | API improvements, database changes, deployment automation |
| **Marketing** | Brand, content, lead generation, social media | Town media templates, LinkedIn content, Purist campaigns |
| **Client Experience** | Onboarding, deliverables, communication | Portal improvements, proposal templates, status updates |
| **R&D** | Experimental ideas, future products, research | AI agents, new service offerings, cross-business synergies |

### Step 3: Check for Strategic Matches

Compare each categorized idea against current **Unmet Needs** documented in:

```
/manual/docs/market-research.md
```

If an idea directly addresses an unmet need:

1. Flag it as `STRATEGIC_MATCH` in the manifest
2. Include the matching unmet need reference
3. Add a priority score (1-5)

### Step 4: Update Manifest

Append matched ideas to `manifest.jsonl`:

```json
{
  "id": "idea-2026-01-20-001",
  "type": "STRATEGIC_MATCH",
  "title": "Reality Capture Virtual Tours",
  "category": "Client Experience",
  "source": "SuperChase Brainstorm & TikTok Notes",
  "matchedNeed": "unmet-need-0042: Virtual staging demand",
  "priority": 4,
  "timestamp": "2026-01-20T03:02:00Z",
  "status": "flagged"
}
```

For non-strategic ideas, log normally:

```json
{
  "id": "idea-2026-01-20-002",
  "type": "IDEA",
  "title": "Bunny content soundscapes",
  "category": "R&D",
  "source": "SuperChase Brainstorm & TikTok Notes",
  "timestamp": "2026-01-20T03:02:00Z",
  "status": "logged"
}
```

## ⚠️ Important Constraints

1. **DO NOT EXECUTE IDEAS** - This skill is for categorization and flagging only
2. Ideas become actionable ONLY when explicitly moved to a project file in:
   ```
   /manual/docs/projects/
   ```
3. Never create tasks in Asana or other systems from this skill
4. Never modify ROADMAP.md directly - strategic matches are flagged for human review

## File Locations

| File | Purpose |
|------|---------|
| `/manifest.jsonl` | Append flagged and logged ideas |
| `/manual/docs/market-research.md` | Reference for unmet needs |
| `/manual/docs/projects/` | Where approved ideas become projects |
| `/memory/brainstorms/` | Raw brainstorm content storage |
| `/spokes/brainstorm/ingest.js` | Automation script for this workflow |

## Usage

### Manual Trigger
```bash
npm run ingest
```

### Programmatic
```javascript
import { processBrainstorm } from './spokes/brainstorm/ingest.js';

const results = await processBrainstorm({
  source: 'SuperChase Brainstorm & TikTok Notes',
  dryRun: false
});

console.log(`Processed: ${results.total}`);
console.log(`Strategic Matches: ${results.strategicMatches}`);
```

## Example Session

```
▶ SuperChase Ideation Agent
  📄 Reading: SuperChase Brainstorm & TikTok Notes
  
  ✔ Found 12 new entries
  
  📁 Categorized:
     - Infrastructure: 2
     - Marketing: 4
     - Client Experience: 3
     - R&D: 3
  
  🎯 Strategic Matches: 2
     1. "Virtual staging automation" → unmet-need-0042
     2. "Town media template scaling" → unmet-need-0018
  
  ✔ Appended to manifest.jsonl
  
  ⚠️ Ideas flagged for review - NOT executed
  ⚠️ Move to /manual/docs/projects/ to activate
```

## Category Heuristics

Use these keywords to help categorize:

### Infrastructure
- API, server, database, deploy, CI/CD, Railway, automation, script, refactor

### Marketing
- Content, social, brand, campaign, video, TikTok, LinkedIn, lead gen, SEO

### Client Experience
- Portal, onboard, proposal, deliverable, communication, feedback, UX

### R&D
- AI, agent, experiment, prototype, research, future, cross-business, synergy

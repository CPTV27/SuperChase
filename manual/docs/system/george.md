---
sidebar_position: 1
title: George (AI Hub)
description: The Gemini-powered intelligence core
---

# George - AI Hub

George is the central intelligence of SuperChase, powered by Google's Gemini model. He processes queries, generates briefings, and maintains business context across all operations.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   George (Hub)                  │
│              Gemini 1.5 Pro Model               │
├─────────────────────────────────────────────────┤
│  Memory Layer                                   │
│  ├── patterns.json (learned behaviors)          │
│  ├── limitless_context.json (30-day history)    │
│  └── daily_summary.json (briefings)             │
├─────────────────────────────────────────────────┤
│  Spokes                                         │
│  ├── Asana (task management)                    │
│  ├── Gmail (email triage)                       │
│  ├── Twitter (research)                         │
│  ├── Sheets (audit logging)                     │
│  └── Voice (ElevenLabs TTS)                     │
└─────────────────────────────────────────────────┘
```

## Query Flow

1. **User Query** → Dashboard or CLI
2. **Context Injection** → George loads relevant patterns + recent history
3. **Gemini Processing** → Query analyzed with business context
4. **Response Generation** → Answer with confidence score
5. **Audit Logging** → Interaction logged to Sheets spoke

## Daily Briefing Generation

George generates briefings by:
1. Analyzing `limitless_context.json` (30-day rolling window)
2. Extracting urgent items from Gmail spoke
3. Pulling top tasks from Asana spoke
4. Synthesizing into natural language summary

### Trigger Methods
- **Automatic:** 6am daily via cron
- **Manual:** Click George orb on dashboard
- **API:** `POST /api/briefing/trigger`

## Memory Files

### `patterns.json`
Learned behavioral patterns and preferences:
```json
{
  "workPatterns": {
    "timeOfDay": { "09:00-12:00": { "s2p": 0.6 } }
  },
  "personPriority": {
    "Miles": { "business": "studio", "responseExpectation": "same-day" }
  }
}
```

### `limitless_context.json`
30-day rolling context from Limitless integration:
- Meeting transcripts
- Voice notes
- Email summaries

### `daily_summary.json`
Latest generated briefing with metadata.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Ask George anything |
| `/briefing` | GET | Get latest briefing |
| `/api/briefing/trigger` | POST | Generate new briefing |

## Spoke Status Monitoring

George monitors spoke health via `/api/status`:
- **Online:** Spoke responding normally
- **Warning:** Degraded or missing data
- **Offline:** Connection failed

---

*Part of SuperChase Executive OS v2.3*

# SuperChase: AI Executive Assistant

A modular, event-driven AI executive assistant for Chase Pierson (CPTV Inc).

## Architecture: Hub-and-Spoke

```
                         ┌─────────────────────┐
                         │      ASANA (HUB)    │
                         │  Single Source of   │
                         │       Truth         │
                         └──────────┬──────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
   ┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
   │  Gmail Spoke  │      │   Voice Spoke   │      │  Asana Spoke   │
   │  /spokes/gmail│      │  /spokes/voice  │      │  /spokes/asana │
   └───────────────┘      └─────────────────┘      └────────────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   Google Sheets     │
                         │  (Audit Log Only)   │
                         └─────────────────────┘
```

## Core Principles

1. **Asana is Truth** - All task state lives in Asana. Never read from Sheets.
2. **Sheets are Audit** - Google Sheets is write-only for human review.
3. **Latency First** - Pre-compute daily briefings to `/memory/daily_summary.json`.
4. **Learn from Failures** - Log patterns to `/memory/patterns.json`.

## Directory Structure

```
SuperChase/
├── core/                    # Central hub logic
│   ├── hub.js              # Main orchestrator
│   └── asana-client.js     # Asana API wrapper
│
├── spokes/                  # Modular integrations
│   ├── gmail/              # Email triage spoke
│   ├── asana/              # Asana sync spoke
│   └── voice/              # Voice interface spoke
│
├── memory/                  # System memory
│   ├── patterns.json       # Learned patterns for automation
│   └── daily_summary.json  # Pre-computed voice briefing
│
├── evolution/               # Learning system
│   └── LEARNINGS.md        # Human-readable failure log
│
├── CLAUDE.md               # System Governor rules (in parent)
└── README.md               # This file
```

## Data Flow

### Task Creation (from Email)
```
Gmail → Gmail Spoke → Core Hub → Asana (create) → Sheets (audit log)
```

### Voice Briefing
```
Daily Trigger → Core Hub → Asana (read) → daily_summary.json
Voice UI → daily_summary.json (cached, <500ms)
```

### Pattern Learning
```
Action Fails → Log to LEARNINGS.md → Extract pattern → Add to patterns.json
Next Action → Consult patterns.json → Apply learned rule
```

## For AI Collaborators

Before executing any automated action:

1. **Read** `/memory/patterns.json` - Check for applicable learned patterns
2. **Check** CLAUDE.md System Governor rules - Respect architecture constraints
3. **Execute** through the Hub - Never let spokes talk directly to each other
4. **Log** failures to `/evolution/LEARNINGS.md` - Help the system learn
5. **Update** patterns.json if a new rule emerges

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | System Governor rules (mandatory) |
| `memory/patterns.json` | Structured automation patterns |
| `memory/daily_summary.json` | Pre-computed briefing cache |
| `evolution/LEARNINGS.md` | Failure log for pattern extraction |

## Commands

```bash
# Local development
npm test              # Run tests
npm run triage        # Process emails
npm run sync          # Sync Asana ↔ local
npm run summary       # Generate daily_summary.json
```

## Credentials (Script Properties)

| Property | Description |
|----------|-------------|
| `ASANA_TOKEN` | Asana Personal Access Token |
| `ASANA_WORKSPACE` | Workspace ID: `1211216881488780` |
| `ASANA_PROJECT` | SuperChaseLive project GID |
| `ELEVENLABS_KEY` | Voice synthesis API key |

---

*Built for Chase Pierson by Claude Code. Architecture: Hub-and-Spoke v1.0*

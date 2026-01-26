# Project MARS - CANONICAL CODEBASE

**Codename:** MARS
**Purpose:** Multi-business AI orchestration platform
**Status:** Active development

There is no other codebase. All previous iterations (superchase, chase-os, chase-empire) are archived on `/Volumes/T7/OLD_CODE`.

## Quick Reference

| Command | Description |
|---------|-------------|
| `node server.js` | Start API server (port 3333) |
| `cd frontend && npm run dev` | Start frontend (port 5173) |
| `POST /api/orchestrate` | Council API endpoint |
| `npm test` | Run all tests |

## The Rule

**If it's not in `~/Documents/Systems/mars`, it doesn't exist.**

## Architecture

```
mars/
├── server.js              # HTTP API server
├── core/                  # Business logic
│   ├── orchestrate-api.js # Multi-model council (Grok, Gemini, GPT-4, Claude)
│   ├── llm_council.js     # Deliberation engine
│   └── orchestrator.js    # Workflow execution
├── lib/                   # Infrastructure
│   ├── opennotebook.js    # Notebook persistence
│   ├── cost-controller.js # Budget tracking
│   └── llm-client.js      # OpenRouter gateway
├── config/
│   └── notebooks.json     # Notebook registry
├── frontend/              # React dashboard
└── spokes/                # Integration modules
```

## Key Capabilities

- **Multi-model council**: 4 AI models in parallel
- **Business routing**: @mentions route to correct notebooks
- **Notebook persistence**: OpenNotebook integration
- **Cost tracking**: Per-request budget enforcement
- **275+ tests**: Full test coverage

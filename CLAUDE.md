# SuperChase OS - Development Guidelines

## Project Memory & Context
- This project uses the `episodic-memory` plugin. Review past session summaries before starting new features.
- Critical architectural decisions are stored in `.claude/memory/` and `CONSTRUCTION_LOG.md`.

## Development Workflow
- **Planning:** For any task involving >2 files, create a plan first.
- **TDD:** New features require passing tests before completion.
- **Documentation:** Update CONSTRUCTION_LOG.md before implementing architectural changes.

## Deployment & Health (Railway)
- Dashboard: https://superchase-dashboard-production.up.railway.app
- Backend: https://superchase-production.up.railway.app
- **Verification:** Always run `npm test` and `npx playwright test` after deployment.

---

## Project Overview
SuperChase OS is an enterprise-grade AI automation platform with provider-agnostic architecture.

## Key Architecture Patterns

### 1. Adapter Pattern (Task Providers)
```javascript
// lib/providers/task-provider.js
const provider = createTaskProvider('asana');   // Production
const provider = createTaskProvider('memory');  // Testing
const provider = createTaskProvider('jira');    // Future
```

### 2. Config-Driven Portfolio
```javascript
// config/portfolio.json - NO hard-coded business units
// core/portfolio-manager.js - CRUD operations
getBusinessUnits(), addBusinessUnit(), updateBusinessUnit()
```

### 3. Human-in-the-Loop (HITL)
```
// spokes/agency/review.js
Draft → AGENCY_REVIEW → CLIENT_REVIEW → Published
        (approval gate)  (approval gate)
```

### 4. Emergency Kill Switch
```
POST /api/emergency/kill-switch  - Halts all automation
POST /api/emergency/resume       - Resumes operations
GET  /api/emergency/status       - Check pause state
```

## Directory Structure
```
SuperChase/
├── server.js              # HTTP API server
├── core/                  # Business logic
│   ├── hub.js            # Classification orchestrator
│   ├── query_hub.js      # Natural language queries
│   ├── llm_council.js    # Multi-model deliberation
│   ├── portfolio-manager.js # Business unit CRUD
│   └── analyzer.js       # Strategic insights
├── lib/                   # Shared infrastructure
│   ├── logger.js         # Structured logging + tracing
│   ├── errors.js         # Custom errors + retries
│   ├── cache.js          # TTL-based caching
│   ├── health.js         # Circuit breakers + metrics
│   └── providers/        # Adapter implementations
│       └── task-provider.js
├── config/
│   └── portfolio.json    # Business unit definitions
├── spokes/                # Integration modules
│   ├── asana/            # Task provider (default)
│   ├── gmail/            # Email processing
│   ├── voice/            # ElevenLabs TTS
│   ├── twitter/          # X.com integration
│   ├── agency/           # Content factory + HITL
│   ├── limitless/        # Pendant lifelogs
│   └── sheets/           # Audit logging
├── memory/               # Persistent state
├── tests/                # Test suites (59 backend + 40 frontend)
├── frontend/             # React dashboard
└── CONSTRUCTION_LOG.md   # Architectural decision log
```

## Deployment
- **Backend**: https://superchase-production.up.railway.app
- **Frontend**: https://superchase-dashboard-production.up.railway.app
- **Railway Project ID**: cc5389c6-ab33-4c79-8d52-c96f995b8d27

### Railway Service IDs
```
Backend:  6328da5c-f254-4f30-97a5-395b4a4608f6
Frontend: ed67ad21-eef7-4b7e-adcd-0da4a581e683
```

## Core Skills
- Use **Systematic Debugger** skill for any bug fixes (Hypothesis → Test → Fix → Doc)
- Use **Railway Operations** skill for all deployment and log checking
- Run **Playwright tests** after every frontend deployment to verify dashboard health
- Always check Railway logs if deployment returns non-200 status

## Technical Standards
- **Frontend**: React 19, Tailwind CSS v4, Framer Motion, Recharts, Lucide icons
- **Backend**: Node.js 20+, native HTTP server (no Express)
- **API Security**: X-API-Key header required for all endpoints except /health, /api/health, /api/metrics
- **Logging**: Structured JSON in production, human-readable in development
- **Types**: JSDoc + TypeScript definitions in `types/index.d.ts`

## API Endpoints

### Core
```
GET  /health              - Basic health (no auth)
GET  /api/health          - Detailed health with circuit states
GET  /api/metrics         - Request metrics & latencies
POST /query               - Natural language business query
GET  /tasks               - Tasks from configured provider
GET  /briefing            - Pre-computed daily briefing
```

### Multi-Model AI
```
POST /api/llm-council         - Run multi-model deliberation
GET  /api/llm-council/models  - List available council models
```

### Portfolio (Config-Driven)
```
GET    /api/portfolio/units      - List all business units
POST   /api/portfolio/units      - Add new business unit
PUT    /api/portfolio/units/:id  - Update business unit
DELETE /api/portfolio/units/:id  - Remove business unit
GET    /api/portfolio/summary    - Dashboard summary
```

### Emergency Controls
```
GET  /api/emergency/status      - Check automation status
POST /api/emergency/kill-switch - Halt all automation
POST /api/emergency/resume      - Resume operations
```

### Research & Publishing
```
POST /search-x         - X.com market research
POST /api/publish/x    - Publish to X.com (requires HITL approval)
```

## Testing Commands
```bash
npm test                  # Run all tests (85 tests)
npm run test:unit         # Run unit tests only (59 tests)
npm run test:api          # Run API tests (26 tests, requires running server)
npm run test:watch        # Watch mode for development
npm run smoke             # Run smoke tests (spokes connectivity)
cd frontend && npm test   # Run Playwright frontend tests
```

## Ideation & Ingestion Commands
```bash
npm run ingest <file>        # Ingest transcript from file
npm run test:brainstorm      # Test brainstorm ingest spoke
npm run limitless            # Process yesterday's Pendant lifelogs
npm run limitless:search <q> # Search lifelogs for topic
npm run limitless:test       # Test Limitless API connection
```


## Development Workflow
1. Local dev: `cd frontend && npm run dev` (proxies to Railway backend)
2. Run tests: `npm test` (all 85 tests should pass)
3. Build: `npm run build`
4. Deploy frontend: `railway up frontend --path-as-root --detach`
5. Deploy backend: `railway up --service 6328da5c-f254-4f30-97a5-395b4a4608f6 --detach`
6. Verify: Check `/api/health` and run Playwright smoke test

## Business Units (Config-Driven)
Business units are defined in `config/portfolio.json`, not hard-coded.

To add/modify units:
```bash
# Via API
curl -X POST /api/portfolio/units \
  -d '{"id": "newco", "name": "New Company", "type": "service", "color": "#3b82f6"}'

# Or edit config/portfolio.json directly
```

Default theme colors by type:
- **service**: Blue (#3b82f6)
- **brand**: Purple (#a855f7)
- **client**: Yellow (#eab308)
- **venue**: Cyan (#06b6d4)

## Standing Instructions
1. After any frontend change, rebuild and verify locally before deploying
2. After Railway deploy, check `/health` and `/api/health` endpoints return 200
3. If spokes show offline, check Railway variables are set correctly
4. Use glassmorphism (.glass class) for all new card components
5. All touch targets must be minimum 44px for iPad compatibility
6. Run `npm test` before any deployment

## Library Modules (v2.1)

### lib/logger.js
- Structured logging with log levels (debug, info, warn, error)
- Request tracing with correlation IDs
- Performance timing for async operations
- JSON output in production, human-readable in dev

### lib/errors.js
- Custom error classes: `ValidationError`, `NotFoundError`, `ExternalServiceError`, etc.
- HTTP status codes built-in
- Retry wrapper with exponential backoff: `withRetry(fn, options)`
- Safe fallback wrapper: `withFallback(fn, fallbackValue)`

### lib/cache.js
- In-memory cache with TTL support
- LRU eviction when at capacity
- Memoization helper: `cache.memoize(fn)`
- Spoke-specific caches with different TTLs

### lib/health.js
- Circuit breaker pattern for spoke resilience
- Request metrics (count, success rate, p50/p95/p99 latencies)
- `GET /api/metrics` for observability
- `GET /api/health` for detailed health status

## Memory Log
- 2026-01-21: Documentation rewritten for enterprise positioning
- 2026-01-21: Enterprise Architecture Refactor complete (Adapter Pattern, Portfolio Manager, Kill Switch)
- 2026-01-21: LLM Council deployed (multi-model deliberation via OpenRouter)
- 2026-01-21: 99 tests passing (59 backend + 40 frontend)
- 2026-01-20: Limitless Scout spoke created (Pendant API integration)
- 2026-01-20: v2.1 Server enhancements deployed (logging, errors, caching, health)
- 2026-01-20: v2.3 Executive Command Center deployed
- 2026-01-20: Framer Motion + Recharts integration complete

# SuperChase Executive OS - Project Guidelines

## Project Memory & Context
- This project uses the `episodic-memory` plugin. Review past session summaries before starting new features.
- Critical architectural decisions are stored in `.claude/memory/`.

## Development Workflow (Superpowers)
- **Planning:** For any task involving >2 files, Claude MUST run `/superpowers:write-plan`.
- **Execution:** Use `/superpowers:execute-plan` for batch edits to minimize token burn.
- **TDD:** Enforce the `test-driven-development` skill. New features require passing tests before completion.

## Deployment & Health (Railway)
- Dashboard is live at: https://superchase-dashboard-production.up.railway.app
- Use the `railway` skill to monitor logs if smoke tests fail on production.
- **Verification:** Always run `npx playwright test` after a deployment sync.

---

## Project Overview
SuperChase is an AI Executive Assistant with hub-and-spoke architecture, deployed on Railway.

## Architecture
```
SuperChase/
├── server.js              # Backend API v2.1 (Node.js HTTP server)
├── core/                  # Hub logic (query_hub.js, analyzer.js)
├── lib/                   # Shared utilities (v2.1)
│   ├── logger.js         # Structured logging with request tracing
│   ├── errors.js         # Custom error classes with retries
│   ├── cache.js          # In-memory caching with TTL
│   └── health.js         # Circuit breakers & metrics
├── spokes/                # Integration modules
│   ├── asana/            # Task management
│   ├── brainstorm/       # Ideation ingest (v2.1)
│   ├── limitless/        # Pendant Scout (v2.1)
│   ├── twitter/          # X.com research & publishing
│   ├── voice/            # ElevenLabs (George persona)
│   ├── portal/           # Client portal queue
│   └── sheets/           # Audit logging
├── memory/               # Persistent context files
│   ├── limitless_context.json
│   ├── patterns.json
│   └── daily_summary.json
├── tests/                 # Test suites (v2.1)
│   ├── api.test.js       # API endpoint tests (26 tests)
│   ├── core.test.js      # Hub/analytics tests (21 tests)
│   └── lib.test.js       # Library module tests (38 tests)
├── types/                 # TypeScript definitions (JSDoc)
│   └── index.d.ts        # Full type coverage
├── frontend/             # React dashboard (Vite + Tailwind)
│   └── src/App.jsx       # Executive Command Center v2.3
└── ROADMAP.md           # Strategic priorities
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
```
GET  /health              - Health check (basic, no auth)
GET  /api/health          - Health check (detailed with circuit states)
GET  /api/metrics         - Request metrics & performance data
POST /query               - Query George (business context)
GET  /tasks               - Get Asana tasks
GET  /briefing            - Get daily briefing
POST /search-x            - Search Twitter/X
GET  /api/logs            - Audit log entries
GET  /api/strategy        - ROADMAP.md as JSON
GET  /api/status          - Spoke connectivity
POST /api/briefing/trigger - Generate new briefing
POST /api/publish/x       - Post to X.com
GET  /api/portal/clients  - List portal clients
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

## Business Units (Theme Colors)
- **Scan2Plan**: Blue (#3b82f6)
- **Studio C**: Emerald (#10b981)
- **CPTV**: Purple (#a855f7)
- **Tuthill**: Orange (#f97316)

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
- 2026-01-20: Limitless Scout spoke created (Pendant API integration)
- 2026-01-20: Brainstorm ingest spoke aligned with SKILL.md workflow
- 2026-01-20: v2.1 Server enhancements deployed (logging, errors, caching, health)
- 2026-01-20: 85 tests passing (API, core, library modules)
- 2026-01-20: TypeScript definitions added for IDE support
- 2026-01-20: v2.3 Executive Command Center deployed
- 2026-01-20: All Railway environment variables configured
- 2026-01-20: Framer Motion + Recharts integration complete

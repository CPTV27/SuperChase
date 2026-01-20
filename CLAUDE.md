# SuperChase Executive OS - Project Guidelines

## Project Memory & Context
- This project uses the `episodic-memory` plugin. Review past session summaries before starting new features.
- Critical architectural decisions are stored in `.claude/memory/`.

## Development Workflow (Superpowers)
- **Planning:** For any task involving >2 files, Claude MUST run `/superpowers:write-plan`.
- **Execution:** Use `/superpowers:execute-plan` for batch edits to minimize token burn.
- **TDD:** Enforce the `test-driven-development` skill. New features require a passing `smoke.spec.js` run before completion.

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
├── server.js              # Backend API (Node.js HTTP server)
├── core/                  # Hub logic (query_hub.js, analyzer.js)
├── spokes/                # Integration modules
│   ├── asana/            # Task management
│   ├── twitter/          # X.com research
│   ├── voice/            # ElevenLabs (George persona)
│   └── sheets/           # Audit logging
├── memory/               # Persistent context files
│   ├── limitless_context.json
│   ├── patterns.json
│   └── daily_summary.json
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
- **API Security**: X-API-Key header required for all endpoints except /health

## API Endpoints
```
GET  /health              - Health check (no auth)
POST /query               - Query George (business context)
GET  /tasks               - Get Asana tasks
GET  /briefing            - Get daily briefing
POST /search-x            - Search Twitter/X
GET  /api/logs            - Audit log entries
GET  /api/strategy        - ROADMAP.md as JSON
GET  /api/status          - Spoke connectivity
POST /api/briefing/trigger - Generate new briefing
```

## Development Workflow
1. Local dev: `cd frontend && npm run dev` (proxies to Railway backend)
2. Build: `npm run build`
3. Deploy frontend: `railway up frontend --path-as-root --detach`
4. Deploy backend: `railway up --service 6328da5c-f254-4f30-97a5-395b4a4608f6 --detach`
5. Verify: Run Playwright smoke test

## Business Units (Theme Colors)
- **Scan2Plan**: Blue (#3b82f6)
- **Studio C**: Emerald (#10b981)
- **CPTV**: Purple (#a855f7)
- **Tuthill**: Orange (#f97316)

## Standing Instructions
1. After any frontend change, rebuild and verify locally before deploying
2. After Railway deploy, check `/health` endpoint returns 200
3. If spokes show offline, check Railway variables are set correctly
4. Use glassmorphism (.glass class) for all new card components
5. All touch targets must be minimum 44px for iPad compatibility

## Memory Log
- 2026-01-20: v2.3 Executive Command Center deployed
- 2026-01-20: All Railway environment variables configured
- 2026-01-20: Framer Motion + Recharts integration complete

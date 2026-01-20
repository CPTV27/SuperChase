# SuperChase Architecture Decisions

## 2026-01-20: v2.3 Executive Command Center

### Frontend Stack
- **React 19** + **Vite 7** for fast builds
- **Tailwind CSS v4** with `@tailwindcss/vite` plugin (not CLI)
- **Framer Motion** for animations
- **Recharts** for data visualization
- **Lucide React** for icons

### Design System
- Glassmorphism: `backdrop-filter: blur()` on cards/modals
- Business unit colors: S2P (Blue), Studio C (Emerald), CPTV (Purple), Tuthill (Orange)
- Touch targets: 44px minimum for iPad compatibility
- Deep zinc foundation (#09090b, #18181b)

### API Architecture
- Native Node.js HTTP server (no Express) - `server.js`
- Endpoints without /api prefix: `/health`, `/tasks`, `/briefing`, `/query`
- Endpoints with /api prefix: `/api/logs`, `/api/status`, `/api/strategy`, `/api/briefing/trigger`
- Auth: X-API-Key header (except `/health`)

### Deployment
- Railway monorepo: Backend + Frontend as separate services
- Frontend uses `serve` package to host static build
- Deploy command: `railway up frontend --path-as-root --detach`

### Key Files
- `frontend/src/App.jsx` - Main dashboard component (800+ lines)
- `frontend/src/services/api.js` - API client
- `frontend/src/index.css` - Theme and animations
- `server.js` - Backend API server
- `ROADMAP.md` - Strategic priorities (parsed by /api/strategy)

### Testing
- Playwright for E2E tests
- Config: `frontend/playwright.config.js`
- Smoke tests: `frontend/tests/smoke.spec.js` (7 tests × 2 browsers)

# SuperChase OS

**AI-Powered Executive Command Center**

An enterprise-grade automation platform for managing multiple business units, synthesizing intelligence across channels, and executing with human oversight.

## Key Capabilities

### Provider-Agnostic Architecture
A modular core that integrates with your preferred tools. Currently supports Asana and In-Memory storage, with an adapter layer ready for Jira, ClickUp, Notion, or Monday.com.

```javascript
// Swap providers without changing business logic
const provider = createTaskProvider('asana');    // Production
const provider = createTaskProvider('jira');     // Enterprise
const provider = createTaskProvider('memory');   // Testing
```

### Dynamic Multi-Entity Management
Manage unlimited business units from a single command center. Define clients, brands, services, or projects via simple JSON configuration—no code changes required.

```json
{
  "businessUnits": [
    { "id": "consulting", "name": "Consulting LLC", "type": "service" },
    { "id": "product", "name": "Product Co", "type": "brand" },
    { "id": "acme-client", "name": "ACME Corp", "type": "client" }
  ]
}
```

### Supervised Content Engine
A multi-agent drafting system with mandatory human-in-the-loop review. Content flows through Strategist → Copywriter → Editor stages with explicit approval gates. Includes emergency Kill Switch and cache-clearing protocols for brand safety.

```
Draft → Agency Review → Client Review → Published
         (HITL gate)     (HITL gate)
```

### Multi-Model AI Deliberation (LLM Council)
Strategic decisions benefit from diverse perspectives. The LLM Council queries GPT-4o, Claude, and Gemini simultaneously, conducts anonymous peer review to eliminate self-preference bias, then synthesizes a weighted consensus.

```
Stage 1: Parallel Collection (3+ models)
Stage 2: Anonymous Peer Review (Borda count aggregation)
Stage 3: Chairman Synthesis (weighted by rankings)
```

### Voice Intelligence Interface
Natural language access to your entire business context. Query tasks, research markets, or run council deliberations hands-free via ElevenLabs conversational AI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPERCHASE CORE                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Task Provider   │  │ Portfolio Mgr   │  │ Emergency Controls  │  │
│  │ (Adapter Layer) │  │ (Config-Driven) │  │ (Kill Switch)       │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
     ┌──────┴──────┐       ┌──────┴──────┐       ┌──────┴──────┐
     │   Spokes    │       │   Memory    │       │   AI Layer  │
     ├─────────────┤       ├─────────────┤       ├─────────────┤
     │ Email       │       │ Patterns    │       │ LLM Council │
     │ Voice       │       │ Briefings   │       │ Gemini Hub  │
     │ Social      │       │ Queue State │       │ OpenRouter  │
     │ Lifelogs    │       │ Audit Trail │       │             │
     └─────────────┘       └─────────────┘       └─────────────┘
```

---

## API Reference

### Core Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health with circuit breaker states |
| `/api/metrics` | GET | Request metrics, latencies, success rates |
| `/query` | POST | Natural language business context query |
| `/tasks` | GET | Task list from configured provider |
| `/briefing` | GET | Pre-computed daily intelligence briefing |

### Multi-Model AI
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/llm-council` | POST | Run multi-model deliberation |
| `/api/llm-council/models` | GET | List available council models |

### Portfolio Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/portfolio/units` | GET | List all configured business units |
| `/api/portfolio/units` | POST | Add new business unit |
| `/api/portfolio/units/:id` | PUT | Update business unit |
| `/api/portfolio/units/:id` | DELETE | Remove business unit |
| `/api/portfolio/summary` | GET | Aggregated portfolio dashboard |

### Emergency Controls
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/emergency/status` | GET | Check automation pause state |
| `/api/emergency/kill-switch` | POST | Halt all automation immediately |
| `/api/emergency/resume` | POST | Resume automation after review |

### Research & Publishing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search-x` | POST | Search X.com for market intelligence |
| `/api/publish/x` | POST | Publish to X.com (requires HITL approval) |

---

## Deployment

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | Yes | Server authentication |
| `GEMINI_API_KEY` | Yes | Classification engine |
| `OPENROUTER_API_KEY` | Yes | LLM Council (multi-model) |
| `ASANA_ACCESS_TOKEN` | If using Asana | Task provider credentials |
| `ELEVENLABS_API_KEY` | Optional | Voice interface |
| `TWITTER_BEARER_TOKEN` | Optional | X.com research |
| `LIMITLESS_API_KEY` | Optional | Pendant lifelog integration |

### Quick Start
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run tests (59 backend + 40 frontend)
npm test
cd frontend && npm test

# Start server
npm run server
```

### Production Deployment
Deploy to Railway, Render, or any Node.js host:
```bash
# Railway
railway up

# Or Docker
docker build -t superchase .
docker run -p 3849:3849 superchase
```

---

## Testing

| Suite | Count | Command |
|-------|-------|---------|
| Backend Unit | 59 | `npm test` |
| Backend API | 26 | `npm run test:api` |
| Frontend E2E | 40 | `cd frontend && npm test` |

All tests run on CI before deployment.

---

## Security

- **Authentication**: All endpoints (except `/health`) require `X-API-Key` header
- **HITL Gates**: Content publishing requires explicit human approval
- **Kill Switch**: Emergency shutdown clears all caches and halts automation
- **Circuit Breakers**: Automatic failover when external services degrade
- **Audit Trail**: All actions logged with timestamps and correlation IDs

---

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
│   ├── logger.js         # Structured logging
│   ├── errors.js         # Error handling + retries
│   ├── cache.js          # TTL-based caching
│   ├── health.js         # Circuit breakers
│   └── providers/        # Adapter implementations
│       └── task-provider.js
├── config/
│   └── portfolio.json    # Business unit definitions
├── spokes/                # Integration modules
│   ├── asana/            # Task management
│   ├── gmail/            # Email processing
│   ├── voice/            # ElevenLabs TTS
│   ├── twitter/          # X.com integration
│   ├── agency/           # Content factory + HITL
│   └── limitless/        # Pendant lifelogs
├── memory/               # Persistent state
├── tests/                # Test suites
└── frontend/             # React dashboard
```

---

## License

Proprietary. All rights reserved.

---

**SuperChase OS** — Enterprise AI automation with human oversight.

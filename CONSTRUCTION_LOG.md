# SuperChase Construction Log

> Every change to this system must be documented here before implementation.

---

## Entry 001: Hub-and-Spoke Architecture Refactor (v2.0)

**Date:** 2026-01-19
**Author:** Claude Code
**Status:** PLANNED (Awaiting Approval)

### 1. The Problem

The current SuperChase system suffers from four critical dysfunctions:

| Dysfunction | Impact | Evidence |
|-------------|--------|----------|
| **Monolithic Code.gs** | Untestable, 199KB single file | Can't deploy spokes independently |
| **Sheet-as-Truth** | Race conditions, stale data | Tasks read from Sheets instead of Asana |
| **Live API on Voice** | 3-5 second latency per request | Every briefing hits full data sources |
| **Flat Learnings** | Same errors repeat | SELF_IMPROVING_SYSTEM.md never consulted |

**Root Cause:** The system grew organically without architectural constraints. Sheets became both input AND output, creating circular dependencies.

### 2. The Spoke

This refactor touches ALL spokes and establishes the Hub:

| Component | Before | After |
|-----------|--------|-------|
| **Hub (core/)** | Doesn't exist | Central orchestrator, Asana client |
| **Gmail Spoke** | Embedded in Code.gs | `/spokes/gmail/triage.gs` |
| **Voice Spoke** | Queries live API | Reads `/memory/daily_summary.json` |
| **Chat Spoke** | ChatBot.gs (standalone) | `/spokes/chat/ChatBot.gs` |
| **Sheets Spoke** | Read/Write (truth) | Write-only audit log |
| **Asana Spoke** | Partial integration | `/spokes/asana/` - SOLE source of truth |

### 3. The Scalability

This architecture enables future growth without rewriting:

**Adding a new spoke (e.g., Slack):**
```
1. Create /spokes/slack/
2. Import core/asana-client.js
3. Call Hub methods (getTasks, addTask)
4. Log to Sheets audit trail
5. Done. No changes to other spokes.
```

**Adding a new data source (e.g., Calendar):**
```
1. Add calendar-client.js to core/
2. Hub aggregates into daily_summary.json
3. All spokes automatically get calendar data
4. Zero spoke modifications required.
```

**Key enablers:**
- Spokes never talk to each other (isolation)
- Hub owns all state transitions (single responsibility)
- Cache layer absorbs read load (performance)
- patterns.json learns from failures (self-improvement)

### 4. The Lesson

**Dysfunction Avoided:** "The Spreadsheet Trap"

When Google Sheets is used as both input and output, you create a system that:
- Can't be tested (no mock injection point)
- Can't be scaled (API rate limits on reads)
- Can't be trusted (stale data, race conditions)
- Can't be debugged (no clear data flow)

**Rule Established:**
> "Sheets are for humans. Asana is for machines. Never reverse this."

---

## Entry 002: First Functional Slice Implementation

**Date:** 2026-01-19
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

The v2 architecture exists as empty directories with no functional code. Need to:
- Prove the hub-and-spoke pattern works end-to-end
- Establish code patterns for future spokes
- Get Asana task creation working from external triggers

### 2. The Spoke

This entry covers three components:

| Component | File | Function |
|-----------|------|----------|
| **Core Hub** | `core/hub.js` | Gemini 2.0 Flash classification orchestrator |
| **Asana Spoke** | `spokes/asana/pusher.js` | Task creation with proper metadata |
| **Gmail Spoke** | `spokes/gmail/triage.js` | Fetch unread emails for classification |

### 3. The Scalability

**Pattern established:** Every spoke follows the same interface:
```javascript
// Input: Raw data (email, voice command, etc.)
// Output: { action: string, payload: object, confidence: number }
// Side effect: Audit log to Sheets
```

Adding new spokes means:
1. Create `/spokes/[name]/index.js`
2. Import `core/hub.js` for classification
3. Import `spokes/asana/pusher.js` for task creation
4. Done. No changes to existing code.

### 4. The Lesson

**Dysfunction Avoided:** "Premature Optimization"

We're implementing with stubs for missing credentials (GEMINI_API_KEY, Google OAuth) rather than blocking entirely. The architecture is proven; credentials can be filled in later.

**Credentials Status:**
- ASANA_ACCESS_TOKEN: ✓ Found
- ASANA_PROJECT_ID: ✓ Found (1212853350834789)
- SHEET_ID: ✓ Found
- GEMINI_API_KEY: ✗ Needs manual input
- GOOGLE_CLIENT_ID/SECRET/REFRESH: ✗ Needs manual input

---

## Entry 003: Smoke Test Infrastructure

**Date:** 2026-01-19
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

Before running full triage logic, need to verify all API "handshakes" work:
- Gemini API (classification)
- Gmail OAuth (email fetch)
- Asana API (task creation)

Running full triage without verified connections leads to cryptic errors mid-process.

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **Hub** | `core/hub.js` | Added `testConnection()` and `processEvent()` functions |
| **Gmail** | `spokes/gmail/test_connection.js` | Lists Gmail labels to verify OAuth |
| **Asana** | `spokes/asana/test_connection.js` | Fetches SC: Tasks GID to verify token |
| **Runner** | `smoke_test.sh` | Runs all three tests with pass/fail summary |

### 3. The Scalability

Smoke tests establish the pattern for new spokes:
```bash
# Every spoke must have test_connection.js
spokes/[name]/test_connection.js

# smoke_test.sh auto-discovers and runs all tests
# No modification needed when adding new spokes
```

### 4. The Lesson

**Dysfunction Avoided:** "Silent Failures"

Without explicit connection tests, API failures surface as:
- "undefined is not a function"
- Empty arrays with no error
- 401s buried in stack traces

**Test Results (2026-01-19):**
```
TEST 1: Gemini Hub     ✓ PASS (Model: gemini-2.0-flash)
TEST 2: Gmail OAuth    ✓ PASS (Labels fetched)
TEST 3: Asana API      ✓ PASS (Projects found)

Result: 3/3 PASSED
```

**All credentials now verified:**
- GEMINI_API_KEY: ✓ Working
- GOOGLE_CLIENT_ID: ✓ Working
- GOOGLE_CLIENT_SECRET: ✓ Working
- GOOGLE_REFRESH_TOKEN: ✓ Working
- ASANA_ACCESS_TOKEN: ✓ Working
- ASANA_WORKSPACE_ID: ✓ Working

---

## Entry 004: Voice Intelligence Spoke (George)

**Date:** 2026-01-19
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

Chase needs briefings while driving. Current system requires:
- Opening laptop
- Checking Asana manually
- Scanning email inbox
- Mental synthesis of priorities

This is unsafe while driving and wastes time that could be productive.

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **Briefing Generator** | `spokes/voice/briefing.js` | Aggregates emails + tasks, uses Gemini for synthesis |
| **George Bridge** | `spokes/voice/george_bridge.js` | Persona layer, formats output for voice |
| **Cache** | `memory/daily_summary.json` | Pre-computed briefing for <500ms retrieval |

**Data Flow:**
```
Audit Log (urgent emails) ─┐
                           ├─→ briefing.js ─→ Gemini 2.0 Flash ─→ daily_summary.json
Asana SC: Tasks ───────────┘
                                                                          │
                                                                          ▼
                                                              george_bridge.js ─→ Console/Voice
```

### 3. The Scalability

**George Persona Pattern:**
- Briefing generator is persona-agnostic (outputs raw data + AI summary)
- george_bridge.js adds the "George" personality layer
- Can add other personas without touching briefing logic:
  - `jarvis_bridge.js` - More technical, robotic
  - `friday_bridge.js` - Casual, friendly
  - `custom_bridge.js` - User-defined personality

**Voice Integration Ready:**
- ELEVENLABS_API_KEY already in .env
- ELEVENLABS_VOICE_ID configured (JBFqnCBsd6RMkjVDRZzb)
- george_bridge.js has `testVoice()` stub for TTS integration

### 4. The Lesson

**Dysfunction Avoided:** "Raw Data Dumps"

A briefing is not a list. Executives need:
- Synthesis (what matters?)
- Prioritization (what first?)
- Context (why now?)

Gemini transforms raw data into actionable intelligence. The 3-sentence constraint forces relevance.

**Commands Added:**
```bash
npm run brief          # Use cached briefing (fast)
npm run brief:refresh  # Force regeneration
```

---

## Entry 005: Voice Interface - ElevenLabs TTS Integration

**Date:** 2026-01-19
**Author:** Claude Code
**Status:** LIVE

### 1. The Problem

George can think but not speak. Text output requires:
- Looking at a screen
- Reading while driving (dangerous)
- Breaking flow of thought

Voice output enables hands-free, eyes-free briefings.

### 2. The Spoke

| Component | Update | Purpose |
|-----------|--------|---------|
| **george_bridge.js** | Full rewrite | ElevenLabs TTS integration |
| **cache/audio/** | New directory | Stores generated MP3 files |

**TTS Flow:**
```
Briefing Text ─→ ElevenLabs API ─→ MP3 Buffer ─→ cache/audio/ ─→ afplay
                     │
                     ▼ (on failure)
              Console text fallback
```

**Voice Settings:**
- Model: eleven_monolingual_v1
- Stability: 0.5 (natural variation)
- Similarity Boost: 0.75 (consistent voice)
- Speaker Boost: enabled

### 3. The Scalability

**Platform Support:**
- macOS: `afplay` (native)
- Linux: `aplay` → `paplay` → `mpg123` (fallback chain)
- Windows: PowerShell Media.SoundPlayer

**Cache Management:**
- Audio files saved to `cache/audio/`
- Auto-cleanup keeps only 5 most recent
- Prevents disk bloat from repeated briefings

**Flags:**
```bash
npm run brief           # Voice + text
npm run brief --text    # Text only (skip TTS)
npm run brief --refresh # Force new briefing
```

### 4. The Lesson

**Dysfunction Avoided:** "Silent Failures"

If ElevenLabs fails (API down, quota exceeded, network issue):
1. Error is logged to console
2. Text output still displayed
3. User is never left wondering what happened

**Phase 3 Status: VOICE INTERFACE LIVE**

---

## Entry 006: Foundation Complete - Audit & Memory Loop

**Date:** 2026-01-19
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

SuperChase v2 had working spokes but:
- No real-time audit trail (only local jsonl)
- No learning loop (failures not captured)
- No single "morning routine" command
- Human couldn't see what the system was doing

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **Sheets Spoke** | `spokes/sheets/logger.js` | Real-time audit to Google Sheets |
| **Wrap-Up Script** | `core/wrap_up.js` | End-of-day learning extraction |
| **Updated Triage** | `triage.js` | Now pushes to Sheets in real-time |

**Full Data Flow (Complete):**
```
Gmail ─→ Hub (Gemini) ─→ Asana (tasks)
              │               │
              │               ▼
              └─→ Sheets (audit) ←── Real-time logging
                      │
                      ▼
              evolution/LEARNINGS.md ←── Daily wrap-up
                      │
                      ▼
              memory/patterns.json ←── Automated rules
```

### 3. The Scalability

**Morning Routine (npm start):**
1. Triage all unread emails
2. Create Asana tasks for urgent/action items
3. Archive newsletters
4. Log everything to Sheets
5. Play voice briefing

**Evening Routine (npm run wrap):**
1. Scan today's audit log
2. Analyze patterns via Gemini
3. Generate learnings
4. Update automation rules

**Scripts Added:**
```bash
npm start           # Full morning routine (triage + brief)
npm run wrap        # End-of-day learning extraction
npm run test:sheets # Verify Sheets connection
```

### 4. The Lesson

**Dysfunction Avoided:** "The Black Box"

Without audit logging:
- Can't explain why a task was created
- Can't verify classifications are correct
- Can't learn from mistakes

With Sheets audit:
- Every action is timestamped and categorized
- Human can review AI decisions
- Patterns emerge for automation

**SUPERCHASE V2 FOUNDATION: COMPLETE**

| Phase | Status | Components |
|-------|--------|------------|
| 1. Hub & Spoke | ✓ LIVE | hub.js, gmail/, asana/ |
| 2. Triage | ✓ LIVE | triage.js, Gemini classification |
| 3. Voice | ✓ LIVE | george_bridge.js, ElevenLabs TTS |
| 4. Audit | ✓ LIVE | sheets/logger.js, Google Sheets |
| 5. Learning | ✓ LIVE | wrap_up.js, patterns.json |

---

## Entry 007: Conversational AI - Query Hub & ElevenLabs Tool

**Date:** 2026-01-20
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

George could only read briefings - a one-way monologue. Chase needs:
- Two-way conversation while driving
- Real-time answers to business questions
- Voice-driven access to tasks, emails, patterns

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **Query Hub** | `core/query_hub.js` | Search memory, Asana, audit logs |
| **API Server** | `server.js` | HTTP endpoint for ElevenLabs |
| **OpenAPI Spec** | `openapi.json` | Tool definition for agent |
| **Integration Guide** | `docs/ELEVENLABS_INTEGRATION.md` | Setup instructions |

**Architecture:**
```
Voice Input (ElevenLabs)
        │
        ▼
George Agent ──────────────────────────────┐
        │                                   │
        │ "What are my tasks?"              │
        ▼                                   ▼
Tool Call: queryBusinessContext ──→ SuperChase API (server.js)
                                            │
                                            ▼
                                    Query Hub (query_hub.js)
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            daily_summary.json      Asana Tasks           audit.jsonl
                    │                       │                       │
                    └───────────────────────┼───────────────────────┘
                                            ▼
                                    Gemini 2.0 Flash
                                            │
                                            ▼
                                    Synthesized Answer
                                            │
                                            ▼
                                    George speaks response
```

### 3. The Scalability

**New query types require zero code changes:**
- Add data to daily_summary.json → Query Hub finds it
- Add patterns to patterns.json → Query Hub includes them
- New Asana projects → Automatically searched

**Adding new tools:**
1. Add endpoint to server.js
2. Add path to openapi.json
3. Configure in ElevenLabs
4. Done.

### 4. The Lesson

**Dysfunction Avoided:** "The Dumb Speaker"

Voice assistants that can only recite are useless. Real value comes from:
- Understanding context
- Answering follow-up questions
- Accessing live data

**ElevenLabs Tool Integration:**
- Agent ID: `agent_6601kfc80k2qftha80gdxca6ym0m`
- Tool: `queryBusinessContext`
- Triggers: tasks, emails, status, schedule

**Commands Added:**
```bash
npm run server  # Start API for ElevenLabs
npm run query   # Test queries from CLI
```

---

## Entry 008: X.com / Twitter Research Integration

**Date:** 2026-01-19
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

George can answer questions about internal business state (tasks, emails, patterns) but has no visibility into:
- Industry trends and conversations
- What relevant people are saying
- Breaking news that affects business decisions
- Real-time market sentiment

Research required manual Twitter browsing, breaking hands-free workflow.

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **Twitter Spoke** | `spokes/twitter/search.js` | Search, research, user lookup, trends |
| **Server Update** | `server.js` | `/search-x` endpoint for ElevenLabs |
| **OpenAPI Update** | `openapi.json` | Tool definition for George |

**Functions:**
- `searchTweets(query)` - Search recent tweets by keyword
- `researchTopic(topic)` - Compile research summary with engagement metrics
- `getUserTweets(username)` - Get user's recent posts
- `getTrends()` - Get trending topics (requires elevated API access)
- `testConnection()` - Verify API connectivity

**Data Flow:**
```
Voice: "What's the buzz about AI automation?"
        │
        ▼
George → Tool Call: searchXTwitter
        │
        ▼
server.js /search-x
        │
        ▼
spokes/twitter/search.js
        │
        ▼
Twitter API v2 (Bearer Token auth)
        │
        ▼
{ tweets, summary, topVoices, engagement }
        │
        ▼
George synthesizes and speaks findings
```

### 3. The Scalability

**Research capabilities now extend to:**
- Any keyword or hashtag search
- Competitor monitoring (get their tweets)
- Industry pulse checks
- News about partners/clients

**Adding new social research:**
1. Create `spokes/linkedin/search.js` (same pattern)
2. Add endpoint to server.js
3. Add to OpenAPI spec
4. George automatically gains the capability

**Actions George can now take:**
```
"Research 3D scanning on Twitter"
"What's @maboroshi saying lately?"
"What's trending in reality capture?"
"Search tweets about Matterport vs competitors"
```

### 4. The Lesson

**Dysfunction Avoided:** "The Information Silo"

An executive assistant that only knows internal state is half-blind. Business decisions require:
- Internal context (tasks, emails)
- External context (market, competitors, trends)

George now has both.

**Setup Required:**
1. Get Bearer Token from developer.x.com
2. Add `TWITTER_BEARER_TOKEN` to .env
3. Add `TWITTER_BEARER_TOKEN` to Railway env vars
4. Redeploy

---

## Entry 009: Synthetic Marketing Agency (4-Agent Content Factory)

**Date:** 2026-01-20
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

Content marketing is a time sink that breaks Chase's flow:
- Blog posts require 2-4 hours of focused writing
- Social posts need consistent brand voice across platforms
- Publishing requires manual deployment to multiple systems
- No systematic way to turn business activity into content

Result: Marketing gets deprioritized despite being critical for all business units.

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **Twitter Publish** | `spokes/twitter/publish.js` | OAuth 1.0a POST to X.com |
| **Marketing Queue** | `memory/marketing_queue.json` | State tracking for drafts → published |
| **Marketing Skill** | `.claude/skills/marketing-agency/SKILL.md` | 4-agent orchestration |
| **Blog Config** | `manual/docusaurus.config.ts` | Enable Docusaurus blog |
| **Server Routes** | `server.js` | `/api/publish/x` endpoints |

**4-Agent Architecture:**
```
Strategist ─→ Content Brief
     │
     ▼
Copywriter ─→ Blog + X.com Drafts
     │
     ▼
Editor ─→ Brand Voice Check
     │
     ▼
Publisher ─→ Docusaurus + X.com
```

### 3. The Scalability

**Adding new business unit:**
1. Add brand voice guide to SKILL.md
2. Add business tag to tags.yml
3. Run `/marketing-brief @newbiz`
4. Content factory works automatically

**Adding new platform (e.g., LinkedIn):**
1. Create `spokes/linkedin/publish.js`
2. Add route to server.js
3. Update Publisher agent in SKILL.md
4. No changes to other agents

**Productization ($499/mo):**
- Clone skill with client brand voice
- Configure client OAuth tokens
- Weekly automation: Mon brief → Wed blog → Thu-Sat posts

### 4. The Lesson

**Dysfunction Avoided:** "The Content Bottleneck"

Manual content creation doesn't scale. An executive's time spent writing blog posts is:
- High-cost ($200-500/hr effective rate)
- Inconsistent (quality varies with energy)
- Interruptible (never gets prioritized)

AI agents turn content creation into a review task:
- Strategist: 30 seconds (approve brief)
- Editor: 2 minutes (approve final)
- Total: ~3 minutes vs 3 hours

**Rule Established:**
> "Executives review content. They don't create it."

---

## Entry 011: Enterprise Architecture Refactor - Adapter Pattern & Kill Switch

**Date:** 2026-01-21
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

The critique identified critical architectural weaknesses:
- **Dependency Nightmare:** Tight coupling to Asana/Gmail APIs
- **Black Box Risk:** AI agents operating without oversight
- **N=1 Problem:** Hard-coded business units (Scan2Plan, CPTV)
- **No Kill Switch:** No emergency shutdown mechanism

### 2. The Solution

**Phase 1: Adapter Pattern for Task Management**

```
lib/providers/task-provider.js

┌─────────────────────────────────────────────────────────────┐
│                    TaskProvider (Abstract)                   │
│  createTask(), getTasks(), completeTask(), addComment()     │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────┐
│  AsanaTaskProvider  │      │  InMemoryTaskProvider   │
│  (Production)       │      │  (Testing/Fallback)     │
└─────────────────────┘      └─────────────────────────┘
```

**Phase 2: Human-in-the-Loop (Already Implemented)**
- `spokes/agency/review.js` already has full HITL workflow
- Multi-stage approval: DRAFT → AGENCY_REVIEW → CLIENT_REVIEW → PUBLISHED
- Secure approval tokens with HMAC verification

**Phase 3: Config-Driven Portfolio**

```javascript
// config/portfolio.json
{
  "businessUnits": [
    { "id": "s2p", "name": "Scan2Plan", "color": "#3b82f6", ... },
    { "id": "studio", "name": "Studio C", "color": "#10b981", ... },
    // Add/remove units dynamically
  ]
}

// core/portfolio-manager.js
getBusinessUnits()     // Returns all configured units
addBusinessUnit(unit)  // Add new unit at runtime
updateBusinessUnit()   // Modify existing unit
deleteBusinessUnit()   // Remove unit
```

**Phase 4: Emergency Kill Switch**

```
POST /api/emergency/kill-switch
  { "confirm": "KILL_ALL_AUTOMATION", "reason": "..." }

Actions:
1. Sets globalThis.AUTOMATION_PAUSED = true
2. Clears all spoke caches (revokes in-memory tokens)
3. Logs to memory/emergency_log.jsonl

POST /api/emergency/resume
  { "confirm": "RESUME_AUTOMATION" }

GET /api/emergency/status
  { "automationPaused": true/false }
```

### 3. New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/portfolio/units` | GET | List all business units |
| `/api/portfolio/units` | POST | Add new business unit |
| `/api/portfolio/units/:id` | PUT | Update business unit |
| `/api/portfolio/units/:id` | DELETE | Remove business unit |
| `/api/portfolio/summary` | GET | Portfolio summary for dashboard |
| `/api/emergency/kill-switch` | POST | Emergency shutdown |
| `/api/emergency/resume` | POST | Resume after shutdown |
| `/api/emergency/status` | GET | Check automation status |

### 4. The Scalability

**Swap Asana for Jira:**
```javascript
// Just create a new provider
class JiraTaskProvider extends TaskProvider {
  async createTask(options) { /* Jira API */ }
}

// And switch in config
const provider = createTaskProvider('jira', { apiKey: '...' });
```

**Add new business unit:**
```bash
curl -X POST /api/portfolio/units \
  -d '{"id": "newco", "name": "New Company", "color": "#ff0000"}'
```

### 5. The Lesson

**Dysfunction Avoided:** "The Uncontrollable System"

Without these changes:
- Couldn't swap task providers without rewriting code
- No way to emergency-stop runaway automation
- Adding a new business required code changes

Now:
- Providers are pluggable (Adapter Pattern)
- Kill switch stops everything in 1 API call
- Business units are config, not code

---

## Entry 010: LLM Council - Multi-Model Deliberation Engine

**Date:** 2026-01-20
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

Single-model AI responses have inherent limitations:
- Model-specific biases and blind spots
- No diversity of perspectives on complex questions
- Self-preference bias when models evaluate themselves
- Strategic decisions benefit from "second opinions"

When Chase asks complex business questions, a single model's answer may be confident but wrong. No validation mechanism exists.

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **LLM Council** | `core/llm_council.js` | 3-stage deliberation orchestrator |
| **Server Routes** | `server.js` | API endpoints for council queries |
| **Output Storage** | `memory/llm_council_outputs/` | Session records for audit |

**3-Stage Architecture (based on karpathy/llm-council):**
```
Stage 1: Parallel Collection
    GPT-4o, Claude, Gemini → Simultaneous responses

Stage 2: Anonymous Peer Review
    Responses labeled A/B/C (model identity hidden)
    Each model ranks all responses
    Borda count aggregation

Stage 3: Chairman Synthesis
    Rankings + responses → Claude synthesizes
    Weight given to higher-ranked inputs
```

**Key Functions:**
- `stage1ParallelCollection()` - Query all models via OpenRouter
- `stage2AnonymousReview()` - Blind peer ranking with Borda aggregation
- `stage3ChairmanSynthesis()` - Weighted final synthesis
- `runCouncil()` - Main orchestrator
- `handleLLMCouncilRequest()` - HTTP handler

### 3. The Scalability

**Adding new models:**
```javascript
// Just update the config array
const COUNCIL_MODELS = [
  'openai/gpt-4o',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-exp',
  'meta-llama/llama-3.1-70b'  // New model
];
```

**OpenRouter abstraction:**
- Single API for 100+ models
- No per-provider SDK management
- Unified pricing and rate limits

**Use cases:**
- Strategic decisions ("Should we enter market X?")
- Factual verification ("Is this claim accurate?")
- Complex analysis ("What are the risks of this approach?")

**Integration with George:**
```
Voice: "Run a council on whether to acquire BigMuddy"
    │
    ▼
George → POST /api/llm-council
    │
    ▼
3 models deliberate → Synthesis returned
    │
    ▼
George speaks the synthesized answer with rankings
```

### 4. The Lesson

**Dysfunction Avoided:** "The Confident Wrong Answer"

Single LLMs confidently assert incorrect information. The council pattern:
- Surfaces disagreements between models
- Identifies consensus (higher confidence)
- Weights higher-rated responses more heavily
- Creates audit trail of deliberation

**Anonymity matters:** Research shows models have ~19% self-preference bias when they can identify their own output. Anonymous labeling (A/B/C) eliminates this.

**API Endpoints:**
```
POST /api/llm-council       - Run council deliberation
GET  /api/llm-council/models - List available models
```

**CLI Commands:**
```bash
node core/llm_council.js test           # Test configuration
node core/llm_council.js run "question" # Run deliberation
```

---

## Entry 012: Level 3 Council - Competitive Intelligence & Content Factory

**Date:** 2026-01-21
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

The LLM Council (Entry 010) enabled multi-model deliberation but lacked:
- **Domain-specific intelligence:** Generic Q&A, not business-focused analysis
- **Structured outputs:** Free-form responses vs actionable battlecards
- **Content pipeline:** No path from insight to published content
- **Citation verification:** Claims without sources aren't trustworthy

Business questions like "How do we beat competitors?" or "What content should we create?" required manual research and synthesis.

### 2. The Spoke

| Component | File | Purpose |
|-----------|------|---------|
| **Competitive Intel** | `core/competitive_intel.js` | 3-agent battlecard generation |
| **Content Council** | `core/content_council.js` | 4-agent content sprint creation |
| **Citations** | `lib/citations.js` | Source verification & quality scoring |
| **Context Injection** | `lib/council-context.js` | Business context for LLM queries |
| **Skills** | `.claude/skills/competitive-intel/`, `content-council/` | Skill definitions |

**3-Agent Competitive Intelligence Architecture:**
```
Librarian (GPT-4o)
    │
    ├─→ Market research
    ├─→ Competitor sitemap scraping
    ├─→ Keyword analysis (Red/Yellow/Green/Blue Ocean)
    └─→ MUST include citations for every claim
           │
           ▼
Auditor (Claude 3.5)
    │
    ├─→ Risk assessment
    ├─→ Feasibility scoring
    └─→ Constraint validation (budget, capacity, geography)
           │
           ▼
Architect (Claude 3.5)
    │
    ├─→ Hormozi "Grand Slam Offer" framework
    ├─→ Blue Ocean positioning
    └─→ 90-day execution roadmap
           │
           ▼
Output: memory/battlecards/{businessId}.json
```

**4-Agent Content Factory Architecture:**
```
Trend Hunter
    │
    ├─→ Platform-specific opportunities
    └─→ Viral seed identification
           │
           ▼
Scriptwriter
    │
    ├─→ Blog posts (1000-1500 words)
    ├─→ Video scripts
    └─→ X.com thread hooks
           │
           ▼
Web Architect
    │
    ├─→ Landing page structure
    └─→ Conversion optimization
           │
           ▼
Visual Director
    │
    ├─→ HeyGen video payloads
    └─→ Brand consistency checks
           │
           ▼
Output: memory/content_sprints/{businessId}.json
```

**Citation System:**
```javascript
{
  "claim": "Scan2Plan's 24-hour turnaround is faster than industry average",
  "source": "Industry benchmark report",
  "sourceUrl": "https://...",
  "confidence": 0.9,  // HIGH
  "retrievedAt": "2026-01-21T..."
}

Quality Grades:
  A (90%+) - All claims well-sourced
  B (80%+) - Most claims sourced
  C (70%+) - Adequate sourcing
  D (60%+) - Below standard
  F (<60%) - Insufficient citations
```

### 3. The Scalability

**Adding new business unit:**
1. Run onboarding: `GET /api/onboard/research?name=NewBiz`
2. Fill gaps: `POST /api/onboard/complete`
3. Generate battlecard: `POST /api/competitive-intel/run`
4. Generate content: `POST /api/content-council/run`
5. All outputs stored per-business in `memory/`

**Chaining capabilities:**
```bash
# Full pipeline in one call
POST /api/competitive-intel/run
  { "businessId": "s2p", "chainToContent": true }
# Competitive Intel → Content Council automatically
```

**Adding new agent role:**
1. Add prompt template to relevant core module
2. Add to stage orchestration
3. Output schema automatically extends

### 4. The Lesson

**Dysfunction Avoided:** "The Generic AI Response"

Without domain grounding:
- AI gives generic advice that applies to any business
- No competitive differentiation
- No actionable specifics

With Level 3 Council:
- Every insight is business-specific (GST, brand voice, constraints)
- Every claim has a citation
- Every output is structured for action

**Trust-by-Design:** If an agent can't cite a source, the claim gets flagged. No more "the AI said so" as justification.

**API Endpoints Added:**
```
POST /api/competitive-intel/run    - Generate battlecard
GET  /api/competitive-intel/:id    - Get battlecard
GET  /api/competitive-intel        - List all battlecards

POST /api/content-council/run      - Generate content sprint
GET  /api/content-council/:id      - Get content sprint
GET  /api/content-council          - List all sprints

POST /api/citations/verify         - Verify citation
GET  /api/citations/battlecard/:id - Get battlecard citations
POST /api/citations/quality        - Calculate quality score

GET  /api/onboard/research         - Research for onboarding
POST /api/onboard/complete         - Complete onboarding
```

**CLI Commands:**
```bash
node core/competitive_intel.js run s2p quick     # Quick battlecard
node core/competitive_intel.js run s2p standard  # Full analysis
node core/content_council.js run s2p quick       # Quick sprint
```

---

## Entry 004: Business Discovery Portal

**Date:** 2026-01-21
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

Current client onboarding is manual and slow:
- Business intelligence scattered across documents (PDFs, spreadsheets)
- No automated extraction from uploaded files
- Discovery questions answered one-by-one without context
- No review/approval step before committing data to system

### 2. The Spoke

**New Module:** `spokes/discovery/index.js`

This spoke handles document-based business discovery:

| Component | Purpose |
|-----------|---------|
| `lib/document-parser.js` | Parse PDF/CSV/XLSX files |
| `spokes/discovery/index.js` | Orchestrate upload → extract → questions → commit |
| `frontend/src/pages/DiscoveryPortal.jsx` | Multi-phase wizard UI |
| `frontend/src/hooks/useDiscovery.js` | State management |

**Storage Pattern:**
```
clients/{businessId}/
├── discovery/
│   ├── uploads/           # Original files
│   ├── extracted.json     # AI-extracted data
│   └── answers.json       # Manual answers
├── config.json            # Updated after commit
├── gst.json               # Updated after commit
└── brand.json             # Updated after commit
```

### 3. The Scalability

**Document Type Extensibility:** Adding new file types (e.g., Word, PowerPoint) only requires extending `lib/document-parser.js` - no changes to the spoke.

**Extraction Schema:** AI extraction uses a defined schema, so adding new fields is just schema + prompt updates.

**Phase Machine:** The wizard uses a state machine (UPLOAD → EXTRACT → QUESTIONS → REVIEW → COMMIT), making it easy to add intermediate steps.

### 4. The Lesson

**Avoided:** Dumping raw document text into a single prompt. Instead, we parse → chunk → extract → validate → commit.

**Enabled:** Human review before data commits. The "Review & Approve" phase prevents AI hallucinations from polluting business configs.

**API Endpoints:**
```
POST /api/discover/:businessId/upload     - File upload
POST /api/discover/:businessId/extract    - AI extraction
GET  /api/discover/:businessId/questions  - Dynamic questions
POST /api/discover/:businessId/answers    - Save answers
POST /api/discover/:businessId/commit     - Apply changes
GET  /api/discover/:businessId/status     - Progress tracking
```

---

## Entry 013: S2P Command Center - Strategic Dashboard Redesign

**Date:** 2026-01-21
**Author:** Claude Code
**Status:** COMPLETE

### 1. The Problem

The S2P portal is a demo dashboard with sample data. The FY2026 Strategy Manual defines:
- $2.2M Revenue target | 40%+ GM | 12+ Wins ≥50k sqft
- Locked P1-P22 portfolio with hard gates
- Stage dictionary governance (Lead → Meeting → Opportunity → Proposal → Close)
- GM Gate: No proposal advances without 40% margin
- Tier classification: A (≥50k sqft) | B (20k-49k sqft) | C (<20k sqft)

**Current gaps:**
- No real KPI tracking (hockey stick metrics)
- No pipeline governance (GM gate, scope audit)
- No lead ingestion (752 leads sitting in CSV)
- No proof vault (assets disconnected from workflow)
- No ABM wave management (manual outreach)
- No signal detection (permit/compliance triggers ignored)

### 2. The Spoke

This redesign creates a **Three-Zone Command Interface**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Hockey Stick KPIs (Revenue, GM%, Meetings/Week, Pipeline 3×)      │
├───────────────────────────┬─────────────────────────────────────────────────┤
│    LEFT COLUMN (30%)      │           MAIN STAGE (70%)                      │
│  • Today's Focus          │  • Pipeline (Stage Dictionary + GM Gate)        │
│  • Capacity Gauge         │  • Tier-A Radar (whale visualization)           │
│  • ABM Wave Status        │  • Proof Vault (1 record = 1 tile)              │
│  • George Chat            │  • Lead Ingestion (Clutch.co + signals)         │
├───────────────────────────┴─────────────────────────────────────────────────┤
│  ACTION BAR: [Ingest Lead] [New Proposal] [Run Scout] [Generate Brief]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Components created:**

| Frontend | Purpose |
|----------|---------|
| `KPIHeader.jsx` | Hockey stick metrics bar |
| `PipelineView.jsx` | Stage dictionary + GM gate |
| `ScopeAuditModal.jsx` | Pre-proposal checklist |
| `TierARadar.jsx` | D3 polar whale visualization |
| `LeadDrawer.jsx` | Detail panel with proof match |
| `LeadIngestion.jsx` | CSV upload + tier classification |
| `ProofVault.jsx` + `ProofTile.jsx` | Tile grid interface |
| `WaveCalendar.jsx` | ABM sprint management |
| `SignalQueue.jsx` | Trigger pod unified view |

| Backend | Purpose |
|---------|---------|
| `lib/lead-scorer.js` | Tier classification logic |
| `lib/proof-matcher.js` | Auto-match proof to leads |
| `core/operations_council.js` | 4-agent sequential pipeline |

**Operations Council Architecture:**

```
Lead Scorer (GPT-4o) → Proof Matcher (Claude) → Price Auditor (Claude) → Signal Scout (GPT-4o)
     │                      │                        │                        │
     ▼                      ▼                        ▼                        ▼
  Tier/Score           Proof Match              GM Verdict              Hot Signals
```

### 3. The Scalability

**Adding new KPI:**
1. Add to `memory/kpi-targets.json`
2. KPIHeader auto-renders with threshold coloring
3. No component changes needed

**Adding new pipeline stage:**
1. Edit stage dictionary in governance.json
2. PipelineView reads config dynamically
3. GM gate rules apply automatically

**Adding new trigger pod (e.g., P18 Procurement):**
1. Add pod config to governance.json
2. Signal Scout auto-includes in scan
3. SignalQueue renders with SLA indicator

**Adding new proof type:**
1. Add record to memory/proof-catalog.json
2. ProofMatcher includes in matching algorithm
3. ProofVault tile appears automatically

### 4. The Lesson

**Dysfunction Avoided:** "The Decoration Dashboard"

Demo dashboards that show sample data are decoration. They:
- Don't enforce governance rules
- Don't block bad decisions
- Don't track real performance
- Don't connect to actual workflow

Command Center dashboards:
- **Block** proposals under 40% GM (GM Gate VETO)
- **Enforce** stage dictionary compliance
- **Track** real KPIs against FY2026 targets
- **Connect** leads → proof → proposals → deals

**Rule Established:**
> "A dashboard without gates is a wallpaper. A dashboard with gates is governance."

---

## Entry Template

```markdown
## Entry XXX: [Title]

**Date:** YYYY-MM-DD
**Author:** [Name]
**Status:** PLANNED | IN PROGRESS | COMPLETE

### 1. The Problem
What was breaking or missing?

### 2. The Spoke
Which module does this belong to?

### 3. The Scalability
How does this make it easier to add features later?

### 4. The Lesson
What dysfunction did we avoid?
```

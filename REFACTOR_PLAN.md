# SuperChase Refactor Plan: Fragile Sync → Modular Hub

**Status:** AWAITING APPROVAL
**Created:** 2026-01-19
**Author:** Claude Code (System Governor)

---

## Executive Summary

Current state: Monolithic `Code.gs` (199KB) with bidirectional Sheet sync = fragile, slow, hard to debug.

Target state: Hub-and-spoke architecture with Asana as single source of truth, Sheets as audit log only.

**Estimated effort:** 4-6 focused sessions
**Risk level:** Medium (requires careful migration of existing data)

---

## Current Architecture (Problems)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Gmail     │────▶│   Sheets    │◀────│  Voice UI   │
└─────────────┘     │ (read/write)│     └─────────────┘
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Code.gs   │ ← 199KB monolith
                    │ (everything)│
                    └─────────────┘
```

**Problems:**
1. Sheet reads on every request = 2-5 second latency
2. Sheet as truth = race conditions, stale data
3. Monolith = can't test/deploy spokes independently
4. No structured learning = same errors repeat

---

## Target Architecture

```
~/SuperChase/
├── CLAUDE.md                    # System Governor rules
├── REFACTOR_PLAN.md            # This file
├── package.json                 # npm scripts for local dev
│
├── core/                        # HUB - Central Logic
│   ├── hub.js                   # Main orchestrator
│   ├── asana-client.js          # Asana API wrapper
│   └── config.js                # Credentials, constants
│
├── spokes/                      # SPOKES - Modular Integrations
│   ├── gmail/
│   │   ├── triage.gs            # Email processing
│   │   └── README.md
│   ├── voice/
│   │   ├── index.html           # Voice UI (exists)
│   │   ├── brief-reader.js      # Reads daily_summary.json
│   │   └── README.md
│   ├── chat/
│   │   ├── ChatBot.gs           # Google Chat bot
│   │   └── README.md
│   └── sheets/
│       ├── audit-logger.gs      # Write-only audit log
│       └── README.md
│
├── cache/                       # PRE-COMPUTED DATA
│   └── daily_summary.json       # Voice briefing cache
│
├── memory/                      # LEARNING SYSTEM
│   └── patterns.json            # Structured patterns + failures
│
└── evolution/                   # HUMAN-READABLE LEARNINGS
    └── LEARNINGS.md             # Markdown for review
```

---

## Migration Phases

### Phase 1: Foundation (Session 1)
**Goal:** Create directory structure and core files

| Action | File | Description |
|--------|------|-------------|
| CREATE | `~/SuperChase/core/config.js` | Centralized config (Asana tokens, IDs) |
| CREATE | `~/SuperChase/core/asana-client.js` | Asana API wrapper (read/write tasks) |
| CREATE | `~/SuperChase/memory/patterns.json` | Initial empty pattern structure |
| CREATE | `~/SuperChase/cache/.gitkeep` | Cache directory |
| CREATE | `~/SuperChase/package.json` | npm scripts |
| MOVE | `index.html` → `spokes/voice/index.html` | Organize voice spoke |

**Deliverable:** Can run `npm run test:asana` to verify Asana connection

---

### Phase 2: Asana Hub (Session 2)
**Goal:** All task operations go through Asana

| Action | File | Description |
|--------|------|-------------|
| CREATE | `~/SuperChase/core/hub.js` | Central orchestrator |
| CREATE | `~/SuperChase/spokes/sheets/audit-logger.gs` | Write-only Sheet logger |
| MODIFY | `~/Projects/Code.gs` | Replace Sheet reads with Asana reads |

**Key Changes to Code.gs:**
```javascript
// BEFORE (fragile)
function getTasks() {
  const sheet = SpreadsheetApp.openById(ID).getSheetByName('Tasks');
  return sheet.getDataRange().getValues();
}

// AFTER (hub-centric)
function getTasks() {
  return AsanaClient.getTasksFromProject(ASANA_PROJECT_ID);
}

function logToSheet(action, taskId, details) {
  // Write-only audit log
  const sheet = SpreadsheetApp.openById(ID).getSheetByName('AuditLog');
  sheet.appendRow([new Date().toISOString(), action, taskId, JSON.stringify(details)]);
}
```

**Deliverable:** Tasks read from Asana, writes logged to Sheets

---

### Phase 3: Daily Brief Cache (Session 3)
**Goal:** Sub-second voice briefings

| Action | File | Description |
|--------|------|-------------|
| CREATE | `~/SuperChase/core/brief-generator.js` | Generates daily_summary.json |
| CREATE | `~/SuperChase/cache/daily_summary.json` | Pre-computed briefing |
| MODIFY | `spokes/voice/index.html` | Read from cache, not live API |
| CREATE | Trigger | Apps Script time-based trigger (5 AM daily) |

**Voice UI Changes:**
```javascript
// BEFORE (slow)
async function getBriefing() {
  const res = await fetch(APPS_SCRIPT_URL + '?action=briefing');
  return res.json();
}

// AFTER (fast)
async function getBriefing() {
  const res = await fetch('/cache/daily_summary.json');
  return res.json();
}
```

**Deliverable:** Voice briefing loads in <500ms

---

### Phase 4: Pattern Memory (Session 4)
**Goal:** System learns from failures

| Action | File | Description |
|--------|------|-------------|
| CREATE | `~/SuperChase/memory/patterns.json` | Seed with 10 initial patterns |
| CREATE | `~/SuperChase/core/pattern-matcher.js` | Consults patterns before actions |
| MIGRATE | `SELF_IMPROVING_SYSTEM.md` → `patterns.json` | Convert learnings to structured format |

**Pattern Matching Flow:**
```javascript
async function processEmail(email) {
  const patterns = await loadPatterns();
  const match = patterns.find(p => matchesTrigger(email, p.trigger));

  if (match) {
    log(`Using pattern ${match.id} (confidence: ${match.confidence})`);
    return executeAction(match.action, email);
  }

  // No pattern match - use AI classification
  return classifyWithAI(email);
}
```

**Deliverable:** Automated actions check patterns first

---

### Phase 5: Spoke Isolation (Session 5-6)
**Goal:** Each spoke deployable independently

| Action | File | Description |
|--------|------|-------------|
| EXTRACT | `Code.gs` → `spokes/gmail/triage.gs` | Email processing |
| EXTRACT | `ChatBot.gs` → `spokes/chat/ChatBot.gs` | Chat bot |
| CREATE | `spokes/*/README.md` | Documentation per spoke |
| CREATE | `~/Projects/appsscript.json` | Update with modular structure |

**Final Code.gs:**
```javascript
// Code.gs becomes a thin router
function doPost(e) {
  const action = JSON.parse(e.postData.contents).action;

  switch(action) {
    case 'triage': return GmailSpoke.triage(e);
    case 'briefing': return Hub.getBriefing(e);
    case 'addTask': return Hub.addTask(e);
    default: return { error: 'Unknown action' };
  }
}
```

**Deliverable:** Spokes can be tested/deployed independently

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Export full Sheet backup before Phase 2 |
| Asana API rate limits | Implement exponential backoff in asana-client.js |
| Voice UI breaks | Keep old endpoints active until Phase 3 complete |
| Pattern matching too strict | Start with low confidence threshold (0.5) |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Voice briefing latency | 3-5 sec | <500ms |
| Code.gs size | 199KB | <20KB (router only) |
| Repeated errors | Unknown | Logged in patterns.json |
| Spoke independence | 0% | 100% (each deployable alone) |

---

## Approval Checklist

- [ ] Chase approves overall architecture
- [ ] Asana project "SuperChaseLive" exists and accessible
- [ ] Backup of current Sheets data exported
- [ ] Ready to begin Phase 1

**To proceed:** Reply "approved" or provide modifications.

---
sidebar_position: 3
title: Ingest Flow
description: How tasks and notes flow through the system
---

# Ingest Flow

SuperChase provides multiple ways to capture tasks, notes, and ideas. All paths ultimately route through George for intelligent processing and Asana for task management.

## Ingest Methods

### 1. Dashboard Quick Ingest

**Path:** Dashboard → Modal → `/api/tasks` → Asana

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  + Button   │───▶│   Modal     │───▶│   Asana     │
│  (Dashboard)│    │  (textarea) │    │   Inbox     │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Friction Points:**
- No business unit selection
- No confirmation of where task landed
- No templates for common patterns

### 2. CLI Quick Ingest (`sc` command)

**Path:** Terminal → `/query` → George → Asana

```bash
# Basic usage
sc "Follow up with Miles about shoot"

# With business unit @mention
sc "Quote for 123 Main St" @s2p

# With flags
sc "URGENT: Server down" @s2p --priority high
```

**Advantages:**
- Zero-click from terminal
- Automatic business routing via @mentions
- Supports priority and due date flags

### 3. Email Auto-Triage

**Path:** Gmail → SuperChase Agent → George → Asana

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Gmail     │───▶│   Agent     │───▶│   George    │
│   Inbox     │    │  (triage)   │    │  (analyze)  │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
                                      ┌─────────────┐
                                      │   Asana     │
                                      │   Task      │
                                      └─────────────┘
```

**Auto-categorization:**
- Urgent emails → High priority tasks
- Action items extracted → Individual tasks
- FYI emails → Logged but no task created

## Business Unit Routing

Tasks are routed based on @mentions or keyword detection:

| Signal | Routes To |
|--------|-----------|
| `@s2p`, "scan", "quote", "capture" | Scan2Plan |
| `@studio`, "shoot", "production", "Miles" | Studio C |
| `@cptv`, "content", "upload", "channel" | CPTV |
| `@tuthill`, "design", "brand", "logo" | Tuthill Design |

## Task Lifecycle

```
┌─────────────┐
│   Ingest    │
│  (capture)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Triage    │
│  (George)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Route     │
│  (Asana)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Execute   │
│  (Human)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Complete  │
│  (Asana)    │
└─────────────┘
```

## Audit Trail

All ingests are logged to the Sheets spoke:
- Timestamp
- Source (dashboard, CLI, email)
- Content
- Routing decision
- Business unit assigned

---

*Part of SuperChase Executive OS v2.3*

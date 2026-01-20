---
sidebar_position: 2
title: API Reference
description: SuperChase API endpoints and usage
---

# API Reference

SuperChase exposes a REST API for dashboard integration and external tools.

**Base URL:** `https://superchase-production.up.railway.app`

## Authentication

All endpoints (except `/health`) require the `X-API-Key` header:

```bash
curl -H "X-API-Key: YOUR_API_KEY" https://superchase-production.up.railway.app/health
```

## Endpoints

### Health & Status

#### `GET /health`
Health check endpoint (no auth required).

```json
{
  "status": "ok",
  "timestamp": "2026-01-20T00:00:00.000Z",
  "version": "2.3.0"
}
```

#### `GET /api/status`
Spoke connectivity status.

```json
{
  "timestamp": "2026-01-20T00:00:00.000Z",
  "spokes": {
    "hub": { "status": "online", "message": "Patterns loaded" },
    "asana": { "status": "online", "message": "12 tasks accessible" },
    "gmail": { "status": "online", "message": "Last briefing available" },
    "twitter": { "status": "online", "message": "Twitter API connected" },
    "sheets": { "status": "warning", "message": "No audit log" },
    "voice": { "status": "online", "message": "Voice configured" }
  }
}
```

### Intelligence

#### `POST /query`
Ask George a question with business context.

**Request:**
```json
{
  "query": "What should I focus on today?",
  "context": {
    "business": "s2p",
    "urgency": "normal"
  }
}
```

**Response:**
```json
{
  "answer": "Based on your pipeline, focus on the 123 Main St quote follow-up...",
  "confidence": 0.85,
  "sources": ["asana", "email"]
}
```

#### `GET /briefing`
Get the latest daily briefing.

```json
{
  "briefing": "Good morning. You have 3 urgent items...",
  "generatedAt": "2026-01-20T06:00:00.000Z",
  "stats": {
    "urgentCount": 3,
    "taskCount": 12,
    "overdueCount": 1
  },
  "topTasks": [...],
  "urgentEmails": [...]
}
```

#### `POST /api/briefing/trigger`
Generate a fresh briefing on demand.

```json
{
  "success": true,
  "message": "Briefing generated",
  "briefing": "..."
}
```

### Tasks

#### `GET /tasks`
Get tasks from Asana.

**Query Parameters:**
- `limit` (optional): Max tasks to return (default: 20)

```json
{
  "tasks": [
    {
      "name": "Follow up with client",
      "project": "Scan2Plan",
      "dueOn": "2026-01-21",
      "completed": false
    }
  ]
}
```

### Strategy

#### `GET /api/strategy`
Get parsed ROADMAP.md as structured JSON.

```json
{
  "priorities": {
    "salesAccelerator": "Unblock revenue by fixing proposal builder UI"
  },
  "buildNow": [
    "Fix Scan2Plan CPQ/proposal UI",
    "Triage SuperChase approval gates",
    "..."
  ],
  "friction": [
    {
      "area": "Scan2Plan - UI",
      "symptom": "Frustration with proposal builder",
      "impact": "Blocks sales workflow"
    }
  ],
  "leverage": [...],
  "highValuePeople": {
    "Owen": { "context": "Scan2Plan", "mentionCount": 5 }
  }
}
```

### Audit

#### `GET /api/logs`
Get recent audit log entries.

**Query Parameters:**
- `limit` (optional): Max entries (default: 50)

```json
{
  "logs": [
    {
      "timestamp": "2026-01-20T00:00:00.000Z",
      "action": "query",
      "details": "User asked about project status"
    }
  ]
}
```

## Error Responses

All errors return JSON with an `error` field:

```json
{
  "error": "Invalid API key"
}
```

| Status | Meaning |
|--------|---------|
| 401 | Missing or invalid API key |
| 404 | Endpoint not found |
| 500 | Internal server error |

---

*SuperChase API v2.3*

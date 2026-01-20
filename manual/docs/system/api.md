---
sidebar_position: 2
title: API Reference
description: SuperChase API v2.1 endpoints and usage
---

# API Reference

SuperChase exposes a REST API for dashboard integration, agency operations, and external tools.

**Base URL:** `https://superchase-production.up.railway.app`
**Version:** 2.1.0

## Authentication

All endpoints (except `/health`, `/api/health`, `/api/metrics`) require the `X-API-Key` header:

```bash
curl -H "X-API-Key: YOUR_API_KEY" https://superchase-production.up.railway.app/api/status
```

## Health & Observability

### `GET /health`
Basic health check (no auth required).

```json
{
  "status": "ok",
  "timestamp": "2026-01-20T00:00:00.000Z",
  "version": "2.1.0"
}
```

### `GET /api/health`
Detailed health with circuit breaker states (no auth required).

```json
{
  "status": "healthy",
  "uptime": 86400,
  "circuits": {
    "asana": { "state": "closed", "failures": 0 },
    "twitter": { "state": "closed", "failures": 0 },
    "gemini": { "state": "closed", "failures": 1 }
  },
  "memory": { "heapUsed": 45, "heapTotal": 128 }
}
```

### `GET /api/metrics`
Request metrics with latency percentiles (no auth required).

```json
{
  "requests": {
    "total": 1250,
    "success": 1180,
    "failure": 70,
    "successRate": 0.944
  },
  "latency": {
    "p50": 45,
    "p95": 180,
    "p99": 450
  },
  "byEndpoint": {
    "GET /api/status": { "count": 500, "avgMs": 12 },
    "POST /query": { "count": 200, "avgMs": 850 }
  }
}
```

### `GET /api/status`
Spoke connectivity status.

```json
{
  "timestamp": "2026-01-20T00:00:00.000Z",
  "spokes": {
    "hub": { "status": "online", "message": "Patterns loaded" },
    "asana": { "status": "online", "message": "12 tasks accessible" },
    "twitter": { "status": "online", "message": "Twitter API connected" },
    "voice": { "status": "online", "message": "Voice configured" }
  }
}
```

## Intelligence

### `POST /query`
Ask George a question with business context.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | The question |
| `context.business` | string | No | Business unit (s2p, studio, cptv, tuthill) |
| `context.urgency` | string | No | normal, high, urgent |

```json
// Response
{
  "answer": "Based on your pipeline, focus on the 123 Main St quote...",
  "confidence": 0.85,
  "sources": ["asana", "email"]
}
```

### `GET /briefing`
Get the latest daily briefing.

### `POST /api/briefing/trigger`
Generate a fresh briefing on demand.

## Tasks

### `GET /tasks`
Get tasks from Asana.

| Query Param | Default | Description |
|-------------|---------|-------------|
| `limit` | 10 | Max tasks to return |

## Twitter / X.com

### `POST /search-x`
Search or research Twitter content.

| Field | Type | Description |
|-------|------|-------------|
| `action` | string | `search`, `research`, `user`, `trends` |
| `query` | string | Search query (for action=search) |
| `topic` | string | Research topic (for action=research) |
| `username` | string | Twitter handle (for action=user) |
| `maxResults` | number | Max results (default: 10) |

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"action":"search","query":"#3Dscanning"}' \
  https://superchase-production.up.railway.app/search-x
```

### `GET /search-x/status`
Check Twitter API connection status.

### `POST /api/publish/x`
Post a tweet or thread to X.com.

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Single tweet content |
| `thread` | array | Array of tweet strings for thread |
| `reply_to_id` | string | Tweet ID to reply to (optional) |
| `delayMs` | number | Delay between thread tweets (default: 30000) |

**Single tweet:**
```json
{ "text": "Hello from SuperChase!" }
```

**Thread:**
```json
{ "thread": ["First tweet", "Second tweet", "Third tweet"] }
```

### `GET /api/publish/x/status`
Check X.com publish credentials.

## Client Portal API

Manage content queues for agency clients.

### `GET /api/portal/clients`
List all portal clients.

```json
{ "success": true, "clients": ["bigmuddy", "studioc", "tuthill"] }
```

### `GET /api/portal/:clientId/queue`
Get client queue state.

```json
{
  "success": true,
  "clientId": "bigmuddy",
  "queue": {
    "ingest": [...],
    "agencyReview": [...],
    "clientReview": [...],
    "published": [...]
  },
  "counts": { "ingest": 2, "agencyReview": 1, "clientReview": 3, "published": 15, "total": 21 }
}
```

### `POST /api/portal/:clientId/upload`
Add asset to ingest queue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Asset identifier |
| `source` | string | Origin (e.g., "Client Upload") |
| `notes` | string | Additional notes |
| `type` | string | Asset type (Image, Video, etc.) |

### `POST /api/portal/:clientId/process`
Process ingest item to agency review.

| Field | Type | Required |
|-------|------|----------|
| `itemId` | string | Yes |
| `thread` | string | No - Content thread title |

### `POST /api/portal/:clientId/send-to-client`
Move item from agency review to client review.

| Field | Type | Required |
|-------|------|----------|
| `itemId` | string | Yes |

### `POST /api/portal/:clientId/approve`
Client approves item (moves to published).

| Field | Type | Required |
|-------|------|----------|
| `itemId` | string | Yes |

### `POST /api/portal/:clientId/move`
Move item between arbitrary stages.

| Field | Type | Required |
|-------|------|----------|
| `itemId` | string | Yes |
| `from` | string | Yes - Source stage |
| `to` | string | Yes - Target stage |

### `POST /api/portal/:clientId/gbp`
Google Business Profile actions.

| Field | Type | Description |
|-------|------|-------------|
| `action` | string | `post`, `media`, `qa`, `insights` |

## Tenant Management API

Manage multi-tenant agency configuration.

### `GET /api/tenants`
List all tenants.

```json
{
  "tenants": [
    { "id": "bigmuddy", "name": "Big Muddy Inn", "businessType": "hospitality" },
    { "id": "studioc", "name": "Studio C", "businessType": "production" }
  ],
  "count": 2
}
```

### `POST /api/tenants`
Create a new tenant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Lowercase alphanumeric with hyphens |
| `name` | string | Yes | Display name |
| `businessType` | string | Yes | Type of business |
| `branding` | object | No | Voice, tone, colors |
| `seo` | object | No | Keywords, content pillars |

### `GET /api/tenants/:tenantId`
Get tenant configuration.

### `PUT /api/tenants/:tenantId`
Update tenant configuration.

## Agency Review API

Content approval workflow management.

### `GET /api/review/pulse`
Get review status pulse (counts and pending items).

```json
{
  "pulse": "Agency Review Pulse",
  "counts": {
    "agencyReview": 3,
    "clientReview": 2,
    "readyToPublish": 1,
    "needsRevision": 0
  },
  "agencyPending": [
    { "id": "review-abc123", "clientId": "bigmuddy", "title": "Blues Night Post", "approveUrl": "...", "rejectUrl": "..." }
  ]
}
```

### `POST /api/review`
Create new review item.

| Field | Type | Required |
|-------|------|----------|
| `clientId` | string | Yes |
| `type` | string | Yes - blog, social, gbp |
| `title` | string | Yes |
| `content` | string | Yes |
| `metadata` | object | No |

### `GET /api/review/:id`
Get specific review item.

### `GET /api/review/:id/approve?token=xxx`
Approve via secure link (agency use).

### `GET /api/review/:id/reject?token=xxx&feedback=xxx`
Reject via secure link. Include `feedback` for revision request.

### `POST /api/review/:id/client-approve`
Client approves content.

| Field | Type | Required |
|-------|------|----------|
| `clientId` | string | Yes |

### `POST /api/review/:id/revision`
Client requests revision.

| Field | Type | Required |
|-------|------|----------|
| `clientId` | string | Yes |
| `feedback` | string | Yes |

### `POST /api/review/:id/publish`
Mark content as published.

| Field | Type | Required |
|-------|------|----------|
| `platform` | string | Yes |
| `url` | string | No |

### `GET /api/review/list/:clientId`
List reviews for a specific client.

## Strategy & Audit

### `GET /api/strategy`
Get parsed ROADMAP.md as structured JSON.

### `GET /api/logs`
Get recent audit log entries.

| Query Param | Default | Description |
|-------------|---------|-------------|
| `limit` | 20 | Max entries |

## Error Responses

All errors return JSON with structured error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Client ID must be lowercase alphanumeric with hyphens"
  },
  "requestId": "req-abc123"
}
```

| Status | Code | Meaning |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid request parameters |
| 401 | AUTHENTICATION_ERROR | Missing or invalid API key |
| 404 | NOT_FOUND | Resource or endpoint not found |
| 500 | INTERNAL_ERROR | Server error |

---

*SuperChase API v2.1*

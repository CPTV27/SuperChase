---
sidebar_position: 5
title: Review Workflow
description: Content approval pipeline
---

# Review Workflow

SuperChase v2.1 implements a human-in-the-loop content approval pipeline with secure token-based approvals.

## Workflow States

```
DRAFT  ──→  AGENCY_REVIEW  ──→  CLIENT_REVIEW  ──→  PUBLISHED
  │              │                    │
  │              ▼                    ▼
  └──────→  REVISION  ←──────────────┘
                │
                ▼
           REJECTED
```

| State | Description | Actor |
|-------|-------------|-------|
| `DRAFT` | AI-generated content, pending submission | System |
| `AGENCY_REVIEW` | Awaiting internal (agency) approval | You |
| `CLIENT_REVIEW` | Awaiting client approval | Client |
| `CLIENT_APPROVED` | Ready to publish | - |
| `PUBLISHED` | Live on platform | System |
| `REVISION` | Needs changes (feedback provided) | - |
| `REJECTED` | Permanently rejected | - |

## Review Item Structure

```javascript
{
  "id": "review-lx1abc123",
  "clientId": "bigmuddy",
  "type": "social",           // blog, social, gbp
  "title": "Friday Blues Night",
  "content": "Full post content...",
  "status": "AGENCY_REVIEW",
  "createdAt": "2026-01-20T10:00:00.000Z",
  "updatedAt": "2026-01-20T10:30:00.000Z",
  "history": [
    { "status": "DRAFT", "timestamp": "...", "actor": "system" },
    { "status": "AGENCY_REVIEW", "timestamp": "...", "actor": "system" }
  ],
  "approveToken": "a1b2c3d4...",
  "rejectToken": "e5f6g7h8...",
  "metadata": {
    "lastFeedback": "Add more excitement to the intro"
  }
}
```

## Secure Token Approval

Review items include secure tokens for one-click approval via email or Slack:

**Approve URL:**
```
https://superchase-production.up.railway.app/api/review/{id}/approve?token={approveToken}
```

**Reject with feedback:**
```
https://superchase-production.up.railway.app/api/review/{id}/reject?token={rejectToken}&feedback=Needs+stronger+CTA
```

Tokens are HMAC-SHA256 hashes, valid only for the specific item and action.

## Workflow Operations

### Create Review Item

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{
    "clientId": "bigmuddy",
    "type": "social",
    "title": "Friday Blues Night",
    "content": "The Mississippi whispers tonight..."
  }' \
  https://superchase-production.up.railway.app/api/review
```

Response includes approve/reject URLs:
```json
{
  "success": true,
  "item": { ... },
  "approveUrl": "https://.../api/review/review-abc/approve?token=xyz",
  "rejectUrl": "https://.../api/review/review-abc/reject?token=xyz"
}
```

### Check Review Pulse

Get aggregate status of all pending reviews:

```bash
curl -H "X-API-Key: KEY" https://superchase-production.up.railway.app/api/review/pulse
```

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
    {
      "id": "review-abc",
      "clientId": "bigmuddy",
      "title": "Blues Night Post",
      "type": "social",
      "approveUrl": "...",
      "rejectUrl": "..."
    }
  ],
  "clientPending": [...],
  "readyToPublish": [...],
  "needsRevision": [...]
}
```

### Agency Approve

Click the approveUrl or call directly:

```bash
curl "https://superchase-production.up.railway.app/api/review/review-abc/approve?token=xyz"
```

Moves item to `CLIENT_REVIEW`.

### Agency Reject / Request Revision

Without feedback (permanent reject):
```bash
curl "https://superchase-production.up.railway.app/api/review/review-abc/reject?token=xyz"
```

With feedback (revision request):
```bash
curl "https://superchase-production.up.railway.app/api/review/review-abc/reject?token=xyz&feedback=Add+a+stronger+CTA"
```

### Client Approve

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"clientId": "bigmuddy"}' \
  https://superchase-production.up.railway.app/api/review/review-abc/client-approve
```

Moves item to `CLIENT_APPROVED`.

### Client Request Revision

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"clientId": "bigmuddy", "feedback": "Can we make it more upbeat?"}' \
  https://superchase-production.up.railway.app/api/review/review-abc/revision
```

### Mark Published

After posting to platform:

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"platform": "twitter", "url": "https://twitter.com/..."}' \
  https://superchase-production.up.railway.app/api/review/review-abc/publish
```

### List Client Reviews

```bash
curl -H "X-API-Key: KEY" https://superchase-production.up.railway.app/api/review/list/bigmuddy
```

## Audit Trail

Every status change is logged to:
1. The item's `history` array
2. The manifest.jsonl file

Example history entry:
```json
{
  "status": "AGENCY_REVIEW",
  "timestamp": "2026-01-20T10:30:00.000Z",
  "actor": "agency",
  "note": "Approved by agency",
  "feedback": ""
}
```

## Integration with Notifications

The review pulse endpoint (`/api/review/pulse`) is designed for integration with:
- Morning briefings (George reads pending counts)
- Slack notifications
- Dashboard widgets

## Storage

Review queue is stored at:
```
/memory/review_queue.json
```

All changes are also appended to:
```
/manifest.jsonl
```

---

*See also: [Agency Mode](/system/agency-mode), [Client Portals](/operations/client-portals)*

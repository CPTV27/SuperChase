---
sidebar_position: 2
title: Client Portals
description: Portal queue management system
---

# Client Portals

The Portal Spoke manages content queues for agency clients, tracking assets from upload through publication.

## Queue Stages

```
INGEST  ──→  AGENCY REVIEW  ──→  CLIENT REVIEW  ──→  PUBLISHED
  │               │                    │
  │    (Process)  │     (Send to       │    (Client
  │               │      Client)       │     Approves)
```

| Stage | Description | Action to Progress |
|-------|-------------|-------------------|
| `ingest` | Raw assets uploaded by client | `/process` |
| `agencyReview` | Content created, awaiting agency approval | `/send-to-client` |
| `clientReview` | Sent to client for approval | `/approve` |
| `published` | Approved and posted | - |

## Queue Storage

Each client's queue is stored at:
```
/clients/{clientId}/queue/queue.json
```

Structure:
```json
{
  "ingest": [
    { "id": "ASSET_001", "complete": false, "metadata": {...} }
  ],
  "agencyReview": [],
  "clientReview": [],
  "published": [],
  "updatedAt": "2026-01-20T10:00:00.000Z"
}
```

## Item Schema

```javascript
{
  "id": "POST_001",
  "complete": false,
  "metadata": {
    "source": "Client Upload",
    "notes": "Photo from Friday event",
    "type": "Image",                    // Image, Video, Text
    "uploadedAt": "2026-01-20T10:00:00.000Z",
    "status": "Waiting for Chase approval",
    "thread": "Blues Night Recap",       // Content thread title
    "sourceAsset": "ASSET_001",         // Original asset ID
    "publishedDate": "2026-01-21"       // When published
  }
}
```

## Portal API Endpoints

### List Clients

```bash
curl -H "X-API-Key: KEY" https://superchase-production.up.railway.app/api/portal/clients
```

```json
{ "success": true, "clients": ["bigmuddy", "studioc", "tuthill", "utopia", "cptv"] }
```

### Get Queue State

```bash
curl -H "X-API-Key: KEY" https://superchase-production.up.railway.app/api/portal/bigmuddy/queue
```

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
  "counts": {
    "ingest": 2,
    "agencyReview": 1,
    "clientReview": 3,
    "published": 15,
    "total": 21
  }
}
```

### Upload Asset (Add to Ingest)

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{
    "id": "friday_photo_01.jpg",
    "source": "Client Upload",
    "notes": "Main stage during blues set",
    "type": "Image"
  }' \
  https://superchase-production.up.railway.app/api/portal/bigmuddy/upload
```

### Process Ingest Item

Move from ingest to agency review (creates content item):

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"itemId": "ASSET_001", "thread": "Friday Blues Night Recap"}' \
  https://superchase-production.up.railway.app/api/portal/bigmuddy/process
```

### Send to Client

Move from agency review to client review:

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"itemId": "POST_001"}' \
  https://superchase-production.up.railway.app/api/portal/bigmuddy/send-to-client
```

### Client Approve

Move from client review to published:

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"itemId": "POST_001"}' \
  https://superchase-production.up.railway.app/api/portal/bigmuddy/approve
```

### Move Item (Manual)

Move item between any stages:

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"itemId": "POST_001", "from": "clientReview", "to": "agencyReview"}' \
  https://superchase-production.up.railway.app/api/portal/bigmuddy/move
```

### GBP Actions

Execute Google Business Profile actions for client:

```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"action": "post", "text": "Join us for Blues Night this Friday!"}' \
  https://superchase-production.up.railway.app/api/portal/bigmuddy/gbp
```

Actions: `post`, `media`, `qa`, `insights`

## Onboarding New Clients

1. **Create tenant** via Tenant Manager:
```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"id":"newclient","name":"New Client","businessType":"hospitality"}' \
  https://superchase-production.up.railway.app/api/tenants
```

2. **Directory structure** is auto-created:
```
/clients/newclient/
  config.json    # Tenant config
  assets/        # Client media
  content/       # Generated content
  queue/         # Queue state
```

3. **Initialize queue** by uploading first asset:
```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"id":"welcome_asset","source":"Onboarding","type":"Image"}' \
  https://superchase-production.up.railway.app/api/portal/newclient/upload
```

4. **Configure style** (optional):
Update `/lib/style-engine.js` with client-specific STYLE_PROMPTS and VOICE_GUIDELINES.

## Integration with Review Workflow

The Portal queue handles asset-to-content flow, while the [Review Workflow](/system/review-workflow) handles content approval.

Typical flow:
1. Client uploads asset -> Portal `ingest`
2. Agency creates content from asset -> Portal `agencyReview`
3. Content submitted for approval -> Review Workflow `AGENCY_REVIEW`
4. Agency approves -> Portal `clientReview` + Review `CLIENT_REVIEW`
5. Client approves -> Portal `published` + Review `PUBLISHED`

## Manifest Logging

All portal actions are logged to `/manifest.jsonl`:

```json
{
  "timestamp": "2026-01-20T10:00:00.000Z",
  "agent": "Portal",
  "finding": "New asset uploaded for @bigmuddy: ASSET_001",
  "status": "Complete",
  "client": "bigmuddy"
}
```

---

*See also: [Agency Mode](/system/agency-mode), [Review Workflow](/system/review-workflow)*

---
sidebar_position: 4
title: Agency Mode
description: Multi-tenant client architecture
---

# Agency Mode

SuperChase v2.1 introduces multi-tenant "Agency Mode" for managing multiple client brands through a unified pipeline.

## Architecture

```
                     +------------------+
                     |  Tenant Manager  |
                     |  (Orchestrator)  |
                     +--------+---------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+    +---------------+    +---------------+
|   bigmuddy    |    |    studioc    |    |   tuthill     |
| /clients/bm/  |    | /clients/sc/  |    | /clients/th/  |
+-------+-------+    +-------+-------+    +-------+-------+
        |                     |                     |
        +----------+----------+----------+----------+
                   |                     |
                   v                     v
            +-------------+       +-------------+
            |   Shared    |       |   Style     |
            |  Pipeline   |       |   Engine    |
            +-------------+       +-------------+
```

**Key principle:** Isolated client data, shared processing pipeline.

## Tenant Manager

Location: `/core/tenant-manager.js`

The Tenant Manager handles:
- Client configuration loading and caching
- Directory structure initialization
- Cross-tenant routing
- Tenant CRUD operations

### Tenant Directory Structure

```
/clients/{clientId}/
  config.json      # Tenant configuration
  assets/          # Client media files
  content/         # Generated content
  queue/           # Queue state (queue.json)
```

### Configuration Schema

```javascript
{
  "id": "bigmuddy",
  "name": "Big Muddy Inn",
  "businessType": "hospitality",
  "branding": {
    "voice": "warm_southern",
    "tone": "friendly",
    "colors": { "primary": "#1A5653", "accent": "#DAA520" },
    "fonts": { "heading": "Playfair Display", "body": "Open Sans" }
  },
  "seo": {
    "primaryKeywords": ["blues music venue", "natchez mississippi"],
    "localKeywords": ["mississippi river", "live music"],
    "contentPillars": ["Blues heritage", "Southern hospitality"],
    "competitors": ["competitor1.com"]
  },
  "integrations": {
    "gbp": { "enabled": true, "locationId": "abc123" },
    "website": { "platform": "wordpress", "apiKey": "..." },
    "social": { "platforms": ["instagram", "facebook"] }
  },
  "workflows": {
    "autoPublish": false,
    "requireApproval": true,
    "notifyOnContent": true
  },
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-20T00:00:00.000Z"
}
```

## Configured Tenants

| ID | Name | Archetype | Business Type |
|----|------|-----------|---------------|
| `bigmuddy` | Big Muddy Inn | Southern Storyteller | Hospitality |
| `cptv` | Chase Pierson TV | Tech Rebellion | Personal Brand |
| `studioc` | Studio C | Cultural Archivist | Production |
| `tuthill` | Tuthill Design | Visionary Artist | Design |
| `utopia` | Utopia Studios | Legendary Host | Recording Studio |

## Style Engine

Location: `/lib/style-engine.js`

The Style Engine applies brand-specific voice and visual style to all generated content.

### Brand Archetypes

| Archetype | Description | Use For |
|-----------|-------------|---------|
| `visionary_artist` | Sophisticated, evocative, rhythmic | Design, architecture |
| `cultural_archivist` | Intellectual, collaborative, gritty | Production, documentary |
| `tech_rebellion` | Immediate, visceral, urgent | Tech, innovation |
| `legendary_host` | Storied, high-fidelity, warm | Studios, venues |
| `warm_southern` | Warm, welcoming, heritage-rich | Hospitality, regional |

### Style Wash

Apply brand voice to content prompts:

```javascript
import { applyStyleWash } from './lib/style-engine.js';

// Returns prompt with brand voice applied
const styledPrompt = applyStyleWash('bigmuddy', 'social', 'Announce Friday blues night');
```

Content types supported:
- `image` - Photography and visual prompts
- `social` - Social media posts
- `blog` - Long-form content
- `caption` - Photo captions

### Voice Guidelines

Each tenant has defined voice guidelines:

```javascript
{
  philosophy: "Where the river meets the blues...",
  tone: ["Warm", "Welcoming", "Storytelling"],
  doSay: ["Paint pictures with words", "Let the history speak"],
  dontSay: ["Generic hospitality language", "Rushed tone"],
  samplePhrases: ["Where the Mississippi whispers its secrets..."]
}
```

## API Usage

### List Tenants
```bash
curl -H "X-API-Key: KEY" https://superchase-production.up.railway.app/api/tenants
```

### Get Tenant Config
```bash
curl -H "X-API-Key: KEY" https://superchase-production.up.railway.app/api/tenants/bigmuddy
```

### Create Tenant
```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"id":"newclient","name":"New Client","businessType":"retail"}' \
  https://superchase-production.up.railway.app/api/tenants
```

### Update Tenant
```bash
curl -X PUT -H "X-API-Key: KEY" \
  -d '{"branding":{"voice":"legendary_host"}}' \
  https://superchase-production.up.railway.app/api/tenants/bigmuddy
```

## Routing to Tenants

The Tenant Manager routes API calls to tenant-specific handlers:

```javascript
import tenantManager from './core/tenant-manager.js';

// Route a GBP action to a specific tenant
const result = await tenantManager.routeToTenant('bigmuddy', 'gbp', 'post', {
  text: 'New event this Friday!'
});
```

Supported spokes:
- `gbp` - Google Business Profile
- `content` - Brainstorm/content generation
- `portal` - Queue management

## Adding a New Tenant

1. Create via API:
```bash
curl -X POST -H "X-API-Key: KEY" \
  -d '{"id":"newclient","name":"New Client Co","businessType":"consulting"}' \
  https://superchase-production.up.railway.app/api/tenants
```

2. Update config with branding:
```bash
curl -X PUT -H "X-API-Key: KEY" \
  -d '{"branding":{"voice":"visionary_artist"},"seo":{"primaryKeywords":["consulting","strategy"]}}' \
  https://superchase-production.up.railway.app/api/tenants/newclient
```

3. Add style prompts to `/lib/style-engine.js` (optional, uses defaults otherwise)

## Caching

Tenant configs are cached for 5 minutes to reduce disk reads. Cache is invalidated on update.

---

*See also: [Review Workflow](/system/review-workflow), [Client Portals](/operations/client-portals)*

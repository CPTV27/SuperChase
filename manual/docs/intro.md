---
sidebar_position: 1
slug: /
title: SuperChase Manual
---

# SuperChase Executive OS v2.1

> AI-powered executive assistant with hub-and-spoke architecture and multi-tenant agency mode

## Quick Links

| Resource | Description |
|----------|-------------|
| [Dashboard](https://superchase-dashboard-production.up.railway.app) | Live command center |
| [System Blueprint](/system/george) | How George works |
| [API Reference](/system/api) | Endpoint documentation |
| [Agency Mode](/system/agency-mode) | Multi-tenant architecture |
| [Review Workflow](/system/review-workflow) | Content approval pipeline |
| [Client Portals](/operations/client-portals) | Portal management |

## System Architecture v2.1

```
+------------------------------------------------------------------+
|                    SuperChase Executive OS v2.1                   |
+------------------------------------------------------------------+
|                                                                   |
|   +-----------+    +-------------+    +-----------+               |
|   | Dashboard |---→|   George    |←---|  Railway  |               |
|   |  (React)  |    |  (Gemini)   |    | (Deploy)  |               |
|   +-----------+    +------+------+    +-----------+               |
|                           |                                       |
|   +-----------------------+------------------------+              |
|   |                       |                        |              |
|   v                       v                        v              |
|   +----------+    +------------+    +------------+                |
|   |  Asana   |    |   Gmail    |    |  Twitter   |                |
|   | (Tasks)  |    |  (Triage)  |    | (Research) |                |
|   +----------+    +------------+    +------+-----+                |
|                                            |                      |
|   +----------------------------------------+                      |
|   |           v2.1 Agency Spokes           |                      |
|   +----------------------------------------+                      |
|   |                       |                |                      |
|   v                       v                v                      |
|   +------------+   +-------------+   +----------+                 |
|   |   Portal   |   |   Agency    |   |   GBP    |                 |
|   |  (Queue)   |   |  (Review)   |   | (Google) |                 |
|   +------------+   +-------------+   +----------+                 |
|         |                 |                                       |
|         v                 v                                       |
|   +------------+   +-------------+                                |
|   |  Tenants   |   |   Style     |                                |
|   | (Clients)  |   |  Engine     |                                |
|   +------------+   +-------------+                                |
|                                                                   |
+------------------------------------------------------------------+
```

## v2.1 New Capabilities

| Feature | Description |
|---------|-------------|
| **Agency Mode** | Multi-tenant client management with isolated data |
| **Review Workflow** | Content approval: Draft -> Agency -> Client -> Published |
| **Client Portals** | Per-client content queues and asset management |
| **Style Engine** | Brand archetypes and voice guidelines per tenant |
| **GBP Spoke** | Google Business Profile integration |
| **Twitter Publish** | Post tweets and threads via API |
| **Circuit Breakers** | Resilient spoke connections with fallbacks |
| **Request Metrics** | p50/p95/p99 latency tracking |

## Configured Tenants

| Tenant ID | Name | Archetype |
|-----------|------|-----------|
| `bigmuddy` | Big Muddy Inn | Southern Storyteller |
| `cptv` | Chase Pierson TV | Tech Rebellion |
| `studioc` | Studio C | Cultural Archivist |
| `tuthill` | Tuthill Design | Visionary Artist |
| `utopia` | Utopia Studios | Legendary Host |

## Business Units

| Unit | Focus | Color |
|------|-------|-------|
| **Scan2Plan** | Reality capture & 3D scanning | Blue |
| **Studio C** | Video production & streaming | Emerald |
| **CPTV** | Personal brand & content | Purple |
| **Tuthill Design** | Editorial vision & design | Orange |

## Quick Start

### CLI Quick Ingest
```bash
# Capture a task from terminal
sc "Follow up with Miles about shoot" @studio

# With priority
sc "URGENT: Fix proposal bug" @s2p --priority high
```

### Dashboard Access
Visit [superchase-dashboard-production.up.railway.app](https://superchase-dashboard-production.up.railway.app)

### API Health Check
```bash
# Basic health
curl https://superchase-production.up.railway.app/health

# Detailed with circuit breakers
curl https://superchase-production.up.railway.app/api/health

# Request metrics
curl https://superchase-production.up.railway.app/api/metrics
```

### Review Pulse
```bash
curl -H "X-API-Key: KEY" https://superchase-production.up.railway.app/api/review/pulse
```

## Documentation Structure

- **System Blueprint** - How SuperChase works under the hood
- **Agency Mode** - Multi-tenant architecture details
- **Review Workflow** - Content approval pipeline
- **Projects** - Live status for each business unit
- **Operations** - SOPs, client portals, and workflow documentation
- **Retrospectives** - Weekly summaries and strategic reviews

---

*SuperChase Executive OS v2.1 - Built with Claude Code*

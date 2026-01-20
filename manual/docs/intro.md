---
sidebar_position: 1
slug: /
title: SuperChase Manual
---

# SuperChase Executive OS

> AI-powered executive assistant with hub-and-spoke architecture

## Quick Links

| Resource | Description |
|----------|-------------|
| [Dashboard](https://superchase-dashboard-production.up.railway.app) | Live command center |
| [System Blueprint](/system/george) | How George works |
| [API Reference](/system/api) | Endpoint documentation |
| [Projects](/projects/s2p) | Business unit status |

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SuperChase Executive OS                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Dashboard  │───▶│   George    │◀───│   Railway   │     │
│  │   (React)   │    │  (Gemini)   │    │  (Deploy)   │     │
│  └─────────────┘    └──────┬──────┘    └─────────────┘     │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         ▼                  ▼                  ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Asana     │    │   Gmail     │    │   Twitter   │     │
│  │   (Tasks)   │    │  (Triage)   │    │ (Research)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

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
curl https://superchase-production.up.railway.app/health
```

## Documentation Structure

- **System Blueprint** - How SuperChase works under the hood
- **Projects** - Live status for each business unit
- **Operations** - SOPs and workflow documentation
- **Retrospectives** - Weekly summaries and strategic reviews

---

*SuperChase Executive OS v2.3 · Built with Claude Code*

---
sidebar_position: 2
title: Scan2Plan Pilot
description: Rolling out SuperChase OS to the first business unit
tags: [pilot, s2p, rollout]
---

# Scan2Plan Pilot Program

> First internal deployment of SuperChase OS for Clients

Scan2Plan is the proving ground for the "Startup in a Box" protocol. Every friction discovered here prevents a bug in future client deployments.

---

## Pilot Overview

| Attribute | Value |
|-----------|-------|
| **Business** | Scan2Plan (Reality Capture & 3D Scanning) |
| **Status** | Phase 1: Mirroring |
| **Start Date** | 2026-01-20 |
| **Owner** | Chase Pierson |
| **Team** | Owen, Agata, Jake |

---

## Rollout Phases

### Phase 1: Mirroring (Current)

**Goal:** Capture existing S2P operations in SuperChase without changing workflows.

| Task | Status | Notes |
|------|--------|-------|
| Create `docs/projects/s2p.md` | Done | Basic template |
| Connect Asana S2P workspace | Done | Via spoke |
| Enable `sc ... @s2p` capture | Done | CLI active |
| Log 10 tasks via CLI | Pending | Dogfooding |

**Success Criteria:**
- [ ] 10+ tasks captured via `sc @s2p` in 7 days
- [ ] Project doc auto-updates working
- [ ] No manual Asana entry needed

### Phase 2: Agent Tuning

**Goal:** Customize George for S2P-specific language and workflows.

| Task | Status | Notes |
|------|--------|-------|
| Create S2P agent personality | Pending | George learns scanning jargon |
| Define S2P-specific intents | Pending | Quote, scan, deliver, invoice |
| Train on S2P ROADMAP context | Pending | CPQ, PandaDoc, field ops |

**S2P Vocabulary for George:**
```
- "scan" → Reality capture job
- "quote" → CPQ proposal generation
- "blueprint" → CAD/BIM deliverable
- "site visit" → Field technician dispatch
- "Matterport" → 3D scanning equipment
- "point cloud" → Raw scan data
```

### Phase 3: Live Ingest

**Goal:** Deploy S2P-specific CLI aliases and workflows.

**Proposed Aliases:**
```bash
# Scan job intake
sc-scan "123 Main St, 5000 sqft commercial"
# Auto-creates: Asana task + Quote draft + Calendar block

# Quote follow-up
sc-quote "Acme Corp" --follow-up 3d
# Auto-creates: Follow-up task + Email draft

# Deliverable tracking
sc-deliver "Project XYZ" --type blueprint
# Updates: Project status + Client notification
```

### Phase 4: Full Automation

**Goal:** End-to-end S2P workflow with minimal manual intervention.

```
Email inquiry → George triage → Auto-quote draft →
Calendar scheduling → Field dispatch → Scan completion →
Deliverable upload → Invoice generation → Follow-up sequence
```

---

## George S2P Personality

### Core Instructions

```markdown
You are George, the AI assistant for Scan2Plan operations.

**Business Context:**
- Scan2Plan provides reality capture and 3D scanning services
- Key offerings: Site scans, point clouds, CAD/BIM blueprints
- Equipment: Matterport Pro2, Leica RTC360, drones
- Team: Owen (sales/ops), Agata (ops), Jake (field tech)

**Communication Style:**
- Technical but accessible
- Assume client may not know scanning terminology
- Always confirm square footage and deliverable type
- Flag urgent timelines (< 1 week turnaround)

**Default Actions:**
- New inquiry → Create quote task, estimate timeline
- Quote accepted → Schedule site visit, assign tech
- Scan complete → Trigger processing pipeline
- Deliverable ready → Notify client, create invoice task

**Key Integrations:**
- Asana: S2P Projects workspace
- PandaDoc: Proposal generation
- QuickBooks: Invoicing (future)
```

### Intent Recognition

| Intent | Trigger Phrases | Action |
|--------|-----------------|--------|
| `new_scan_request` | "need a scan", "quote for", "how much to scan" | Create quote task |
| `schedule_visit` | "schedule", "when can you come", "site visit" | Check calendar, propose times |
| `deliverable_status` | "where's my blueprint", "scan ready?", "progress" | Check project status |
| `invoice_request` | "send invoice", "billing", "payment" | Generate invoice task |

---

## Metrics & KPIs

### Pilot Success Metrics

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Tasks via CLI | 0 | 50/week | - |
| Manual Asana entries | 100% | < 20% | - |
| Quote response time | 24h | 4h | - |
| George query accuracy | - | > 80% | - |

### Business Impact (Expected)

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Time to quote | 2 hours | 15 minutes |
| Missed follow-ups | 3/week | 0 |
| Context switches/day | 50+ | < 20 |

---

## Learnings → Evolution

Frictions discovered in this pilot feed back to [SuperChase Evolution](/lab/superchase-evolution):

| Friction Found | Severity | Applied To |
|----------------|----------|------------|
| *Pending pilot start* | - | - |

---

## Timeline

| Week | Milestone |
|------|-----------|
| W1 (Jan 20-26) | Phase 1: Mirroring complete |
| W2 (Jan 27-Feb 2) | Phase 2: Agent tuning |
| W3 (Feb 3-9) | Phase 3: Live ingest aliases |
| W4 (Feb 10-16) | Phase 4: Full automation test |
| W5+ | Production rollout |

---

*Pilot Owner: Chase Pierson*
*Last Updated: 2026-01-20*

# Project MARS
## Product Requirements Document — v1.0

**Version:** 1.0
**Date:** January 26, 2026
**Author:** Chase Pierson
**Status:** Active

---

## Vision

MARS is a planning layer for a portfolio operator. One human, multiple businesses, a council of AI agents that think together, and a gallery of visual artifacts that communicate the plan.

**v1 scope:** Strategic planning and visual communication. Execution happens through the team (Elijah, contractors, etc.) working with the artifacts MARS produces.

---

## The Problem

You run five businesses. Each needs:
- Strategic decisions requiring multiple perspectives
- Research and market intelligence
- Clear communication of plans to team members
- Institutional memory that compounds over time

**Current state:** You context-switch constantly, repeat yourself to AI assistants, lose insights between sessions, and communicate plans through scattered docs and conversations.

**Desired state:** You think with the council, capture plans as visual artifacts, hand off to the team, and everything persists in memory for next time.

---

## Design Principles

### 1. Council Over Oracle

No single model has all the answers. MARS convenes a council with different perspectives. Decisions come from structured disagreement, not singular output.

### 2. Visual Over Verbal

Complex ideas deserve visual form. MARS produces microsites and decks, not walls of text. A link replaces a thousand-word email.

### 3. Memory as Foundation

Every interaction builds institutional knowledge. Six months from now, MARS knows your pricing philosophy, your past decisions, your strategic context.

### 4. Business as First-Class Concept

@s2p and @studio-c are separate cognitive spaces. Cross-business queries are explicit, not accidental.

### 5. Planning, Not Execution

MARS plans. Humans execute. The artifacts are the handoff—clear enough that the team knows exactly what to do.

---

## What MARS Does (v1)

### Council — Strategic Thinking

Ask a question, get four perspectives, receive a synthesis that shows consensus and divergence.

**Flow:**
```
Question → 4 models in parallel → Structured synthesis → Stored in notebook
```

**Models:**
| Agent | Role |
|-------|------|
| Grok | Contrarian, real-time data |
| Gemini | Structured analysis, data-driven |
| GPT-4 | Deep reasoning, edge cases |
| Claude | Synthesis, integration |

---

### Artifacts — Visual Communication

Generate microsites and decks that communicate plans visually. Share with a link.

**Types:**
- **Microsite** — Single-page site for a concept (proposal, strategy, scope)
- **Slide Deck** — Web slides + PDF export
- **One-Pager** — Quick reference PDF/PNG
- **Diagram** — Workflow, system, or relationship visualization

**Flow:**
```
Council output → "Generate artifact?" → Select type → Edit inline → Publish → Share link
```

---

### Memory — Institutional Knowledge

Everything persists in OpenNotebook. Each business has its own notebook. The orchestrator notebook holds cross-business synthesis.

**Structure:**
```
Orchestrator (cross-business)
├── Scan2Plan (@s2p)
├── Studio C (@studio-c)
├── Big Muddy Inn (@bigmuddy)
├── Tuthill Design (@tuthill)
├── CPTV (@cptv)
└── Utopia (@utopia)
```

---

### Research — Information Input

Web research, market analysis, competitive intelligence. Feeds the council, informs the artifacts.

**Capabilities:**
- Web search and synthesis
- Competitive analysis
- Market sizing
- Trend identification

---

## What MARS Does NOT Do (v1)

- ❌ Write or send emails
- ❌ Manage calendars
- ❌ Execute marketing campaigns
- ❌ Post to social media
- ❌ Manage tasks in Asana/Things

These are execution. MARS plans. Team executes from artifacts.

---

## The Interface

### Primary: Artifact Gallery

Visual grid of all artifacts, organized by business, type, and status.

```
┌─────────────────────────────────────────────────────────────┐
│  MARS — Gallery                        [+ New] [Council]    │
├─────────────────────────────────────────────────────────────┤
│  [All ▾] [Microsites ▾] [This Month ▾]                      │
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │ ░░░░░░░░░ │ │ ░░░░░░░░░ │ │ ░░░░░░░░░ │ │ ░░░░░░░░░ │   │
│  │ ░░░░░░░░░ │ │ ░░░░░░░░░ │ │ ░░░░░░░░░ │ │ ░░░░░░░░░ │   │
│  ├───────────┤ ├───────────┤ ├───────────┤ ├───────────┤   │
│  │ S2P       │ │ Studio C  │ │ Big Muddy │ │ The Feed  │   │
│  │ Pricing   │ │ Deck      │ │ Events    │ │ Launch    │   │
│  │ @s2p      │ │ @studio-c │ │ @bigmuddy │ │ @utopia   │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Secondary: Council Panel

Chat interface for strategic questions. Council responses feed artifact generation.

### Tertiary: Notebook Browser

View and search stored knowledge across all business notebooks.

---

## User Flow

### Strategic Question → Artifact

```
1. Open Council panel
2. Ask: "@s2p How should we position against Matterport?"
3. Council deliberates (4 models, ~30 seconds)
4. Review synthesis (consensus + divergence)
5. Click "Generate Artifact"
6. Select: Microsite
7. MARS generates draft with S2P branding
8. Edit inline if needed
9. Publish
10. Share link with team or client
```

### Direct Artifact Creation

```
1. Click "+ New" in Gallery
2. Select: Microsite
3. Select: @s2p
4. Describe: "Proposal for Tuthill landscape scanning project"
5. MARS pulls context from @s2p notebook
6. MARS generates draft
7. Edit inline
8. Publish
9. Share link
```

### Research → Council → Artifact

```
1. Ask: "@s2p Research the as-built documentation market size"
2. MARS performs web research
3. MARS synthesizes findings
4. Stored in @s2p notebook
5. Later: "Create a market overview microsite from that research"
6. MARS generates artifact from stored research
```

---

## Handoff to Team

The artifact IS the handoff. It contains:
- The strategic decision
- The rationale (council synthesis)
- The action items
- The visual presentation

Team members (Elijah, etc.) can:
- View artifacts directly
- Download PDFs
- Access the context in notebooks
- Execute based on the plan

Future: Team members get their own MARS access for status updates and clarifications.

---

## Technical Stack

### Council
- OpenRouter for multi-model access
- Parallel dispatch, async responses
- Cost tracking per query

### Artifacts
- React + Tailwind templates
- Per-business branding
- Static hosting (Cloudflare Pages or similar)
- Inline WYSIWYG editor

### Memory
- OpenNotebook for persistence
- Semantic search (built into OpenNotebook)
- Per-business notebook isolation

### Research
- Web search integration
- Source tracking and citation
- Synthesis storage in notebooks

---

## Success Metrics

### Planning Quality
- Council divergence rate: 20-40% (meaningful disagreement)
- Decisions made faster with higher confidence

### Artifact Utility
- 80% of external communication via artifact links
- Team can execute from artifacts without clarification calls

### Memory Value
- Past context surfaces automatically
- No re-explaining strategic decisions

---

## Roadmap

### Phase 1: Foundation ✓
- [x] Multi-model council
- [x] Business routing (@mentions)
- [x] OpenNotebook persistence
- [x] Bug fixes (parsing, response format)

### Phase 2: Artifact Engine
- [ ] Microsite template system
- [ ] Business-branded templates
- [ ] Council → Artifact flow
- [ ] Inline editor
- [ ] Publish to shareable URL
- [ ] Artifact gallery UI

### Phase 3: Memory & Research
- [ ] Semantic search across notebooks
- [ ] Web research integration
- [ ] Auto-context injection
- [ ] Cross-business synthesis

### Phase 4: Team Layer (Future)
- [ ] Team member access
- [ ] Execution status tracking
- [ ] Marketing automation integration
- [ ] Social channel management

---

## The Handoff Principle

MARS produces plans. Plans live in artifacts. Artifacts are the handoff.

The quality bar for an artifact: **Can Elijah execute from this without a follow-up conversation?**

If yes, the artifact is done. If no, it needs more detail.

---

*Plan visually. Share with a link. Execute through the team.*

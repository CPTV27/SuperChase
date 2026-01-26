# MARS Phase 2: Artifact Engine

## Context

Phase 1 is complete:
- Multi-model council: Working (4/4 models)
- Business routing (@mentions): Working
- OpenNotebook persistence: Working
- Bug fixes: Complete

Phase 2 builds the Artifact Engine — the system that generates microsites, decks, and visual artifacts from council output.

## Reference Documents

Read these first:
- `docs/PRD.md` — Product requirements (vision, principles, capabilities)
- `docs/SELF-IMPROVEMENT.md` — Learning system spec
- `CANONICAL.md` — This is the one true codebase

## Notebooks

| Notebook | ID | Purpose |
|----------|-----|---------|
| Orchestrator | `notebook:fe5sb11m1u3xdvnd7i9e` | Cross-business synthesis |
| MARS-Tools | `notebook:l1shb4pr5b4xwb4o6t4n` | Tool research |
| MARS-Learning | `notebook:srabz08izic34yokgrlw` | Feedback & patterns |

Business notebooks: s2p, studio-c, bigmuddy, tuthill, cptv, utopia

---

## Phase 2 Deliverables

### 1. Artifact Types

Build generators for:

**Microsite**
- Single-page website for a concept
- Sections: hero, problem, solution, specifics, CTA, footer
- Output: Static HTML deployable to URL

**Slide Deck**
- Web-based slides (reveal.js or similar)
- PDF export option
- Output: HTML slides + PDF

**One-Pager**
- Single-page summary
- Output: HTML + PDF + PNG

**Diagram**
- Mermaid or similar for workflows/systems
- Output: SVG + PNG

### 2. Template System

Each business gets branded templates:

```javascript
// templates/config.js
const BUSINESS_TEMPLATES = {
  s2p: {
    name: "Scan2Plan",
    primaryColor: "#2563eb", // Blue
    font: "Inter",
    logo: "/assets/s2p-logo.svg",
    vibe: "Technical precision"
  },
  "studio-c": {
    name: "Studio C",
    primaryColor: "#000000", // Black/Gold
    font: "Montserrat",
    logo: "/assets/studio-c-logo.svg",
    vibe: "Premium media"
  },
  bigmuddy: {
    name: "Big Muddy Inn",
    primaryColor: "#166534", // Deep green
    font: "Playfair Display",
    logo: "/assets/bigmuddy-logo.svg",
    vibe: "Southern hospitality"
  },
  // ... tuthill, cptv, utopia
};
```

Templates auto-apply based on @mention routing.

### 3. Generation Flow

```
Council Output
     ↓
User clicks "Generate Artifact"
     ↓
Select type: [Microsite] [Deck] [One-Pager] [Diagram]
     ↓
MARS generates draft with business branding
     ↓
Inline editor for review/tweaks
     ↓
Publish to shareable URL
     ↓
Track outcome (feedback system)
```

### 4. Artifact Gallery UI

Primary interface — visual grid of all artifacts:

```
┌─────────────────────────────────────────────────────────────┐
│  MARS — Gallery                        [+ New] [Council]    │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All ▾] [Microsites ▾] [This Month ▾]              │
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │ thumbnail │ │ thumbnail │ │ thumbnail │ │ thumbnail │   │
│  ├───────────┤ ├───────────┤ ├───────────┤ ├───────────┤   │
│  │ Title     │ │ Title     │ │ Title     │ │ Title     │   │
│  │ @business │ │ @business │ │ @business │ │ @business │   │
│  │ Status    │ │ Status    │ │ Status    │ │ Status    │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────┘
```

Features:
- Thumbnail preview of each artifact
- Filter by business, type, status, date
- Click to open, edit, share
- Search across artifacts

### 5. Publishing System

Artifacts publish to shareable URLs:

```
https://mars.yourdomain.com/{business}/{slug}

Examples:
https://mars.yourdomain.com/s2p/tuthill-proposal-2026-01
https://mars.yourdomain.com/studio-c/capabilities-deck
```

Options:
- **Cloudflare Pages** — Static hosting, edge deployment
- **Vercel** — Easy deploys
- **Local first** — Save to `/artifacts` folder, manual deploy later

Start with local generation + manual deploy. Add auto-publish later.

### 6. Inline Editor

WYSIWYG editing for generated artifacts:
- Edit text in place
- Reorder sections (drag/drop)
- Swap images
- Preview changes live

Libraries to consider:
- TipTap (rich text)
- Plate (Notion-like)
- Or simple contenteditable + custom controls

### 7. Feedback Capture (Self-Improvement)

Every artifact gets outcome tracking:

```javascript
// When artifact is generated
const artifact = {
  id: generateId(),
  type: "microsite",
  business: "s2p",
  title: "Tuthill Proposal",
  created: new Date(),
  status: "draft",
  
  // Feedback tracking
  feedback: {
    rating: null,           // User explicit rating
    editCount: 0,           // Times edited before publish
    timeToPublish: null,    // How long from create to publish
    shared: false,          // Was it shared externally?
    revisions: [],          // Edit history
  }
};

// On edit
artifact.feedback.editCount++;
artifact.feedback.revisions.push({
  timestamp: new Date(),
  changes: diffFromPrevious
});

// On publish
artifact.feedback.timeToPublish = Date.now() - artifact.created;

// On share
artifact.feedback.shared = true;

// Store to MARS-Learning notebook
await storeToLearning({
  type: "artifact_outcome",
  artifact_id: artifact.id,
  artifact_type: artifact.type,
  business: artifact.business,
  feedback: artifact.feedback,
  timestamp: new Date()
});
```

### 8. Pattern Detection (Weekly Job)

Analyze feedback data weekly:

```javascript
// scripts/analyze-patterns.js

async function analyzePatterns() {
  // Get all feedback from MARS-Learning notebook
  const feedback = await getLearningNotes({ type: "artifact_outcome" });
  
  // Find patterns
  const patterns = [];
  
  // Pattern: Common edits
  const editPatterns = findCommonEdits(feedback);
  if (editPatterns.length > 0) {
    patterns.push({
      type: "common_edit",
      insight: `Users frequently add "${editPatterns[0].section}" section`,
      evidence: `${editPatterns[0].count}/${feedback.length} artifacts edited to add this`,
      suggestion: `Include "${editPatterns[0].section}" in default template`
    });
  }
  
  // Pattern: High rejection rate for type
  const rejectionRates = calcRejectionByType(feedback);
  // ...
  
  // Store patterns for human review
  await storeToOrchestrator({
    type: "weekly_patterns",
    patterns,
    timestamp: new Date()
  });
  
  return patterns;
}
```

---

## Technical Stack

### Frontend (Artifact Gallery + Editor)

Extend existing React frontend in `/frontend`:

```
frontend/src/
├── components/
│   ├── Gallery/
│   │   ├── ArtifactGrid.jsx
│   │   ├── ArtifactCard.jsx
│   │   ├── FilterBar.jsx
│   │   └── SearchBox.jsx
│   ├── Editor/
│   │   ├── MicrositeEditor.jsx
│   │   ├── DeckEditor.jsx
│   │   ├── OnePagerEditor.jsx
│   │   └── DiagramEditor.jsx
│   ├── Templates/
│   │   ├── MicrositeTemplate.jsx
│   │   ├── DeckTemplate.jsx
│   │   └── OnePagerTemplate.jsx
│   └── ...existing components
├── pages/
│   ├── Gallery.jsx
│   ├── Editor.jsx
│   └── ...existing pages
```

### Backend (Artifact API)

Add to existing server:

```
/api/artifacts
  POST   /generate     - Generate new artifact from council output
  GET    /             - List all artifacts (with filters)
  GET    /:id          - Get single artifact
  PUT    /:id          - Update artifact
  DELETE /:id          - Delete artifact
  POST   /:id/publish  - Publish to URL
  POST   /:id/feedback - Submit feedback
```

### Storage

Artifacts stored in:
1. **Local filesystem** — `/artifacts/{id}/` with index.html, assets
2. **OpenNotebook** — Metadata, feedback, for council access

---

## Implementation Order

### Week 1: Foundation
1. Artifact data model + API endpoints
2. Basic microsite template (one business first: @s2p)
3. Generate from council output
4. Save to filesystem

### Week 2: Gallery UI
5. Artifact gallery component
6. Filter/search
7. Basic editing (text only)
8. Manual publish (copy files)

### Week 3: Polish + Feedback
9. All business templates
10. Inline editor improvements
11. Feedback capture on all interactions
12. Store outcomes to MARS-Learning

### Week 4: Additional Types
13. Deck generator
14. One-pager generator
15. Diagram generator
16. Pattern detection job

---

## API Examples

### Generate Artifact

```bash
curl -X POST http://localhost:3333/api/artifacts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "microsite",
    "business": "s2p",
    "title": "Tuthill Landscape Scanning Proposal",
    "councilOutput": {
      "synthesis": "...",
      "responses": {...}
    },
    "sections": {
      "hero": "Precision As-Built Documentation",
      "problem": "Traditional surveys miss critical details...",
      "solution": "Scan2Plan delivers sub-millimeter accuracy...",
      "specifics": {
        "timeline": "2 weeks",
        "price": "$8,500",
        "deliverables": ["Point cloud", "BIM model", "2D drawings"]
      },
      "cta": "Schedule a consultation"
    }
  }'
```

### List Artifacts

```bash
curl "http://localhost:3333/api/artifacts?business=s2p&type=microsite&status=published"
```

### Submit Feedback

```bash
curl -X POST http://localhost:3333/api/artifacts/abc123/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "positive",
    "shared": true,
    "notes": "Client loved it"
  }'
```

---

## Quality Bar

An artifact is ready when:

> **"Can Elijah execute from this without a follow-up conversation?"**

If the artifact clearly communicates the plan, it ships. If it needs explanation, it needs more detail.

---

## Success Criteria

Phase 2 is complete when:

1. [ ] Can generate microsite from council output
2. [ ] Microsite has business branding (at least @s2p)
3. [ ] Gallery shows all artifacts with thumbnails
4. [ ] Can edit artifact inline
5. [ ] Can publish to shareable URL (even if manual)
6. [ ] Feedback captured on every artifact
7. [ ] Outcomes stored to MARS-Learning notebook

Stretch:
- [ ] Deck generator working
- [ ] One-pager generator working
- [ ] Pattern detection job running weekly

---

## Notes for Claude Code

- Start with @s2p templates, expand to other businesses
- Use Tailwind for styling (already in project)
- Keep templates simple — we can enhance later
- Feedback capture is mandatory, not optional
- Test with real council output, not mocks
- Reference `research/tools/` for any external services needed

---

## Commands to Verify

```bash
# After implementation, these should work:

# Generate artifact
curl -X POST localhost:3333/api/artifacts/generate -d '...'

# List artifacts
curl localhost:3333/api/artifacts

# Check gallery UI
open http://localhost:5175/gallery

# Verify feedback stored
curl localhost:3333/api/notebooks/MARS-Learning/notes
```

---

*Phase 2 transforms council thinking into shareable visual artifacts. Ship the microsite generator first, iterate from there.*

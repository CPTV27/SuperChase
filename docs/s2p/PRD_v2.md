# Scan2Plan Command Center - Product Requirements Document (PRD)
**Version:** 2.0 - Demo Ready Edition
**Date:** January 22, 2026
**Owner:** CEO
**Status:** Active Development → CEO Demo Prep

---

## EXECUTIVE SUMMARY

### Product Vision
The S2P Command Center is a revenue intelligence platform that helps the CEO get more meetings and win more jobs by automatically classifying prospects, matching proof assets, and enforcing pricing discipline.

### Success Metrics (The Only 3 That Matter)
1. **New Prospects Added** - Pipeline volume
2. **Meetings Booked** - Conversion rate
3. **Jobs Won** - Revenue

### Target User
**Primary:** CEO (solo sales operator)
**Secondary:** Future sales team members

### Current Phase
**MVP Demo** - Proving value to CEO before building production system

---

## PRODUCT PRINCIPLES

### 1. Signal Over Noise
Every element on screen must drive a decision or action. Remove everything else.

### 2. Action-Oriented
The interface shows what to do next, not just what exists.

### 3. Revenue-Focused
If it doesn't impact meetings or jobs, it doesn't belong in the command center.

### 4. Single-User First
No multi-tenant complexity. This is CEO's personal command center.

### 5. Proof-Centric
The 12-Point Standard is our differentiation. Every view should connect to proof.

---

## CORE FEATURES

### Feature 1: TODAY View (Daily Hit List)
**Priority:** P0 (Must Have for Demo)

**Purpose:** CEO opens the app and immediately sees what to do today.

**Sections (in priority order):**

1. **OVERDUE (Red)**
   - Items past due date
   - Sorted by days overdue (oldest first)
   - Shows: Lead name, last action, days overdue, next action
   - Actions: Call, Email, Done

2. **HOT LEADS (Yellow)**
   - High intent signals (proof viewer clicks, warm intros, reply received)
   - Sorted by signal strength
   - Shows: Lead name, signal type, when, next action
   - Actions: Call, Email, Done

3. **OUTBOUND BATCH (Blue)**
   - Wave 1 leads ready for proof mailers
   - Shows: Lead name, matched proof, next action
   - Actions: Send Batch, Individual Send

4. **PROPOSAL STAGE (Green)**
   - Deals pending decision
   - Sorted by days in stage
   - Shows: Deal name, value, GM%, days pending
   - Actions: Follow Up, View Deal

**Success Criteria:**
- CEO can complete daily workflow in <10 minutes
- No items fall through cracks (overdue visible)
- Clear prioritization (red → yellow → blue → green)

**Technical Requirements:**
- Real-time data from `/api/s2p/leads` and `/api/s2p/deals`
- Action buttons trigger toast notifications
- Items disappear when marked Done
- Refresh button to reload data

---

### Feature 2: LEADS View (Wave 1 Targets)
**Priority:** P0 (Must Have for Demo)

**Purpose:** Show top 25 Tier-A targets with enrichment status.

**Display:**
- Default filter: Wave 1 only (25 leads)
- Grouped by status: Ready, Needs Work, In Progress
- Each lead card shows: Tier badge, name, score, next action, quick actions

**Lead Card Format:**
```
[Tier: A] Gensler                    Score: 100
Healthcare, 10M SF, ENR #2
Proof: Mount Sinai (80% match)
Next: Send proof mailer
[📧 Email] [✓ Done]
```

**Click Lead → Opens Drawer:**
- Next Action (top, prominent)
- Contact Info (name, email, phone with copy buttons)
- Proof Matched (top 3 with 12-Point narratives)
- Tier + Score + Reasoning (compact)
- Proof Gaps (if any)

**Success Criteria:**
- Can identify best targets in <30 seconds
- Know exactly what proof to send
- One-click to draft email with proof narrative

**Technical Requirements:**
- Load from `/api/s2p/leads?wave=1`
- Proof matching from `/api/s2p/proof-matcher`
- Drawer slides in from right
- Copy buttons use clipboard API + toast feedback

---

### Feature 3: PIPELINE View (Active Deals)
**Priority:** P0 (Must Have for Demo)

**Purpose:** Track deals and enforce 40% GM floor.

**Display:**
- 3 stages only: Meeting → Proposal → Won
- Kanban layout with drag-and-drop
- Each card shows: Firm name, value, GM%, stage

**Deal Card Format:**
```
Mount Sinai Hospital
$120K
45% GM ✓
```

**GM Color Coding:**
- Green (≥45%): Good margin
- Yellow (40-44%): Warning
- Red (<40%): VETO - blocked

**Governance Enforcement:**
When user tries to advance deal with <40% GM:
1. Modal blocks action
2. Shows violation: "GM 38% is below 40% floor"
3. Presents options: Reprice, Reduce Scope, Cancel
4. Deal cannot advance until fixed

**Success Criteria:**
- Spot low-margin deals instantly (VETO badge)
- Cannot accidentally advance bad deals
- Clear path to fix violations

**Technical Requirements:**
- Load from `/api/s2p/deals`
- Governance validation via `/api/s2p/governance/validate`
- Drag-and-drop uses react-beautiful-dnd or native
- Modal overlay with violation details

---

### Feature 4: PROOF View (Case Studies)
**Priority:** P0 (Must Have for Demo)

**Purpose:** Access proof assets with 12-Point narratives for emails.

**Display:**
- Grid of 6 proof assets
- Each shows: Thumbnail, name, building type, LoD
- Click → Modal with full 12-Point narrative

**Proof Card Format:**
```
[Thumbnail]
Mount Sinai Healthcare Retrofit
Healthcare | 150K SF | LoD 350
[View Details]
```

**Proof Modal:**
```
Mount Sinai Healthcare Retrofit
150K SF | Healthcare | LoD 350

WHY THIS PROVES OUR QUALITY:
✓ LoA-40 stated (±3mm accuracy documented)
✓ Validation explained (A/B/C spot-check methodology)
✓ Support defined (12-month post-delivery access)

WHAT MOST PROVIDERS DON'T DO:
❌ Don't specify LoD
❌ Don't document accuracy
❌ No validation proof
❌ No post-delivery support

[📋 Copy Narrative for Email]
```

**Success Criteria:**
- Find right proof in <10 seconds
- Copy narrative in one click
- Narrative pastes cleanly into email

**Technical Requirements:**
- Load from `/api/s2p/proofs`
- Modal with 12-Point narrative pre-formatted
- Copy button triggers clipboard + toast
- Narratives include all 12-Point highlights

---

## USER INTERFACE SPECIFICATION

### Layout
```
┌──────────────┬────────────────────────────────┐
│              │                                │
│   SIDEBAR    │         MAIN CONTENT           │
│   (240px)    │         (flex-grow)            │
│              │                                │
│              │                                │
│              │                                │
│              │                                │
│              │                                │
│              │                                │
│              │                                │
└──────────────┴────────────────────────────────┘
```

### Sidebar (Fixed 240px)
```
┌─────────────────────┐
│ 🎯 Scan2Plan        │
│    Command Center   │
├─────────────────────┤
│ 🔥 TODAY            │  ← Active highlight
│ 🎯 LEADS            │
│ 💰 PIPELINE         │
│ ✓  PROOF            │
├─────────────────────┤
│ 📚 Docs             │
│ ⚙️  Settings        │
└─────────────────────┘
```

**Rules:**
- Dark theme (#1a1a1a background)
- Active item: blue highlight (#2563eb)
- Hover: subtle gray (#2a2a2a)
- Icons: 18px, labels: 14px uppercase
- No other items allowed

### Main Content Area
- Light theme (#ffffff background)
- 24px padding
- Max-width: none (use full space)
- Views render here based on route

### Color Palette
```css
/* Tier Badges */
--tier-a: #D4AF37 (gold)
--tier-b: #3B82F6 (blue)
--tier-c: #6B7280 (gray)

/* GM Indicators */
--gm-good: #10B981 (green, ≥45%)
--gm-warning: #F59E0B (amber, 40-44%)
--gm-veto: #DC2626 (red, <40%)

/* Status */
--overdue: #DC2626 (red)
--hot: #F59E0B (amber)
--ready: #10B981 (green)

/* Base */
--primary: #2563eb (blue)
--text: #111827 (dark gray)
--text-muted: #6B7280 (gray)
--border: #E5E7EB (light gray)
```

### Typography
```css
/* Headings */
h1: 24px, 700 weight
h2: 18px, 600 weight
h3: 16px, 600 weight

/* Body */
body: 16px, 400 weight
small: 14px, 400 weight
label: 14px, 500 weight

/* Emphasis */
.next-action: 16px, 600 weight
.firm-name: 18px, 500 weight
```

### Components

**Button Styles:**
```css
/* Primary */
.btn-primary {
  background: #2563eb;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

/* Secondary */
.btn-secondary {
  background: transparent;
  color: #6B7280;
  border: 1px solid #E5E7EB;
}

/* Icon Only */
.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
}
```

**Card Styles:**
```css
.card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

**Toast Notifications:**
```css
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
  animation: slideIn 0.2s;
}

.toast-success { background: #10B981; color: white; }
.toast-info { background: #3B82F6; color: white; }
.toast-error { background: #EF4444; color: white; }
```

---

## DATA MODELS

### Lead
```typescript
interface Lead {
  id: string;
  firmName: string;
  website: string;
  tier: 'A' | 'B' | 'C' | 'Disqualified';
  tierScore: number; // 0-100
  tierReasoning: string[];

  // Company attributes
  enrRank?: number;
  portfolioSF: number;
  multiSitePortfolio: boolean;
  employeeCount: number;
  buildingTypes: string[];
  buyerPersona: string;
  location: string;

  // Contacts
  contacts: Contact[];

  // Status
  relationshipStatus: 'cold' | 'warm_intro' | 'contacted' | 'meeting' | 'proposal';
  waveAssignment: 1 | 2 | 3 | null;
  nextAction: string;

  // Proof matching
  proofMatches: ProofMatch[];
  proofGaps: string[];

  // Tracking
  lastContact?: string; // ISO date
  notes?: string;
}

interface Contact {
  name: string;
  title: string;
  email: string;
  phone?: string;
  linkedin?: string;
}

interface ProofMatch {
  assetId: string;
  proof: ProofAsset;
  relevanceScore: number; // 0-100
  matchReasons: string[];
  narrative: string; // Full 12-Point narrative
}
```

### Deal
```typescript
interface Deal {
  id: string;
  firmName: string;
  leadId: string;
  projectName: string;

  // Financials
  scopeSF: number;
  estimatedCost: number;
  proposedPrice: number;
  gmPercent: number; // Calculated: (price - cost) / price * 100

  // Pricing
  pricingType: 'tiered' | 'custom';
  pricingTier?: 1 | 2 | 3;

  // Status
  currentStage: 'meeting' | 'proposal' | 'won' | 'lost';
  daysInStage: number;

  // Proof
  proofAttached: boolean;
  proofAssetIds: string[];

  // Tracking
  createdAt: string; // ISO date
  lastContact: string; // ISO date
  nextAction: string;
  notes?: string;
}
```

### ProofAsset
```typescript
interface ProofAsset {
  id: string;
  name: string;
  client: string;

  // Project details
  projectSF: number;
  buildingTypes: string[];
  lodLevel: number; // e.g., 350, 400
  disciplines: string[];

  // Matching
  buyerPersonaFit: string[];

  // Differentiation
  twelvePointHighlights: string[]; // Which of 12 points this demonstrates

  // Metadata
  awards?: string[];
  completionYear: number;
  description: string;
  thumbnailUrl?: string;
}
```

---

## API ENDPOINTS

### Leads
```
GET /api/s2p/leads
Query params: ?wave=1&tier=A
Returns: Lead[]

GET /api/s2p/leads/:id
Returns: Lead

POST /api/s2p/leads/:id/update-status
Body: { relationshipStatus, lastContact, notes }
Returns: Lead
```

### Deals
```
GET /api/s2p/deals
Query params: ?stage=proposal
Returns: Deal[]

GET /api/s2p/deals/:id
Returns: Deal

POST /api/s2p/deals/:id/update-stage
Body: { currentStage }
Returns: Deal (or validation error if GM < 40%)

GET /api/s2p/governance/validate
Body: { deal, targetStage }
Returns: { canAdvance: boolean, violations?: Violation[] }
```

### Proof
```
GET /api/s2p/proofs
Returns: ProofAsset[]

GET /api/s2p/proofs/:id
Returns: ProofAsset

POST /api/s2p/proof-matcher
Body: { lead }
Returns: { matches: ProofMatch[], gaps: string[] }
```

### Today
```
GET /api/s2p/today
Returns: {
  overdue: Lead[],
  hotLeads: Lead[],
  outboundBatch: Lead[],
  proposalStage: Deal[]
}
```

---

## BUSINESS LOGIC

### Lead Scoring Algorithm
```
Tier A (Score 80-100):
- ENR Top 100 (+30 points)
- Multi-site portfolio (+20 points)
- Portfolio >5M SF (+20 points)
- Healthcare or Education focus (+15 points)
- 500+ employees (+15 points)

Tier B (Score 50-79):
- Regional firm (+10 points)
- Portfolio 1-5M SF (+10 points)
- Commercial or Institutional (+10 points)
- 100-500 employees (+10 points)

Tier C (Score 30-49):
- Local firm
- Portfolio <1M SF
- Mixed portfolio

Disqualified (<30 points):
- Residential only
- <10 employees
- No portfolio evidence
```

### Proof Matching Algorithm
```
1. Exact building type match: 85% confidence
   (Lead buildingTypes contains Proof buildingTypes)

2. Adjacent building type: 70% confidence
   (Healthcare → Education, Commercial → Institutional)

3. Service focus match: 60% confidence
   (Proof disciplines overlap with Lead needs)

4. Buyer persona fit: +15% bonus
   (Proof buyerPersonaFit includes Lead buyerPersona)

Return top 3 matches sorted by confidence
```

### Governance Rules
```
1. GM Floor: 40% (HARD RULE)
   - Any deal with GM < 40% shows VETO badge
   - Cannot advance to Proposal or Won stage
   - Modal blocks with violation message

2. Pricing Tier Validation:
   - Tier 1: 45-50% target GM
   - Tier 2: 50-55% target GM
   - Tier 3: 55-60% target GM

3. Discount Limits:
   - Single discount: ≤10%
   - Combined discounts: ≤15%
   - >15% requires CEO override (not implemented in MVP)
```

---

## INTEGRATIONS

### Current State (MVP Demo)
- **Data Storage:** JSON files in `/clients/s2p/memory/`
- **Authentication:** None (single user)
- **APIs:** Internal Express routes

### Future State (Production)
- **CRM:** Airtable or HubSpot sync
- **Email:** Gmail API for sending proof mailers
- **Calendar:** Google Calendar for meeting scheduling
- **Enrichment:** Clearbit or ZoomInfo for contact data
- **Analytics:** Mixpanel or Amplitude for usage tracking

---

## DEVELOPMENT ROADMAP

### Phase 1: MVP Demo (Current - Week 1)
**Goal:** Prove value to CEO

**Deliverables:**
- ✅ 4-view navigation (TODAY, LEADS, PIPELINE, PROOF)
- ✅ Demo data (25 leads, 6 proofs, 5 deals)
- ✅ Lead scoring + tier classification
- ✅ Proof matching with 12-Point narratives
- ✅ GM governance with VETO blocking
- ✅ Toast notifications for actions
- ✅ Clean sidebar (6 items only)
- ⏳ Knowledge base (Docusaurus) - optional

**Success Criteria:**
- CEO says "This will help me get more meetings"
- CEO approves loading real 1,651 leads
- CEO commits to using Daily Hit List weekly

### Phase 2: Production Launch (Week 2-3)
**Goal:** CEO uses daily

**Deliverables:**
- Load real 1,651 Clutch leads
- Email integration (Gmail API)
- Meeting tracker (Google Calendar sync)
- Weekly KPI reports
- Mobile responsive design

**Success Criteria:**
- CEO uses TODAY view every morning
- Sends 25+ proof mailers in Week 1
- Books 5+ meetings from Wave 1

### Phase 3: Scale (Week 4-8)
**Goal:** Add team members

**Deliverables:**
- Multi-user support (roles: CEO, Sales Rep)
- Activity feed (who did what)
- Email templates library
- Automated follow-up sequences
- Pipeline forecasting

**Success Criteria:**
- 2-3 sales reps onboarded
- 50+ proof mailers/week
- 10+ meetings/week
- 5 jobs won

---

## TESTING REQUIREMENTS

### Critical Path Testing (Before CEO Demo)
```
1. TODAY View
   ✓ Click "Call" → phone copied, toast shows
   ✓ Click "Email" → draft copied, toast shows
   ✓ Click "Done" → item disappears

2. LEADS View
   ✓ Click Gensler → drawer opens
   ✓ See Mount Sinai matched (80%)
   ✓ See 12-Point narrative
   ✓ Click "Copy for Email" → narrative copied

3. PIPELINE View
   ✓ See deals with GM% badges
   ✓ NYC DOE shows VETO badge (38% GM)
   ✓ Try to move to Proposal → modal blocks

4. PROOF View
   ✓ See 6 proof assets
   ✓ Click Mount Sinai → modal opens
   ✓ Click "Copy Narrative" → copied to clipboard
```

### Browser Compatibility
- Chrome (primary)
- Safari (secondary)
- Firefox (tertiary)

### Performance Targets
- Page load: <2 seconds
- Action feedback: <200ms
- API response: <500ms

---

## DEPLOYMENT

### Environments
- **Development:** localhost:5176 (frontend) + localhost:3000 (backend)
- **Demo:** https://superchase-dashboard-production.up.railway.app
- **Production:** TBD (post-CEO approval)

### Infrastructure
- **Frontend:** Railway (Vite build)
- **Backend:** Railway (Express server)
- **Data:** JSON files (memory layer)
- **Docs:** Railway or Vercel (Docusaurus build)

### Deployment Process
```bash
# Frontend
cd frontend
npm run build
railway up

# Backend
cd backend
railway up

# Docs (if built)
cd s2p-docs
npm run build
railway up
```

---

## AGENT COLLABORATION FRAMEWORK

### Purpose
This PRD enables autonomous AI agent collaboration to review, refine, and execute the S2P Command Center roadmap.

### Agent Roles

**1. PM Agent (Orchestrator)**
- Reviews PRD for completeness
- Identifies gaps or ambiguities
- Coordinates other agents
- Reports progress to CEO

**2. Design Agent**
- Reviews UI/UX specifications
- Validates color palette, typography, spacing
- Suggests improvements for usability
- Ensures consistency across views

**3. Backend Agent**
- Reviews data models and API endpoints
- Validates business logic (scoring, matching, governance)
- Identifies missing endpoints
- Suggests performance optimizations

**4. QA Agent**
- Reviews testing requirements
- Creates additional test cases
- Validates success criteria
- Identifies edge cases

**5. Docs Agent**
- Reviews documentation requirements
- Ensures PRD clarity
- Flags unclear specifications
- Suggests improvements

### Agent Workflow

**Phase 1: Initial Review (Each agent independently)**
1. Read entire PRD
2. Note gaps, ambiguities, contradictions
3. Document findings in standardized format
4. Submit to PM Agent

**Phase 2: Collaborative Refinement**
1. PM Agent synthesizes feedback
2. Calls council meeting (all agents)
3. Agents debate and resolve conflicts
4. PM Agent updates PRD with consensus changes

**Phase 3: Implementation Tracking**
1. PM Agent breaks PRD into tasks
2. Assigns tasks to appropriate agents
3. Agents execute autonomously
4. Report progress/blockers to PM Agent

**Phase 4: Quality Validation**
1. QA Agent validates against PRD
2. Design Agent validates UI/UX
3. Backend Agent validates logic
4. PM Agent confirms completion

### Agent Communication Protocol

**Format for Agent Feedback:**
```markdown
## Agent: [Design/Backend/QA/Docs]
## Section: [Which PRD section]
## Priority: [Critical/Important/Nice-to-Have]

### Finding:
[Description of issue/gap/ambiguity]

### Impact:
[How this affects implementation]

### Recommendation:
[Specific action to resolve]

### Status:
[Pending/In-Progress/Resolved]
```

**Example:**
```markdown
## Agent: Backend
## Section: Business Logic > Lead Scoring
## Priority: Important

### Finding:
Lead scoring algorithm doesn't specify how to handle leads with missing data (e.g., no ENR rank, unknown portfolio SF).

### Impact:
Scoring will fail or produce unreliable results for incomplete lead data.

### Recommendation:
Add default values or scoring penalties:
- No ENR rank: 0 points (not +30)
- Unknown portfolio SF: Use employee count as proxy
- Missing data: Flag for enrichment, score conservatively

### Status:
Pending PM review
```

### Success Metrics for Agent Collaboration
1. PRD reviewed by all agents within 24 hours
2. All Critical findings resolved before implementation
3. Implementation matches PRD specifications 95%+
4. Zero "this wasn't in the PRD" issues during QA

---

## APPENDICES

### Appendix A: 12-Point Standard (Full List)
1. LoD Stated
2. LoA Documented
3. Coordinate Basis Stated
4. Level Datum Stated
5. Heritage Preservation
6. Scan-to-Model Methodology
7. Data Access Defined
8. Validation Explained
9. As-Found Conditions
10. Clash Detection
11. Constructability Review
12. Support Defined

### Appendix B: Buyer Personas (7 Types)
1. Risk-Averse Principal (ENR Top 100, healthcare/education)
2. Tech-Forward BIM Director (wants latest tech)
3. Cost-Conscious Owner's Rep (budget-focused)
4. Regulatory Compliance Officer (documentation-focused)
5. Fast-Track PM (speed over everything)
6. Sustainability Champion (LEED, green building)
7. Renovation Specialist (existing conditions expert)

### Appendix C: Demo Script (10-Minute Flow)
See `/docs/CEO_Demo_Script.md` for full walkthrough

### Appendix D: Knowledge Base Structure
See `/mnt/user-data/outputs/S2P_KNOWLEDGE_BASE_PLAN.md`

---

## DOCUMENT CONTROL

### Version History
- v1.0 (Jan 20, 2026): Initial PRD for full production system
- v2.0 (Jan 22, 2026): Simplified to demo-ready MVP, added agent collaboration framework

### Approval
- **CEO:** Pending demo
- **PM Agent:** TBD (will review this PRD)
- **Design Agent:** TBD
- **Backend Agent:** TBD
- **QA Agent:** TBD

### Maintenance
This PRD is a living document. Update after:
- CEO demo feedback
- Phase completions
- Major feature changes
- Agent collaboration insights

---

## QUICK REFERENCE

**Current Status:** MVP Demo in development
**Next Milestone:** CEO demo approval
**Key Blocker:** Clean sidebar (remove multi-tenant artifacts)
**Success Metric:** CEO says "Load the real 1,651 leads"

**Contact:**
- Product Owner: CEO
- Technical Lead: Claude Code
- Agent Orchestrator: PM Agent (when activated)

---

*End of PRD v2.0*

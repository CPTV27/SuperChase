# Competitive Intelligence - Level 3 Council

## Overview

Execute a 360-degree Competitive & Industrial Offensive for any business unit. This is **Tactical Intelligence** - extracting what the market knows through live, multi-vector research.

## Council Roles

### Agent 1: Intelligence Librarian (Chief Intelligence Officer)
**Mission:** External eyes - live market research

**Tasks:**
1. **Competitor Extraction**
   - Identify top 3 direct competitors via web search
   - Scrape their sitemaps (`/sitemap.xml`) to identify content volume and product focus
   - Count pages by category (blog, products, services, case studies)

2. **The Bidding Blueprint**
   - Search for competitor ad copy patterns
   - Identify keywords they're "camping" on
   - Estimate CPC ranges for high-value keywords
   - Use: `site:facebook.com/ads/library [competitor]` for ad research

3. **SEO Gap Analysis**
   - Find "High Volume, Low Difficulty" keywords competitors missed
   - Extract "People Also Ask" patterns for customer pain points
   - Use: `site:competitor.com [keyword]` to check coverage

4. **Lead Sourcing**
   - Identify niche-specific directories and databases
   - Find LinkedIn "Hiring Signals" (companies hiring = high intent)
   - Search: `"looking for" OR "hiring" [industry] [region]`

### Agent 2: Audit Analyst (Risk & Feasibility Analyst)
**Mission:** Reality check against constraints

**Tasks:**
1. **Constraint Mapping**
   - Cross-reference SEO/bidding data against `constraints` in portfolio.json
   - Check budget limits, team capacity, geographic restrictions

2. **Traffic Light Flagging**
   - 🔴 **Red/Avoid**: Competitor spending > 10x our budget on keyword
   - 🟡 **Yellow/Caution**: Competitor has > 100 pages on topic
   - 🟢 **Green/Opportunity**: Gap keyword with < 3 competitor pages

3. **Blue Ocean Identification**
   - For every Red keyword, propose a Blue Ocean alternative
   - Find adjacent niches competitors are ignoring

4. **Lead Verification**
   - Validate lead sources aren't outdated or junk data
   - Check domain authority of directories found

### Agent 3: Hormozi Architect (Strategy Builder)
**Mission:** Convert intelligence into action

**Tasks:**
1. **The Counter-Offer**
   - Design a "Grand Slam Offer" targeting competitor weaknesses
   - Extract pain points from competitor reviews (G2, Capterra, Trustpilot, BBB)
   - Structure: Dream Outcome + Perceived Likelihood + Time Delay + Effort/Sacrifice

2. **The Rule of 100 Sprint**
   - Generate list of 100 outreach targets from Librarian's lead data
   - Draft "Warm Outreach" scripts (3 variations: email, LinkedIn, cold call)
   - Prioritize by: Company size, Recent signals, Geographic fit

3. **SEO Content Map**
   - Create 4-week content cluster plan for gap keywords
   - Structure: Pillar page + 4 supporting posts per week
   - Include: Title, Target keyword, Word count, CTA

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPETITIVE INTEL                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stage 1: Intelligence Gathering (Librarian)                │
│  ├── WebSearch: "{business} competitors {region}"           │
│  ├── WebFetch: competitor1.com/sitemap.xml                  │
│  ├── WebFetch: competitor2.com/sitemap.xml                  │
│  ├── WebFetch: competitor3.com/sitemap.xml                  │
│  ├── WebSearch: "{industry} pricing" site:competitor.com    │
│  └── WebSearch: "hiring {role}" {industry} {region}         │
│                                                             │
│  Stage 2: Constraint Analysis (Auditor)                     │
│  ├── Read: config/portfolio.json (constraints)              │
│  ├── Read: clients/{id}/config.json (budget, team)          │
│  ├── Traffic Light Classification                           │
│  └── Blue Ocean Alternatives                                │
│                                                             │
│  Stage 3: Strategy Synthesis (Architect)                    │
│  ├── Grand Slam Offer Design                                │
│  ├── 100 Target List Generation                             │
│  ├── Outreach Scripts (3 variations)                        │
│  └── 4-Week Content Calendar                                │
│                                                             │
│  Output: memory/battlecards/{businessId}.json               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Search Operators Reference

### Competitor Research
```
site:competitor.com                    # All indexed pages
site:competitor.com/blog               # Blog content only
site:competitor.com filetype:pdf       # Whitepapers/guides
"competitor name" review               # Customer reviews
"competitor name" pricing              # Pricing info
```

### Keyword Research
```
"keyword" -site:competitor.com         # Coverage gap check
intitle:"keyword" inurl:blog           # Blog competition
"people also ask" "keyword"            # PAA patterns
allintitle:"keyword"                   # Title competition
```

### Lead Sourcing
```
"looking for" OR "hiring" {role} {industry}
"RFP" OR "RFQ" {industry} {region}
site:linkedin.com/jobs {industry} {city}
"{industry} directory" OR "{industry} association"
```

### Ad Research
```
site:facebook.com/ads/library {competitor}
"{competitor}" "sponsored" OR "ad"
"{industry}" "free trial" OR "demo"
```

---

## Output: Competitive Battlecard

```json
{
  "businessId": "s2p",
  "generatedAt": "2026-01-21T...",
  "traceId": "intel-abc123",

  "competitors": [
    {
      "name": "OpenSpace",
      "website": "openspace.ai",
      "sitemap": {
        "totalPages": 342,
        "blogPosts": 89,
        "caseStudies": 24,
        "productPages": 15
      },
      "strengths": ["Enterprise clients", "AI positioning"],
      "weaknesses": ["Complex pricing", "Long implementation"],
      "estimatedAdSpend": "$50k-100k/month"
    }
  ],

  "keywords": {
    "red": [
      {"keyword": "construction documentation software", "reason": "OpenSpace dominates, $45 CPC"}
    ],
    "yellow": [
      {"keyword": "as-built scanning", "reason": "3 competitors, moderate difficulty"}
    ],
    "green": [
      {"keyword": "point cloud to revit", "reason": "Low competition, high intent"}
    ],
    "blueOcean": [
      {"keyword": "historic building scanning", "reason": "Niche, low CPC, high margin"}
    ]
  },

  "grandSlamOffer": {
    "headline": "Guaranteed As-Built Accuracy or We Re-Scan Free",
    "targetPainPoint": "Competitor implementations take 6+ months",
    "dreamOutcome": "Production-ready Revit model in 2 weeks",
    "riskReversal": "100% accuracy guarantee with re-scan clause"
  },

  "outreachTargets": {
    "count": 100,
    "sources": ["LinkedIn hiring signals", "Recent permits", "Conference attendees"],
    "topTier": [
      {"company": "Turner Construction", "signal": "Hiring BIM Manager", "priority": 1}
    ]
  },

  "contentPlan": {
    "week1": {
      "pillar": "Complete Guide to As-Built Documentation",
      "supporting": [
        "Point Cloud vs Traditional Survey: Cost Comparison",
        "5 Signs You Need As-Built Updates"
      ]
    }
  },

  "actionItems": [
    {"task": "Create pillar page for 'point cloud to revit'", "priority": "high", "asanaReady": true},
    {"task": "Launch LinkedIn outreach to top 10 targets", "priority": "high", "asanaReady": true}
  ]
}
```

---

## Integration Points

### Auto-Trigger on Onboard
When a business unit completes onboarding, automatically trigger competitive intel:
```javascript
POST /api/competitive-intel/run
{
  "businessId": "newco",
  "depth": "standard"  // "quick" | "standard" | "deep"
}
```

### Dashboard Display
Battlecard data feeds into:
- `/gst/{businessId}` - GST Dashboard competitive section
- `/s2p` - Lead Radar with verified targets
- `/marketing` - Content calendar with gap keywords

### Task Provider Push
Action items automatically create Asana tasks:
```javascript
POST /api/tasks
{
  "source": "competitive-intel",
  "businessId": "s2p",
  "tasks": battlecard.actionItems
}
```

---

## Depth Levels

### Quick (5 min)
- Top 3 competitors identified
- Basic sitemap analysis
- 5 gap keywords
- No outreach list

### Standard (15 min)
- Full competitor analysis
- Keyword traffic lights
- Grand Slam Offer draft
- 25 outreach targets
- 2-week content plan

### Deep (30 min)
- Extended to 5 competitors
- Ad library research
- Full 100 outreach targets
- 4-week content plan
- Competitor review mining

---

## Constraints Schema

Add to `config/portfolio.json` per business unit:

```json
{
  "constraints": {
    "monthlyAdBudget": 2000,
    "contentCapacity": 4,        // posts per week
    "outreachCapacity": 50,      // contacts per week
    "serviceArea": ["Northeast US"],
    "excludeCompetitors": [],    // don't target
    "focusKeywords": []          // prioritize these
  }
}
```

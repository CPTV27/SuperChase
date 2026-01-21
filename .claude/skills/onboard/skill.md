---
name: onboard
description: |
  Research-first onboarding agent for new business units. Automatically gathers
  intelligence from web searches and internal data, then asks targeted questions
  only for gaps. Generates portfolio.json, config.json, gst.json, and brand.json.
  Usage: /onboard @{business} or /onboard "Business Name"
author: Claude Code
version: 2.0.0
tags: [superchase, onboarding, research, clients]
---

# Business Unit Onboarding Agent (Research-First)

This agent autonomously researches a business before asking questions, minimizing user input.

## Usage

```
/onboard @bigmuddy          # Onboard Big Muddy Inn
/onboard "Studio C"         # Onboard by name
/onboard @s2p --refresh     # Re-research and update existing
/onboard --list             # Show all onboarded units
```

---

## Phase 1: Autonomous Research (NO USER INPUT)

### Step 1.1: Parse Input

Extract business identifier:
- `@{id}` format → use ID directly
- Quoted name → use as search term, derive ID from name
- If no input, ask only: "What business should I research?"

Derive ID: lowercase, replace spaces with hyphens, remove special chars
- "Big Muddy Inn" → `bigmuddy`
- "Studio C" → `studio`

### Step 1.2: Check Internal Data

Search SuperChase for existing data:

```
Files to check:
~/SuperChase/config/portfolio.json     - Is this unit already registered?
~/SuperChase/clients/{id}/config.json  - Existing configuration?
~/SuperChase/clients/{id}/gst.json     - Existing goals?
~/SuperChase/clients/{id}/brand.json   - Existing brand voice?
~/SuperChase/memory/limitless_context.json - Business intelligence from Limitless?
```

Extract any existing data to avoid asking questions we already have answers for.

### Step 1.3: Web Research

Use WebSearch tool to gather public information. Run these searches:

```
Search 1: "{business name}"
→ Extract: official name, tagline, basic description

Search 2: "{business name} services" OR "{business name} products"
→ Extract: offerings, service categories, product lines

Search 3: "{business name} {location}" OR "{business name} address"
→ Extract: city, state, service area

Search 4: "{business name} pricing" OR "{business name} rates"
→ Extract: any public pricing (note: often not available)

Search 5: "{business name} reviews" OR "{business name} testimonials"
→ Extract: target market signals, value proposition hints
```

If business has a website, use WebFetch to extract:
- About page content
- Services/products listed
- Pricing page (if public)
- Contact information

### Step 1.4: Analyze & Categorize Findings

Organize research into confidence levels:

```yaml
HIGH_CONFIDENCE: # Explicitly stated in sources
  name: "Big Muddy Inn"
  location: "Clarksdale, MS"
  website: "https://bigmuddyinn.com"

MEDIUM_CONFIDENCE: # Inferred from multiple signals
  type: "venue"  # inferred from "live music", "event space" mentions
  revenue_model: "event-based"  # inferred from ticket/booking mentions
  target_market: "blues enthusiasts"  # inferred from reviews

LOW_CONFIDENCE: # Single weak signal or guess
  value_proposition: "Authentic blues experience"

NOT_FOUND: # No data, requires user input
  - specific pricing
  - current business goals
  - team contacts
  - competitive positioning
```

### Step 1.5: Generate Research Report

Create internal report (shown to user in Phase 2):

```markdown
## Research Report: {Business Name}

**Sources consulted:** {count} web pages, {count} internal files

### Verified Information
| Field | Value | Source |
|-------|-------|--------|
| Name | Big Muddy Inn | Website |
| Location | Clarksdale, MS | Google |
| Type | Venue/Hospitality | Inferred |

### Inferred (Needs Confirmation)
| Field | Best Guess | Confidence | Signals |
|-------|------------|------------|---------|
| Revenue Model | Event-based | Medium | "tickets", "bookings" on site |
| Target Market | Blues tourists | Medium | Review demographics |

### Gaps (Will Ask User)
- Primary business goal for 2026
- Specific pricing/packages
- Key differentiator vs competitors
```

---

## Phase 2: Targeted Questions (ONLY FOR GAPS)

### Step 2.1: Present Research Summary

Show user what was found and ask for confirmation:

```
## Onboarding: {Business Name}

I researched {name} and found the following. Quick confirmation needed:

**Profile** ✓ High confidence
- Name: {name}
- Location: {location}
- Type: {type}

**Business Model** ⚠ Needs verification
Based on my research, this appears to be a {inferred_model} business
targeting {inferred_market}.
```

### Step 2.2: Ask Confirmation + Gap Questions

Use AskUserQuestion with 2-4 questions max:

**Question 1: Verify Inferences**
```
header: "Business Model"
question: "I found {name} appears to be {inferred}. Is this accurate?"
options:
  - label: "Yes, that's correct"
    description: "Proceed with inferred data"
  - label: "Project-based"
    description: "Revenue from individual projects/jobs"
  - label: "Subscription/Retainer"
    description: "Recurring revenue model"
  - label: "Event-based"
    description: "Revenue from events/tickets"
```

**Question 2: Primary Goal (Always Ask)**
```
header: "2026 Goal"
question: "What's the #1 business goal for {name} this year?"
options:
  - label: "Increase revenue"
    description: "Hit a specific revenue target"
  - label: "Launch new offering"
    description: "New product/service launch"
  - label: "Expand market"
    description: "Enter new geographic or demographic market"
  - label: "Improve operations"
    description: "Efficiency, systems, or team goals"
```

**Question 3: Differentiator (If not found)**
```
header: "Differentiator"
question: "What makes {name} different from competitors?"
options:
  - label: "Price/Value"
    description: "More affordable or better value"
  - label: "Quality/Expertise"
    description: "Superior service or specialized knowledge"
  - label: "Speed/Convenience"
    description: "Faster delivery or easier process"
  - label: "Unique offering"
    description: "Something competitors don't have"
```

**Question 4: Pricing (If not public)**
```
header: "Pricing"
question: "I couldn't find public pricing. How should I handle it?"
options:
  - label: "I'll provide now"
    description: "Enter pricing details in follow-up"
  - label: "Reference existing file"
    description: "Point to pricing source (e.g., CPQ engine)"
  - label: "Custom quotes only"
    description: "No fixed pricing - all quotes are custom"
  - label: "Skip for now"
    description: "Add pricing later"
```

### Step 2.3: Collect Follow-up Details

If user selected options requiring follow-up:

- **Revenue target**: "What's the target revenue?" (direct question)
- **Pricing details**: "What are the main offerings and their prices?"
- **File reference**: "What's the path to the pricing file?"

---

## Phase 3: Write Configuration Files

### Step 3.1: Create Directory

```bash
mkdir -p ~/SuperChase/clients/{id}
```

### Step 3.2: Write config.json

```json
{
  "id": "{id}",
  "name": "{name}",
  "businessType": "{type}",
  "revenueModel": "{model}",
  "targetMarket": "{market}",
  "valueProposition": "{value_prop}",
  "offerings": [
    {
      "id": "{offering_id}",
      "name": "{offering_name}",
      "description": "{description}",
      "pricingNotes": "{pricing_notes}"
    }
  ],
  "pricingEngine": {
    "source": "{pricing_file_path or null}",
    "minimumProject": null,
    "notes": "{pricing_notes}"
  },
  "location": {
    "city": "{city}",
    "state": "{state}",
    "serviceArea": ["{areas}"]
  },
  "website": "{url}",
  "contacts": {
    "primary": {
      "name": "{contact_name or null}",
      "role": "{role or null}"
    }
  },
  "researchSources": ["{urls used}"],
  "createdAt": "{ISO timestamp}",
  "updatedAt": "{ISO timestamp}"
}
```

### Step 3.3: Write gst.json

```json
{
  "businessId": "{id}",
  "goals": [
    {
      "id": "goal_{id}_001",
      "title": "{goal_title}",
      "metric": "{metric}",
      "target": {target_number},
      "current": 0,
      "deadline": "2026-12-31",
      "status": "in_progress"
    }
  ],
  "strategies": [],
  "tactics": [],
  "updatedAt": "{ISO timestamp}"
}
```

### Step 3.4: Update portfolio.json

Add entry to `~/SuperChase/config/portfolio.json`:

```json
{
  "id": "{id}",
  "name": "{name}",
  "type": "{type}",
  "description": "{description}",
  "active": true
}
```

### Step 3.5: Write brand.json (if voice data gathered)

```json
{
  "businessId": "{id}",
  "voice": {
    "tone": "{inferred_tone}",
    "vocabulary": {
      "include": ["{industry_terms}"],
      "avoid": []
    }
  },
  "sources": "{where tone was inferred from}"
}
```

---

## Phase 4: Validation & Summary

### Step 4.1: Validate Data Completeness

Call `validateBusinessData(id)` from council-context.js

### Step 4.2: Test Context Injection

```javascript
import { buildContext } from '../lib/council-context.js';
const ctx = await buildContext('{id}');
// Verify context loads properly
```

### Step 4.3: Present Summary

```markdown
## Onboarding Complete: {Business Name}

### Research Summary
- Web sources consulted: {count}
- Internal files checked: {count}
- User questions asked: {count} (minimized via research)

### Files Created
| File | Status |
|------|--------|
| clients/{id}/config.json | ✓ Created |
| clients/{id}/gst.json | ✓ Created |
| config/portfolio.json | ✓ Updated |
| clients/{id}/brand.json | {✓ or ○ skipped} |

### Data Completeness
| Section | Status | Notes |
|---------|--------|-------|
| Profile | ✓ Complete | From web research |
| Business Model | ✓ Complete | User confirmed |
| Offerings | ⚠ Partial | {count} services, pricing TBD |
| Goals | ✓ Complete | {goal_title} |
| Brand Voice | ○ Not set | Add via brand.json |

### Context Injection Ready
The LLM Council will now use {name}'s data for:
- @{id} mentions in queries
- "{name}" mentions in queries

### Quick Test
Run this to verify:
```
curl -X POST /api/llm-council \
  -d '{"query": "What should @{id} focus on this quarter?"}'
```

### Next Steps
1. Add detailed pricing: `edit clients/{id}/config.json`
2. Define strategies: `edit clients/{id}/gst.json`
3. Generate content: `/marketing-brief @{id}`
```

---

## Research Quality Rules

### Source Priority
1. **Official website** - highest authority
2. **LinkedIn company page** - business details
3. **Google Business Profile** - location, hours, reviews
4. **Industry directories** - service categorization
5. **News/press** - recent developments
6. **Reviews (Yelp, Google)** - customer insights

### Inference Rules
- **Type**: Infer from service keywords (e.g., "scanning" → service, "venue" → venue)
- **Revenue model**: Infer from pricing language ("per project", "monthly", "tickets")
- **Target market**: Infer from review demographics and service descriptions
- **Value prop**: Extract from taglines, about page, or synthesize from differentiators

### When to Ask vs. Infer
| Data Point | Ask if... | Infer if... |
|------------|-----------|-------------|
| Business name | Never (always searchable) | Always |
| Location | Not found in search | Found on website/Google |
| Revenue model | Low confidence | Multiple signals agree |
| Target market | Very niche/unclear | Clear from services/reviews |
| Goals | Always | Never (too specific) |
| Pricing | Not public | Public pricing page exists |
| Differentiator | Generic/unclear | Unique claims on website |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No web results | Rely on user questions, note "limited public info" |
| Business already exists | Ask: Update existing or skip? |
| Conflicting info found | Present both, ask user to clarify |
| User skips optional | Write config with nulls, note gaps |
| Research timeout | Proceed with partial data, note incomplete |

---

## Example Session

```
User: /onboard "Big Muddy Inn"

Agent:
Researching Big Muddy Inn...

[WebSearch: "Big Muddy Inn"]
[WebSearch: "Big Muddy Inn Clarksdale Mississippi"]
[WebSearch: "Big Muddy Inn blues room events"]
[WebFetch: bigmuddyinn.com]
[Read: memory/limitless_context.json]

---

## Research Complete: Big Muddy Inn

I found substantial information. Here's what I gathered:

**Verified (High Confidence)**
| Field | Value | Source |
|-------|-------|--------|
| Name | Big Muddy Inn | Website |
| Location | Clarksdale, MS | Google |
| Type | Venue/Hospitality | Website |
| Features | Blues Room, lodging | Website |

**Inferred (Medium Confidence)**
| Field | Value | Signals |
|-------|-------|---------|
| Revenue | Event + Lodging | "book tickets", "rooms" |
| Market | Blues tourists | Review demographics |
| Positioning | Authentic blues heritage | Marketing copy |

**Gaps (Need Your Input)**
- 2026 business goals
- Specific pricing/packages
- Competitive differentiator

---

[AskUserQuestion: 3 questions about gaps]

User: [Answers questions]

Agent:
Writing configuration files...

✓ clients/bigmuddy/config.json (created)
✓ clients/bigmuddy/gst.json (created)
✓ config/portfolio.json (updated)

## Onboarding Complete: Big Muddy Inn

Research saved you from answering 12 questions.
Only 3 questions were needed for gaps.

The Council will now use Big Muddy data automatically.
Test it: "What marketing strategy should @bigmuddy pursue?"
```

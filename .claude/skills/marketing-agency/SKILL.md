---
name: marketing-agency
description: |
  4-agent marketing content factory that generates blog posts and X.com threads from business 
  activity. Invoke with /marketing-brief @{business} to generate content brief, then /publish 
  to deploy. Supports: bigmuddy, utopia, cptv, studioc, tuthill, s2p.
triggers:
  - marketing-brief
  - publish
  - blog
  - content
  - x.com post
---

# Marketing Agency Skill

## Overview

A synthetic marketing agency with 4 AI agents that work together to produce and publish content:

| Agent | Role | Output |
|-------|------|--------|
| **Strategist** | Analyzes business activity, picks topics | Content brief |
| **Copywriter** | Drafts blog post + social posts | Markdown drafts |
| **Editor** | Brand voice check, quality review | Approved content |
| **Publisher** | Deploys to blog & X.com | Published URLs |

## Commands

### `/marketing-brief @{business}`

Generates a content brief for the specified business unit.

**Example:**
```
/marketing-brief @bigmuddy
```

**What happens:**
1. Strategist reads the GST manifest for the business
2. Reviews recent activity, milestones, and current tactics
3. Proposes a topic aligned with active strategies
4. Generates 3 X.com post hooks
5. Outputs a content brief to `memory/marketing_queue.json`

### `/publish`

Publishes pending content from the marketing queue.

**What happens:**
1. Reads pending items from `memory/marketing_queue.json`
2. Writes blog post to `manual/blog/` (Docusaurus)
3. Commits and deploys to Railway
4. Posts X.com thread using `/api/publish/x`
5. Updates queue with published URLs

## Agent Prompts

### Strategist Agent

```
You are the Strategist for SuperChase Marketing Agency.

INPUTS:
- GST Manifest: clients/{business}/gst.json
- Recent activity: history[] array
- Active strategies: strategies[] with status="active"

TASK:
1. Identify the most impactful topic based on:
   - Upcoming milestones that need awareness
   - Strategies with high success rates (worth doubling down)
   - Recent wins worth celebrating
   
2. Create a Content Brief with:
   - Topic: One clear theme
   - Angle: The unique perspective or story
   - Goal alignment: Which goal/strategy this supports
   - X.com hooks: 3 different angles for social posts
   - Blog outline: 3-5 section headers

OUTPUT: JSON content brief
```

### Copywriter Agent

```
You are the Copywriter for SuperChase Marketing Agency.

INPUTS:
- Content brief from Strategist
- Brand DNA: clients/{business}/brand.json
- Voice archetype from brand scraper

TASK:
1. Write a 500-800 word blog post following the outline
2. Write 3 X.com posts (max 280 chars each) from the hooks
3. Match the brand's voice archetype:
   - Southern Storyteller: Warm, nostalgic, heritage-focused
   - Tech Visionary: Forward-thinking, solution-focused
   - Creative Artisan: Aesthetic, craft-focused
   - Production Pro: Professional, technical, equipment-focused

OUTPUT: Markdown blog + array of tweets
```

### Editor Agent

```
You are the Editor for SuperChase Marketing Agency.

INPUTS:
- Draft content from Copywriter
- Brand guidelines
- GST governor permissions

TASK:
1. Review for brand voice consistency
2. Check factual accuracy against GST manifest
3. Ensure alignment with stated goal
4. Verify tweet lengths (max 280 chars)
5. Check for:
   - Cliches to eliminate
   - Passive voice to rewrite
   - Weak verbs to strengthen

OUTPUT: Approved content with any revisions noted
```

### Publisher Agent

```
You are the Publisher for SuperChase Marketing Agency.

INPUTS:
- Approved content from Editor
- Docusaurus config
- X.com publish credentials

TASK:
1. Format blog post with frontmatter:
   ---
   title: {title}
   authors: [chase]
   tags: [{business}, {strategy_approach}]
   date: {today}
   ---

2. Save to manual/blog/{date}-{slug}.md

3. Deploy blog:
   cd manual && npm run build && railway up

4. Post to X.com via API:
   POST /api/publish/x
   { "thread": [tweet1, tweet2, tweet3] }

OUTPUT: { blogUrl, xPostUrls[] }
```

## Business-Specific Voice Guides

### Big Muddy Inn (@bigmuddy)
- **Archetype:** Southern Storyteller
- **Tone:** Warm, atmospheric, historical
- **Themes:** Blues heritage, river life, boutique hospitality
- **Avoid:** Generic hotel language, corporate speak

### Utopia Bearsville (@utopia)
- **Archetype:** Production Pro
- **Tone:** Professional, technical, equipment-focused
- **Themes:** Gear deep-dives, behind-the-scenes, creative process
- **Avoid:** Salesy language, overselling

### Chase Pierson TV (@cptv)
- **Archetype:** Tech Visionary
- **Tone:** Forward-thinking, build-in-public, educational
- **Themes:** AI operations, automation, systems thinking
- **Avoid:** Hype without substance

### Studio C (@studioc)
- **Archetype:** Creative Artisan
- **Tone:** Craft-focused, visual, behind-the-scenes
- **Themes:** Production process, creative partnerships
- **Avoid:** Technical jargon

### Scan2Plan (@s2p)
- **Archetype:** Tech Visionary
- **Tone:** Solution-focused, precise, professional
- **Themes:** Reality capture, accuracy, efficiency
- **Avoid:** Consumer language

## Content Templates

### Blog Post Template
```markdown
---
title: {title}
authors: [chase]
tags: [{business}, {primary_tag}]
date: {YYYY-MM-DD}
---

# {Title}

{Hook paragraph - establish the problem or opportunity}

## {Section 1}
{Content}

## {Section 2}
{Content}

## {Section 3}
{Content}

## What's Next
{Call to action aligned with GST goal}
```

### X.com Thread Template
```
Tweet 1 (Hook): {Attention-grabbing statement or question}

Tweet 2 (Value): {Key insight or lesson}

Tweet 3 (CTA): {Action + link to blog post}
```

## Error Handling

| Error | Resolution |
|-------|------------|
| GST manifest not found | Create manifest first: `npm run gst {business} init` |
| Brand.json missing | Run brand scraper: `npm run brand:scrape {business}` |
| X.com publish failed | Check credentials: `GET /api/publish/x/status` |
| Blog deploy failed | Check Railway status, verify build locally |

## Workflow State Machine

```
IDLE → BRIEFING → DRAFTING → EDITING → PUBLISHING → COMPLETE
  ↑                              ↓
  └──────── REVISION ←──────────┘
```

States are tracked in `memory/marketing_queue.json`:
- `pending`: Brief created, awaiting draft
- `drafted`: Content written, awaiting edit
- `approved`: Editor approved, ready to publish
- `published`: Live on blog and X.com
- `revision`: Needs changes before proceeding

## API Endpoints Used

```bash
# Check X.com publish credentials
GET /api/publish/x/status

# Publish tweet or thread
POST /api/publish/x
{
  "text": "single tweet" 
  // OR
  "thread": ["tweet 1", "tweet 2", "tweet 3"],
  "delayMs": 30000
}

# Get GST status
npm run gst {business} status

# Generate tactics
npm run gst {business} generate-tactics
```

## Example Workflow

```bash
# 1. Generate brief for Big Muddy
> /marketing-brief @bigmuddy

Strategist: Analyzing bigmuddy GST...
- Active strategy: Southern Gothic Narrative (92% success rate)
- Recent milestone: Top 5 in Local Pack
- Opportunity: Double down on what's working

Content Brief Generated:
- Topic: "Silver Street Stories: The Blues Room's Legacy"
- Goal: goal_bigmuddy_local (Dominate Natchez Local Search)
- Strategy: strat_bigmuddy_gothic

# 2. Review and publish
> /publish

Copywriter: Drafting 700-word blog post...
Editor: Voice check passed, factual accuracy verified
Publisher: 
  - Blog deployed to manual/blog/2026-01-20-silver-street-stories.md
  - X.com thread posted: https://twitter.com/i/status/...

Published!
- Blog: https://superchase-manual-production.up.railway.app/blog/silver-street-stories
- X.com: https://twitter.com/i/status/1234567890
```

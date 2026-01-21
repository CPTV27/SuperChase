---
name: marketing-agency
description: |
  Reference documentation for the Marketing Agency 4-agent system.
  DO NOT invoke this skill directly. Use the individual command skills:
  /marketing-brief, /marketing-draft, /marketing-publish, /marketing-status
author: Claude Code
version: 1.0.0
invocable: false
user-invocable: false
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - WebFetch
  - Task
---

# Marketing Agency Skill

A 4-agent content factory that transforms business activity into blog posts and X.com threads.

## Trigger Commands

| Command | Description |
|---------|-------------|
| `/marketing-brief @{business}` | Generate content brief for a business unit |
| `/publish` | Publish pending content to blog + X.com |
| `/marketing-status` | Show queue status and pending briefs |

## Supported Business Units

- `@s2p` - Scan2Plan (Reality Capture)
- `@studio` - Studio C (Production)
- `@cptv` - Chase Pierson TV (Personal Brand)
- `@tuthill` - Tuthill Design (Editorial)
- `@bigmuddy` - Big Muddy Inn (Hospitality)
- `@utopia` - Utopia Bearsville (Studio)

---

## Agent Architecture

### Agent 1: Strategist

**Role:** Analyze business activity and select optimal content topics.

**Inputs:**
- Project docs from `manual/docs/projects/{business}.md`
- Client GST from `clients/{clientId}/gst.json`
- Recent activity from Asana tasks
- Brand profile from `clients/{clientId}/brand.json`

**Process:**
1. Read the business unit's project documentation
2. Check GST for active strategies and their performance
3. Identify highest-leverage content opportunity
4. Generate content brief with topic, angle, and hooks

**Output:** Content brief saved to `memory/marketing_queue.json`

```json
{
  "id": "brief_{clientId}_{date}",
  "clientId": "{clientId}",
  "status": "pending",
  "createdAt": "ISO8601",
  "strategist": {
    "topic": "Main topic/headline",
    "angle": "Unique perspective or hook",
    "goalAlignment": {
      "goalId": "Which GST goal this supports",
      "strategyId": "Which strategy",
      "rationale": "Why this content now"
    },
    "blogOutline": ["Section 1", "Section 2", "Section 3", "Section 4"],
    "xHooks": ["Hook 1 (< 280 chars)", "Hook 2", "Hook 3"],
    "voiceArchetype": "Brand voice archetype",
    "toneGuidance": "Specific tone instructions"
  }
}
```

---

### Agent 2: Copywriter

**Role:** Draft blog post and X.com thread from the content brief.

**Inputs:**
- Content brief from Strategist
- Brand voice guide (see below)
- Blog template (see below)

**Process:**
1. Read the pending brief from `memory/marketing_queue.json`
2. Apply brand voice archetype
3. Draft full blog post (800-1200 words)
4. Draft X.com thread (3-5 posts)

**Output:** Drafts added to the brief

```json
{
  "copywriter": {
    "blogDraft": "Full markdown content...",
    "xThread": [
      "Post 1 with hook...",
      "Post 2 with value...",
      "Post 3 with CTA..."
    ],
    "draftedAt": "ISO8601"
  }
}
```

---

### Agent 3: Editor

**Role:** Quality check and brand voice alignment.

**Inputs:**
- Copywriter drafts
- Brand style guide
- Previous published content (for consistency)

**Process:**
1. Review blog draft for brand voice compliance
2. Check X.com posts for engagement optimization
3. Verify no sensitive/confidential information
4. Apply final polish

**Output:** Approved content ready for publishing

```json
{
  "editor": {
    "approved": true,
    "edits": ["List of changes made"],
    "finalBlog": "Polished markdown...",
    "finalXThread": ["Polished posts..."],
    "approvedAt": "ISO8601"
  }
}
```

---

### Agent 4: Publisher

**Role:** Deploy content to production.

**Inputs:**
- Editor-approved content
- Blog configuration
- X.com API credentials

**Process:**
1. Generate blog post filename: `YYYY-MM-DD-{slug}.md`
2. Write to `manual/blog/`
3. Post X.com thread via `/api/publish/x`
4. Update marketing_queue.json with published URLs

**Output:** Published content with URLs

```json
{
  "publisher": {
    "blogPath": "manual/blog/2026-01-20-topic-slug.md",
    "blogUrl": "https://superchase-manual-production.up.railway.app/blog/topic-slug",
    "xPostIds": ["post_id_1", "post_id_2", "post_id_3"],
    "xUrls": ["https://x.com/user/status/123", "..."],
    "publishedAt": "ISO8601"
  }
}
```

---

## Workflow Orchestration

### Phase 1: `/marketing-brief @{business}`

```
1. User invokes: /marketing-brief @bigmuddy
2. Load project docs: manual/docs/projects/bigmuddy.md
3. Load GST: clients/bigmuddy/gst.json
4. Load brand: clients/bigmuddy/brand.json (if exists)
5. Strategist generates brief
6. Save to memory/marketing_queue.json
7. Display brief summary to user
8. Prompt: "Ready to draft? Run /marketing-draft"
```

### Phase 2: `/marketing-draft`

```
1. Load pending brief from queue
2. Copywriter drafts blog + X.com thread
3. Editor reviews and approves
4. Save approved content to queue
5. Display draft preview to user
6. Prompt: "Ready to publish? Run /publish"
```

### Phase 3: `/publish`

```
1. Load approved content from queue
2. Publisher writes blog file to manual/blog/
3. Publisher posts X.com thread via API
4. Update queue with published status
5. Trigger manual site rebuild (railway up)
6. Return published URLs
```

---

## Content Templates

### Blog Post Template

```markdown
---
slug: {slug}
title: "{title}"
authors: [chase]
tags: [{business_tag}, {topic_tags}]
---

{opening_hook}

<!--truncate-->

## {section_1_title}

{section_1_content}

## {section_2_title}

{section_2_content}

## {section_3_title}

{section_3_content}

## {call_to_action_title}

{cta_content}

---

*{closing_thought}*
```

### X.com Thread Template

```
Post 1 (Hook - max 280 chars):
{attention_grabbing_hook}

Post 2 (Value - max 280 chars):
{key_insight_or_story}

Post 3 (Proof - max 280 chars):
{evidence_or_example}

Post 4 (CTA - max 280 chars):
{call_to_action_with_link}
```

---

## Brand Voice Guides

### Scan2Plan (@s2p)
- **Archetype:** Technical Expert
- **Tone:** Professional, precise, confident
- **Vocabulary:** Reality capture, point cloud, BIM, as-built, deliverables
- **Avoid:** Jargon overload, cold/robotic language
- **Style:** Clear explanations, ROI-focused, problem-solution structure

### Studio C (@studio)
- **Archetype:** Creative Director
- **Tone:** Energetic, visionary, collaborative
- **Vocabulary:** Production value, storytelling, visual narrative, brand film
- **Avoid:** Corporate speak, overselling
- **Style:** Behind-the-scenes insights, process reveals, creative inspiration

### Chase Pierson TV (@cptv)
- **Archetype:** Thought Leader
- **Tone:** Personal, reflective, ambitious
- **Vocabulary:** Systems thinking, leverage, compounding, operator
- **Avoid:** Humble-bragging, generic advice
- **Style:** First-person narratives, lessons learned, building in public

### Tuthill Design (@tuthill)
- **Archetype:** Tastemaker
- **Tone:** Refined, considered, editorial
- **Vocabulary:** Methodology, editions, intentionality, craft
- **Avoid:** Trendy buzzwords, superficial takes
- **Style:** Deep dives, design philosophy, curated perspectives

### Big Muddy Inn (@bigmuddy)
- **Archetype:** Southern Storyteller
- **Tone:** Warm, atmospheric, historically grounded
- **Vocabulary:** Heritage, Delta, river, blues, hospitality
- **Avoid:** Tourist cliches, inauthenticity
- **Style:** Narrative-driven, sensory details, local color

### Utopia Bearsville (@utopia)
- **Archetype:** Creative Sanctuary
- **Tone:** Inspiring, peaceful, professional
- **Vocabulary:** Hudson Valley, production, retreat, collaboration
- **Avoid:** Pretentiousness, exclusivity language
- **Style:** Space descriptions, creative possibilities, artist stories

---

## Error Handling

| Error | Action |
|-------|--------|
| No GST found for client | Use project docs only, note in brief |
| No brand.json found | Use default archetype from voice guides |
| X.com API failure | Save thread to queue, retry later |
| Blog build failure | Keep draft in queue, alert user |
| Content too long | Editor truncates, notes original length |

---

## API Integration

### Twitter/X.com Publishing

**Endpoint:** `POST /api/publish/x`

**Request:**
```json
{
  "tweets": ["Post 1 text", "Post 2 text", "Post 3 text"],
  "asThread": true
}
```

**Response:**
```json
{
  "success": true,
  "posts": [
    { "id": "123", "url": "https://x.com/..." }
  ]
}
```

### Check X.com Status

**Endpoint:** `GET /api/publish/x/status`

**Response:**
```json
{
  "success": true,
  "configured": true,
  "username": "@chasepierson"
}
```

---

## Queue State Management

**Location:** `memory/marketing_queue.json`

**Structure:**
```json
{
  "version": "1.0",
  "lastUpdated": "ISO8601",
  "pending": [],
  "published": [],
  "briefs": [
    {
      "id": "brief_bigmuddy_20260120",
      "clientId": "bigmuddy",
      "status": "pending|drafted|approved|published",
      "createdAt": "ISO8601",
      "strategist": { ... },
      "copywriter": { ... },
      "editor": { ... },
      "publisher": { ... }
    }
  ]
}
```

**Status Flow:**
```
pending → drafted → approved → published
                 ↘ rejected (with feedback)
```

---

## Execution Instructions

When user invokes `/marketing-brief @{business}`:

1. **Validate business unit**
   - Check if `@{business}` is in supported list
   - If not, suggest closest match or list options

2. **Load context**
   ```
   Read: manual/docs/projects/{business}.md
   Read: clients/{clientId}/gst.json (if exists)
   Read: clients/{clientId}/brand.json (if exists)
   ```

3. **Generate brief**
   - Identify content opportunity aligned with GST goals
   - Create topic, angle, outline, and X.com hooks
   - Apply brand voice archetype

4. **Save to queue**
   - Update `memory/marketing_queue.json`
   - Add new brief with status "pending"

5. **Present to user**
   ```
   ## Content Brief: {topic}

   **Business:** {business_name}
   **Angle:** {angle}
   **Goal Alignment:** {goal} → {strategy}

   ### Blog Outline
   1. {section_1}
   2. {section_2}
   3. {section_3}
   4. {section_4}

   ### X.com Hooks
   - {hook_1}
   - {hook_2}
   - {hook_3}

   Ready to draft? Run `/marketing-draft`
   ```

When user invokes `/publish`:

1. **Load approved content**
   - Find brief with status "approved" in queue
   - If none, inform user to run `/marketing-draft` first

2. **Write blog post**
   - Generate filename from date and slug
   - Write markdown file to `manual/blog/`
   - Git add the new file

3. **Post to X.com**
   - Call `POST /api/publish/x` with thread
   - Capture post IDs and URLs

4. **Update queue**
   - Mark brief as "published"
   - Add publisher metadata with URLs

5. **Deploy**
   - Run `cd manual && railway up --detach`
   - Return blog URL and X.com URLs to user

---

## Example Session

```
User: /marketing-brief @bigmuddy

Claude: ## Content Brief: Silver Street Stories

**Business:** Big Muddy Inn
**Angle:** Historical deep-dive positioning Big Muddy as the gateway to Natchez Under-the-Hill's musical legacy
**Goal Alignment:** Guest Reviews Goal → Blues Heritage Strategy (100% success rate)

### Blog Outline
1. The River's Edge: Why Silver Street Matters
2. From Steamboats to Speakeasies: The Birth of Delta Blues
3. The Blues Room: Keeping the Tradition Alive
4. Experience It Yourself: Planning Your Visit

### X.com Hooks
- Silver Street in Natchez wasn't just a road—it was where the Delta Blues found its voice.
- The Mississippi River brought more than cargo to Natchez Under-the-Hill. It brought the sound that would change American music.
- Why do blues pilgrims keep coming to a tiny street in Mississippi? Because some places hold memory in their walls.

Brief saved. Ready to draft? Run `/marketing-draft`

---

User: /marketing-draft

Claude: ## Draft: Silver Street Stories

[Full blog post preview...]

### X.com Thread Preview
1. Silver Street in Natchez wasn't just a road...
2. The Mississippi River brought more than cargo...
3. Why do blues pilgrims keep coming...
4. Experience it yourself at @BigMuddyInn...

Draft approved. Ready to publish? Run `/publish`

---

User: /publish

Claude: ## Published!

**Blog:** https://superchase-manual-production.up.railway.app/blog/silver-street-stories
**X.com Thread:**
- https://x.com/chasepierson/status/123456789
- https://x.com/chasepierson/status/123456790
- https://x.com/chasepierson/status/123456791

Content marked as published in queue.
```

---

## Metrics & Reporting

Track in `memory/marketing_queue.json`:

- Total briefs generated per business
- Draft-to-publish conversion rate
- Average time from brief to publish
- X.com engagement (manual entry for now)

Future: Weekly `/marketing-report` command for cross-business content analytics.

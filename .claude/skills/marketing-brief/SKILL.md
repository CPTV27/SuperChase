---
name: marketing-brief
description: |
  Generate content briefs for blog posts and X.com threads. Invoke with
  /marketing-brief @{business} where business is: @s2p, @studio, @cptv,
  @tuthill, @bigmuddy, or @utopia. Analyzes project docs, GST goals, and
  brand profiles to create aligned content strategies.
author: Claude Code
version: 1.0.0
invocable: true
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Task
---

# Marketing Brief Generator

Generate strategic content briefs aligned with business goals.

## Usage

```
/marketing-brief @bigmuddy
/marketing-brief @s2p
/marketing-brief @studio
```

## Supported Business Units

| Alias | Business | Archetype |
|-------|----------|-----------|
| `@s2p` | Scan2Plan | Technical Expert |
| `@studio` | Studio C | Creative Director |
| `@cptv` | Chase Pierson TV | Thought Leader |
| `@tuthill` | Tuthill Design | Tastemaker |
| `@bigmuddy` | Big Muddy Inn | Southern Storyteller |
| `@utopia` | Utopia Bearsville | Creative Sanctuary |

## Execution Steps

### 1. Parse Business Unit

Extract the `@{business}` from `$ARGUMENTS`. If missing, prompt user to specify.

Map alias to clientId:
- `@s2p` → `s2p`
- `@studio` → `studio`
- `@cptv` → `cptv`
- `@tuthill` → `tuthill`
- `@bigmuddy` → `bigmuddy`
- `@utopia` → `utopia`

### 2. Load Context

Read these files (skip if not found):

```
~/SuperChase/manual/docs/projects/{clientId}.md
~/SuperChase/clients/{clientId}/gst.json
~/SuperChase/clients/{clientId}/brand.json
```

### 3. Generate Content Brief

As the **Strategist Agent**, analyze the context and identify the highest-leverage content opportunity.

Consider:
- Active GST goals and their performance
- Recent project activity
- Market positioning opportunities
- Brand voice alignment

### 4. Save to Queue

Update `~/SuperChase/memory/marketing_queue.json`:

```json
{
  "id": "brief_{clientId}_{YYYYMMDD}",
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

### 5. Present to User

Output format:

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

---
Brief saved. Ready to draft? Run `/marketing-draft`
```

## Brand Voice Reference

### Scan2Plan (@s2p)
- **Tone:** Professional, precise, confident
- **Style:** Clear explanations, ROI-focused, problem-solution structure
- **Vocabulary:** Reality capture, point cloud, BIM, as-built, deliverables

### Studio C (@studio)
- **Tone:** Energetic, visionary, collaborative
- **Style:** Behind-the-scenes insights, process reveals, creative inspiration
- **Vocabulary:** Production value, storytelling, visual narrative, brand film

### Chase Pierson TV (@cptv)
- **Tone:** Personal, reflective, ambitious
- **Style:** First-person narratives, lessons learned, building in public
- **Vocabulary:** Systems thinking, leverage, compounding, operator

### Tuthill Design (@tuthill)
- **Tone:** Refined, considered, editorial
- **Style:** Deep dives, design philosophy, curated perspectives
- **Vocabulary:** Methodology, editions, intentionality, craft

### Big Muddy Inn (@bigmuddy)
- **Tone:** Warm, atmospheric, historically grounded
- **Style:** Narrative-driven, sensory details, local color
- **Vocabulary:** Heritage, Delta, river, blues, hospitality

### Utopia Bearsville (@utopia)
- **Tone:** Inspiring, peaceful, professional
- **Style:** Space descriptions, creative possibilities, artist stories
- **Vocabulary:** Hudson Valley, production, retreat, collaboration

## Error Handling

| Condition | Action |
|-----------|--------|
| No business specified | List available businesses, ask user to choose |
| Business not recognized | Suggest closest match |
| No project docs found | Create brief from brand archetype only |
| No GST found | Skip goal alignment, note in output |

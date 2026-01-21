---
name: marketing-draft
description: |
  Draft blog post and X.com thread from a pending content brief. Runs the
  Copywriter and Editor agents to produce publication-ready content. Use after
  running /marketing-brief. Invoke with /marketing-draft to process the next
  pending brief, or /marketing-draft {brief_id} for a specific one.
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
  - Task
---

# Marketing Draft Generator

Transform content briefs into publication-ready blog posts and X.com threads.

## Usage

```
/marketing-draft              # Process next pending brief
/marketing-draft brief_bigmuddy_20260120   # Process specific brief
```

## Execution Steps

### 1. Load Pending Brief

Read `~/SuperChase/memory/marketing_queue.json`

Find brief where:
- `status === "pending"` (if no argument)
- `id === $ARGUMENTS` (if specific brief requested)

If no pending briefs, inform user to run `/marketing-brief @{business}` first.

### 2. Copywriter Agent

Draft the full content using the strategist's brief.

**Blog Post (800-1200 words):**

```markdown
---
slug: {generated-slug}
title: "{topic}"
authors: [chase]
tags: [{business_tag}, {topic_tags}]
---

{opening_hook_paragraph}

<!--truncate-->

## {section_1_title}

{section_1_content - 150-250 words}

## {section_2_title}

{section_2_content - 150-250 words}

## {section_3_title}

{section_3_content - 150-250 words}

## {section_4_title}

{section_4_content - call to action}

---

*{closing_thought}*
```

**X.com Thread (3-5 posts, max 280 chars each):**

```
Post 1 (Hook): {attention_grabbing_hook}
Post 2 (Value): {key_insight_or_story}
Post 3 (Proof): {evidence_or_example}
Post 4 (CTA): {call_to_action_with_link}
```

### 3. Editor Agent

Review and polish the drafts:

1. **Voice Check:** Ensure brand archetype consistency
2. **Engagement Optimization:** Strengthen hooks and CTAs
3. **Confidentiality Review:** No sensitive business details
4. **Length Check:** Blog 800-1200 words, tweets under 280 chars
5. **Final Polish:** Grammar, flow, impact

### 4. Update Queue

Add copywriter and editor sections to the brief:

```json
{
  "copywriter": {
    "blogDraft": "Full markdown content...",
    "xThread": ["Post 1...", "Post 2...", "Post 3...", "Post 4..."],
    "draftedAt": "ISO8601"
  },
  "editor": {
    "approved": true,
    "edits": ["List of changes made"],
    "finalBlog": "Polished markdown...",
    "finalXThread": ["Polished posts..."],
    "approvedAt": "ISO8601"
  }
}
```

Update brief status to `"approved"`.

### 5. Present to User

Output format:

```
## Draft: {topic}

**Business:** {business_name}
**Status:** Approved for publishing

---

### Blog Preview

{First 500 chars of blog...}

[Full draft: 1,024 words]

---

### X.com Thread Preview

1. {post_1}
2. {post_2}
3. {post_3}
4. {post_4}

---

**Editor Notes:**
- {edit_1}
- {edit_2}

Ready to publish? Run `/publish`
```

## Writing Guidelines

### Blog Structure

1. **Hook:** Open with a provocative statement or question
2. **Context:** Brief background (2-3 sentences)
3. **Body:** 3 main sections with clear subheads
4. **CTA:** Specific next step for the reader

### X.com Thread Rules

1. **Post 1:** Pattern interrupt - stop the scroll
2. **Post 2-3:** Deliver value without being salesy
3. **Final Post:** Clear CTA with link or ask
4. **No hashtags** unless specifically relevant
5. **No emojis** unless brand-appropriate

### Voice Alignment

Apply the `voiceArchetype` and `toneGuidance` from the brief:

| Archetype | Writing Style |
|-----------|---------------|
| Technical Expert | Facts first, jargon defined, ROI clear |
| Creative Director | Visual language, process reveals |
| Thought Leader | Personal pronouns, lessons learned |
| Tastemaker | Considered pace, design vocabulary |
| Southern Storyteller | Sensory details, historical threads |
| Creative Sanctuary | Inspiring imagery, possibility-focused |

## Error Handling

| Condition | Action |
|-----------|--------|
| No pending briefs | Prompt: "No briefs in queue. Run `/marketing-brief @{business}` first" |
| Brief not found | List available brief IDs |
| Content too long | Editor truncates with note |
| Voice mismatch | Editor rewrites flagged sections |

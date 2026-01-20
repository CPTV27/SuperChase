---
slug: synthetic-marketing-agency
title: Introducing the Synthetic Marketing Agency
authors: [chase]
tags: [automation, operations]
---

Building a 4-agent content factory that turns business activity into publishable content.

<!-- truncate -->

## The Problem

Content marketing is critical for all four businesses, but it's always the first thing to get deprioritized. Writing a blog post takes 2-4 hours of focused time. Social posts need consistent voice. Publishing requires manual deployment.

## The Solution

A synthetic marketing agency with four AI agents:

| Agent | Role | Output |
|-------|------|--------|
| **Strategist** | Analyzes activity, picks topics | Content brief |
| **Copywriter** | Drafts blog + social posts | Markdown drafts |
| **Editor** | Brand voice, quality check | Approved content |
| **Publisher** | Deploys to Docusaurus + X.com | Published URLs |

## The Workflow

```
/marketing-brief @s2p
→ Strategist reads recent activity
→ Generates content brief with 3 X.com hooks

/publish
→ Blog post written to Docusaurus
→ Thread posted to X.com
→ Returns published URLs
```

Total time investment: ~3 minutes of review instead of 3 hours of writing.

## What's Next

Productizing this for clients at $499/month:
- 4 blog posts/month
- 12 X.com posts/month
- Monthly engagement report

The leverage is the machine, not the output.

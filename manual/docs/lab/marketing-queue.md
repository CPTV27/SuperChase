---
sidebar_position: 3
---

# Marketing Queue

Content pipeline status and upcoming posts.

## Queue Status

View the current marketing queue state in `memory/marketing_queue.json`.

## Active Workflows

### `/marketing-brief @{business}`

Generates content brief for a business unit:
1. **Strategist** analyzes recent activity
2. **Copywriter** drafts blog + X.com thread
3. **Editor** reviews for brand voice
4. Content stored in pending queue

### `/publish`

Publishes approved content:
1. Blog post written to `manual/blog/`
2. Thread posted to X.com via API
3. Results logged to audit

## Content Templates

### Blog Post
- 500-800 words
- Problem → Solution → Results structure
- Tags: business unit + topic tags
- Author: chase

### X.com Thread
- 3 tweets
- Hook → Context → CTA with link
- 280 character limit per tweet
- 30 second delay between posts

## Brand Voice by Business

| Business | Tone | Audience |
|----------|------|----------|
| Scan2Plan | Technical, authoritative | GCs, architects |
| Studio C | Creative, premium | Brands, agencies |
| CPTV | Direct, systems-thinking | Entrepreneurs |
| Tuthill | Thoughtful, editorial | Design professionals |

## Published Content

Track published content in `memory/marketing_queue.json` under the `published` array.

## Metrics to Track

- Blog post views (via Docusaurus/Plausible)
- X.com thread impressions
- Click-through to blog
- Engagement rate

## Automation Schedule (Future)

| Day | Action |
|-----|--------|
| Monday | `/marketing-brief @{business}` |
| Wednesday | Review + `/publish` blog |
| Thursday | Post tweet 1 |
| Friday | Post tweet 2 |
| Saturday | Post tweet 3 |

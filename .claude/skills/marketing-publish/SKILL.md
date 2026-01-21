---
name: marketing-publish
description: |
  Publish approved content to blog and X.com. Writes blog post to manual/blog/,
  posts X.com thread via API, and updates marketing queue. Use after /marketing-draft
  has approved content. Invoke with /marketing-publish or /publish.
author: Claude Code
version: 1.0.0
invocable: true
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - WebFetch
  - Task
---

# Marketing Publisher

Deploy approved content to blog and X.com.

## Usage

```
/marketing-publish              # Publish next approved brief
/marketing-publish brief_bigmuddy_20260120   # Publish specific brief
```

## Execution Steps

### 1. Load Approved Content

Read `~/SuperChase/memory/marketing_queue.json`

Find brief where:
- `status === "approved"` (if no argument)
- `id === $ARGUMENTS` (if specific brief requested)

If no approved content, inform user to run `/marketing-draft` first.

### 2. Write Blog Post

**Generate filename:**
```
YYYY-MM-DD-{slug}.md
```

**Write to:**
```
~/SuperChase/manual/blog/{filename}
```

Use the `editor.finalBlog` content from the brief.

### 3. Post to X.com

Call the SuperChase API:

```bash
curl -X POST https://superchase-production.up.railway.app/api/publish/x \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${SUPERCHASE_API_KEY}" \
  -d '{
    "tweets": ["Post 1...", "Post 2...", "Post 3..."],
    "asThread": true
  }'
```

Use `editor.finalXThread` array from the brief.

**Response format:**
```json
{
  "success": true,
  "posts": [
    { "id": "123456789", "url": "https://x.com/chasepierson/status/123456789" }
  ]
}
```

### 4. Update Queue

Add publisher section to the brief:

```json
{
  "publisher": {
    "blogPath": "manual/blog/2026-01-20-topic-slug.md",
    "blogUrl": "https://superchase-manual-production.up.railway.app/blog/topic-slug",
    "xPostIds": ["123456789", "123456790", "123456791"],
    "xUrls": ["https://x.com/chasepierson/status/123...", "..."],
    "publishedAt": "ISO8601"
  }
}
```

Update brief status to `"published"`.

Move brief from `briefs` to `published` array.

### 5. Deploy Manual Site (Optional)

If blog was written, trigger rebuild:

```bash
cd ~/SuperChase/manual && railway up --detach
```

### 6. Present to User

Output format:

```
## Published!

**Topic:** {topic}
**Business:** {business_name}

### Blog
- **File:** manual/blog/{filename}
- **URL:** https://superchase-manual-production.up.railway.app/blog/{slug}

### X.com Thread
1. https://x.com/chasepierson/status/123456789
2. https://x.com/chasepierson/status/123456790
3. https://x.com/chasepierson/status/123456791

---
Content marked as published in queue.
```

## Error Handling

| Condition | Action |
|-----------|--------|
| No approved content | Prompt: "No approved content. Run `/marketing-draft` first" |
| X.com API failure | Save thread to `failed_posts` in queue, continue with blog |
| Blog write failure | Report error, do not mark as published |
| Missing API key | Prompt user to set SUPERCHASE_API_KEY |

## Rollback

If partial publish (blog succeeded, X failed):

1. Keep blog file in place
2. Update brief with partial status:
   ```json
   {
     "status": "partial",
     "publisher": {
       "blogPath": "...",
       "xError": "API returned 401"
     }
   }
   ```
3. User can retry X.com with `/marketing-publish {brief_id}`

## X.com API Reference

**Check status:**
```
GET /api/publish/x/status
```

**Post thread:**
```
POST /api/publish/x
{
  "tweets": ["string array"],
  "asThread": true
}
```

**Rate limits:**
- 50 posts per 15-minute window
- Thread posts count as separate tweets

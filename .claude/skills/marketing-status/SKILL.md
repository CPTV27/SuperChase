---
name: marketing-status
description: |
  Show marketing queue status and pending briefs. Lists all briefs by status
  (pending, drafted, approved, published) with summaries. Use to check what
  content is in the pipeline before running other marketing commands.
author: Claude Code
version: 1.0.0
invocable: true
user-invocable: true
allowed-tools:
  - Read
  - Glob
---

# Marketing Status

Display the current state of the marketing content queue.

## Usage

```
/marketing-status           # Show full queue status
/marketing-status pending   # Show only pending briefs
/marketing-status published # Show recently published
```

## Execution Steps

### 1. Load Queue

Read `~/SuperChase/memory/marketing_queue.json`

### 2. Categorize Briefs

Group by status:
- `pending` - Briefs awaiting drafting
- `drafted` - Drafts awaiting editing (legacy)
- `approved` - Ready to publish
- `published` - Successfully deployed
- `partial` - Partially published (blog only, X failed)
- `rejected` - Editor rejected with feedback

### 3. Generate Summary

**Count by status:**
```
Pending:   3
Approved:  1
Published: 12
```

**List active briefs:**
```
| ID | Business | Topic | Status | Created |
|----|----------|-------|--------|---------|
| brief_bigmuddy_20260120 | Big Muddy | Silver Street Stories | pending | Jan 20 |
| brief_s2p_20260119 | Scan2Plan | Point Cloud Processing | approved | Jan 19 |
```

### 4. Present to User

Output format:

```
## Marketing Queue Status

**Last Updated:** {lastUpdated}

### Summary
| Status | Count |
|--------|-------|
| Pending | 3 |
| Approved | 1 |
| Published | 12 |

---

### Pending Briefs

**brief_bigmuddy_20260120** - Big Muddy Inn
- Topic: Silver Street Stories
- Angle: Historical deep-dive on blues heritage
- Created: Jan 20, 2026
- Next: Run `/marketing-draft`

**brief_s2p_20260119** - Scan2Plan
- Topic: Point Cloud Processing Speed
- Angle: Technical how-to for AEC professionals
- Created: Jan 19, 2026
- Next: Run `/marketing-draft`

---

### Ready to Publish

**brief_studio_20260118** - Studio C
- Topic: Behind the Scenes at Utopia
- Blog: 1,024 words
- X Thread: 4 posts
- Next: Run `/marketing-publish`

---

### Recently Published

**brief_cptv_20260115** - Chase Pierson TV
- Topic: Building in Public
- Blog: https://superchase-manual-production.up.railway.app/blog/building-in-public
- X.com: https://x.com/chasepierson/status/123456789
- Published: Jan 15, 2026

---

### Quick Actions
- Generate new brief: `/marketing-brief @{business}`
- Draft pending brief: `/marketing-draft`
- Publish approved: `/marketing-publish`
```

## Filtering

If `$ARGUMENTS` contains a status filter:

- `pending` - Show only pending briefs with full strategist details
- `approved` - Show only approved briefs with draft previews
- `published` - Show only published briefs with URLs
- `@{business}` - Show only briefs for specific business

## Queue Health Checks

Report issues:

```
### Warnings

- brief_bigmuddy_20260115 has been pending for 5 days
- brief_s2p_20260110 was rejected: "Voice too casual"
- X.com API last failed: Jan 18, 2026 (check credentials)
```

## Error Handling

| Condition | Action |
|-----------|--------|
| Queue file missing | Create empty queue, report "No briefs yet" |
| Queue corrupted | Report error, suggest manual inspection |
| No briefs in status | "No {status} briefs. Run /marketing-brief @{business} to create one" |

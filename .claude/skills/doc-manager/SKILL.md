---
name: doc-manager
description: |
  Manages SuperChase documentation and project status files. Automatically updates
  project docs when tasks are ingested via the sc command. Syncs Asana tasks to
  project pages. Use when: (1) sc command captures a task with @mention, (2) user
  asks to update project documentation, (3) generating retrospectives.
author: Claude Code
version: 2.0.0
tags: [documentation, projects, automation]
---

# Doc Manager Skill

Automatically keeps SuperChase documentation in sync with business operations.

## Capabilities

### 1. Project Activity Logging

When the `sc` CLI command captures a task with a @mention, append it to the
corresponding project's "Recent Activity" section.

**Trigger:** `sc` command with @mention (s2p, studio, cptv, tuthill)

**Action:**
```bash
# After sc captures a task, append to project doc
PROJECT_FILE="/Users/chasethis/SuperChase/manual/docs/projects/${business}.md"

# Append to Recent Activity section
sed -i '' "/## Recent Activity/a\\
- $(date '+%Y-%m-%d %H:%M') - ${task_note}" "$PROJECT_FILE"
```

### 2. Asana Sync

Pull top tasks from Asana and update the "Active Projects" table in each project doc.

**Usage:**
```bash
# Sync all projects
doc-sync all

# Sync specific project
doc-sync s2p
```

**Implementation:**
1. Query SuperChase API: `GET /tasks?project=s2p&limit=5`
2. Parse response into markdown table
3. Replace "Active Projects" section in project doc

### 3. Retrospective Generation

Generate weekly retrospective documents from:
- Completed tasks (Asana)
- George query history (audit logs)
- Business activity (project docs)

**Output:** `manual/docs/retrospectives/week-{YYYY-WW}.md`

## File Locations

| Type | Path |
|------|------|
| Projects | `manual/docs/projects/{business}.md` |
| System | `manual/docs/system/*.md` |
| Retrospectives | `manual/docs/retrospectives/*.md` |
| Operations | `manual/docs/operations/*.md` |

## Integration with sc CLI

The `sc` function in `~/.zshrc` should call this skill after successful ingest:

```bash
sc() {
  # ... existing capture logic ...

  # After successful capture, update project doc
  if [[ -n "$business" ]]; then
    local timestamp=$(date '+%Y-%m-%d %H:%M')
    local doc_file="/Users/chasethis/SuperChase/manual/docs/projects/${business}.md"

    if [[ -f "$doc_file" ]]; then
      # Find "Recent Activity" section and append
      sed -i '' "/\*No recent activity logged\*/d" "$doc_file"
      sed -i '' "/## Recent Activity/a\\
- ${timestamp} - ${note}" "$doc_file"
    fi
  fi
}
```

## Project Doc Structure

Each project doc has these auto-updated sections:

```markdown
## Active Projects
<!-- AUTO-UPDATED: Pulled from Asana -->
| Project | Client | Status | Due |
...

## Recent Activity
<!-- AUTO-UPDATED: Appended by sc CLI -->
- 2026-01-20 10:30 - Follow up with Miles about Blues Room
- 2026-01-20 09:15 - Review contract draft
```

## Manual Updates

For manual documentation updates, Claude should:

1. Read the current project file
2. Identify the appropriate section
3. Make targeted edits (don't rewrite entire file)
4. Preserve AUTO-UPDATED comment markers

## Verification

After updates, verify:
```bash
# Check doc builds
cd /Users/chasethis/SuperChase/manual && npm run build

# View locally
npm run serve
```

## Related Skills

- `superchase-ingest` - CLI task capture
- `superchase-manager` - Railway deployment
- `playwright` - Dashboard testing

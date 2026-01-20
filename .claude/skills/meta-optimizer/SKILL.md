---
name: meta-optimizer
description: |
  Recursive self-improvement skill for SuperChase OS. Runs weekly audits or on
  `/retrospective` to identify friction points, draft improvement plans, and log
  the evolution cycle. Use when: (1) ending a work session, (2) weekly system review,
  (3) after deploying new features, (4) when friction accumulates.
author: Claude Code
version: 1.0.0
date: 2026-01-20
tags: [meta, evolution, recursive, audit, retrospective]
---

# Meta-Optimizer Skill

## Purpose

This skill implements the recursive self-improvement cycle for SuperChase OS:
```
Operate → Audit → Improve → Log → Apply to Pilots → Repeat
```

## Trigger Conditions

Invoke this skill when:
- User runs `/retrospective`
- Weekly audit (suggest every Monday)
- After deploying significant features
- When 3+ friction points accumulate
- User asks "what could be better?"

## Execution Protocol

### Phase 1: Friction Audit

Scan recent activity for friction signals:

```markdown
**Friction Categories:**
1. **Click-Heavy** - Actions requiring 3+ clicks that could be 1
2. **Context-Lost** - Information not persisted where needed
3. **Manual-Repeat** - Same action performed multiple times
4. **Dead-End** - Flows that lead nowhere (no confirmation, no next step)
5. **Blind-Spot** - Errors/issues not surfaced to user
```

**Data Sources to Check:**
- Railway logs (last 7 days)
- Git commit messages (patterns of fixes)
- Dashboard usage (if telemetry exists)
- User feedback in conversation
- Failed API calls or error patterns

### Phase 2: Prioritize Top 3 Frictions

Score each friction on:
| Criteria | Weight |
|----------|--------|
| Frequency (how often) | 3x |
| Severity (how painful) | 2x |
| Fixability (effort to resolve) | 1x |

**Output Format:**
```markdown
## Top 3 Frictions This Cycle

| Rank | Friction | Category | Score | Proposed Fix |
|------|----------|----------|-------|--------------|
| 1 | [description] | [category] | [score] | [one-liner] |
| 2 | [description] | [category] | [score] | [one-liner] |
| 3 | [description] | [category] | [score] | [one-liner] |
```

### Phase 3: Draft Improvement Plan

For the #1 friction, auto-generate a plan:

```markdown
## Improvement Plan: [Friction Name]

**Problem:** [Clear description]

**Root Cause:** [Why this friction exists]

**Proposed Solution:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Success Criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

**Estimated Impact:** [Low/Medium/High]

**Files to Modify:**
- `path/to/file1`
- `path/to/file2`
```

### Phase 4: Log to The Lab

Append findings to `/manual/docs/lab/superchase-evolution.md`:

**Update Friction Backlog:**
```markdown
| ID | Friction | Severity | Status | Resolution |
|----|----------|----------|--------|------------|
| F00X | [new friction] | [severity] | Open | [planned fix] |
```

**Update Meta-Optimizer Runs:**
```markdown
| Date | Top Frictions | Action Taken | Result |
|------|---------------|--------------|--------|
| [date] | [summary] | [action] | [result] |
```

### Phase 5: Cross-Reference Pilots

Check if friction applies to active pilots:
- Read `/manual/docs/lab/scan2plan-pilot.md`
- Check if friction affects pilot workflows
- Note cross-references in both docs

## Automation Hooks

### Weekly Cron Suggestion
```bash
# Add to crontab or scheduled task
# Runs every Monday at 9 AM
0 9 * * 1 claude-code "Run /retrospective for SuperChase"
```

### Post-Deploy Hook
After any Railway deployment, prompt:
> "New deploy detected. Run quick friction check? (y/n)"

## Output Templates

### Retrospective Summary
```markdown
# SuperChase Retrospective - [Date]

## Session Overview
- Duration: [X hours]
- Tasks Completed: [N]
- Deploys: [N]

## Frictions Identified
[Top 3 table]

## Improvement Drafted
[Plan for #1 friction]

## Logged To
- [x] superchase-evolution.md
- [ ] Relevant pilot docs

## Next Actions
1. [action]
2. [action]
```

### Quick Audit (< 5 min)
```markdown
## Quick Friction Check - [Date]

**Signals Checked:**
- [ ] Railway logs
- [ ] Recent commits
- [ ] Dashboard errors

**New Frictions:** [N]
**Resolved Frictions:** [N]

**Priority Action:** [one-liner]
```

## Integration Points

- **doc-manager skill**: Updates project docs with friction resolutions
- **superchase-ingest skill**: Captures friction notes via CLI
- **continuous-learning skill**: Extracts reusable patterns from fixes

## Anti-Patterns

- Don't log minor inconveniences as frictions
- Don't create plans for frictions that resolve themselves
- Don't over-engineer solutions for rare edge cases
- Don't duplicate existing documentation

## Example Run

**Input:** `/retrospective`

**Output:**
```markdown
# SuperChase Retrospective - 2026-01-20

## Session Overview
- Duration: 4 hours
- Tasks Completed: 12
- Deploys: 3 (frontend, manual)

## Frictions Identified

| Rank | Friction | Category | Score | Proposed Fix |
|------|----------|----------|-------|--------------|
| 1 | Quick Ingest has no BU selector | Click-Heavy | 8 | Add dropdown |
| 2 | No task landing confirmation | Dead-End | 7 | Show toast |
| 3 | Polling continues when idle | Manual-Repeat | 5 | Adaptive poll |

## Improvement Drafted

### Quick Ingest Business Unit Selector

**Problem:** Users must type @mention to route tasks

**Proposed Solution:**
1. Add dropdown to Quick Ingest form
2. Default to suggested BU based on time
3. Persist last-used selection

**Files to Modify:**
- `frontend/src/App.jsx`
- `frontend/src/index.css`

## Logged To
- [x] superchase-evolution.md (F001 updated)
- [x] scan2plan-pilot.md (cross-ref noted)

## Next Actions
1. Implement BU selector in v2.4
2. Add confirmation toast
3. Schedule next retrospective: 2026-01-27
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-20 | Initial skill creation |

---

*This skill embodies the recursive improvement philosophy: the system that builds the system.*

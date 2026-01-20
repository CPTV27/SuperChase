---
sidebar_position: 1
title: Standard Operating Procedures
---

# Standard Operating Procedures

## Daily Operations

### Morning Routine
1. Check SuperChase dashboard
2. Review George's daily briefing
3. Process urgent emails
4. Update task priorities in Asana

### Evening Wind-Down
1. Review completed tasks
2. Log any blockers
3. Queue tomorrow's priorities

## Task Triage SOP

### Priority Classification

| Priority | Response Time | Examples |
|----------|--------------|----------|
| P1 - Critical | Same day | Client emergency, system down |
| P2 - High | Within 24h | Client request, deadline |
| P3 - Normal | Within 3 days | Standard work |
| P4 - Low | When available | Nice-to-have |

### Routing Rules

- **Revenue-impacting** → P1, notify immediately
- **Client-facing** → P2 minimum
- **Internal improvement** → P3-P4

## Quick Ingest SOP

### From Terminal
```bash
# Standard capture
sc "Task description" @business

# With priority
sc "URGENT: Description" @s2p --priority high

# With due date
sc "Description" @studio --due tomorrow
```

### From Dashboard
1. Click + button
2. Enter task details
3. Click Ingest

### From Email
- Automatic via Gmail integration
- George triages and creates tasks

---

*Updated: Auto-generated*

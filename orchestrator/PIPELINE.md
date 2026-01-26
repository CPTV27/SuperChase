# SuperChase Pipeline Runner

## Quick Start

Run the full pipeline for a venture:

```bash
# Set your venture
VENTURE=s2p

# Run each agent in sequence
# (In practice, each would be a separate Claude session)
```

## Pipeline Stages

### Stage 1: Builder
```
Prompt: "You are a Builder Agent. Read BUILDER_AGENT.md and execute the first pending task for {venture}."

Input: tasks.json (pending items)
Output: files in /outputs/
Updates: tasks.json (passes: true)
```

### Stage 2: Reviewer
```
Prompt: "You are a Reviewer Agent. Read REVIEWER_AGENT.md and review all items in /outputs/ for {venture}."

Input: /outputs/ files
Output: PASS → move to /approved/, FAIL → revision notes
Updates: tasks.json (reviewed: true, reviewStatus)
```

### Stage 3: Publisher
```
Prompt: "You are a Publisher Agent. Read PUBLISHER_AGENT.md and publish all approved items for {venture}."

Input: /approved/ files
Output: Live content + URLs
Updates: tasks.json (published: true, publishedUrls)
```

### Stage 4: Archivist
```
Prompt: "You are an Archivist Agent. Read ARCHIVIST_AGENT.md and archive all published items for {venture}."

Input: /published/ files + metrics
Output: Archive records + updated GST
Updates: tasks.json (archived: true), gst.json (metrics)
```

---

## Manual Pipeline (Current)

1. **Planning Session (Claude.ai)**
   - Review goals, create tasks
   - "Add task: Write case study for hotel project"
   - Tasks appear in tasks.json

2. **Builder Session (Claude Code)**
   - Paste BUILDER_AGENT.md as context
   - Agent picks task, executes, commits
   - Output appears in /outputs/

3. **Review Session (Claude Code)**
   - Paste REVIEWER_AGENT.md as context
   - Agent reviews, approves or rejects
   - Approved items move to /approved/

4. **Publish Session (Manual or API)**
   - Take approved content
   - Post to platforms
   - Record URLs

5. **Archive Session (Claude Code)**
   - Paste ARCHIVIST_AGENT.md as context
   - Agent creates records, updates metrics
   - Learning extracted

---

## Automated Pipeline (Future)

```python
# Conceptual - would need Claude API integration

async def run_pipeline(venture_id: str):
    # Stage 1: Build all pending tasks
    while has_pending_tasks(venture_id):
        await run_agent('builder', venture_id)
    
    # Stage 2: Review all built items
    while has_unreviewed_items(venture_id):
        await run_agent('reviewer', venture_id)
    
    # Stage 3: Publish all approved items
    while has_unpublished_items(venture_id):
        await run_agent('publisher', venture_id)
    
    # Stage 4: Archive all published items
    while has_unarchived_items(venture_id):
        await run_agent('archivist', venture_id)
    
    return get_pipeline_summary(venture_id)

async def run_agent(agent_type: str, venture_id: str):
    prompt = load_agent_prompt(f"{agent_type.upper()}_AGENT.md")
    context = load_venture_context(venture_id)
    
    response = await claude.complete(
        system=prompt,
        messages=[{
            "role": "user",
            "content": f"Execute for venture: {venture_id}\n\nContext:\n{context}"
        }],
        tools=[filesystem_tools, git_tools]
    )
    
    return response
```

---

## Multi-Venture Pipeline

Run all ventures in parallel:

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│  S2P    │  │ Studio  │  │  Big    │
│Pipeline │  │    C    │  │ Muddy   │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     ▼            ▼            ▼
  Builder      Builder      Builder
     │            │            │
     ▼            ▼            ▼
  Reviewer     Reviewer     Reviewer
     │            │            │
     ▼            ▼            ▼
  Publisher    Publisher    Publisher
     │            │            │
     ▼            ▼            ▼
  Archivist    Archivist    Archivist
     │            │            │
     └────────────┼────────────┘
                  │
                  ▼
           Daily Summary
```

---

## Status Check

Quick command to see pipeline status:

```bash
for venture in s2p bigmuddy studioc tuthill cptv utopia; do
  echo "=== $venture ==="
  
  pending=$(jq '[.features[] | select(.passes == false)] | length' \
    clients/$venture/tasks.json 2>/dev/null || echo "0")
  
  outputs=$(ls clients/$venture/outputs/ 2>/dev/null | wc -l)
  approved=$(ls clients/$venture/approved/ 2>/dev/null | wc -l)
  published=$(ls clients/$venture/published/ 2>/dev/null | wc -l)
  
  echo "  Pending: $pending | Built: $outputs | Approved: $approved | Published: $published"
done
```

---

## The Key Insight

Each agent is:
- **Stateless** - No memory between runs
- **Specialized** - One job only
- **Documented** - Clear protocol
- **Accountable** - Git commits track everything

The system is smart because:
- **tasks.json** is the contract
- **File system** is the shared memory
- **Git** is the audit trail
- **Handoffs** are explicit

No single agent needs to be brilliant.
The brilliance is in the coordination.

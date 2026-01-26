# SuperChase Agent Organization

## The Org Chart

```
CHASE (CEO)
    │
    └── PLANNER (Strategic Planning)
            │
            ├── BUILDER (Execution)
            │       │
            │       └── REVIEWER (Quality)
            │               │
            │               └── PUBLISHER (Distribution)
            │                       │
            │                       └── ARCHIVIST (Learning)
            │
            └── RESEARCHER (Intelligence)
                    │
                    └── ANALYST (Insights)
```

## Agent Specifications

### 1. PLANNER AGENT
**Role:** Strategic planning and task creation  
**Triggers:** Conversation with Chase  
**Inputs:** Goals, strategy, business context  
**Outputs:** tasks.json updates, priority decisions  
**Model:** Claude (high reasoning)

### 2. BUILDER AGENT
**Role:** Execute individual tasks  
**Triggers:** tasks.json has pending items  
**Inputs:** Single task + brand/config context  
**Outputs:** Deliverable files in /outputs/  
**Model:** Claude (execution mode)

### 3. REVIEWER AGENT
**Role:** Quality assurance  
**Triggers:** Builder completes a task  
**Inputs:** Task requirements + output file  
**Outputs:** PASS/FAIL + revision notes  
**Model:** Claude (critical analysis mode)

**Review Checklist:**
- [ ] Matches brand voice (check brand.json)
- [ ] Meets task requirements (check description)
- [ ] No factual errors
- [ ] Appropriate length/format
- [ ] Ready for audience

### 4. PUBLISHER AGENT
**Role:** Deploy content to platforms  
**Triggers:** Reviewer passes a task  
**Inputs:** Approved output + platform credentials  
**Outputs:** Live content + URLs  
**Model:** Claude + Platform APIs

**Supported Platforms:**
- LinkedIn (posts, articles)
- Google Business Profile (posts, events)
- Instagram (via scheduling tools)
- Email (via SendGrid/Gmail)
- Website (via CMS APIs)

### 5. ARCHIVIST AGENT
**Role:** Log results and update metrics  
**Triggers:** Publisher completes deployment  
**Inputs:** Published content + engagement data  
**Outputs:** Updated GST metrics, learnings log  
**Model:** Claude (analysis mode)

**Archives:**
- What was published
- When and where
- Initial engagement metrics
- Lessons learned
- GST progress updates

### 6. RESEARCHER AGENT
**Role:** Gather intelligence  
**Triggers:** Planner requests research  
**Inputs:** Research question + parameters  
**Outputs:** Structured findings with citations  
**Model:** GPT-4o (web-enabled) or Perplexity

**Research Types:**
- Competitor analysis
- Market trends
- Audience insights
- Industry news
- Technical documentation

### 7. ANALYST AGENT
**Role:** Synthesize insights  
**Triggers:** Researcher completes gathering  
**Inputs:** Raw research data  
**Outputs:** Executive summary + recommendations  
**Model:** Claude (synthesis mode)

---

## Workflow: Content Creation Pipeline

```
1. PLANNER creates task
       │
       ▼
2. BUILDER executes task
   └── Creates draft in /outputs/
       │
       ▼
3. REVIEWER checks quality
   ├── PASS → Continue
   └── FAIL → Back to Builder with notes
       │
       ▼
4. PUBLISHER deploys
   └── Posts to platform, records URL
       │
       ▼
5. ARCHIVIST logs
   └── Updates metrics, archives content
```

## Workflow: Research Pipeline

```
1. PLANNER requests intelligence
       │
       ▼
2. RESEARCHER gathers data
   └── Searches, compiles, cites
       │
       ▼
3. ANALYST synthesizes
   └── Creates actionable summary
       │
       ▼
4. PLANNER incorporates
   └── Updates strategy, creates tasks
```

---

## File Structure

```
/superchase/
├── orchestrator/
│   ├── AGENTS.md           ← This file
│   ├── PLANNER_AGENT.md    ← Planner protocol
│   ├── BUILDER_AGENT.md    ← Builder protocol
│   ├── REVIEWER_AGENT.md   ← Reviewer protocol
│   ├── PUBLISHER_AGENT.md  ← Publisher protocol
│   └── ARCHIVIST_AGENT.md  ← Archivist protocol
│
├── clients/{venture}/
│   ├── tasks.json          ← Task queue
│   ├── brand.json          ← Voice/style
│   ├── config.json         ← Business context
│   ├── gst.json            ← Goals/strategies
│   ├── outputs/            ← Builder deliverables
│   ├── approved/           ← Reviewer passed
│   ├── published/          ← Publisher deployed
│   └── archive/            ← Archivist logs
│
└── intelligence/
    ├── research/           ← Researcher findings
    └── analysis/           ← Analyst summaries
```

---

## Agent Handoff Protocol

Each agent MUST:
1. Read the previous agent's output
2. Complete their specific task
3. Write their output to the correct location
4. Update the task status
5. Git commit with clear message

**Commit Message Format:**
```
[{venture}] {agent}: {action} for {task_id}

Examples:
[s2p] BUILDER: Complete s2p-001 case study draft
[s2p] REVIEWER: PASS s2p-001 with minor edits
[s2p] PUBLISHER: Deploy s2p-001 to LinkedIn
[s2p] ARCHIVIST: Log s2p-001 published metrics
```

---

## Running Multi-Agent Sessions

**Option 1: Sequential (Simple)**
Run one agent at a time, manually triggering the next.

**Option 2: Chained (Advanced)**
Use a script that:
1. Runs Builder until no pending tasks
2. Runs Reviewer on all built items
3. Runs Publisher on all approved items
4. Runs Archivist on all published items

**Option 3: Parallel (Full Scale)**
Multiple Builder agents work on different ventures simultaneously.
Each venture's pipeline runs independently.

---

## Key Insight

> "The solution wasn't a bigger model. It was a simple, structured workflow inspired by how humans already get things done."

Each agent is DUMB about the big picture but EXPERT at their one job.
The system is SMART because of how the agents connect.

The task queue (tasks.json) is the contract.
The file system is the memory.
Git is the diary.

No agent needs to remember anything.
Every agent can pick up where the last one left off.

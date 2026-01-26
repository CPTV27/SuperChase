# NotebookLM Setup Guide
## Creating Your Empire Intelligence System

---

## RECOMMENDED NOTEBOOK STRUCTURE

Create **3 separate notebooks** in NotebookLM:

### Notebook 1: "Chase Empire OS"
**Purpose:** Central command for all ventures
**Sources to upload:**
- `EMPIRE_OS_SOURCE.md` (this folder)
- `VENTURE_GALLERY_NOTEBOOK.md` (this folder)
- `CROSS_POLLINATION_ANALYSIS.md` (this folder)
- All `brand.json` files from /clients/*/
- All `gst.json` files from /clients/*/

**Use for:**
- Cross-venture strategy
- Resource allocation decisions
- Big picture planning
- "What should I focus on?" questions

---

### Notebook 2: "Empire Activity Log"
**Purpose:** Track what's happening across ventures
**Sources to upload:**
- All `tasks.json` files from /clients/*/
- Completed deliverables from /outputs/ folders
- Weekly status updates (create these)

**Use for:**
- Pipeline status checks
- Task prioritization
- Progress tracking
- "What did we complete this week?" questions

---

### Notebook 3: "Limitless Intelligence"
**Purpose:** Extract insights from your lifelog
**Sources to upload:**
- `LIMITLESS_QUERY_PROMPTS.md` (this folder)
- Weekly Limitless exports/summaries
- Meeting notes and transcripts

**Use for:**
- Contact mining
- Opportunity identification
- Relationship mapping
- "Who did I talk to about X?" questions

---

## HOW TO SET UP EACH NOTEBOOK

### Step 1: Create Notebook in NotebookLM
1. Go to notebooklm.google.com
2. Click "New Notebook"
3. Name it (e.g., "Chase Empire OS")

### Step 2: Upload Sources
1. Click "Add Source"
2. Upload markdown files from this folder
3. For JSON files, upload as-is (NotebookLM handles them)

### Step 3: Generate Audio Overview (Optional)
- NotebookLM can create podcast-style summaries
- Good for passive review while driving/working

### Step 4: Test Key Queries
Try these to verify setup:
- "What are the six ventures?"
- "Which venture needs the most attention?"
- "How can Scan2Plan help Tuthill?"

---

## WEEKLY MAINTENANCE ROUTINE

### Every Monday
1. Update `tasks.json` files with new tasks
2. Move completed items to completedFeatures
3. Upload fresh files to NotebookLM
4. Run "Weekly Brief" query

### Every Friday
1. Export Limitless highlights
2. Run intelligence queries
3. Add any new contacts/opportunities to tracking
4. Generate audio summary for weekend review

---

## QUERY TEMPLATES

### Morning Check-In
```
"Give me a 30-second status on each venture. Flag anything urgent."
```

### Planning Session
```
"I have 4 hours to work on the empire. Based on current status and priorities, what should I do and in what order?"
```

### Cross-Venture Strategy
```
"Analyze the connections between [Venture A] and [Venture B]. What opportunities are we missing? What would a combined offering look like?"
```

### Client Research
```
"Based on everything in this notebook, what type of client would benefit from multiple ventures? Describe their profile and journey."
```

### Content Planning
```
"What content could I create this week that would benefit at least 2 ventures? Give me 3 specific ideas with outlines."
```

---

## CONNECTING TO VENTURE GALLERY

The Venture Gallery UI (venture-gallery.netlify.app) displays the same data visually. Use them together:

**Gallery for:**
- Visual pipeline monitoring
- Quick task management
- Real-time status

**NotebookLM for:**
- Deep analysis
- Strategy questions
- Cross-venture insights
- Historical patterns

---

## CONNECTING TO LIMITLESS

Your Limitless pendant captures conversations. Extract value with these steps:

### Daily (2 minutes)
- Review Limitless daily summary
- Flag any venture-relevant mentions

### Weekly (15 minutes)
1. Run venture-specific queries (see LIMITLESS_QUERY_PROMPTS.md)
2. Export key conversations
3. Add new contacts to tracking

### Monthly (30 minutes)
1. Run relationship analysis
2. Identify dropped opportunities
3. Update contact records

---

## FILES IN THIS FOLDER

| File | Purpose | Upload To |
|------|---------|-----------|
| EMPIRE_OS_SOURCE.md | Master knowledge base | Chase Empire OS notebook |
| VENTURE_GALLERY_NOTEBOOK.md | Command interface doc | Chase Empire OS notebook |
| CROSS_POLLINATION_ANALYSIS.md | Synergy deep dive | Chase Empire OS notebook |
| LIMITLESS_QUERY_PROMPTS.md | Lifelog extraction | Limitless Intelligence notebook |
| SETUP_GUIDE.md | This file | Reference only |

---

## ADVANCED: MCP INTEGRATION

If you have NotebookLM MCP server set up, you can query notebooks directly from Claude:

```
"Query my 'Chase Empire OS' notebook: What cross-venture opportunities should I prioritize this week?"
```

This allows seamless flow between:
- Claude (strategic planning)
- NotebookLM (knowledge retrieval)
- Venture Gallery (visual monitoring)
- Builder agents (execution)

---

*Your intelligence stack: Limitless captures → NotebookLM analyzes → Gallery displays → Agents execute*

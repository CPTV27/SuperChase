# Limitless Lifelog Query Prompts
## For Chase Portfolio OS Context Extraction

Use these prompts with your Limitless pendant data to extract actionable intelligence for the venture system.

---

## VENTURE-SPECIFIC QUERIES

### Scan2Plan Intelligence

**Client Conversations:**
```
Search my conversations for any mentions of:
- Architects, AEC firms, or construction companies
- Building scanning, point clouds, or BIM
- Historic preservation or renovation projects
- Anyone expressing frustration with as-built documentation

Extract: Name, company, pain point, potential project size
```

**Competitive Intelligence:**
```
Have I talked to anyone about Matterport, Leica, or other scanning services?
What did they say about pricing, quality, or turnaround time?
Any complaints about other providers I could address?
```

**Pricing Discussions:**
```
When I've discussed Scan2Plan pricing with potential clients:
- What price points did they react positively to?
- What objections came up?
- What ROI arguments resonated?
```

---

### Big Muddy Inn Intelligence

**Guest Feedback:**
```
Search for any conversations with guests or about guests at Big Muddy Inn:
- What did they love about the stay?
- What complaints or suggestions came up?
- What brought them to Natchez?
- Did they mention the Blues Room specifically?
```

**Music/Event Planning:**
```
Any conversations about:
- Potential performers for the Blues Room
- Event ideas or partnerships
- Music tourism or Delta blues heritage
- Steamboat passenger experiences
```

**Local Business Relationships:**
```
Conversations with other Natchez business owners:
- Referral opportunities
- Joint marketing ideas
- Local event coordination
```

---

### Tuthill Design Intelligence

**Client Conversations:**
```
Search for discussions about interior design projects:
- Budget ranges mentioned
- Timeline expectations
- Style preferences (modern, traditional, etc.)
- Pain points with previous designers
```

**Referral Network:**
```
Any conversations with:
- Architects who might refer clients
- Real estate agents
- Contractors or builders
- Other designers (collaboration vs. competition)
```

---

### Studio C Intelligence

**Podcast/Production Inquiries:**
```
Search for anyone asking about:
- Podcast production or hosting
- Video production services
- Music industry content needs
- Documentary or brand content projects
```

**Ardent/Memphis Connections:**
```
Conversations mentioning:
- Ardent Studios or its artists
- Memphis music scene
- Recording projects
- Music industry relationships
```

---

### CPTV / Personal Brand

**Content Ideas:**
```
What topics have I discussed passionately that could become content?
What questions do people frequently ask me?
What "build logs" or projects have I mentioned working on?
What lessons or failures have I talked about?
```

**Audience Feedback:**
```
When people engage with my content:
- What resonates most?
- What questions do they have?
- What do they want to see more of?
```

---

### Utopia Bearsville

**Music Industry Conversations:**
```
Any discussions with:
- Artists looking for studio space
- Producers or engineers
- Record labels or managers
- Music retreat or residency interest
```

---

## CROSS-VENTURE QUERIES

**Service Bundle Opportunities:**
```
Have I had any conversations where someone needed:
- Both design AND documentation (Tuthill + Scan2Plan)
- Both hospitality AND production (Big Muddy + Studio C)
- Both recording AND music events (Utopia + Big Muddy)

Flag any overlap for package/bundle opportunities.
```

**Geographic Connections:**
```
People I've talked to who are:
- Based in Hudson Valley (Tuthill/Utopia targets)
- Based in Mississippi/Memphis (Big Muddy/Studio C targets)
- Travel frequently to these areas
```

**Referral Mapping:**
```
Who have I met that could refer business to which venture?
Build a map: Person → Venture they could help → How to ask
```

---

## WEEKLY INTELLIGENCE BRIEF

Run this weekly to feed the Portfolio OS:

```
From the past 7 days of conversations, extract:

1. NEW CONTACTS
   - Name, company, relevance to which venture(s)
   - Follow-up needed? Y/N

2. OPPORTUNITIES MENTIONED
   - Specific projects or needs discussed
   - Estimated value if mentioned
   - Timeline if discussed

3. COMPETITIVE INTEL
   - What did I learn about competitors?
   - Pricing, positioning, weaknesses

4. CONTENT IDEAS
   - What topics came up that could be content?
   - What questions did people ask?

5. PROBLEMS TO SOLVE
   - What friction points came up in my businesses?
   - What's not working that I mentioned?

6. WINS TO DOCUMENT
   - What went well?
   - What should become a case study?

Format as JSON for import into task system.
```

---

## RELATIONSHIP INTELLIGENCE

**Who Should I Follow Up With:**
```
From the past 30 days:
- Who did I promise to get back to?
- Who expressed interest in a service?
- Who mentioned a project timeline?
- Who seemed warm but I haven't closed?

Rank by: Urgency × Potential Value
```

**Relationship Strength:**
```
For my key contacts, analyze our conversation history:
- How often do we talk?
- What do we typically discuss?
- What's the relationship trajectory?
- What would strengthen the connection?
```

---

## STRATEGIC PATTERN RECOGNITION

**Market Signals:**
```
Across all my conversations, what patterns emerge about:
- Industry trends affecting my ventures
- Economic concerns or opportunities
- Technology changes mentioned
- Regulatory or compliance topics
```

**Positioning Feedback:**
```
When I describe my businesses to people:
- What questions do they ask?
- What confuses them?
- What excites them?
- What's the "aha moment"?
```

---

## OUTPUT FORMAT

When querying Limitless, request structured output:

```
Return results as:

## [VENTURE NAME]

### Contacts
| Name | Company | Topic | Action Needed |
|------|---------|-------|---------------|

### Opportunities
- **Opportunity:** [description]
  - **Source:** [conversation date/context]
  - **Value:** [estimate if possible]
  - **Next Step:** [action]

### Insights
- [Key learning or pattern]
```

---

*These prompts turn your ambient life data into venture intelligence.*
*Run weekly minimum. Run daily during active sales pushes.*

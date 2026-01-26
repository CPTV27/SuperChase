---
task_id: s2p-006
venture: s2p
type: outreach
created: 2026-01-26T09:35:00.000Z
author: builder-agent
status: ready_for_review
---

# Open Quote Follow-Up Sequence

## Scan2Plan — Stalled Quote Recovery Campaign

*3-email sequence to re-engage prospects with open quotes*

---

## Personalization Fields

Use these merge tags in your email platform:

| Field | Description | Example |
|-------|-------------|---------|
| `{{first_name}}` | Contact's first name | "Michael" |
| `{{company}}` | Firm/company name | "Harrison Architecture" |
| `{{project_name}}` | Project from original quote | "Bedford Office Renovation" |
| `{{quote_amount}}` | Original quote total | "$8,500" |
| `{{quote_date}}` | When quote was sent | "January 10th" |
| `{{sqft}}` | Project square footage | "12,000 sqft" |
| `{{deliverable}}` | Primary deliverable type | "Scan-to-BIM" |
| `{{rep_name}}` | Sales rep name | "Owen" |

---

## Email 1: The Check-In

**Subject Lines (A/B test):**
- A: `{{project_name}} — quick question`
- B: `Following up on your scan quote`
- C: `{{first_name}}, still considering the {{deliverable}}?`

**Send:** Day 0 (trigger when quote is 7+ days old with no response)

---

### Body

Subject: {{project_name}} — quick question

Hi {{first_name}},

I wanted to follow up on the quote we sent over on {{quote_date}} for {{project_name}}.

Quick recap: {{sqft}} of {{deliverable}} at {{quote_amount}}.

I know these decisions often get backlogged—especially when you're juggling active projects. But I also know that the longer as-built documentation waits, the more it can impact your design timeline.

**A few questions that might be on your mind:**

1. **"Is the pricing negotiable?"** — Depending on timeline flexibility, we may have room. Worth a conversation.

2. **"What's the turnaround?"** — We're currently booking 7-10 days out for scanning, with deliverables 5-7 business days after.

3. **"Can we phase this?"** — Yes. We can scan priority areas first and expand scope later if budget is tight.

If any of these apply, reply and let me know. If you've decided to go another direction, no hard feelings—I'd just appreciate knowing so I can close out the quote on our end.

Either way, happy to help.

{{rep_name}}
Scan2Plan
{{phone}} | scan2plan.dev

---

## Email 2: The Value Reminder

**Subject Lines (A/B test):**
- A: `The cost of waiting on {{project_name}}`
- B: `Quick math on your renovation timeline`
- C: `Re: {{project_name}} quote`

**Send:** Day 4 (if no response to Email 1)

---

### Body

Subject: The cost of waiting on {{project_name}}

Hi {{first_name}},

Following up one more time on the {{project_name}} quote.

I've been thinking about your project, and I wanted to share something that might be useful:

**The Hidden Cost of Field Measurements**

On a typical {{sqft}} renovation, firms that rely on manual measurements see an average of 3-5 RFIs directly tied to dimensional errors. Each RFI cycle adds 2-3 days to the project timeline.

For a project your size, that's potentially:
- 6-15 days of schedule slip
- $15K-$50K in change order exposure
- Design rework that pulls your team off other projects

Our scan data eliminates that uncertainty. ±3mm accuracy means your design team works from reality—not assumptions.

**The quote is still valid.** If you'd like to move forward, we can typically get you on the schedule within 2 weeks.

If timing or budget is the blocker, let me know—I may be able to help.

{{rep_name}}

P.S. — I've attached a one-page case study from a similar project. Might be useful context.

**[Attachment: Case study PDF]**

---

## Email 3: The Last Call

**Subject Lines (A/B test):**
- A: `Closing out your quote — {{project_name}}`
- B: `Last call: {{quote_amount}} quote expiring`
- C: `{{first_name}} — should I close this out?`

**Send:** Day 9 (if no response to Emails 1-2)

---

### Body

Subject: Closing out your quote — {{project_name}}

Hi {{first_name}},

I don't want to clutter your inbox, so this will be my last note on the {{project_name}} quote.

**Here's where we are:**

- Original quote: {{quote_amount}} for {{sqft}} of {{deliverable}}
- Quote date: {{quote_date}}
- Status: Awaiting your decision

I'm planning to close this out at the end of the week unless I hear otherwise.

**Before I do—one option:**

If budget is the holdup, I can offer a **10% scheduling flexibility discount** if you're able to book within the next 7 days and give us flexibility on the exact scan date (we'd schedule within a 2-week window that works for both sides).

That would bring your total to **{{discounted_amount}}**.

No pressure either way. If now isn't the right time, I'll follow up in a few months to see if anything has changed.

Thanks for considering Scan2Plan.

{{rep_name}}
Scan2Plan
{{phone}} | scan2plan.dev

---

## Automation Setup

### Trigger Conditions
- Quote sent via Scan2Plan OS
- No response after 7 days
- Quote status: "Sent" or "Pending"
- NOT in "Won" or "Lost" status

### Exit Conditions
- Prospect replies (move to manual follow-up)
- Quote marked "Won" or "Lost"
- Prospect unsubscribes
- Prospect requests call (move to calendar booking)

### Timing
| Email | Delay | Best Send Time |
|-------|-------|----------------|
| Email 1 | Day 0 (trigger) | Tuesday or Thursday, 9:00 AM |
| Email 2 | Day 4 | Tuesday or Thursday, 9:00 AM |
| Email 3 | Day 9 | Tuesday or Thursday, 9:00 AM |

---

## Objection Pre-Handling Reference

Use these talking points if prospect responds with objections:

### "Too expensive"
- Break down cost per sqft (often <$1/sqft)
- Compare to cost of one change order ($5K-$50K)
- Offer phased approach or priority-area scanning
- Discuss scheduling flexibility discount

### "We'll do it later"
- Projects get more complex over time (equipment installed, spaces occupied)
- Earlier scan = cleaner data = faster modeling
- Schedule fills up—lock in dates now even if project is 60 days out

### "Using someone else"
- Ask who (market intelligence)
- Ask what deliverable format (we may offer more)
- Offer to be backup vendor for overflow

### "Need to check with partner/client"
- Offer to join a call with decision-maker
- Provide one-page summary for them to share
- Ask what their specific concerns are

---

## Discount Guidelines

| Discount Type | Amount | Approval | Conditions |
|---------------|--------|----------|------------|
| Scheduling Flexibility | 10% | Auto-approved | Must accept 2-week window |
| Volume (3+ projects) | 10-15% | Manager | Committed pipeline |
| Referral Credit | $250 | Auto-approved | New client from referral |
| First-Time Client | 5% | Auto-approved | First project only |

**Never discount below 40% margin floor.**

---

## Tracking & Metrics

### KPIs to Monitor
- Open rate by subject line (target: 40%+)
- Reply rate by email (target: 15%+)
- Conversion rate (quote to won): target 25%
- Average days to close after sequence: track baseline

### CRM Updates
After each email:
- Log activity in Scan2Plan OS
- Update quote status if reply received
- Tag with "Recovery Sequence" for reporting

---

## Sample Completed Email

**To:** michael.harrison@harrisonarch.com
**Subject:** Bedford Office Renovation — quick question

Hi Michael,

I wanted to follow up on the quote we sent over on January 10th for Bedford Office Renovation.

Quick recap: 12,000 sqft of Scan-to-BIM at $8,500.

I know these decisions often get backlogged—especially when you're juggling active projects. But I also know that the longer as-built documentation waits, the more it can impact your design timeline.

**A few questions that might be on your mind:**

1. **"Is the pricing negotiable?"** — Depending on timeline flexibility, we may have room. Worth a conversation.

2. **"What's the turnaround?"** — We're currently booking 7-10 days out for scanning, with deliverables 5-7 business days after.

3. **"Can we phase this?"** — Yes. We can scan priority areas first and expand scope later if budget is tight.

If any of these apply, reply and let me know. If you've decided to go another direction, no hard feelings—I'd just appreciate knowing so I can close out the quote on our end.

Either way, happy to help.

Owen
Scan2Plan
(845) 555-1234 | scan2plan.dev

---

*Close the loop. Recover the revenue.*

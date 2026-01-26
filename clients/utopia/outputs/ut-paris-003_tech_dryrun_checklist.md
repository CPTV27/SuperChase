# PARIS DOCUMENTARY — TECH DRY RUN CHECKLIST
## Utopia / Studio C Production Validation

---

## 🎯 OBJECTIVE

Validate the entire production pipeline before committing to documentary shoots:
- Remote direction with <1s latency
- Automated lighting (Situs/CITUS)
- Multicam ingest and switching
- Same-day rough assembly (15-30 min interview cut)
- AI pipeline integration

**Duration:** 1 full day
**Location:** Utopia Bearsville
**Crew:** Chase, Elijah, Miles, + 1 mock interview subject

---

## 📅 DRY RUN SCHEDULE

| Time | Phase | Activity |
|------|-------|----------|
| 9:00–10:00 | Setup | Equipment prep, system checks |
| 10:00–11:00 | Lighting Test | Situs/CITUS automation validation |
| 11:00–12:00 | Remote Direction | Latency and control testing |
| 12:00–1:00 | Lunch | — |
| 1:00–2:30 | Mock Interview | Full capture with mock subject |
| 2:30–4:00 | Ingest & Edit | Same-day rough assembly test |
| 4:00–5:00 | AI Pipeline | Transcription, shot tagging, Asana integration |
| 5:00–5:30 | Debrief | Document issues, create fix list |

---

## ✅ PRE-DRY RUN CHECKLIST

### Equipment
- [ ] Primary camera charged, formatted
- [ ] Backup camera ready
- [ ] All lenses cleaned
- [ ] Tripod plates attached
- [ ] Gimbal charged and balanced
- [ ] Wireless lav kit (2 transmitters, fresh batteries)
- [ ] Shotgun mic + recorder
- [ ] LED panel + stands
- [ ] Cables (HDMI, SDI, USB, XLR)
- [ ] Media cards (3x daily requirement)
- [ ] Backup drives (2 minimum)

### Situs/CITUS Lighting
- [ ] All fixtures networked
- [ ] Control software updated
- [ ] Presets created for interview setup
- [ ] Remote trigger tested

### Switching/Capture
- [ ] Blackmagic switcher powered and configured
- [ ] All camera inputs routed
- [ ] Multiview monitor working
- [ ] OBS scene collection ready
- [ ] Recording paths verified (local + backup)
- [ ] Restream connection tested (if needed)

### Remote Direction
- [ ] Remote workstation connected
- [ ] Low-latency monitoring feed active
- [ ] Comms (Discord/Zoom/intercom) working
- [ ] PTZ or remote tally control functional

### AI/Automation
- [ ] Transcription service credentials ready (11Labs or other)
- [ ] Claude prompts prepared for shot tagging
- [ ] Asana project created for test
- [ ] File naming template confirmed

---

## 🔧 PHASE 1: LIGHTING TEST (10:00–11:00)

### Goals
- Virtual preset → real lights in <2 seconds
- Smooth transitions between looks
- No flicker on camera

### Test Sequence
1. Load "Interview — Key Light" preset → verify fixture response
2. Load "Interview — Fill Added" preset → verify smooth transition
3. Load "B-Roll — Moody" preset → verify dramatic change
4. Trigger via remote command → verify latency
5. Manual override → verify fallback works

### Validation Criteria
| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Virtual → Real latency <2s | ☐ | ☐ | |
| No flicker on camera | ☐ | ☐ | |
| Remote trigger works | ☐ | ☐ | |
| Manual override available | ☐ | ☐ | |
| All fixtures responding | ☐ | ☐ | |

### Issues Found
- [ ] Issue 1: [DESCRIPTION] → Fix: [ACTION]
- [ ] Issue 2: [DESCRIPTION] → Fix: [ACTION]

---

## 🎥 PHASE 2: REMOTE DIRECTION (11:00–12:00)

### Goals
- Director sees live feed with <1 second delay
- Director can call shot changes in real-time
- Crew receives clear instruction via comms
- Tally/on-air indication visible to talent

### Test Sequence
1. Director (Chase) at remote station, Elijah on floor
2. Call 10 consecutive shot changes (A, B, A, C, B, A, etc.)
3. Measure round-trip latency (call → execution → confirmation)
4. Test comms clarity in both directions
5. Simulate connection drop → verify recovery

### Validation Criteria
| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Monitoring latency <1s | ☐ | ☐ | Measured: ___ ms |
| Shot execution <2s from call | ☐ | ☐ | |
| Comms clear both directions | ☐ | ☐ | |
| Tally visible to talent | ☐ | ☐ | |
| Connection recovery <30s | ☐ | ☐ | |

### Issues Found
- [ ] Issue 1: [DESCRIPTION] → Fix: [ACTION]
- [ ] Issue 2: [DESCRIPTION] → Fix: [ACTION]

---

## 🎤 PHASE 3: MOCK INTERVIEW (1:00–2:30)

### Setup
- **Subject:** [NAME] (can be team member or friend)
- **Topic:** Doesn't matter — focus on technical execution
- **Duration:** 20-30 minutes of actual interview

### Capture Checklist
- [ ] 2-camera setup (A cam tight, B cam wide or reverse)
- [ ] Lav mic on subject + room mic backup
- [ ] Lighting preset active
- [ ] Recording started on all sources
- [ ] Slate with timecode reference

### During Interview
- [ ] Director calls 5+ shot changes
- [ ] Adjust lighting mid-interview (test automation)
- [ ] Note any audio issues in real-time
- [ ] Capture B-roll cutaways (hands, details)

### Post-Interview
- [ ] Confirm all files recorded
- [ ] Verify sync between sources
- [ ] Spot-check audio levels
- [ ] Note any camera/lighting issues

### Validation Criteria
| Test | Pass | Fail | Notes |
|------|------|------|-------|
| All cameras recorded | ☐ | ☐ | |
| Audio clean, no dropouts | ☐ | ☐ | |
| Sources sync properly | ☐ | ☐ | |
| Lighting changes smooth on camera | ☐ | ☐ | |
| Remote direction effective | ☐ | ☐ | |

---

## 🖥 PHASE 4: SAME-DAY EDIT (2:30–4:00)

### Goals
- Ingest complete in <15 minutes
- Rough cut assembled in <45 minutes
- Output a watchable 3-5 minute selects reel

### Workflow Test
1. **Ingest** (15 min max)
   - [ ] Copy all media to edit drive
   - [ ] Verify file integrity (spot-check playback)
   - [ ] Create project, import media
   - [ ] Sync multicam (if applicable)

2. **Rough Assembly** (30-45 min)
   - [ ] Select best 3-5 soundbites
   - [ ] Cut together with basic B-roll
   - [ ] Add temp music (if available)
   - [ ] Export rough cut

3. **Output**
   - [ ] 3-5 minute selects reel rendered
   - [ ] File delivered to review folder
   - [ ] Shareable link created (Frame.io, Google Drive, etc.)

### Validation Criteria
| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Ingest <15 min | ☐ | ☐ | Actual: ___ min |
| Rough cut <45 min | ☐ | ☐ | Actual: ___ min |
| Watchable output delivered | ☐ | ☐ | |
| No major technical issues | ☐ | ☐ | |

### Issues Found
- [ ] Issue 1: [DESCRIPTION] → Fix: [ACTION]
- [ ] Issue 2: [DESCRIPTION] → Fix: [ACTION]

---

## 🤖 PHASE 5: AI PIPELINE (4:00–5:00)

### Goals
- Auto-transcription of interview audio
- AI-generated shot tags/descriptions
- Task creation in Asana from outputs

### Test Sequence
1. **Transcription**
   - [ ] Upload interview audio to transcription service
   - [ ] Receive transcript in <10 minutes
   - [ ] Verify accuracy (spot-check 2-3 sections)

2. **Shot Tagging (Claude)**
   - [ ] Feed transcript to Claude with tagging prompt
   - [ ] Receive list of potential pull-quotes
   - [ ] Receive suggested chapter markers

3. **Asana Integration**
   - [ ] Auto-create task from AI output
   - [ ] Verify task appears in correct project
   - [ ] Attachments linked properly

### Validation Criteria
| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Transcription <10 min | ☐ | ☐ | Actual: ___ min |
| Transcript accuracy >90% | ☐ | ☐ | |
| Claude returns useful tags | ☐ | ☐ | |
| Asana task auto-created | ☐ | ☐ | |

### AI Prompts Used
**Transcription Service:** [11Labs / Whisper / Other]

**Claude Shot Tagging Prompt:**
```
[INCLUDE THE ACTUAL PROMPT USED]
```

---

## 📋 PHASE 6: DEBRIEF (5:00–5:30)

### Overall Assessment
| Category | Status | Notes |
|----------|--------|-------|
| Lighting Automation | ✅ / ⚠️ / ❌ | |
| Remote Direction | ✅ / ⚠️ / ❌ | |
| Interview Capture | ✅ / ⚠️ / ❌ | |
| Same-Day Edit | ✅ / ⚠️ / ❌ | |
| AI Pipeline | ✅ / ⚠️ / ❌ | |
| **OVERALL READY?** | **YES / NO** | |

### Critical Issues (Must Fix Before Production)
1. [ISSUE] → Owner: [NAME] → Deadline: [DATE]
2. [ISSUE] → Owner: [NAME] → Deadline: [DATE]
3. [ISSUE] → Owner: [NAME] → Deadline: [DATE]

### Nice-to-Fix (Before Production if Possible)
1. [ISSUE]
2. [ISSUE]

### Workflow Improvements Identified
1. [IMPROVEMENT]
2. [IMPROVEMENT]

---

## 🚨 FALLBACK PLANS

If critical systems fail during production:

| System Failure | Fallback |
|----------------|----------|
| Situs/CITUS dies | Manual lighting with preset notes |
| Remote feed drops | Local director takes over, phone comms |
| Multicam ingest fails | Single-cam hero + separate B-roll |
| Transcription service down | Manual transcription post-shoot |
| Recording fails | Backup camera always rolling |

---

## 📁 FILES TO PREPARE

Before dry run:
- [ ] This checklist printed
- [ ] Lighting presets saved
- [ ] OBS scene collection backed up
- [ ] AI prompts documented
- [ ] Asana project template ready
- [ ] Release form for mock subject

After dry run:
- [ ] Completed checklist scanned/saved
- [ ] Issues log documented
- [ ] Fix assignments made
- [ ] Follow-up dry run scheduled (if needed)

---

*Prepared for Utopia / Studio C*
*January 26, 2026*

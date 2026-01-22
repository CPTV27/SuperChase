/**
 * ABM Wave Orchestration
 * Part of S2P Command Center
 *
 * Features:
 * - 6-week sprint cycles per wave
 * - Auto-assign leads to waves based on tier score
 * - Track: proof mailer sent date, expected reply date
 * - Calculate days overdue: (today - expected_reply_date)
 * - Weekly kill/keep workflow: flag leads with no response after 2 touches
 * - Next action routing based on lead state
 *
 * State Machine:
 * Cold Lead → Proof Mailer Sent → Reply Received → Meeting Scheduled → Qualified
 *          ↓ (no reply in 7d)
 *          → Follow-up Email → Reply Received → Meeting Scheduled
 *          ↓ (no reply in 7d)
 *          → Kill/Keep Decision → Keep (call) OR Kill (move to nurture)
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const WAVES_PATH = join(__dirname, '../../clients/s2p/memory/waves.json');
const LEADS_PATH = join(__dirname, '../../clients/s2p/memory/leads.json');

// Wave configuration
const WAVE_CONFIG = {
  sprintDurationWeeks: 6,
  followUpIntervalDays: 7,
  maxTouches: 3,
  replyExpectedDays: 7,
  cohortSize: 25  // A-25 targets per wave
};

// Target states (state machine)
const TARGET_STATE = {
  COLD: 'cold',
  PROOF_SENT: 'proof_sent',
  FOLLOW_UP_1: 'follow_up_1',
  FOLLOW_UP_2: 'follow_up_2',
  REPLY_RECEIVED: 'reply_received',
  MEETING_SCHEDULED: 'meeting_scheduled',
  QUALIFIED: 'qualified',
  KILLED: 'killed',
  NURTURE: 'nurture'
};

// Persona beats (locked to 3 topics per strategy)
const PERSONA_BEATS = {
  'Risk-Averse Principal': [
    { week: 1, topic: 'Variance Control ROI', deliverable: 'proof_mailer' },
    { week: 2, topic: 'Change Order Prevention', deliverable: 'case_study' },
    { week: 4, topic: 'Risk Mitigation Case Study', deliverable: 'whitepaper' }
  ],
  'Tech-Forward BIM Director': [
    { week: 1, topic: 'LOD 350 Technical Spec', deliverable: 'proof_mailer' },
    { week: 2, topic: 'Point Cloud to BIM Workflow', deliverable: 'case_study' },
    { week: 4, topic: 'Integration with Existing BIM', deliverable: 'technical_doc' }
  ],
  'Budget-Conscious PM': [
    { week: 1, topic: 'Cost Savings Calculator', deliverable: 'proof_mailer' },
    { week: 2, topic: 'Fixed-Price Guarantee', deliverable: 'case_study' },
    { week: 4, topic: 'ROI Analysis Template', deliverable: 'calculator' }
  ]
};

/**
 * Load waves database
 */
async function loadWaves() {
  try {
    const data = await readFile(WAVES_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.waves || [];
  } catch {
    return [];
  }
}

/**
 * Save waves database
 */
async function saveWaves(waves) {
  const db = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    waves
  };
  await writeFile(WAVES_PATH, JSON.stringify(db, null, 2));
}

/**
 * Load leads database
 */
async function loadLeads() {
  try {
    const data = await readFile(LEADS_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.leads || [];
  } catch {
    return [];
  }
}

/**
 * Calculate days overdue
 */
function daysOverdue(expectedDate) {
  if (!expectedDate) return 0;
  const expected = new Date(expectedDate);
  const now = new Date();
  const diff = Math.floor((now - expected) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/**
 * Calculate days until expected reply
 */
function daysUntilExpected(sentDate) {
  if (!sentDate) return null;
  const sent = new Date(sentDate);
  const expected = new Date(sent.getTime() + WAVE_CONFIG.replyExpectedDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.ceil((expected - now) / (1000 * 60 * 60 * 24));
}

/**
 * Get next action for a target based on current state
 */
function getNextAction(target) {
  const state = target.state || TARGET_STATE.COLD;
  const touchCount = target.touchCount || 0;

  switch (state) {
    case TARGET_STATE.COLD:
      return {
        action: 'send_proof_mailer',
        description: 'Send initial proof mailer with matched case study',
        priority: 'high',
        dueIn: 0
      };

    case TARGET_STATE.PROOF_SENT:
    case TARGET_STATE.FOLLOW_UP_1:
      const overdue = daysOverdue(target.expectedReplyDate);
      if (overdue > 0) {
        if (touchCount >= WAVE_CONFIG.maxTouches) {
          return {
            action: 'kill_keep_decision',
            description: 'No response after max touches - decide kill or keep',
            priority: 'high',
            dueIn: 0
          };
        }
        return {
          action: 'send_follow_up',
          description: `Send follow-up #${touchCount + 1} (${overdue} days overdue)`,
          priority: 'high',
          dueIn: 0
        };
      }
      return {
        action: 'wait_for_reply',
        description: `Waiting for reply (${daysUntilExpected(target.lastTouchDate)} days remaining)`,
        priority: 'low',
        dueIn: daysUntilExpected(target.lastTouchDate)
      };

    case TARGET_STATE.REPLY_RECEIVED:
      return {
        action: 'schedule_meeting',
        description: 'Reply received - schedule qualified meeting',
        priority: 'urgent',
        dueIn: 0
      };

    case TARGET_STATE.MEETING_SCHEDULED:
      return {
        action: 'prepare_meeting',
        description: 'Prepare meeting materials and proof kit',
        priority: 'high',
        dueIn: 1
      };

    case TARGET_STATE.KILLED:
    case TARGET_STATE.NURTURE:
      return {
        action: 'none',
        description: state === TARGET_STATE.KILLED ? 'Lead killed' : 'Moved to nurture',
        priority: 'none',
        dueIn: null
      };

    default:
      return {
        action: 'review',
        description: 'Review lead status',
        priority: 'medium',
        dueIn: 0
      };
  }
}

/**
 * Create a new wave
 */
async function createWave(waveData) {
  const { name, persona, startDate, targetLeadIds } = waveData;

  const waves = await loadWaves();
  const leads = await loadLeads();

  // Filter and prepare targets
  const targets = targetLeadIds
    .map(id => {
      const lead = leads.find(l => l.id === id || l.firmName === id);
      if (!lead) return null;

      return {
        leadId: lead.id,
        firmName: lead.firmName,
        tier: lead.scoring?.tier || 'B',
        score: lead.scoring?.score || 0,
        state: TARGET_STATE.COLD,
        touchCount: 0,
        lastTouchDate: null,
        expectedReplyDate: null,
        replyDate: null,
        meetingDate: null,
        killed: false,
        notes: [],
        history: []
      };
    })
    .filter(Boolean)
    .slice(0, WAVE_CONFIG.cohortSize);

  const wave = {
    id: `wave_${Date.now()}`,
    name: name || `Wave ${waves.length + 1}`,
    persona: persona || 'Risk-Averse Principal',
    status: 'active',
    startDate: startDate || new Date().toISOString(),
    endDate: calculateEndDate(startDate || new Date().toISOString()),
    targets,
    personaBeats: PERSONA_BEATS[persona] || PERSONA_BEATS['Risk-Averse Principal'],
    stats: {
      totalTargets: targets.length,
      touched: 0,
      replies: 0,
      meetings: 0,
      killed: 0,
      converted: 0
    },
    createdAt: new Date().toISOString()
  };

  waves.push(wave);
  await saveWaves(waves);

  return { success: true, wave };
}

/**
 * Calculate wave end date (6 weeks from start)
 */
function calculateEndDate(startDate) {
  const start = new Date(startDate);
  start.setDate(start.getDate() + WAVE_CONFIG.sprintDurationWeeks * 7);
  return start.toISOString();
}

/**
 * Get wave by ID
 */
async function getWave(waveId) {
  const waves = await loadWaves();
  return waves.find(w => w.id === waveId) || null;
}

/**
 * Get all waves with optional filtering
 */
async function getWaves(filters = {}) {
  let waves = await loadWaves();

  if (filters.status) {
    waves = waves.filter(w => w.status === filters.status);
  }

  return {
    waves,
    count: waves.length,
    activeCount: waves.filter(w => w.status === 'active').length
  };
}

/**
 * Record a touch (email sent)
 */
async function recordTouch(waveId, leadId, touchType) {
  const waves = await loadWaves();
  const waveIndex = waves.findIndex(w => w.id === waveId);

  if (waveIndex === -1) {
    return { success: false, error: 'Wave not found' };
  }

  const targetIndex = waves[waveIndex].targets.findIndex(t =>
    t.leadId === leadId || t.firmName === leadId
  );

  if (targetIndex === -1) {
    return { success: false, error: 'Target not found in wave' };
  }

  const target = waves[waveIndex].targets[targetIndex];
  const now = new Date().toISOString();

  target.touchCount = (target.touchCount || 0) + 1;
  target.lastTouchDate = now;
  target.expectedReplyDate = new Date(Date.now() + WAVE_CONFIG.replyExpectedDays * 24 * 60 * 60 * 1000).toISOString();

  if (target.state === TARGET_STATE.COLD) {
    target.state = TARGET_STATE.PROOF_SENT;
  } else if (target.state === TARGET_STATE.PROOF_SENT) {
    target.state = TARGET_STATE.FOLLOW_UP_1;
  } else if (target.state === TARGET_STATE.FOLLOW_UP_1) {
    target.state = TARGET_STATE.FOLLOW_UP_2;
  }

  target.history.push({
    action: touchType || 'email_sent',
    date: now,
    touchNumber: target.touchCount
  });

  // Update wave stats
  waves[waveIndex].stats.touched = waves[waveIndex].targets.filter(t =>
    t.touchCount > 0
  ).length;

  await saveWaves(waves);

  return {
    success: true,
    target,
    nextAction: getNextAction(target)
  };
}

/**
 * Record a reply
 */
async function recordReply(waveId, leadId, replyType) {
  const waves = await loadWaves();
  const waveIndex = waves.findIndex(w => w.id === waveId);

  if (waveIndex === -1) {
    return { success: false, error: 'Wave not found' };
  }

  const targetIndex = waves[waveIndex].targets.findIndex(t =>
    t.leadId === leadId || t.firmName === leadId
  );

  if (targetIndex === -1) {
    return { success: false, error: 'Target not found in wave' };
  }

  const target = waves[waveIndex].targets[targetIndex];
  const now = new Date().toISOString();

  target.state = TARGET_STATE.REPLY_RECEIVED;
  target.replyDate = now;

  target.history.push({
    action: 'reply_received',
    date: now,
    replyType: replyType || 'email'
  });

  // Update wave stats
  waves[waveIndex].stats.replies = waves[waveIndex].targets.filter(t =>
    t.replyDate
  ).length;

  await saveWaves(waves);

  return {
    success: true,
    target,
    nextAction: getNextAction(target)
  };
}

/**
 * Record meeting scheduled
 */
async function recordMeeting(waveId, leadId, meetingDate) {
  const waves = await loadWaves();
  const waveIndex = waves.findIndex(w => w.id === waveId);

  if (waveIndex === -1) {
    return { success: false, error: 'Wave not found' };
  }

  const targetIndex = waves[waveIndex].targets.findIndex(t =>
    t.leadId === leadId || t.firmName === leadId
  );

  if (targetIndex === -1) {
    return { success: false, error: 'Target not found in wave' };
  }

  const target = waves[waveIndex].targets[targetIndex];
  const now = new Date().toISOString();

  target.state = TARGET_STATE.MEETING_SCHEDULED;
  target.meetingDate = meetingDate || now;

  target.history.push({
    action: 'meeting_scheduled',
    date: now,
    meetingDate: target.meetingDate
  });

  // Update wave stats
  waves[waveIndex].stats.meetings = waves[waveIndex].targets.filter(t =>
    t.meetingDate
  ).length;

  await saveWaves(waves);

  return {
    success: true,
    target,
    nextAction: getNextAction(target)
  };
}

/**
 * Kill or keep decision
 */
async function killKeepDecision(waveId, leadId, decision, reason) {
  const waves = await loadWaves();
  const waveIndex = waves.findIndex(w => w.id === waveId);

  if (waveIndex === -1) {
    return { success: false, error: 'Wave not found' };
  }

  const targetIndex = waves[waveIndex].targets.findIndex(t =>
    t.leadId === leadId || t.firmName === leadId
  );

  if (targetIndex === -1) {
    return { success: false, error: 'Target not found in wave' };
  }

  const target = waves[waveIndex].targets[targetIndex];
  const now = new Date().toISOString();

  if (decision === 'kill') {
    target.state = TARGET_STATE.KILLED;
    target.killed = true;
    waves[waveIndex].stats.killed++;
  } else {
    target.state = TARGET_STATE.NURTURE;
  }

  target.history.push({
    action: `kill_keep_${decision}`,
    date: now,
    reason
  });

  await saveWaves(waves);

  return {
    success: true,
    target,
    decision
  };
}

/**
 * Get wave dashboard data
 */
async function getWaveDashboard(waveId) {
  const wave = await getWave(waveId);

  if (!wave) {
    return { success: false, error: 'Wave not found' };
  }

  const now = new Date();

  // Calculate metrics
  const targetsWithAction = wave.targets.map(target => ({
    ...target,
    nextAction: getNextAction(target),
    daysOverdue: daysOverdue(target.expectedReplyDate),
    isOverdue: daysOverdue(target.expectedReplyDate) > 0
  }));

  const overdueCount = targetsWithAction.filter(t => t.isOverdue).length;
  const pendingCount = targetsWithAction.filter(t =>
    ![TARGET_STATE.KILLED, TARGET_STATE.NURTURE, TARGET_STATE.QUALIFIED].includes(t.state)
  ).length;

  // Reply → Meeting conversion
  const replyToMeeting = wave.stats.replies > 0
    ? Math.round((wave.stats.meetings / wave.stats.replies) * 100)
    : 0;

  // Days until wave ends
  const endDate = new Date(wave.endDate);
  const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

  return {
    wave: {
      id: wave.id,
      name: wave.name,
      status: wave.status,
      persona: wave.persona,
      startDate: wave.startDate,
      endDate: wave.endDate,
      daysRemaining
    },
    stats: {
      ...wave.stats,
      overdueCount,
      pendingCount,
      replyToMeeting
    },
    targets: targetsWithAction.sort((a, b) => {
      // Sort by urgency: overdue first, then by state
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.daysOverdue - a.daysOverdue;
    }),
    personaBeats: wave.personaBeats
  };
}

/**
 * Get targets needing kill/keep decision
 */
async function getKillKeepQueue() {
  const waves = await loadWaves();
  const queue = [];

  for (const wave of waves.filter(w => w.status === 'active')) {
    for (const target of wave.targets) {
      const overdue = daysOverdue(target.expectedReplyDate);
      const touchCount = target.touchCount || 0;

      if (overdue > 0 && touchCount >= WAVE_CONFIG.maxTouches &&
          ![TARGET_STATE.KILLED, TARGET_STATE.NURTURE, TARGET_STATE.REPLY_RECEIVED,
            TARGET_STATE.MEETING_SCHEDULED, TARGET_STATE.QUALIFIED].includes(target.state)) {
        queue.push({
          waveId: wave.id,
          waveName: wave.name,
          ...target,
          daysOverdue: overdue,
          recommendation: target.tier === 'A' ? 'keep' : 'kill'
        });
      }
    }
  }

  return {
    queue,
    count: queue.length
  };
}

export {
  createWave,
  getWave,
  getWaves,
  recordTouch,
  recordReply,
  recordMeeting,
  killKeepDecision,
  getWaveDashboard,
  getKillKeepQueue,
  getNextAction,
  loadWaves,
  saveWaves,
  TARGET_STATE,
  WAVE_CONFIG,
  PERSONA_BEATS
};

export default {
  createWave,
  getWave,
  getWaves,
  recordTouch,
  recordReply,
  recordMeeting,
  killKeepDecision,
  getWaveDashboard,
  getKillKeepQueue,
  getNextAction,
  loadWaves,
  saveWaves,
  TARGET_STATE,
  WAVE_CONFIG,
  PERSONA_BEATS
};

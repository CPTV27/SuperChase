/**
 * Signal Queue (Trigger Detection)
 * Part of S2P Command Center
 *
 * Detects and routes signals:
 * - Whale Alert: deal_size > $50,000
 * - Referral Warm Intro: relationship_status = 'warm_intro'
 * - Vendor Approved: vendor_status changed to 'approved'
 * - Proof Viewer: someone clicked proof link
 * - Overdue Follow-up: days_overdue > 0
 *
 * 48-hour SLA tracking
 * Auto-route to action owner (CEO, Marketing, Ops)
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const SIGNALS_PATH = join(__dirname, '../../clients/s2p/memory/signals.json');
const LEADS_PATH = join(__dirname, '../../clients/s2p/memory/leads.json');
const PIPELINE_PATH = join(__dirname, '../../clients/s2p/memory/pipeline.json');

// Signal types with routing
const SIGNAL_TYPES = {
  whale_alert: {
    name: 'Whale Alert',
    slaHours: 24,
    owner: 'CEO',
    action: 'Schedule whale call',
    priority: 'critical'
  },
  warm_intro: {
    name: 'Warm Introduction',
    slaHours: 48,
    owner: 'CEO',
    action: 'Draft intro email',
    priority: 'high'
  },
  vendor_approved: {
    name: 'Vendor Approved',
    slaHours: 24,
    owner: 'CEO',
    action: 'Send first project proposal',
    priority: 'high'
  },
  proof_viewer: {
    name: 'Proof Viewed',
    slaHours: 48,
    owner: 'Marketing',
    action: 'Send follow-up with matched proof',
    priority: 'medium'
  },
  overdue_followup: {
    name: 'Overdue Follow-up',
    slaHours: 0, // Immediate
    owner: 'CEO',
    action: 'Call immediately',
    priority: 'urgent'
  },
  permit_filed: {
    name: 'Permit Filed',
    slaHours: 48,
    owner: 'CEO',
    action: 'First touch outreach',
    priority: 'high'
  },
  compliance_filing: {
    name: 'Compliance Filing',
    slaHours: 48,
    owner: 'CEO',
    action: 'Compliance outreach',
    priority: 'medium'
  },
  bid_posted: {
    name: 'Bid Posted',
    slaHours: 24,
    owner: 'CEO',
    action: 'Review and respond',
    priority: 'high'
  },
  meeting_completed: {
    name: 'Meeting Completed',
    slaHours: 24,
    owner: 'CEO',
    action: 'Send follow-up and proposal',
    priority: 'high'
  }
};

// Signal status
const SIGNAL_STATUS = {
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DISMISSED: 'dismissed',
  EXPIRED: 'expired'
};

/**
 * Load signals database
 */
async function loadSignals() {
  try {
    const data = await readFile(SIGNALS_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.signals || [];
  } catch {
    return [];
  }
}

/**
 * Save signals database
 */
async function saveSignals(signals) {
  const db = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    signals
  };
  await writeFile(SIGNALS_PATH, JSON.stringify(db, null, 2));
}

/**
 * Calculate hours since signal created
 */
function hoursSince(dateString) {
  const created = new Date(dateString);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60));
}

/**
 * Calculate SLA status
 */
function getSLAStatus(signal) {
  const config = SIGNAL_TYPES[signal.type];
  if (!config) return { status: 'unknown', hoursRemaining: null };

  const hours = hoursSince(signal.createdAt);
  const slaHours = config.slaHours;

  if (signal.status === SIGNAL_STATUS.COMPLETED) {
    return { status: 'completed', hoursRemaining: null };
  }

  if (hours >= slaHours) {
    return {
      status: 'breached',
      hoursOverdue: hours - slaHours,
      hoursRemaining: 0
    };
  }

  return {
    status: 'ok',
    hoursRemaining: slaHours - hours
  };
}

/**
 * Create a new signal
 */
async function createSignal(signalData) {
  const { type, leadId, firmName, source, metadata, notes } = signalData;

  const config = SIGNAL_TYPES[type];
  if (!config) {
    return { success: false, error: `Unknown signal type: ${type}` };
  }

  const signals = await loadSignals();

  const signal = {
    id: `signal_${Date.now()}`,
    type,
    name: config.name,
    leadId,
    firmName,
    source: source || 'manual',
    status: SIGNAL_STATUS.PENDING,
    owner: config.owner,
    action: config.action,
    priority: config.priority,
    slaHours: config.slaHours,
    metadata: metadata || {},
    notes: notes || null,
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
    completedAt: null,
    history: [{
      action: 'created',
      date: new Date().toISOString()
    }]
  };

  signals.push(signal);
  await saveSignals(signals);

  return { success: true, signal };
}

/**
 * Acknowledge a signal
 */
async function acknowledgeSignal(signalId, assignedTo) {
  const signals = await loadSignals();
  const index = signals.findIndex(s => s.id === signalId);

  if (index === -1) {
    return { success: false, error: 'Signal not found' };
  }

  signals[index].status = SIGNAL_STATUS.IN_PROGRESS;
  signals[index].acknowledgedAt = new Date().toISOString();
  signals[index].assignedTo = assignedTo || signals[index].owner;
  signals[index].history.push({
    action: 'acknowledged',
    date: new Date().toISOString(),
    assignedTo
  });

  await saveSignals(signals);

  return { success: true, signal: signals[index] };
}

/**
 * Complete a signal
 */
async function completeSignal(signalId, resolution, notes) {
  const signals = await loadSignals();
  const index = signals.findIndex(s => s.id === signalId);

  if (index === -1) {
    return { success: false, error: 'Signal not found' };
  }

  signals[index].status = SIGNAL_STATUS.COMPLETED;
  signals[index].completedAt = new Date().toISOString();
  signals[index].resolution = resolution;
  signals[index].history.push({
    action: 'completed',
    date: new Date().toISOString(),
    resolution,
    notes
  });

  await saveSignals(signals);

  return { success: true, signal: signals[index] };
}

/**
 * Dismiss a signal
 */
async function dismissSignal(signalId, reason) {
  const signals = await loadSignals();
  const index = signals.findIndex(s => s.id === signalId);

  if (index === -1) {
    return { success: false, error: 'Signal not found' };
  }

  signals[index].status = SIGNAL_STATUS.DISMISSED;
  signals[index].history.push({
    action: 'dismissed',
    date: new Date().toISOString(),
    reason
  });

  await saveSignals(signals);

  return { success: true, signal: signals[index] };
}

/**
 * Get pending signals with SLA status
 */
async function getPendingSignals() {
  const signals = await loadSignals();

  const pending = signals
    .filter(s => [SIGNAL_STATUS.PENDING, SIGNAL_STATUS.IN_PROGRESS].includes(s.status))
    .map(s => ({
      ...s,
      sla: getSLAStatus(s),
      ageHours: hoursSince(s.createdAt)
    }))
    .sort((a, b) => {
      // Sort by priority then by SLA breach
      const priorityOrder = { urgent: 0, critical: 1, high: 2, medium: 3, low: 4 };
      const priorityDiff = (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by SLA status (breached first)
      if (a.sla.status === 'breached' && b.sla.status !== 'breached') return -1;
      if (a.sla.status !== 'breached' && b.sla.status === 'breached') return 1;

      return a.ageHours - b.ageHours;
    });

  return {
    signals: pending,
    count: pending.length,
    breached: pending.filter(s => s.sla.status === 'breached').length,
    urgent: pending.filter(s => s.priority === 'urgent').length
  };
}

/**
 * Get signal queue dashboard
 */
async function getSignalDashboard() {
  const signals = await loadSignals();
  const now = new Date();

  const byStatus = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    dismissed: 0
  };

  const byOwner = {
    CEO: [],
    Marketing: [],
    Ops: []
  };

  const breached = [];
  const urgent = [];

  for (const signal of signals) {
    byStatus[signal.status] = (byStatus[signal.status] || 0) + 1;

    if ([SIGNAL_STATUS.PENDING, SIGNAL_STATUS.IN_PROGRESS].includes(signal.status)) {
      const owner = signal.owner || 'CEO';
      if (!byOwner[owner]) byOwner[owner] = [];
      byOwner[owner].push(signal);

      const sla = getSLAStatus(signal);
      if (sla.status === 'breached') {
        breached.push({ ...signal, sla });
      }

      if (signal.priority === 'urgent' || signal.priority === 'critical') {
        urgent.push(signal);
      }
    }
  }

  return {
    summary: {
      total: signals.length,
      ...byStatus,
      breachedCount: breached.length,
      urgentCount: urgent.length
    },
    byOwner: {
      CEO: byOwner.CEO.length,
      Marketing: byOwner.Marketing.length,
      Ops: byOwner.Ops.length
    },
    breached,
    urgent,
    lastUpdated: now.toISOString()
  };
}

/**
 * Detect signals from lead/deal data (for Operations Council)
 */
async function detectSignals(leadOrDeal) {
  const detected = [];

  // Whale alert (deal > $50K)
  if (leadOrDeal.value && leadOrDeal.value > 50000) {
    detected.push({
      type: 'whale_alert',
      reason: `Deal value $${(leadOrDeal.value / 1000).toFixed(0)}K exceeds $50K threshold`
    });
  }

  // Warm intro
  if (leadOrDeal.relationshipStatus === 'warm_intro') {
    detected.push({
      type: 'warm_intro',
      reason: 'Lead has warm introduction'
    });
  }

  // Tier-A with no recent activity
  if (leadOrDeal.scoring?.tier === 'A' && !leadOrDeal.lastTouchDate) {
    detected.push({
      type: 'overdue_followup',
      reason: 'Tier-A lead with no recent activity'
    });
  }

  return {
    detected,
    count: detected.length
  };
}

/**
 * Run Signal Scout agent (for Operations Council)
 */
async function runSignalScout(company) {
  // Load leads and check for signals
  const leads = await loadExistingLeads();
  const lead = leads.find(l =>
    l.firmName?.toLowerCase() === company?.toLowerCase() ||
    l.id === company
  );

  if (!lead) {
    return {
      agentId: 'signal-scout',
      model: 'local',
      signals: [],
      slaBreaches: [],
      newLeadsCreated: 0,
      timestamp: new Date().toISOString()
    };
  }

  const detection = await detectSignals(lead);
  const pending = await getPendingSignals();

  // Check for SLA breaches related to this company
  const companySignals = pending.signals.filter(s =>
    s.firmName?.toLowerCase() === company?.toLowerCase() ||
    s.leadId === lead.id
  );
  const slaBreaches = companySignals.filter(s => s.sla.status === 'breached');

  return {
    agentId: 'signal-scout',
    model: 'local',
    signals: detection.detected.map(d => ({
      ...d,
      company: lead.firmName,
      matchedLead: lead.id,
      action: SIGNAL_TYPES[d.type]?.action
    })),
    slaBreaches: slaBreaches.map(s => ({
      id: s.id,
      type: s.type,
      hoursOverdue: s.sla.hoursOverdue
    })),
    existingSignals: companySignals.length,
    newLeadsCreated: 0,
    timestamp: new Date().toISOString()
  };
}

// Helper to load leads (for signal scout)
async function loadExistingLeads() {
  try {
    const data = await readFile(LEADS_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.leads || [];
  } catch {
    return [];
  }
}

export {
  createSignal,
  acknowledgeSignal,
  completeSignal,
  dismissSignal,
  getPendingSignals,
  getSignalDashboard,
  detectSignals,
  runSignalScout,
  loadSignals,
  saveSignals,
  SIGNAL_TYPES,
  SIGNAL_STATUS
};

export default {
  createSignal,
  acknowledgeSignal,
  completeSignal,
  dismissSignal,
  getPendingSignals,
  getSignalDashboard,
  detectSignals,
  runSignalScout,
  loadSignals,
  saveSignals,
  SIGNAL_TYPES,
  SIGNAL_STATUS
};

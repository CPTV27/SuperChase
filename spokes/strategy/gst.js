#!/usr/bin/env node
/**
 * GST (Goal-Strategy-Tactic) Manager Spoke
 *
 * Implements the Dynamic Strategic Hierarchy for autonomous agency operations.
 *
 * Hierarchy:
 *   Goals     → Fixed North Star objectives with milestone tracking
 *   Strategies → High-level plans that can pivot when blocked
 *   Tactics   → Daily actions, auto-generated and disposable
 *
 * Governor System:
 *   Phase 1 (Learning)    → AI drafts, human approves everything
 *   Phase 2 (Co-Pilot)    → AI self-publishes minor updates after 10 approvals with <10% edits
 *   Phase 3 (Autonomous)  → AI runs A/B tests, proposes new strategies
 *
 * Usage:
 *   node spokes/strategy/gst.js <clientId> [command] [args]
 *   node spokes/strategy/gst.js bigmuddy status
 *   node spokes/strategy/gst.js bigmuddy add-goal "Dominate Local Search"
 *   node spokes/strategy/gst.js bigmuddy generate-tactics
 *   node spokes/strategy/gst.js --all status
 *
 * Output: clients/<clientId>/gst.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLIENTS_PATH = join(__dirname, '..', '..', 'clients');
const MANIFEST_PATH = join(__dirname, '..', '..', 'manifest.jsonl');

/**
 * GST Status Constants
 */
export const GoalStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked'
};

export const StrategyStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  PIVOTING: 'pivoting',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
};

export const TacticStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

export const GovernorPhase = {
  LEARNING: 1,      // AI drafts, human approves everything
  COPILOT: 2,       // AI self-publishes minor updates
  AUTONOMOUS: 3     // AI runs experiments, proposes strategies
};

/**
 * Default GST structure for new clients
 */
function createDefaultGST(clientId, clientName) {
  return {
    clientId,
    clientName,
    version: '1.0.0',

    // Governor: Autonomy control
    governor: {
      phase: GovernorPhase.LEARNING,
      phaseName: 'Learning',
      metrics: {
        totalApprovals: 0,
        totalRejections: 0,
        approvalRate: 0,
        avgEditPercentage: 100,
        consecutiveApprovals: 0
      },
      thresholds: {
        // Phase 2 unlock: 10 approvals with <10% avg edits
        copilotApprovals: 10,
        copilotMaxEditRate: 10,
        // Phase 3 unlock: 100 subscribers or equivalent milestone
        autonomousMilestone: 'subscriber_100'
      },
      permissions: {
        canSelfPublish: false,
        canRunTests: false,
        canProposeStrategy: false,
        canAutoRespond: false
      },
      lastEvaluation: null
    },

    // Goals: North Star objectives
    goals: [],

    // Strategies: High-level plans
    strategies: [],

    // Tactics: Daily execution items
    tactics: [],

    // History: Audit trail
    history: [],

    // Metadata
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Load client GST manifest
 */
export function loadGST(clientId) {
  const gstPath = join(CLIENTS_PATH, clientId, 'gst.json');

  if (!existsSync(gstPath)) {
    // Load client config to get name
    const configPath = join(CLIENTS_PATH, clientId, 'config.json');
    if (!existsSync(configPath)) {
      throw new Error(`Client not found: ${clientId}`);
    }
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    return createDefaultGST(clientId, config.name);
  }

  return JSON.parse(readFileSync(gstPath, 'utf8'));
}

/**
 * Save client GST manifest
 */
export function saveGST(clientId, gst) {
  const gstPath = join(CLIENTS_PATH, clientId, 'gst.json');
  gst.updatedAt = new Date().toISOString();
  writeFileSync(gstPath, JSON.stringify(gst, null, 2));
  return gstPath;
}

/**
 * Log to manifest
 */
function logToManifest(agent, finding, clientId, type = 'GST') {
  const entry = {
    timestamp: new Date().toISOString(),
    agent,
    finding,
    type,
    status: 'Complete',
    clientId
  };
  appendFileSync(MANIFEST_PATH, JSON.stringify(entry) + '\n');
}

// ============================================
// GOAL MANAGEMENT
// ============================================

/**
 * Add a new goal
 */
export function addGoal(clientId, goalData) {
  const gst = loadGST(clientId);

  const goal = {
    id: `goal_${Date.now().toString(36)}`,
    title: goalData.title,
    description: goalData.description || '',
    metric: goalData.metric || null,        // e.g., "email_subscribers"
    target: goalData.target || null,        // e.g., 1000
    current: goalData.current || 0,
    status: GoalStatus.NOT_STARTED,
    priority: goalData.priority || 'medium', // high, medium, low
    milestones: goalData.milestones || [],
    deadline: goalData.deadline || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  gst.goals.push(goal);
  gst.history.push({
    type: 'goal_added',
    goalId: goal.id,
    title: goal.title,
    timestamp: new Date().toISOString(),
    actor: 'system'
  });

  saveGST(clientId, gst);
  logToManifest('GST Manager', `New goal added: ${goal.title}`, clientId, 'GOAL_CREATED');

  return goal;
}

/**
 * Update goal progress
 */
export function updateGoalProgress(clientId, goalId, progress) {
  const gst = loadGST(clientId);
  const goal = gst.goals.find(g => g.id === goalId);

  if (!goal) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  const previousCurrent = goal.current;
  goal.current = progress.current ?? goal.current;
  goal.status = progress.status ?? goal.status;
  goal.updatedAt = new Date().toISOString();

  // Check milestone completion
  if (goal.milestones) {
    goal.milestones.forEach(milestone => {
      if (!milestone.completedAt && goal.current >= milestone.target) {
        milestone.completedAt = new Date().toISOString();
        milestone.status = 'completed';

        gst.history.push({
          type: 'milestone_completed',
          goalId,
          milestoneId: milestone.id,
          title: milestone.title,
          timestamp: new Date().toISOString()
        });

        logToManifest('GST Manager', `Milestone completed: ${milestone.title}`, clientId, 'MILESTONE_COMPLETED');

        // Check if milestone triggers governor promotion
        evaluateGovernor(gst, milestone);
      }
    });
  }

  // Check goal completion
  if (goal.target && goal.current >= goal.target && goal.status !== GoalStatus.COMPLETED) {
    goal.status = GoalStatus.COMPLETED;
    goal.completedAt = new Date().toISOString();

    gst.history.push({
      type: 'goal_completed',
      goalId,
      title: goal.title,
      timestamp: new Date().toISOString()
    });

    logToManifest('GST Manager', `Goal completed: ${goal.title}`, clientId, 'GOAL_COMPLETED');
  }

  saveGST(clientId, gst);
  return goal;
}

/**
 * Add milestone to goal
 */
export function addMilestone(clientId, goalId, milestoneData) {
  const gst = loadGST(clientId);
  const goal = gst.goals.find(g => g.id === goalId);

  if (!goal) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  const milestone = {
    id: `ms_${Date.now().toString(36)}`,
    title: milestoneData.title,
    target: milestoneData.target,
    triggersPhase: milestoneData.triggersPhase || null, // e.g., GovernorPhase.COPILOT
    status: 'pending',
    completedAt: null
  };

  if (!goal.milestones) goal.milestones = [];
  goal.milestones.push(milestone);
  goal.updatedAt = new Date().toISOString();

  saveGST(clientId, gst);
  return milestone;
}

// ============================================
// STRATEGY MANAGEMENT
// ============================================

/**
 * Add a new strategy
 */
export function addStrategy(clientId, strategyData) {
  const gst = loadGST(clientId);

  const strategy = {
    id: `strat_${Date.now().toString(36)}`,
    goalId: strategyData.goalId || null,
    title: strategyData.title,
    description: strategyData.description || '',
    approach: strategyData.approach || '',   // e.g., "Content-Led Authority"
    channels: strategyData.channels || [],   // e.g., ["GBP", "Blog", "Social"]
    status: StrategyStatus.ACTIVE,
    metrics: {
      tacticsCompleted: 0,
      tacticsFailed: 0,
      successRate: 0
    },
    pivotHistory: [],
    blockers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  gst.strategies.push(strategy);
  gst.history.push({
    type: 'strategy_added',
    strategyId: strategy.id,
    title: strategy.title,
    timestamp: new Date().toISOString(),
    actor: 'system'
  });

  saveGST(clientId, gst);
  logToManifest('GST Manager', `New strategy: ${strategy.title}`, clientId, 'STRATEGY_CREATED');

  return strategy;
}

/**
 * Propose a strategy pivot
 */
export function proposeStrategyPivot(clientId, strategyId, pivotData) {
  const gst = loadGST(clientId);
  const strategy = gst.strategies.find(s => s.id === strategyId);

  if (!strategy) {
    throw new Error(`Strategy not found: ${strategyId}`);
  }

  const pivot = {
    id: `pivot_${Date.now().toString(36)}`,
    reason: pivotData.reason,
    fromApproach: strategy.approach,
    toApproach: pivotData.newApproach,
    proposedAt: new Date().toISOString(),
    status: 'pending_approval',
    approvedAt: null,
    rejectedAt: null
  };

  strategy.status = StrategyStatus.PIVOTING;
  strategy.pivotHistory.push(pivot);
  strategy.updatedAt = new Date().toISOString();

  gst.history.push({
    type: 'strategy_pivot_proposed',
    strategyId,
    pivotId: pivot.id,
    reason: pivot.reason,
    timestamp: new Date().toISOString()
  });

  saveGST(clientId, gst);
  logToManifest('GST Manager', `Strategy pivot proposed: ${pivotData.reason}`, clientId, 'STRATEGY_PIVOT');

  return pivot;
}

/**
 * Approve strategy pivot
 */
export function approvePivot(clientId, strategyId, pivotId) {
  const gst = loadGST(clientId);
  const strategy = gst.strategies.find(s => s.id === strategyId);

  if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);

  const pivot = strategy.pivotHistory.find(p => p.id === pivotId);
  if (!pivot) throw new Error(`Pivot not found: ${pivotId}`);

  pivot.status = 'approved';
  pivot.approvedAt = new Date().toISOString();
  strategy.approach = pivot.toApproach;
  strategy.status = StrategyStatus.ACTIVE;
  strategy.updatedAt = new Date().toISOString();

  saveGST(clientId, gst);
  return strategy;
}

// ============================================
// TACTIC MANAGEMENT
// ============================================

/**
 * Generate daily tactics based on active strategies
 */
export function generateTactics(clientId, options = {}) {
  const gst = loadGST(clientId);
  const today = new Date().toISOString().split('T')[0];

  // Get active strategies
  const activeStrategies = gst.strategies.filter(s => s.status === StrategyStatus.ACTIVE);

  if (activeStrategies.length === 0) {
    return { tactics: [], message: 'No active strategies' };
  }

  const newTactics = [];

  for (const strategy of activeStrategies) {
    // Generate tactics based on strategy channels
    for (const channel of strategy.channels || []) {
      const tactic = {
        id: `tactic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        strategyId: strategy.id,
        channel,
        type: getTacticType(channel),
        title: generateTacticTitle(channel, strategy, gst),
        description: '',
        status: TacticStatus.PENDING,
        scheduledFor: today,
        priority: options.priority || 'medium',
        estimatedMinutes: getEstimatedTime(channel),
        createdAt: new Date().toISOString(),
        completedAt: null,
        result: null
      };

      newTactics.push(tactic);
    }
  }

  // Add tactics to GST (keep last 30 days)
  gst.tactics = [
    ...newTactics,
    ...gst.tactics.filter(t => {
      const tacticDate = new Date(t.scheduledFor);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return tacticDate > cutoff;
    })
  ];

  saveGST(clientId, gst);

  logToManifest('GST Manager', `Generated ${newTactics.length} tactics for ${today}`, clientId, 'TACTICS_GENERATED');

  return { tactics: newTactics, count: newTactics.length };
}

/**
 * Get tactic type based on channel
 */
function getTacticType(channel) {
  const types = {
    'GBP': 'post',
    'Blog': 'article',
    'Social': 'post',
    'X': 'thread',
    'Email': 'newsletter',
    'LinkedIn': 'post',
    'Instagram': 'post',
    'Facebook': 'post'
  };
  return types[channel] || 'content';
}

/**
 * Generate tactic title
 */
function generateTacticTitle(channel, strategy, gst) {
  const templates = {
    'GBP': [
      `GBP Post: ${strategy.approach} update`,
      `GBP Photo: Behind the scenes`,
      `GBP Update: Weekly highlight`
    ],
    'Blog': [
      `Blog Draft: ${strategy.approach} deep dive`,
      `Blog: Industry insights`,
      `Blog: How-to guide`
    ],
    'Social': [
      `Social: Share recent win`,
      `Social: Industry commentary`,
      `Social: Behind the scenes`
    ],
    'X': [
      `X Thread: ${strategy.approach}`,
      `X: Quick tip`,
      `X: Engagement post`
    ],
    'Email': [
      `Newsletter: Weekly roundup`,
      `Email: Value-add content`
    ]
  };

  const options = templates[channel] || [`${channel}: Content piece`];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get estimated time for tactic
 */
function getEstimatedTime(channel) {
  const times = {
    'GBP': 15,
    'Blog': 60,
    'Social': 10,
    'X': 20,
    'Email': 45,
    'LinkedIn': 15
  };
  return times[channel] || 20;
}

/**
 * Complete a tactic
 */
export function completeTactic(clientId, tacticId, result = {}) {
  const gst = loadGST(clientId);
  const tactic = gst.tactics.find(t => t.id === tacticId);

  if (!tactic) throw new Error(`Tactic not found: ${tacticId}`);

  tactic.status = result.success !== false ? TacticStatus.COMPLETED : TacticStatus.FAILED;
  tactic.completedAt = new Date().toISOString();
  tactic.result = result;

  // Update strategy metrics
  const strategy = gst.strategies.find(s => s.id === tactic.strategyId);
  if (strategy) {
    if (tactic.status === TacticStatus.COMPLETED) {
      strategy.metrics.tacticsCompleted++;
    } else {
      strategy.metrics.tacticsFailed++;
    }
    const total = strategy.metrics.tacticsCompleted + strategy.metrics.tacticsFailed;
    strategy.metrics.successRate = Math.round((strategy.metrics.tacticsCompleted / total) * 100);
  }

  saveGST(clientId, gst);
  return tactic;
}

/**
 * Get today's tactics
 */
export function getTodaysTactics(clientId) {
  const gst = loadGST(clientId);
  const today = new Date().toISOString().split('T')[0];

  return gst.tactics.filter(t => t.scheduledFor === today);
}

// ============================================
// GOVERNOR SYSTEM
// ============================================

/**
 * Evaluate governor phase promotion
 */
function evaluateGovernor(gst, triggerMilestone = null) {
  const gov = gst.governor;
  const metrics = gov.metrics;

  // Check Phase 2 promotion
  if (gov.phase === GovernorPhase.LEARNING) {
    if (
      metrics.totalApprovals >= gov.thresholds.copilotApprovals &&
      metrics.avgEditPercentage <= gov.thresholds.copilotMaxEditRate
    ) {
      promoteGovernor(gst, GovernorPhase.COPILOT);
    }
  }

  // Check Phase 3 promotion via milestone trigger
  if (gov.phase === GovernorPhase.COPILOT && triggerMilestone) {
    if (triggerMilestone.triggersPhase === GovernorPhase.AUTONOMOUS) {
      promoteGovernor(gst, GovernorPhase.AUTONOMOUS);
    }
  }

  gov.lastEvaluation = new Date().toISOString();
}

/**
 * Promote governor to next phase
 */
function promoteGovernor(gst, newPhase) {
  const gov = gst.governor;
  const previousPhase = gov.phase;

  gov.phase = newPhase;

  switch (newPhase) {
    case GovernorPhase.COPILOT:
      gov.phaseName = 'Co-Pilot';
      gov.permissions.canSelfPublish = true;
      gov.permissions.canAutoRespond = true;
      break;
    case GovernorPhase.AUTONOMOUS:
      gov.phaseName = 'Autonomous';
      gov.permissions.canSelfPublish = true;
      gov.permissions.canRunTests = true;
      gov.permissions.canProposeStrategy = true;
      gov.permissions.canAutoRespond = true;
      break;
  }

  gst.history.push({
    type: 'governor_promoted',
    fromPhase: previousPhase,
    toPhase: newPhase,
    phaseName: gov.phaseName,
    timestamp: new Date().toISOString()
  });

  logToManifest('Governor', `Promoted to Phase ${newPhase}: ${gov.phaseName}`, gst.clientId, 'GOVERNOR_PROMOTION');
}

/**
 * Record content approval (affects governor metrics)
 */
export function recordApproval(clientId, editPercentage = 0) {
  const gst = loadGST(clientId);
  const metrics = gst.governor.metrics;

  metrics.totalApprovals++;
  metrics.consecutiveApprovals++;

  // Update rolling average edit percentage
  const totalReviews = metrics.totalApprovals + metrics.totalRejections;
  metrics.avgEditPercentage = Math.round(
    ((metrics.avgEditPercentage * (totalReviews - 1)) + editPercentage) / totalReviews
  );

  metrics.approvalRate = Math.round((metrics.totalApprovals / totalReviews) * 100);

  evaluateGovernor(gst);
  saveGST(clientId, gst);

  return gst.governor;
}

/**
 * Record content rejection
 */
export function recordRejection(clientId, reason = '') {
  const gst = loadGST(clientId);
  const metrics = gst.governor.metrics;

  metrics.totalRejections++;
  metrics.consecutiveApprovals = 0;

  const totalReviews = metrics.totalApprovals + metrics.totalRejections;
  metrics.approvalRate = Math.round((metrics.totalApprovals / totalReviews) * 100);

  saveGST(clientId, gst);
  return gst.governor;
}

/**
 * Get governor status
 */
export function getGovernorStatus(clientId) {
  const gst = loadGST(clientId);
  return gst.governor;
}

// ============================================
// STATUS & REPORTING
// ============================================

/**
 * Get full GST status
 */
export function getStatus(clientId) {
  const gst = loadGST(clientId);
  const today = new Date().toISOString().split('T')[0];

  const todaysTactics = gst.tactics.filter(t => t.scheduledFor === today);
  const completedToday = todaysTactics.filter(t => t.status === TacticStatus.COMPLETED).length;

  return {
    clientId: gst.clientId,
    clientName: gst.clientName,
    governor: {
      phase: gst.governor.phase,
      phaseName: gst.governor.phaseName,
      approvalRate: gst.governor.metrics.approvalRate,
      permissions: gst.governor.permissions
    },
    goals: {
      total: gst.goals.length,
      completed: gst.goals.filter(g => g.status === GoalStatus.COMPLETED).length,
      inProgress: gst.goals.filter(g => g.status === GoalStatus.IN_PROGRESS).length,
      items: gst.goals.map(g => ({
        id: g.id,
        title: g.title,
        status: g.status,
        progress: g.target ? Math.round((g.current / g.target) * 100) : null,
        milestones: g.milestones?.length || 0,
        milestonesCompleted: g.milestones?.filter(m => m.completedAt).length || 0
      }))
    },
    strategies: {
      total: gst.strategies.length,
      active: gst.strategies.filter(s => s.status === StrategyStatus.ACTIVE).length,
      items: gst.strategies.map(s => ({
        id: s.id,
        title: s.title,
        approach: s.approach,
        status: s.status,
        successRate: s.metrics.successRate
      }))
    },
    tactics: {
      today: todaysTactics.length,
      completedToday,
      pending: todaysTactics.filter(t => t.status === TacticStatus.PENDING).length,
      items: todaysTactics
    },
    updatedAt: gst.updatedAt
  };
}

/**
 * Get all clients' GST status summary
 */
export function getAllStatus() {
  const clients = readdirSync(CLIENTS_PATH, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => existsSync(join(CLIENTS_PATH, d.name, 'config.json')))
    .map(d => d.name);

  return clients.map(clientId => {
    try {
      return getStatus(clientId);
    } catch (error) {
      return { clientId, error: error.message };
    }
  });
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
GST (Goal-Strategy-Tactic) Manager - SuperChase Strategic Hierarchy

Usage:
  node spokes/strategy/gst.js <clientId> <command> [args]

Commands:
  status                     Show GST status
  add-goal <title>          Add a new goal
  add-strategy <title>      Add a new strategy
  generate-tactics          Generate today's tactics
  complete-tactic <id>      Mark tactic as complete
  record-approval [edit%]   Record content approval
  record-rejection          Record content rejection
  governor                  Show governor status

Global:
  --all status              Show all clients' status
  --list                    List clients

Examples:
  node spokes/strategy/gst.js bigmuddy status
  node spokes/strategy/gst.js bigmuddy add-goal "Hit 1000 subscribers"
  node spokes/strategy/gst.js bigmuddy generate-tactics
  node spokes/strategy/gst.js --all status
`);
    process.exit(0);
  }

  // Global commands
  if (args[0] === '--all' && args[1] === 'status') {
    const statuses = getAllStatus();
    console.log('\n📊 GST Status - All Clients\n');
    console.log('─'.repeat(60));

    for (const status of statuses) {
      if (status.error) {
        console.log(`\n❌ ${status.clientId}: ${status.error}`);
        continue;
      }

      console.log(`\n🏢 ${status.clientName} (@${status.clientId})`);
      console.log(`   Governor: Phase ${status.governor.phase} (${status.governor.phaseName})`);
      console.log(`   Goals: ${status.goals.completed}/${status.goals.total} complete`);
      console.log(`   Strategies: ${status.strategies.active} active`);
      console.log(`   Today: ${status.tactics.completedToday}/${status.tactics.today} tactics done`);
    }

    process.exit(0);
  }

  if (args[0] === '--list') {
    const clients = readdirSync(CLIENTS_PATH, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .filter(d => existsSync(join(CLIENTS_PATH, d.name, 'config.json')))
      .map(d => d.name);

    console.log('\nAvailable clients:');
    clients.forEach(c => console.log(`  - ${c}`));
    process.exit(0);
  }

  // Client-specific commands
  const clientId = args[0];
  const command = args[1] || 'status';

  try {
    switch (command) {
      case 'status': {
        const status = getStatus(clientId);
        console.log(`\n📊 GST Status: ${status.clientName}\n`);
        console.log('─'.repeat(50));

        // Governor
        console.log(`\n🎛️  Governor: Phase ${status.governor.phase} (${status.governor.phaseName})`);
        console.log(`   Approval Rate: ${status.governor.approvalRate}%`);
        console.log(`   Permissions: ${Object.entries(status.governor.permissions).filter(([,v]) => v).map(([k]) => k).join(', ') || 'None'}`);

        // Goals
        console.log(`\n🎯 Goals (${status.goals.completed}/${status.goals.total} complete)`);
        for (const goal of status.goals.items) {
          const progress = goal.progress !== null ? ` [${goal.progress}%]` : '';
          const milestones = goal.milestones > 0 ? ` (${goal.milestonesCompleted}/${goal.milestones} milestones)` : '';
          console.log(`   ${goal.status === 'completed' ? '✅' : '⏳'} ${goal.title}${progress}${milestones}`);
        }

        // Strategies
        console.log(`\n📋 Strategies (${status.strategies.active} active)`);
        for (const strat of status.strategies.items) {
          const rate = strat.successRate > 0 ? ` [${strat.successRate}% success]` : '';
          console.log(`   ${strat.status === 'active' ? '▶️' : '⏸️'} ${strat.title}${rate}`);
          if (strat.approach) console.log(`      Approach: ${strat.approach}`);
        }

        // Today's Tactics
        console.log(`\n⚡ Today's Tactics (${status.tactics.completedToday}/${status.tactics.today} done)`);
        for (const tactic of status.tactics.items) {
          const icon = tactic.status === 'completed' ? '✅' : tactic.status === 'failed' ? '❌' : '⬜';
          console.log(`   ${icon} ${tactic.title} [${tactic.channel}]`);
        }

        if (status.tactics.items.length === 0) {
          console.log('   No tactics for today. Run: generate-tactics');
        }

        break;
      }

      case 'add-goal': {
        const title = args.slice(2).join(' ');
        if (!title) {
          console.error('Error: Goal title required');
          process.exit(1);
        }
        const goal = addGoal(clientId, { title });
        console.log(`\n✅ Goal added: ${goal.title}`);
        console.log(`   ID: ${goal.id}`);
        break;
      }

      case 'add-strategy': {
        const title = args.slice(2).join(' ');
        if (!title) {
          console.error('Error: Strategy title required');
          process.exit(1);
        }
        const strategy = addStrategy(clientId, { title, channels: ['GBP', 'Social', 'Blog'] });
        console.log(`\n✅ Strategy added: ${strategy.title}`);
        console.log(`   ID: ${strategy.id}`);
        console.log(`   Channels: ${strategy.channels.join(', ')}`);
        break;
      }

      case 'generate-tactics': {
        const result = generateTactics(clientId);
        console.log(`\n⚡ Generated ${result.count} tactics for today`);
        for (const tactic of result.tactics) {
          console.log(`   ⬜ ${tactic.title} [${tactic.channel}] ~${tactic.estimatedMinutes}min`);
        }
        break;
      }

      case 'complete-tactic': {
        const tacticId = args[2];
        if (!tacticId) {
          console.error('Error: Tactic ID required');
          process.exit(1);
        }
        const tactic = completeTactic(clientId, tacticId, { success: true });
        console.log(`\n✅ Tactic completed: ${tactic.title}`);
        break;
      }

      case 'record-approval': {
        const editPct = parseInt(args[2]) || 0;
        const gov = recordApproval(clientId, editPct);
        console.log(`\n✅ Approval recorded (${editPct}% edits)`);
        console.log(`   Phase: ${gov.phase} (${gov.phaseName})`);
        console.log(`   Total Approvals: ${gov.metrics.totalApprovals}`);
        console.log(`   Approval Rate: ${gov.metrics.approvalRate}%`);
        break;
      }

      case 'record-rejection': {
        const gov = recordRejection(clientId);
        console.log(`\n❌ Rejection recorded`);
        console.log(`   Approval Rate: ${gov.metrics.approvalRate}%`);
        break;
      }

      case 'governor': {
        const gov = getGovernorStatus(clientId);
        console.log(`\n🎛️  Governor Status: ${clientId}`);
        console.log('─'.repeat(40));
        console.log(`Phase: ${gov.phase} (${gov.phaseName})`);
        console.log(`\nMetrics:`);
        console.log(`  Total Approvals: ${gov.metrics.totalApprovals}`);
        console.log(`  Total Rejections: ${gov.metrics.totalRejections}`);
        console.log(`  Approval Rate: ${gov.metrics.approvalRate}%`);
        console.log(`  Avg Edit %: ${gov.metrics.avgEditPercentage}%`);
        console.log(`  Consecutive Approvals: ${gov.metrics.consecutiveApprovals}`);
        console.log(`\nPermissions:`);
        Object.entries(gov.permissions).forEach(([k, v]) => {
          console.log(`  ${v ? '✅' : '❌'} ${k}`);
        });
        console.log(`\nPromotion Thresholds:`);
        console.log(`  Co-Pilot: ${gov.thresholds.copilotApprovals} approvals, <${gov.thresholds.copilotMaxEditRate}% edits`);
        console.log(`  Autonomous: Milestone "${gov.thresholds.autonomousMilestone}"`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);

export default {
  loadGST,
  saveGST,
  addGoal,
  updateGoalProgress,
  addMilestone,
  addStrategy,
  proposeStrategyPivot,
  approvePivot,
  generateTactics,
  completeTactic,
  getTodaysTactics,
  recordApproval,
  recordRejection,
  getGovernorStatus,
  getStatus,
  getAllStatus,
  GoalStatus,
  StrategyStatus,
  TacticStatus,
  GovernorPhase
};

/**
 * KPI Calculation Engine
 * Part of S2P Command Center
 *
 * Calculates from LIVE pipeline data (not hardcoded):
 * - Revenue: Sum of booked deals / monthly target
 * - GM%: Weighted average of all proposals
 * - Meetings/Week: Qualified meetings / weeks elapsed
 * - Tier-A Meetings YTD: Count where tier === 'A'
 * - Reply→Meeting %: Meetings booked / emails sent (Tier-A only)
 * - Pipeline Coverage: Pipeline value / revenue target
 * - Win Rate: Closed-Won / (Closed-Won + Closed-Lost)
 *
 * FY2026 Targets (from Strategy Manual):
 * - Revenue: $2.2M
 * - GM: 40% floor, 45% stretch
 * - Meetings/Week: 4.5 qualified
 * - Tier-A Meetings: 60/year
 * - Win Rate: 30%+
 * - Pipeline Coverage: 3×
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const PIPELINE_PATH = join(__dirname, '../clients/s2p/memory/pipeline.json');
const LEADS_PATH = join(__dirname, '../clients/s2p/memory/leads.json');
const KPI_TARGETS_PATH = join(__dirname, '../clients/s2p/memory/kpi-targets.json');
const WAVES_PATH = join(__dirname, '../clients/s2p/memory/waves.json');

// FY2026 Default Targets
const DEFAULT_TARGETS = {
  annual: {
    revenue: 2200000,       // $2.2M
    gmFloor: 40,            // 40% minimum
    gmStretch: 45,          // 45% stretch
    tierAMeetings: 60,      // 60 Tier-A meetings/year
    wins: 12,               // 12+ wins ≥50k sqft
    winRate: 30             // 30%+ win rate
  },
  weekly: {
    meetings: 4.5           // 4.5 qualified meetings/week
  },
  monthly: {
    revenue: 183333,        // ~$183K/month
    tierAMeetings: 5        // 5 Tier-A meetings/month
  },
  pipeline: {
    coverage: 3.0           // 3× pipeline coverage
  }
};

/**
 * Load pipeline deals from file
 */
async function loadPipeline() {
  try {
    const data = await readFile(PIPELINE_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.deals || db.pipeline || [];
  } catch {
    return [];
  }
}

/**
 * Load leads from file
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
 * Load KPI targets from file
 */
async function loadTargets() {
  try {
    const data = await readFile(KPI_TARGETS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return DEFAULT_TARGETS;
  }
}

/**
 * Load wave data for email metrics
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
 * Get current fiscal period info
 */
function getFiscalPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;

  // FY2026 starts Jan 1, 2026
  const fyStartDate = new Date(2026, 0, 1);
  const weeksElapsed = Math.max(1, Math.floor((now - fyStartDate) / (7 * 24 * 60 * 60 * 1000)));

  return {
    year,
    month: month + 1,
    quarter,
    weeksElapsed,
    daysIntoMonth: now.getDate(),
    daysInMonth: new Date(year, month + 1, 0).getDate()
  };
}

/**
 * Calculate revenue KPIs
 */
function calculateRevenueKPIs(deals, targets, period) {
  // Booked revenue (Closed-Won deals)
  const bookedDeals = deals.filter(d =>
    d.stage === 'Closed-Won' || d.status === 'won'
  );
  const bookedRevenue = bookedDeals.reduce((sum, d) => sum + (d.value || d.dealValue || 0), 0);

  // This month's revenue
  const thisMonth = period.month;
  const thisYear = period.year;
  const monthlyDeals = bookedDeals.filter(d => {
    const closeDate = new Date(d.closedAt || d.created_at);
    return closeDate.getMonth() + 1 === thisMonth && closeDate.getFullYear() === thisYear;
  });
  const monthlyRevenue = monthlyDeals.reduce((sum, d) => sum + (d.value || d.dealValue || 0), 0);

  // Pipeline value (active opportunities)
  const activeDeals = deals.filter(d =>
    !['Closed-Won', 'Closed-Lost', 'won', 'lost'].includes(d.stage || d.status)
  );
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || d.dealValue || 0), 0);

  // Calculate percentages
  const annualTarget = targets.annual?.revenue || DEFAULT_TARGETS.annual.revenue;
  const monthlyTarget = targets.monthly?.revenue || DEFAULT_TARGETS.monthly.revenue;

  return {
    booked: {
      value: bookedRevenue,
      target: annualTarget,
      percent: Math.round((bookedRevenue / annualTarget) * 100),
      status: bookedRevenue >= annualTarget * 0.9 ? 'on-track' : 'at-risk'
    },
    monthly: {
      value: monthlyRevenue,
      target: monthlyTarget,
      percent: Math.round((monthlyRevenue / monthlyTarget) * 100),
      status: monthlyRevenue >= monthlyTarget * 0.9 ? 'on-track' : 'at-risk'
    },
    pipeline: {
      value: pipelineValue,
      target: annualTarget * (targets.pipeline?.coverage || 3),
      coverage: pipelineValue > 0 ? (pipelineValue / annualTarget).toFixed(1) + '×' : '0×',
      coverageNum: pipelineValue / annualTarget,
      status: pipelineValue >= annualTarget * 2.5 ? 'healthy' : 'needs-attention'
    }
  };
}

/**
 * Calculate GM KPIs
 */
function calculateGMKPIs(deals, targets) {
  // Get proposals and won deals with GM data
  const dealsWithGM = deals.filter(d =>
    (d.gmPercent || d.gm_percent) &&
    ['Proposal Issued', 'Negotiation', 'Closed-Won'].includes(d.stage)
  );

  if (dealsWithGM.length === 0) {
    return {
      average: 0,
      weighted: 0,
      floor: targets.annual?.gmFloor || DEFAULT_TARGETS.annual.gmFloor,
      stretch: targets.annual?.gmStretch || DEFAULT_TARGETS.annual.gmStretch,
      belowFloor: 0,
      belowStretch: 0,
      status: 'no-data'
    };
  }

  // Simple average
  const avgGM = dealsWithGM.reduce((sum, d) => sum + (d.gmPercent || d.gm_percent || 0), 0) / dealsWithGM.length;

  // Weighted average by deal value
  const totalValue = dealsWithGM.reduce((sum, d) => sum + (d.value || d.dealValue || 0), 0);
  const weightedGM = totalValue > 0
    ? dealsWithGM.reduce((sum, d) => {
        const gm = d.gmPercent || d.gm_percent || 0;
        const value = d.value || d.dealValue || 0;
        return sum + (gm * value);
      }, 0) / totalValue
    : avgGM;

  const gmFloor = targets.annual?.gmFloor || DEFAULT_TARGETS.annual.gmFloor;
  const gmStretch = targets.annual?.gmStretch || DEFAULT_TARGETS.annual.gmStretch;

  // Count deals below thresholds
  const belowFloor = dealsWithGM.filter(d => (d.gmPercent || d.gm_percent) < gmFloor).length;
  const belowStretch = dealsWithGM.filter(d => (d.gmPercent || d.gm_percent) < gmStretch).length;

  return {
    average: Math.round(avgGM * 10) / 10,
    weighted: Math.round(weightedGM * 10) / 10,
    floor: gmFloor,
    stretch: gmStretch,
    belowFloor,
    belowStretch,
    dealsAnalyzed: dealsWithGM.length,
    status: weightedGM >= gmStretch ? 'exceeds' : (weightedGM >= gmFloor ? 'meets' : 'below')
  };
}

/**
 * Calculate meeting KPIs
 */
function calculateMeetingKPIs(deals, leads, targets, period) {
  // Qualified meetings (stage >= Qualified Meeting)
  const qualifiedMeetings = deals.filter(d =>
    ['Qualified Meeting', 'Proposal Issued', 'Negotiation', 'Closed-Won', 'Closed-Lost']
      .includes(d.stage)
  );

  // Tier-A meetings
  const tierAMeetings = qualifiedMeetings.filter(d => {
    const lead = leads.find(l => l.id === d.leadId || l.firmName === d.firmName);
    return lead?.scoring?.tier === 'A' || d.tier === 'A';
  });

  // Calculate meetings per week
  const weeklyTarget = targets.weekly?.meetings || DEFAULT_TARGETS.weekly.meetings;
  const meetingsPerWeek = period.weeksElapsed > 0
    ? qualifiedMeetings.length / period.weeksElapsed
    : 0;

  // Tier-A target (annualized)
  const tierATarget = targets.annual?.tierAMeetings || DEFAULT_TARGETS.annual.tierAMeetings;
  const tierAMonthlyTarget = tierATarget / 12;

  return {
    total: qualifiedMeetings.length,
    perWeek: {
      value: Math.round(meetingsPerWeek * 10) / 10,
      target: weeklyTarget,
      status: meetingsPerWeek >= weeklyTarget * 0.9 ? 'on-track' : 'at-risk'
    },
    tierA: {
      ytd: tierAMeetings.length,
      target: tierATarget,
      monthlyTarget: Math.round(tierAMonthlyTarget),
      status: tierAMeetings.length >= (tierATarget / 12) * period.month * 0.9 ? 'on-track' : 'at-risk'
    }
  };
}

/**
 * Calculate win rate KPIs
 */
function calculateWinRateKPIs(deals, targets) {
  const closedWon = deals.filter(d => d.stage === 'Closed-Won' || d.status === 'won').length;
  const closedLost = deals.filter(d => d.stage === 'Closed-Lost' || d.status === 'lost').length;
  const totalClosed = closedWon + closedLost;

  const winRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;
  const targetRate = targets.annual?.winRate || DEFAULT_TARGETS.annual.winRate;

  return {
    won: closedWon,
    lost: closedLost,
    total: totalClosed,
    rate: Math.round(winRate * 10) / 10,
    target: targetRate,
    status: winRate >= targetRate ? 'above-target' : 'below-target'
  };
}

/**
 * Calculate ABM wave metrics
 */
async function calculateWaveKPIs(waves) {
  if (!waves || waves.length === 0) {
    return {
      activeWaves: 0,
      emailsSent: 0,
      replies: 0,
      meetings: 0,
      replyToMeeting: 0,
      status: 'no-data'
    };
  }

  let totalEmailsSent = 0;
  let totalReplies = 0;
  let totalMeetings = 0;

  for (const wave of waves) {
    // Count from wave targets/touchpoints
    if (wave.targets) {
      for (const target of wave.targets) {
        if (target.emailSent || target.touched) totalEmailsSent++;
        if (target.replied) totalReplies++;
        if (target.meetingScheduled) totalMeetings++;
      }
    }

    // Or from wave stats if available
    if (wave.stats) {
      totalEmailsSent += wave.stats.emailsSent || 0;
      totalReplies += wave.stats.replies || 0;
      totalMeetings += wave.stats.meetings || 0;
    }
  }

  const replyToMeeting = totalReplies > 0
    ? (totalMeetings / totalReplies) * 100
    : 0;

  return {
    activeWaves: waves.filter(w => w.status === 'active').length,
    totalWaves: waves.length,
    emailsSent: totalEmailsSent,
    replies: totalReplies,
    meetings: totalMeetings,
    replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0,
    replyToMeeting: Math.round(replyToMeeting),
    targetReplyToMeeting: 18, // From strategy: ≥18% Reply→Meeting
    status: replyToMeeting >= 18 ? 'on-target' : 'below-target'
  };
}

/**
 * Main KPI calculation function
 * Returns all KPIs from live data
 */
async function calculateAllKPIs() {
  // Load all data
  const [deals, leads, targets, waves] = await Promise.all([
    loadPipeline(),
    loadLeads(),
    loadTargets(),
    loadWaves()
  ]);

  const period = getFiscalPeriod();

  // Calculate all KPIs
  const revenue = calculateRevenueKPIs(deals, targets, period);
  const gm = calculateGMKPIs(deals, targets);
  const meetings = calculateMeetingKPIs(deals, leads, targets, period);
  const winRate = calculateWinRateKPIs(deals, targets);
  const waveMetrics = await calculateWaveKPIs(waves);

  // Determine overall health
  const healthIndicators = [
    revenue.booked.status,
    gm.status,
    meetings.perWeek.status,
    meetings.tierA.status,
    winRate.status
  ];
  const atRiskCount = healthIndicators.filter(s =>
    ['at-risk', 'below', 'below-target', 'needs-attention'].includes(s)
  ).length;

  const overallHealth = atRiskCount === 0 ? 'excellent' :
                       atRiskCount <= 1 ? 'good' :
                       atRiskCount <= 2 ? 'fair' : 'needs-attention';

  return {
    period: {
      year: period.year,
      month: period.month,
      quarter: period.quarter,
      weeksElapsed: period.weeksElapsed
    },
    revenue,
    gm,
    meetings,
    winRate,
    waveMetrics,
    overallHealth,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Get KPI summary for dashboard header
 * Returns the 6 hockey stick KPIs
 */
async function getKPISummary() {
  const kpis = await calculateAllKPIs();

  return {
    revenue: {
      label: 'Revenue',
      value: formatCurrency(kpis.revenue.booked.value),
      target: formatCurrency(kpis.revenue.booked.target),
      percent: kpis.revenue.booked.percent,
      status: kpis.revenue.booked.status
    },
    gm: {
      label: 'Gross Margin',
      value: kpis.gm.weighted + '%',
      target: kpis.gm.stretch + '%',
      floor: kpis.gm.floor + '%',
      status: kpis.gm.status
    },
    meetingsPerWeek: {
      label: 'Meetings/Week',
      value: kpis.meetings.perWeek.value,
      target: kpis.meetings.perWeek.target,
      status: kpis.meetings.perWeek.status
    },
    tierAMeetings: {
      label: 'Tier-A Meetings YTD',
      value: kpis.meetings.tierA.ytd,
      target: kpis.meetings.tierA.target,
      status: kpis.meetings.tierA.status
    },
    pipelineCoverage: {
      label: 'Pipeline Coverage',
      value: kpis.revenue.pipeline.coverage,
      target: '3×',
      status: kpis.revenue.pipeline.status
    },
    winRate: {
      label: 'Win Rate',
      value: kpis.winRate.rate + '%',
      target: kpis.winRate.target + '%',
      status: kpis.winRate.status
    },
    overallHealth: kpis.overallHealth,
    calculatedAt: kpis.calculatedAt
  };
}

/**
 * Format currency value
 */
function formatCurrency(value) {
  if (value >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(0) + 'K';
  }
  return '$' + value.toFixed(0);
}

export {
  calculateAllKPIs,
  getKPISummary,
  calculateRevenueKPIs,
  calculateGMKPIs,
  calculateMeetingKPIs,
  calculateWinRateKPIs,
  calculateWaveKPIs,
  getFiscalPeriod,
  loadPipeline,
  loadLeads,
  loadTargets,
  DEFAULT_TARGETS
};

export default {
  calculateAllKPIs,
  getKPISummary,
  calculateRevenueKPIs,
  calculateGMKPIs,
  calculateMeetingKPIs,
  calculateWinRateKPIs,
  calculateWaveKPIs,
  getFiscalPeriod,
  loadPipeline,
  loadLeads,
  loadTargets,
  DEFAULT_TARGETS
};

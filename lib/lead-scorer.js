/**
 * Lead Scorer - Tier Classification Logic
 * Part of S2P Operations Council
 *
 * FY2026 Strategy Scoring Rules:
 * - ENR Top 100 + Multi-site = 100 points (TIER-A GOLD)
 * - ENR Top 100 only = 85 points (TIER-A)
 * - ENR 101-500 + Multi-site = 75 points (TIER-A SILVER)
 * - ENR 101-500 only = 60 points (TIER-B)
 * - 500k+ SF + Multi-site = 70 points (TIER-A BRONZE)
 * - 500k+ SF only = 55 points (TIER-B)
 * - 100k+ SF = 35-50 points (TIER-B)
 * - 50k+ SF = 20 points (TIER-C)
 *
 * Wave Assignment:
 * - Wave 1: Score >= 70 (Tier-A)
 * - Wave 2: Score 50-69 (Tier-B high)
 * - Wave 3: Score 35-49 (Tier-B low)
 * - Nurture: Score 20-34 (Tier-C)
 * - Disqualify: Score < 20 or disqualified
 *
 * Disqualification Criteria:
 * - Residential-only focus
 * - <10 employees
 * - Competitor (in-house scanning)
 */

// Logger with fallback for standalone testing
const noopLogger = {
  child: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  })
};

let logger = noopLogger;
try {
  const loggerModule = await import('./logger.js');
  logger = loggerModule.default || loggerModule;
} catch {
  // Use noop logger if import fails
}

// Tier thresholds
const TIER_THRESHOLDS = {
  A: 70,  // Score >= 70 = Tier A
  B: 35,  // Score 35-69 = Tier B
  C: 20   // Score 20-34 = Tier C
};

// Wave assignment thresholds
const WAVE_THRESHOLDS = {
  1: 70,  // Wave 1: Score >= 70
  2: 50,  // Wave 2: Score 50-69
  3: 35   // Wave 3: Score 35-49
};

// Relationship bonuses
const RELATIONSHIP_BONUSES = {
  warm_intro: 20,
  past_client: 15,
  referral: 15,
  cold: 0
};

// Building type bonuses (when proof exists)
const BUILDING_TYPE_BONUSES = {
  Healthcare: 10,
  Education: 10,
  'Adaptive Reuse': 5
};

/**
 * Parse employee count from various formats
 * Handles: "250-999", "1,000+", "50-249", numbers
 */
function parseEmployeeCount(employeeValue) {
  if (!employeeValue) return null;
  if (typeof employeeValue === 'number') return employeeValue;

  const cleaned = String(employeeValue).replace(/[,+]/g, '');
  const parts = cleaned.split('-');
  return parseInt(parts[0]) || null;
}

/**
 * Check if lead should be disqualified
 * Returns array of disqualification reasons (empty if qualified)
 */
function checkDisqualifications(lead) {
  const disqualifications = [];

  // Residential-only focus
  if (lead.buildingTypes?.length === 1 && lead.buildingTypes[0] === 'Residential') {
    disqualifications.push('Residential-only focus');
  }

  // Too small
  const employeeCount = parseEmployeeCount(lead.employees || lead.employeeCount);
  if (employeeCount !== null && employeeCount < 10) {
    disqualifications.push('Too small (<10 employees)');
  }

  // Competitor
  if (lead.competitor === true || lead.hasInHouseScanning === true) {
    disqualifications.push('Competitor (in-house scanning)');
  }

  // Explicit disqualification flag
  if (lead.disqualified === true) {
    disqualifications.push(lead.disqualificationReason || 'Manually disqualified');
  }

  return disqualifications;
}

/**
 * Main scoring function
 * @param {Object} lead - Lead data object
 * @returns {Object} { score, tier, waveAssignment, reasoning, disqualified }
 */
function scoreLead(lead) {
  const log = logger.child({ component: 'lead-scorer', leadId: lead.id || lead.firmName });

  // Check disqualifications first
  const disqualifications = checkDisqualifications(lead);
  if (disqualifications.length > 0) {
    log.info({ disqualifications }, 'Lead disqualified');
    return {
      score: 0,
      tier: 'Disqualified',
      waveAssignment: null,
      reasoning: disqualifications.join('; '),
      disqualified: true,
      disqualificationReasons: disqualifications
    };
  }

  let score = 0;
  const reasoning = [];
  const employeeCount = parseEmployeeCount(lead.employees || lead.employeeCount);
  const portfolioSF = lead.portfolioSF || lead.sqft_estimate || 0;
  const multiSite = lead.multiSitePortfolio || lead.multiSite || false;
  const enrRank = lead.enrRank || null;

  // ENR Ranking scoring (highest priority)
  if (enrRank && enrRank <= 100) {
    // ENR Top 100
    if (multiSite) {
      score = 100;
      reasoning.push('ENR Top 100 + Multi-site = TIER-A GOLD');
    } else {
      score = 85;
      reasoning.push('ENR Top 100 only');
    }
    // ENR Top 100 is instant Tier-A, Wave 1
    return buildResult(score, reasoning, log);
  }

  if (enrRank && enrRank <= 500) {
    // ENR 101-500
    if (multiSite) {
      score = 75;
      reasoning.push('ENR 101-500 + Multi-site = TIER-A SILVER');
    } else {
      score = 60;
      reasoning.push('ENR 101-500 only');
    }
  }

  // Portfolio SF scoring (if no ENR or ENR > 500)
  if (portfolioSF >= 500000) {
    const sfScore = multiSite ? 70 : 55;
    if (sfScore > score) {
      score = sfScore;
      if (multiSite) {
        reasoning.push('500k+ SF + Multi-site = TIER-A BRONZE');
      } else {
        reasoning.push('500k+ SF portfolio');
      }
    }
  } else if (portfolioSF >= 100000) {
    const sfScore = multiSite ? 50 : 35;
    if (sfScore > score) {
      score = sfScore;
      reasoning.push(`${(portfolioSF / 1000).toFixed(0)}k SF portfolio`);
    }
  } else if (portfolioSF >= 50000) {
    if (score < 20) {
      score = 20;
      reasoning.push('50k+ SF (TIER-C threshold)');
    }
  }

  // Employee count fallback (if no SF data)
  if (!portfolioSF && employeeCount && employeeCount >= 50) {
    const empScore = multiSite ? 45 : 30;
    if (empScore > score) {
      score = empScore;
      reasoning.push(`${employeeCount}+ employees (no SF data)`);
    }
  }

  // Relationship status bonuses
  const relationshipStatus = lead.relationshipStatus || 'cold';
  const relationshipBonus = RELATIONSHIP_BONUSES[relationshipStatus] || 0;
  if (relationshipBonus > 0) {
    score += relationshipBonus;
    reasoning.push(`${relationshipStatus.replace('_', ' ')} (+${relationshipBonus})`);
  }

  // Building type bonuses (when we have proof for these types)
  if (lead.buildingTypes && Array.isArray(lead.buildingTypes)) {
    for (const type of lead.buildingTypes) {
      const bonus = BUILDING_TYPE_BONUSES[type];
      if (bonus && (lead.hasMatchedProof || lead.proofMatched)) {
        score += bonus;
        reasoning.push(`${type} focus + relevant proof (+${bonus})`);
      }
    }
  }

  // Cap score at 100
  score = Math.min(100, score);

  return buildResult(score, reasoning, log);
}

/**
 * Build the result object with tier and wave assignment
 */
function buildResult(score, reasoning, log) {
  let tier, waveAssignment;

  if (score >= TIER_THRESHOLDS.A) {
    tier = 'A';
    waveAssignment = 1;
  } else if (score >= 50) {
    tier = 'B';
    waveAssignment = 2;
  } else if (score >= TIER_THRESHOLDS.B) {
    tier = 'B';
    waveAssignment = 3;
  } else if (score >= TIER_THRESHOLDS.C) {
    tier = 'C';
    waveAssignment = 'nurture';
  } else {
    tier = 'C';
    waveAssignment = 'disqualify';
  }

  const result = {
    score,
    tier,
    waveAssignment,
    reasoning: reasoning.join(', '),
    disqualified: false
  };

  log.info({ score, tier, waveAssignment }, 'Lead scored');

  return result;
}

/**
 * Batch score multiple leads
 * @param {Array} leads - Array of lead objects
 * @returns {Array} Array of leads with scoring results
 */
function scoreLeads(leads) {
  return leads.map(lead => ({
    ...lead,
    scoring: scoreLead(lead)
  }));
}

/**
 * Get tier summary from scored leads
 * @param {Array} scoredLeads - Array of leads with scoring
 * @returns {Object} Summary counts
 */
function getTierSummary(scoredLeads) {
  const summary = {
    total: scoredLeads.length,
    tierA: 0,
    tierB: 0,
    tierC: 0,
    disqualified: 0,
    wave1: 0,
    wave2: 0,
    wave3: 0,
    nurture: 0
  };

  for (const lead of scoredLeads) {
    const scoring = lead.scoring || scoreLead(lead);

    switch (scoring.tier) {
      case 'A': summary.tierA++; break;
      case 'B': summary.tierB++; break;
      case 'C': summary.tierC++; break;
      case 'Disqualified': summary.disqualified++; break;
    }

    switch (scoring.waveAssignment) {
      case 1: summary.wave1++; break;
      case 2: summary.wave2++; break;
      case 3: summary.wave3++; break;
      case 'nurture': summary.nurture++; break;
    }
  }

  return summary;
}

/**
 * Run Lead Scorer agent (for Operations Council integration)
 * @param {Object|Array} leadData - Single lead or array of leads
 * @param {Object} options - Scoring options
 * @returns {Object} Agent result with scored leads
 */
async function runLeadScorer(leadData, options = {}) {
  const log = logger.child({ component: 'lead-scorer-agent' });

  const leads = Array.isArray(leadData) ? leadData : [leadData];
  log.info({ leadCount: leads.length }, 'Running Lead Scorer agent');

  const scoredLeads = scoreLeads(leads);
  const summary = getTierSummary(scoredLeads);

  return {
    agentId: 'lead-scorer',
    model: 'local', // Runs locally without LLM
    results: scoredLeads,
    summary,
    timestamp: new Date().toISOString()
  };
}

export {
  scoreLead,
  scoreLeads,
  getTierSummary,
  checkDisqualifications,
  parseEmployeeCount,
  runLeadScorer,
  TIER_THRESHOLDS,
  WAVE_THRESHOLDS,
  RELATIONSHIP_BONUSES,
  BUILDING_TYPE_BONUSES
};

export default {
  scoreLead,
  scoreLeads,
  getTierSummary,
  checkDisqualifications,
  parseEmployeeCount,
  runLeadScorer,
  TIER_THRESHOLDS,
  WAVE_THRESHOLDS,
  RELATIONSHIP_BONUSES,
  BUILDING_TYPE_BONUSES
};

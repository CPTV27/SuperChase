/**
 * S2P Operations Council
 * 4-Agent Sequential Pipeline for Sales Operations
 *
 * Agent 1: Lead Scorer (local) - Tier classification, whale detection
 * Agent 2: Proof Matcher (local) - Match proof assets to leads
 * Agent 3: Price Auditor (local) - GM gate enforcement, pricing validation
 * Agent 4: Signal Scout (local) - Detect trigger signals, SLA tracking
 *
 * Pipeline: Score → Match → Audit → Scout
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic imports for ESM modules
let logger;
let leadScorer;
let proofMatcher;
let governanceRules;
let signalQueue;

async function initModules() {
  if (!logger) {
    try {
      const loggerModule = await import('../lib/logger.js');
      logger = loggerModule.default || loggerModule;
    } catch {
      logger = {
        child: () => ({
          info: console.log,
          warn: console.warn,
          error: console.error
        })
      };
    }
  }

  if (!leadScorer) {
    leadScorer = await import('../lib/lead-scorer.js');
  }

  if (!proofMatcher) {
    proofMatcher = await import('../lib/proof-matcher.js');
  }

  if (!governanceRules) {
    governanceRules = await import('../lib/governance-rules.js');
  }

  if (!signalQueue) {
    signalQueue = await import('../spokes/s2p/signal-queue.js');
  }
}

// GM Gate configuration (fallback if governance.json unavailable)
const GM_GATE = {
  floor: 0.40,
  target: 0.45,
  enforcement: 'VETO'
};

/**
 * Load governance configuration
 */
async function loadGovernance() {
  try {
    const governancePath = join(__dirname, '..', 'clients', 's2p', 'governance.json');
    const data = await readFile(governancePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      hardGates: {
        marginFloor: { value: 0.40 },
        noFreelancing: { enabled: true },
        noBespokePricing: { enabled: true }
      }
    };
  }
}

/**
 * Load pricing config
 */
async function loadPricingConfig() {
  try {
    const configPath = join(__dirname, '..', 'clients', 's2p', 'config.json');
    const data = await readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    return config.pricingEngine || {};
  } catch {
    return {
      baseRates: {
        architecture: 2.50,
        mep: 3.00,
        structural: 2.00
      },
      lodMultipliers: {
        200: 1.0,
        300: 1.3,
        350: 1.5
      }
    };
  }
}

/**
 * Agent 1: Lead Scorer
 * Classifies leads into tiers, scores whale potential
 */
async function runLeadScorerAgent(leadData, options = {}) {
  await initModules();
  const log = logger.child({ component: 'lead-scorer-agent' });

  log.info({ leadId: leadData?.id || leadData?.firmName }, 'Running Lead Scorer agent');

  try {
    const result = leadScorer.scoreLead(leadData);

    log.info({
      tier: result.tier,
      score: result.score,
      wave: result.waveAssignment
    }, 'Lead scoring complete');

    return {
      agentId: 'lead-scorer',
      model: 'local',
      ...result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    log.error({ error: error.message }, 'Lead Scorer failed');
    return {
      agentId: 'lead-scorer',
      model: 'local',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Agent 2: Proof Matcher
 * Matches proof assets from Vault to leads
 */
async function runProofMatcherAgent(leadData, scoring, options = {}) {
  await initModules();
  const log = logger.child({ component: 'proof-matcher-agent' });

  log.info({ leadId: leadData?.id || leadData?.firmName }, 'Running Proof Matcher agent');

  try {
    const proofCatalog = await proofMatcher.loadProofCatalog();
    const result = proofMatcher.matchProofToLead(leadData, proofCatalog);

    log.info({
      matchCount: result.matches?.length || 0,
      gapCount: result.gaps?.length || 0
    }, 'Proof matching complete');

    // Generate copy/paste snippet for top match
    let snippet = null;
    if (result.matches?.length > 0) {
      const topMatch = result.matches[0];
      snippet = `Relevant project: ${topMatch.title} - ${topMatch.projectSF?.toLocaleString() || 'N/A'} sqft ${topMatch.buildingTypes?.join(', ') || ''}`;
    }

    return {
      agentId: 'proof-matcher',
      model: 'local',
      matches: result.matches || [],
      gaps: result.gaps || [],
      snippet,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    log.error({ error: error.message }, 'Proof Matcher failed');
    return {
      agentId: 'proof-matcher',
      model: 'local',
      matches: [],
      gaps: [],
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Agent 3: Price Auditor
 * Validates pricing and enforces GM gate
 * Uses governance-rules.js for validation
 */
async function runPriceAuditorAgent(proposal, leadData, options = {}) {
  await initModules();
  const log = logger.child({ component: 'price-auditor-agent' });

  log.info({ proposalId: proposal?.id, leadId: leadData?.id }, 'Running Price Auditor agent');

  try {
    // Use governance-rules module for audit
    const audit = governanceRules.auditProposal(proposal);

    // Enhance with scope audit checklist
    const scopeAuditChecklist = {
      sqftConfirmed: !!proposal.sqft && proposal.sqft > 0,
      lodDefined: !!proposal.lod && ['200', '300', '350'].includes(String(proposal.lod)),
      disciplinesListed: proposal.disciplines?.length > 0,
      travelIncluded: proposal.travelIncluded !== false,
      timelineAgreed: !!proposal.timeline || !!proposal.duration,
      riskFactored: !!proposal.riskMultiplier || proposal.riskAssessed,
      proofAttached: proposal.proofIds?.length > 0
    };

    // Check scope audit completion
    const requiredChecks = ['sqftConfirmed', 'lodDefined', 'disciplinesListed', 'timelineAgreed'];
    const failedChecks = requiredChecks.filter(check => !scopeAuditChecklist[check]);

    const recommendations = [...(audit.warnings || [])];
    if (failedChecks.length > 0) {
      recommendations.push(`Complete scope audit: ${failedChecks.join(', ')}`);
    }

    log.info({
      verdict: audit.approved ? 'PASS' : 'VETO',
      gm: audit.calculatedGM
    }, 'Price audit complete');

    return {
      agentId: 'price-auditor',
      model: 'local',
      verdict: audit.approved ? 'PASS' : 'VETO',
      calculatedPrice: audit.price,
      calculatedGM: audit.calculatedGM,
      scopeAuditChecklist,
      recommendations,
      violatedRules: audit.violations || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    log.error({ error: error.message }, 'Price Auditor failed');

    // Fallback to basic audit
    const governance = await loadGovernance();
    const pricing = await loadPricingConfig();
    const gmFloor = governance.hardGates?.marginFloor?.value || GM_GATE.floor;

    // Calculate expected price based on SSOT
    let calculatedPrice = 0;
    const sqft = proposal.sqft || 0;
    const lodMultiplier = pricing.lodMultipliers?.[proposal.lod] || 1.0;

    for (const discipline of (proposal.disciplines || ['architecture'])) {
      const baseRate = pricing.baseRates?.[discipline] || 2.50;
      calculatedPrice += sqft * baseRate * lodMultiplier;
    }

    const proposalPrice = proposal.value || proposal.price || calculatedPrice;
    const estimatedCost = proposalPrice * (1 - GM_GATE.target);
    const calculatedGM = 1 - (estimatedCost / proposalPrice);

    return {
      agentId: 'price-auditor',
      model: 'local',
      verdict: calculatedGM >= gmFloor ? 'PASS' : 'VETO',
      calculatedPrice: Math.round(calculatedPrice),
      calculatedGM,
      scopeAuditChecklist: {},
      recommendations: [],
      violatedRules: calculatedGM < gmFloor ? [`GM ${(calculatedGM * 100).toFixed(1)}% below floor`] : [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Agent 4: Signal Scout
 * Detects hot signals and tracks SLA status
 * Uses signal-queue.js for detection
 */
async function runSignalScoutAgent(companyName, options = {}) {
  await initModules();
  const log = logger.child({ component: 'signal-scout-agent' });

  log.info({ company: companyName }, 'Running Signal Scout agent');

  try {
    // Use the signal-queue module
    const result = await signalQueue.runSignalScout(companyName);

    log.info({
      signalCount: result.signals?.length || 0,
      slaBreaches: result.slaBreaches?.length || 0
    }, 'Signal scout complete');

    return result;
  } catch (error) {
    log.error({ error: error.message }, 'Signal Scout failed');

    // Fallback to basic signal check
    let existingSignals = [];
    try {
      const signalsPath = join(__dirname, '..', 'clients', 's2p', 'memory', 'signals.json');
      const data = await readFile(signalsPath, 'utf8');
      const signalsData = JSON.parse(data);
      existingSignals = signalsData.signals || [];
    } catch {
      // No signals file
    }

    const companyLower = (companyName || '').toLowerCase();
    const matchedSignals = existingSignals.filter(signal => {
      const signalCompany = (signal.firmName || signal.company || '').toLowerCase();
      return signalCompany.includes(companyLower) || companyLower.includes(signalCompany);
    });

    return {
      agentId: 'signal-scout',
      model: 'local',
      signals: matchedSignals,
      slaBreaches: [],
      newLeadsCreated: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run full Operations Council pipeline
 * Sequential: Lead Scorer → Proof Matcher → Price Auditor (if proposal) → Signal Scout
 */
async function runOperationsCouncil(leadData, options = {}) {
  await initModules();
  const log = logger.child({ component: 'operations-council' });
  const { mode = 'full', proposal = null } = options;

  log.info({ leadId: leadData.id || leadData.firmName, mode }, 'Running Operations Council');

  const results = {
    councilId: `council_${Date.now()}`,
    leadId: leadData.id || leadData.firmName,
    timestamp: new Date().toISOString(),
    stages: []
  };

  try {
    // Stage 1: Lead Scorer
    log.info('Stage 1: Lead Scorer');
    const scoring = await runLeadScorerAgent(leadData);
    results.scoring = scoring;
    results.stages.push({ stage: 1, agent: 'lead-scorer', status: 'complete' });

    // Stage 2: Proof Matcher (only for Tier-A/B)
    let proof = null;
    if (scoring.tier !== 'C' && !scoring.disqualified) {
      log.info('Stage 2: Proof Matcher');
      proof = await runProofMatcherAgent(leadData, scoring);
      results.proof = proof;
      results.stages.push({ stage: 2, agent: 'proof-matcher', status: 'complete' });
    } else {
      const reason = scoring.disqualified ? 'Disqualified lead' : 'Tier C lead';
      results.stages.push({ stage: 2, agent: 'proof-matcher', status: 'skipped', reason });
    }

    // Stage 3: Price Auditor (if proposal provided)
    let pricing = null;
    if (proposal) {
      log.info('Stage 3: Price Auditor');
      pricing = await runPriceAuditorAgent(proposal, leadData);
      results.pricing = pricing;
      results.stages.push({ stage: 3, agent: 'price-auditor', status: 'complete' });
    } else {
      results.stages.push({ stage: 3, agent: 'price-auditor', status: 'skipped', reason: 'No proposal' });
    }

    // Stage 4: Signal Scout
    log.info('Stage 4: Signal Scout');
    const signals = await runSignalScoutAgent(leadData.firmName || leadData.company);
    results.signals = signals;
    results.stages.push({ stage: 4, agent: 'signal-scout', status: 'complete' });

    // Generate summary
    results.summary = {
      tier: scoring.tier,
      score: scoring.score,
      waveAssignment: scoring.waveAssignment,
      disqualified: scoring.disqualified || false,
      recommendedAction: scoring.waveAssignment === 'Wave 1' ? 'add_to_wave_1'
        : scoring.waveAssignment === 'Wave 2' ? 'add_to_wave_2'
        : scoring.waveAssignment === 'Wave 3' ? 'add_to_wave_3'
        : 'nurture',
      proofMatch: proof?.matches?.[0] || null,
      proofGaps: proof?.gaps || [],
      gmVerdict: pricing?.verdict || null,
      gmPercent: pricing?.calculatedGM ? Math.round(pricing.calculatedGM * 100) : null,
      activeSignals: signals.signals?.length || 0,
      slaBreaches: signals.slaBreaches?.length || 0
    };

    log.info({ summary: results.summary }, 'Operations Council complete');

    return results;
  } catch (error) {
    log.error({ error: error.message }, 'Operations Council failed');
    results.error = error.message;
    return results;
  }
}

/**
 * HTTP handler for council score endpoint
 */
async function handleCouncilScore(req, body) {
  const leadData = body.lead || body;
  const scoring = await runLeadScorerAgent(leadData);
  return { success: true, scoring };
}

/**
 * HTTP handler for council match endpoint
 */
async function handleCouncilMatch(req, body) {
  const { lead, scoring } = body;
  const proof = await runProofMatcherAgent(lead, scoring);
  return { success: true, proof };
}

/**
 * HTTP handler for council audit endpoint
 */
async function handleCouncilAudit(req, body) {
  const { proposal, lead } = body;
  const audit = await runPriceAuditorAgent(proposal, lead);
  return { success: true, audit };
}

/**
 * HTTP handler for council signals endpoint
 */
async function handleCouncilSignals(req, body) {
  const { company } = body;
  const signals = await runSignalScoutAgent(company);
  return { success: true, signals };
}

/**
 * HTTP handler for full council pipeline
 */
async function handleCouncilFull(req, body) {
  const { lead, proposal, mode } = body;
  const results = await runOperationsCouncil(lead, { proposal, mode });
  return { success: true, council: results };
}

/**
 * Get council status/health
 */
async function getCouncilStatus() {
  await initModules();

  const agents = [
    { id: 'lead-scorer', name: 'Lead Scorer', status: 'online' },
    { id: 'proof-matcher', name: 'Proof Matcher', status: 'online' },
    { id: 'price-auditor', name: 'Price Auditor', status: 'online' },
    { id: 'signal-scout', name: 'Signal Scout', status: 'online' }
  ];

  // Check if governance rules are loaded
  try {
    await loadGovernance();
  } catch {
    agents[2].status = 'degraded';
  }

  return {
    status: 'operational',
    agents,
    timestamp: new Date().toISOString()
  };
}

export {
  runOperationsCouncil,
  runLeadScorerAgent,
  runProofMatcherAgent,
  runPriceAuditorAgent,
  runSignalScoutAgent,
  handleCouncilScore,
  handleCouncilMatch,
  handleCouncilAudit,
  handleCouncilSignals,
  handleCouncilFull,
  getCouncilStatus,
  GM_GATE
};

export default {
  runOperationsCouncil,
  runLeadScorerAgent,
  runProofMatcherAgent,
  runPriceAuditorAgent,
  runSignalScoutAgent,
  handleCouncilScore,
  handleCouncilMatch,
  handleCouncilAudit,
  handleCouncilSignals,
  handleCouncilFull,
  getCouncilStatus,
  GM_GATE
};

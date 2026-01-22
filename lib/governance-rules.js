/**
 * Pipeline Governance Engine
 * Part of S2P Operations Council
 *
 * Hard Rules (Cannot be overridden):
 * - GM Floor: 40% minimum (no exceptions)
 * - Pricing Type: Tiered pricing only (no custom)
 * - Proof Required: Cannot advance to proposal without proof
 *
 * Stage Requirements:
 * - Qualified Meeting: tierStatus, proofMatched, contactLevel
 * - Proposal Issued: sowScoped, pricingPackage, proofAttached, gmPercent >= 40
 * - Negotiation: verbalAcceptance, changeOrderProcess
 * - Closed-Won: contractSigned, startDate, paymentTerms
 *
 * Warnings (Non-blocking):
 * - GM below 45% stretch target
 * - Legal cycle time > 12 days
 * - Missing attribution
 */

// GM Floor - NEVER violate
const GM_FLOOR = 40;

// GM Stretch target (for warnings)
const GM_STRETCH = 45;

// Allowed pricing types
const ALLOWED_PRICING_TYPES = ['tiered', 'standard', 'volume'];

// Stage definitions with requirements
const STAGE_REQUIREMENTS = {
  'Lead': {
    required: [],
    gmFloor: null,
    pricingType: null,
    description: 'Initial lead intake'
  },
  'Qualified Meeting': {
    required: ['tierStatus', 'proofMatched', 'contactLevel'],
    gmFloor: null,
    pricingType: null,
    description: 'Meeting scheduled with qualified contact'
  },
  'Proposal Issued': {
    required: ['sowScoped', 'pricingPackage', 'proofAttached'],
    gmFloor: GM_FLOOR,
    pricingType: 'tiered',
    description: 'Proposal sent to client'
  },
  'Negotiation': {
    required: ['verbalAcceptance', 'changeOrderProcess'],
    gmFloor: GM_FLOOR,
    pricingType: null,
    description: 'Active negotiation on terms'
  },
  'Closed-Won': {
    required: ['contractSigned', 'startDate', 'paymentTerms'],
    gmFloor: null,
    pricingType: null,
    description: 'Contract signed, project starts'
  },
  'Closed-Lost': {
    required: ['lossReason'],
    gmFloor: null,
    pricingType: null,
    description: 'Opportunity lost'
  }
};

// Legal cycle SLA
const LEGAL_CYCLE_SLA = 12; // days

/**
 * Validate a deal against governance rules for stage transition
 * @param {Object} deal - Deal data
 * @param {string} targetStage - Stage to advance to
 * @returns {Object} { canAdvance, violations, warnings }
 */
function validateStageTransition(deal, targetStage) {
  const violations = []; // Blocking issues
  const warnings = []; // Non-blocking alerts

  const requirements = STAGE_REQUIREMENTS[targetStage];
  if (!requirements) {
    return {
      canAdvance: true,
      violations: [],
      warnings: [{ rule: 'unknown_stage', message: `Unknown stage: ${targetStage}` }]
    };
  }

  // Check required fields
  for (const field of requirements.required) {
    if (!deal[field]) {
      violations.push({
        rule: field,
        message: `Missing required: ${formatFieldName(field)}`,
        blocking: true,
        field
      });
    }
  }

  // GM Floor check (HARD BLOCK - no override allowed)
  if (requirements.gmFloor !== null) {
    const gmPercent = deal.gmPercent || deal.gm_percent || 0;

    if (gmPercent < requirements.gmFloor) {
      violations.push({
        rule: 'gmFloor',
        message: `GM ${gmPercent}% is below ${requirements.gmFloor}% floor`,
        blocking: true,
        allowOverride: false, // CEO CANNOT override this
        currentValue: gmPercent,
        requiredValue: requirements.gmFloor
      });
    }
  }

  // Pricing type check (HARD BLOCK - no override allowed)
  if (requirements.pricingType !== null) {
    const pricingType = deal.pricingType || deal.pricing_type || 'unknown';

    if (!ALLOWED_PRICING_TYPES.includes(pricingType)) {
      violations.push({
        rule: 'pricingType',
        message: `Must use tiered pricing (currently: ${pricingType})`,
        blocking: true,
        allowOverride: false, // CEO CANNOT override this
        currentValue: pricingType,
        allowedValues: ALLOWED_PRICING_TYPES
      });
    }
  }

  // Non-blocking warnings

  // GM stretch target warning
  if (targetStage === 'Proposal Issued' || targetStage === 'Negotiation') {
    const gmPercent = deal.gmPercent || deal.gm_percent || 0;
    if (gmPercent >= GM_FLOOR && gmPercent < GM_STRETCH) {
      warnings.push({
        rule: 'gmStretch',
        message: `GM ${gmPercent}% below ${GM_STRETCH}% stretch target`,
        action: 'Review pricing or scope efficiency',
        currentValue: gmPercent,
        targetValue: GM_STRETCH
      });
    }
  }

  // Legal cycle time warning
  if (targetStage === 'Negotiation' || targetStage === 'Closed-Won') {
    const legalCycleDays = deal.legalCycleDays || deal.legal_cycle_days || 0;
    if (legalCycleDays > LEGAL_CYCLE_SLA) {
      warnings.push({
        rule: 'legalCycleTime',
        message: `Legal review ${legalCycleDays} days (SLA: ${LEGAL_CYCLE_SLA}d)`,
        action: 'Consider escalation to expedite',
        currentValue: legalCycleDays,
        slaValue: LEGAL_CYCLE_SLA
      });
    }
  }

  // Attribution warning
  if (targetStage !== 'Lead' && !deal.attribution) {
    warnings.push({
      rule: 'attribution',
      message: 'Missing attribution source',
      action: 'Add attribution for tracking (100% attribution required)'
    });
  }

  // Tier mismatch warning
  if (targetStage === 'Proposal Issued' && deal.tierStatus === 'C') {
    warnings.push({
      rule: 'tierMismatch',
      message: 'Proposal to Tier-C lead',
      action: 'Consider if effort is worth the opportunity size'
    });
  }

  return {
    canAdvance: violations.length === 0,
    violations,
    warnings,
    targetStage,
    requirements: requirements.required
  };
}

/**
 * Format field name for display
 */
function formatFieldName(field) {
  const displayNames = {
    tierStatus: 'Tier Status',
    proofMatched: 'Proof Matched',
    contactLevel: 'Contact Level',
    sowScoped: 'SOW Scoped',
    pricingPackage: 'Pricing Package',
    proofAttached: 'Proof Attached',
    verbalAcceptance: 'Verbal Acceptance',
    changeOrderProcess: 'Change Order Process',
    contractSigned: 'Contract Signed',
    startDate: 'Start Date',
    paymentTerms: 'Payment Terms',
    lossReason: 'Loss Reason'
  };

  return displayNames[field] || field.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get scope audit checklist for proposal stage
 * @param {Object} deal - Deal data
 * @returns {Object} Checklist with completion status
 */
function getScopeAuditChecklist(deal = {}) {
  const checklist = {
    sqftConfirmed: {
      label: 'Square footage confirmed',
      completed: !!deal.sqft || !!deal.sqftConfirmed,
      required: true
    },
    lodDefined: {
      label: 'LOD level defined',
      completed: !!deal.lodLevel || !!deal.lod_level,
      required: true
    },
    disciplinesListed: {
      label: 'Disciplines listed',
      completed: !!deal.disciplines && deal.disciplines.length > 0,
      required: true
    },
    travelIncluded: {
      label: 'Travel costs included',
      completed: deal.travelIncluded !== false,
      required: true
    },
    riskFactored: {
      label: 'Risk multiplier applied',
      completed: !!deal.riskMultiplier || deal.riskFactored === true,
      required: false
    },
    proofAttached: {
      label: 'Proof attachment selected',
      completed: !!deal.proofAttached || (deal.proofIds && deal.proofIds.length > 0),
      required: true
    },
    gmCalculated: {
      label: 'GM calculated and verified',
      completed: !!deal.gmPercent && deal.gmPercent >= GM_FLOOR,
      required: true
    }
  };

  const completedCount = Object.values(checklist).filter(item => item.completed).length;
  const requiredCount = Object.values(checklist).filter(item => item.required).length;
  const requiredCompleted = Object.values(checklist).filter(item => item.required && item.completed).length;

  return {
    items: checklist,
    completedCount,
    totalCount: Object.keys(checklist).length,
    requiredCompleted,
    requiredTotal: requiredCount,
    canProceed: requiredCompleted === requiredCount
  };
}

/**
 * Validate GM before proposal creation
 * @param {number} gmPercent - Gross margin percentage
 * @returns {Object} Validation result
 */
function validateGM(gmPercent) {
  if (gmPercent < GM_FLOOR) {
    return {
      valid: false,
      message: `GM ${gmPercent}% is below the ${GM_FLOOR}% floor. This deal CANNOT proceed.`,
      action: 'Revise pricing or reduce scope costs.',
      severity: 'BLOCK'
    };
  }

  if (gmPercent < GM_STRETCH) {
    return {
      valid: true,
      message: `GM ${gmPercent}% is below the ${GM_STRETCH}% stretch target.`,
      action: 'Consider pricing optimization.',
      severity: 'WARNING'
    };
  }

  return {
    valid: true,
    message: `GM ${gmPercent}% meets targets.`,
    action: null,
    severity: 'OK'
  };
}

/**
 * Get all available stages
 * @returns {Array} Stage definitions
 */
function getStages() {
  return Object.entries(STAGE_REQUIREMENTS).map(([name, config]) => ({
    name,
    ...config
  }));
}

/**
 * Run Price Auditor agent (for Operations Council integration)
 * @param {Object} proposal - Proposal data
 * @param {Object} lead - Lead data
 * @returns {Object} Auditor results
 */
async function runPriceAuditor(proposal, lead = {}) {
  const deal = { ...lead, ...proposal };

  // Run scope audit
  const scopeAudit = getScopeAuditChecklist(deal);

  // Validate GM
  const gmValidation = validateGM(deal.gmPercent || 0);

  // Check if can advance to Proposal stage
  const stageValidation = validateStageTransition(deal, 'Proposal Issued');

  // Determine verdict
  let verdict = 'PASS';
  if (!stageValidation.canAdvance) {
    verdict = 'VETO';
  } else if (stageValidation.warnings.length > 0 || !scopeAudit.canProceed) {
    verdict = 'WARNING';
  }

  return {
    agentId: 'price-auditor',
    model: 'local',
    verdict,
    calculatedPrice: proposal.totalPrice || proposal.price,
    calculatedGM: deal.gmPercent,
    scopeAuditChecklist: scopeAudit.items,
    scopeAuditPassed: scopeAudit.canProceed,
    recommendations: stageValidation.warnings.map(w => w.action).filter(Boolean),
    violatedRules: stageValidation.violations.map(v => v.rule),
    violations: stageValidation.violations,
    warnings: stageValidation.warnings,
    gmValidation,
    timestamp: new Date().toISOString()
  };
}

export {
  validateStageTransition,
  validateGM,
  getScopeAuditChecklist,
  getStages,
  runPriceAuditor,
  GM_FLOOR,
  GM_STRETCH,
  ALLOWED_PRICING_TYPES,
  STAGE_REQUIREMENTS,
  LEGAL_CYCLE_SLA
};

export default {
  validateStageTransition,
  validateGM,
  getScopeAuditChecklist,
  getStages,
  runPriceAuditor,
  GM_FLOOR,
  GM_STRETCH,
  ALLOWED_PRICING_TYPES,
  STAGE_REQUIREMENTS,
  LEGAL_CYCLE_SLA
};

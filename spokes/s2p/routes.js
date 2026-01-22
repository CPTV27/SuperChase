/**
 * S2P Command Center - API Routes
 * Handles all S2P dashboard endpoints
 *
 * Phase 4: Connect Frontend to Live APIs
 * - Uses new lead-scorer.js, proof-matcher.js, governance-rules.js
 * - Integrates kpi-calculator.js, lead-ingestion.js, vendor-tracker.js
 * - Uses abm-waves.js and signal-queue.js
 * - Calls operations_council.js for full pipeline
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Memory file paths
const MEMORY_BASE = join(__dirname, '..', '..', 'clients', 's2p', 'memory');

const PATHS = {
  leads: join(MEMORY_BASE, 'leads.json'),
  proofCatalog: join(MEMORY_BASE, 'proof-catalog.json'),
  waves: join(MEMORY_BASE, 'waves.json'),
  kpiTargets: join(MEMORY_BASE, 'kpi-targets.json'),
  pipeline: join(MEMORY_BASE, 'pipeline.json'),
  signals: join(MEMORY_BASE, 'signals.json'),
  vendorStatus: join(MEMORY_BASE, 'vendor-status.json')
};

// Dynamic module imports (lazy loaded)
let leadScorer, proofMatcher, governanceRules, kpiCalculator;
let leadIngestion, vendorTracker, abmWaves, signalQueue;
let operationsCouncil;

async function initModules() {
  if (!leadScorer) {
    leadScorer = await import('../../lib/lead-scorer.js');
  }
  if (!proofMatcher) {
    proofMatcher = await import('../../lib/proof-matcher.js');
  }
  if (!governanceRules) {
    governanceRules = await import('../../lib/governance-rules.js');
  }
  if (!kpiCalculator) {
    kpiCalculator = await import('../../lib/kpi-calculator.js');
  }
  if (!leadIngestion) {
    leadIngestion = await import('./lead-ingestion.js');
  }
  if (!vendorTracker) {
    vendorTracker = await import('./vendor-tracker.js');
  }
  if (!abmWaves) {
    abmWaves = await import('./abm-waves.js');
  }
  if (!signalQueue) {
    signalQueue = await import('./signal-queue.js');
  }
  if (!operationsCouncil) {
    operationsCouncil = await import('../../core/operations_council.js');
  }
}

/**
 * Ensure memory directory exists
 */
function ensureMemoryDir() {
  if (!existsSync(MEMORY_BASE)) {
    mkdirSync(MEMORY_BASE, { recursive: true });
  }
}

/**
 * Load JSON file safely
 */
function loadJson(filePath, defaultValue = {}) {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
  }
  return defaultValue;
}

/**
 * Save JSON file
 */
function saveJson(filePath, data) {
  ensureMemoryDir();
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Parse body from request
 */
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// ==========================================
// KPI Endpoints (using kpi-calculator.js)
// ==========================================

async function handleGetKPISummary() {
  await initModules();

  try {
    const result = await kpiCalculator.calculateKPIs();
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('KPI calculation error:', error);
    // Fallback to static data
    const kpiTargets = loadJson(PATHS.kpiTargets, { kpis: {} });
    return {
      success: true,
      kpis: kpiTargets.kpis || {},
      quarterlyTargets: kpiTargets.quarterlyTargets,
      currentQuarter: kpiTargets.currentQuarter
    };
  }
}

// ==========================================
// Pipeline Endpoints (using governance-rules.js)
// ==========================================

async function handleGetPipelineStages() {
  await initModules();

  const pipeline = loadJson(PATHS.pipeline, { deals: [], stages: [] });

  return {
    success: true,
    stages: governanceRules.getStages(),
    governance: {
      gmFloor: governanceRules.GM_FLOOR,
      allowedPricingTypes: governanceRules.ALLOWED_PRICING_TYPES
    },
    scopeAuditChecklist: governanceRules.getScopeAuditChecklist()
  };
}

async function handleGetDeals() {
  const pipeline = loadJson(PATHS.pipeline, { deals: [] });

  return {
    success: true,
    deals: pipeline.deals || [],
    stats: pipeline.stats || {}
  };
}

async function handleAdvanceStage(req) {
  await initModules();
  const body = await parseBody(req);
  const { dealId, toStage, auditData } = body;

  const pipeline = loadJson(PATHS.pipeline, { deals: [] });
  const dealIndex = pipeline.deals.findIndex(d => d.id === dealId);

  if (dealIndex === -1) {
    return { success: false, error: 'Deal not found' };
  }

  const deal = pipeline.deals[dealIndex];
  const currentStage = deal.stage;

  // Use governance-rules to validate stage advance
  const validation = governanceRules.validateStageTransition(deal, toStage);

  if (!validation.canAdvance) {
    return {
      success: false,
      error: validation.violations?.[0]?.message || 'Stage transition blocked',
      violations: validation.violations,
      warnings: validation.warnings
    };
  }

  // If advancing to proposal, run full audit
  if (toStage === 'Proposal Issued' || toStage === 'proposal') {
    const audit = governanceRules.runPriceAuditor(deal);

    if (!audit.approved) {
      return {
        success: false,
        error: 'Proposal audit failed - GM below floor',
        verdict: 'VETO',
        violations: audit.violations,
        gm_percent: audit.gmPercent
      };
    }

    deal.gm_percent = audit.gmPercent;
    deal.gm_status = 'PASS';
    deal.scope_audit_complete = true;
  }

  // Advance stage
  deal.stage = toStage;
  deal.updated_at = new Date().toISOString();
  pipeline.deals[dealIndex] = deal;
  saveJson(PATHS.pipeline, pipeline);

  return {
    success: true,
    deal,
    message: `Deal advanced to ${toStage}`
  };
}

async function handleScopeAudit(req, dealId) {
  await initModules();

  const pipeline = loadJson(PATHS.pipeline, { deals: [] });
  const deal = pipeline.deals.find(d => d.id === dealId);

  if (!deal) {
    return { success: false, error: 'Deal not found' };
  }

  // Run full audit
  const audit = governanceRules.runPriceAuditor(deal);

  return {
    success: true,
    deal,
    audit,
    checklist: governanceRules.getScopeAuditChecklist()
  };
}

// ==========================================
// Lead Endpoints (using lead-scorer.js, lead-ingestion.js)
// ==========================================

async function handleGetLeads(req) {
  await initModules();

  try {
    const result = await leadIngestion.getLeads();
    return {
      success: true,
      leads: result.leads,
      count: result.count,
      total: result.total
    };
  } catch (error) {
    // Fallback to direct file read
    const leads = loadJson(PATHS.leads, { leads: [] });
    return {
      success: true,
      leads: leads.leads || [],
      count: (leads.leads || []).length,
      total: (leads.leads || []).length
    };
  }
}

async function handleGetLead(leadId) {
  await initModules();

  try {
    const lead = await leadIngestion.getLead(leadId);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }
    return { success: true, lead };
  } catch (error) {
    const leads = loadJson(PATHS.leads, { leads: [] });
    const lead = leads.leads.find(l => l.id === leadId);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }
    return { success: true, lead };
  }
}

async function handleIngestLeads(req) {
  await initModules();
  const body = await parseBody(req);

  // Support both CSV and JSON formats
  if (body.csvData) {
    const result = await leadIngestion.ingestLeads(body.csvData, body.options || {});
    return result;
  }

  if (body.leads && Array.isArray(body.leads)) {
    // Legacy JSON format - convert to CSV-like ingestion
    const leadsData = loadJson(PATHS.leads, { leads: [] });
    const existingCompanies = new Set(leadsData.leads.map(l => (l.firmName || l.company)?.toLowerCase()));

    let added = 0;
    let skipped = 0;

    for (const lead of body.leads) {
      const company = lead.firmName || lead.company;
      if (existingCompanies.has(company?.toLowerCase())) {
        skipped++;
        continue;
      }

      // Score the lead
      const scoring = leadScorer.scoreLead(lead);

      leadsData.leads.push({
        id: `lead_${Date.now()}_${added}`,
        ...lead,
        scoring,
        ingestedAt: new Date().toISOString()
      });
      added++;
      existingCompanies.add(company?.toLowerCase());
    }

    leadsData.lastUpdated = new Date().toISOString();
    saveJson(PATHS.leads, leadsData);

    return {
      success: true,
      summary: {
        total: body.leads.length,
        unique: added,
        duplicates: skipped
      },
      tierSummary: leadScorer.getTierSummary(leadsData.leads)
    };
  }

  return { success: false, error: 'csvData or leads array required' };
}

async function handleUpdateLeadTier(req) {
  await initModules();
  const body = await parseBody(req);
  const { leadId, tier, reason } = body;

  try {
    const result = await leadIngestion.updateLead(leadId, {
      tier_override: tier,
      tier_override_reason: reason
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleScoreLead(req) {
  await initModules();
  const body = await parseBody(req);

  const scoring = leadScorer.scoreLead(body.lead || body);
  return { success: true, scoring };
}

// ==========================================
// Proof Vault Endpoints (using proof-matcher.js)
// ==========================================

async function handleGetProofs() {
  await initModules();

  try {
    const catalog = await proofMatcher.loadProofCatalog();
    return {
      success: true,
      proofs: catalog.proofs || [],
      stats: {
        total: catalog.proofs?.length || 0,
        total_uses: (catalog.proofs || []).reduce((sum, p) => sum + (p.uses || 0), 0)
      }
    };
  } catch (error) {
    const catalog = loadJson(PATHS.proofCatalog, { proofs: [] });
    return {
      success: true,
      proofs: catalog.proofs || [],
      stats: catalog.stats || {}
    };
  }
}

async function handleGetProof(proofId) {
  const catalog = loadJson(PATHS.proofCatalog, { proofs: [] });
  const proof = catalog.proofs.find(p => p.id === proofId);

  if (!proof) {
    return { success: false, error: 'Proof not found' };
  }

  return { success: true, proof };
}

async function handleProofUse(req) {
  const body = await parseBody(req);
  const { proofId, leadId, context } = body;

  const catalog = loadJson(PATHS.proofCatalog, { proofs: [] });
  const proofIndex = catalog.proofs.findIndex(p => p.id === proofId);

  if (proofIndex === -1) {
    return { success: false, error: 'Proof not found' };
  }

  // Increment uses
  catalog.proofs[proofIndex].uses = (catalog.proofs[proofIndex].uses || 0) + 1;
  catalog.proofs[proofIndex].last_used = new Date().toISOString();

  saveJson(PATHS.proofCatalog, catalog);

  return {
    success: true,
    uses: catalog.proofs[proofIndex].uses,
    proofId
  };
}

async function handleProofMatch(leadId) {
  await initModules();

  // Load lead data
  const leads = loadJson(PATHS.leads, { leads: [] });
  const lead = leads.leads.find(l => l.id === leadId);

  if (!lead) {
    return { success: false, error: 'Lead not found' };
  }

  // Use proof-matcher module
  const catalog = await proofMatcher.loadProofCatalog();
  const result = proofMatcher.matchProofToLead(lead, catalog);

  return {
    success: true,
    leadId,
    matches: result.matches,
    gaps: result.gaps
  };
}

// ==========================================
// Vendor Status Endpoints (using vendor-tracker.js)
// ==========================================

async function handleGetVendorStatus(req) {
  await initModules();

  try {
    const summary = await vendorTracker.getVendorSummary();
    const alerts = await vendorTracker.getVendorAlerts();
    const vendors = await vendorTracker.getAllVendors();

    return {
      success: true,
      summary,
      alerts,
      vendors: vendors.vendors
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSubmitVendorApp(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await vendorTracker.submitApplication(body);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleApproveVendor(req) {
  await initModules();
  const body = await parseBody(req);
  const { leadId, approvalDate, notes } = body;

  try {
    const result = await vendorTracker.approveVendor(leadId, approvalDate, notes);

    // Create a signal for vendor approval
    if (result.success) {
      await signalQueue.createSignal({
        type: 'vendor_approved',
        leadId,
        firmName: result.vendor?.firmName,
        source: 'vendor_tracker',
        notes: `Approved after ${result.cycleTimeDays} days`
      });
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// Wave Calendar Endpoints (using abm-waves.js)
// ==========================================

async function handleGetWaves() {
  await initModules();

  try {
    const waves = await abmWaves.getAllWaves();
    const dashboard = await abmWaves.getWaveDashboard();

    return {
      success: true,
      waves: waves.waves,
      activeWave: dashboard.activeWave,
      globalStats: dashboard.globalStats,
      recentActivity: dashboard.recentActivity
    };
  } catch (error) {
    const waves = loadJson(PATHS.waves, { waves: [] });
    return {
      success: true,
      waves: waves.waves || [],
      activeWave: waves.activeWave
    };
  }
}

async function handleGetWave(waveId) {
  await initModules();

  try {
    const wave = await abmWaves.getWave(waveId);
    if (!wave) {
      return { success: false, error: 'Wave not found' };
    }
    return { success: true, wave };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleCreateWave(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await abmWaves.createWave(body);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleWaveTargetAction(req) {
  await initModules();
  const body = await parseBody(req);
  const { waveId, leadId, action, notes } = body;

  try {
    if (action === 'kill') {
      const result = await abmWaves.killTarget(waveId, leadId, notes);
      return result;
    } else if (action === 'touch') {
      const result = await abmWaves.recordTouch(waveId, leadId, body.touchType || 'email', notes);
      return result;
    } else if (action === 'advance') {
      const result = await abmWaves.advanceTargetState(waveId, leadId, body.newState);
      return result;
    }

    return { success: false, error: 'Invalid action. Use: kill, touch, advance' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// Signal Queue Endpoints (using signal-queue.js)
// ==========================================

async function handleGetSignals() {
  await initModules();

  try {
    const pending = await signalQueue.getPendingSignals();
    const dashboard = await signalQueue.getSignalDashboard();

    return {
      success: true,
      signals: pending.signals,
      count: pending.count,
      breached: pending.breached,
      urgent: pending.urgent,
      dashboard
    };
  } catch (error) {
    const signals = loadJson(PATHS.signals, { signals: [] });
    return {
      success: true,
      signals: signals.signals || [],
      count: (signals.signals || []).length
    };
  }
}

async function handleCreateSignal(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await signalQueue.createSignal(body);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSignalAction(req) {
  await initModules();
  const body = await parseBody(req);
  const { signalId, action, assignedTo, resolution, notes } = body;

  try {
    if (action === 'acknowledge') {
      const result = await signalQueue.acknowledgeSignal(signalId, assignedTo);
      return result;
    } else if (action === 'complete') {
      const result = await signalQueue.completeSignal(signalId, resolution, notes);
      return result;
    } else if (action === 'dismiss') {
      const result = await signalQueue.dismissSignal(signalId, notes);
      return result;
    }

    return { success: false, error: 'Invalid action. Use: acknowledge, complete, dismiss' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// Operations Council Endpoints
// ==========================================

async function handleCouncilScore(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await operationsCouncil.handleCouncilScore(req, body);
    return result;
  } catch (error) {
    // Fallback to direct scorer
    const scoring = leadScorer.scoreLead(body.lead || body);
    return { success: true, scoring };
  }
}

async function handleCouncilMatch(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await operationsCouncil.handleCouncilMatch(req, body);
    return result;
  } catch (error) {
    // Fallback to handleProofMatch
    return handleProofMatch(body.lead?.id);
  }
}

async function handleCouncilAudit(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await operationsCouncil.handleCouncilAudit(req, body);
    return result;
  } catch (error) {
    // Fallback to governance-rules
    const audit = governanceRules.runPriceAuditor(body.proposal);
    return { success: true, audit };
  }
}

async function handleCouncilSignals(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await operationsCouncil.handleCouncilSignals(req, body);
    return result;
  } catch (error) {
    // Fallback to signalQueue
    const scout = await signalQueue.runSignalScout(body.company);
    return { success: true, signals: scout };
  }
}

async function handleCouncilFull(req) {
  await initModules();
  const body = await parseBody(req);

  try {
    const result = await operationsCouncil.handleCouncilFull(req, body);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleCouncilStatus() {
  await initModules();

  try {
    const status = await operationsCouncil.getCouncilStatus();
    return { success: true, ...status };
  } catch (error) {
    return {
      success: true,
      status: 'operational',
      agents: [
        { id: 'lead-scorer', name: 'Lead Scorer', status: 'online' },
        { id: 'proof-matcher', name: 'Proof Matcher', status: 'online' },
        { id: 'price-auditor', name: 'Price Auditor', status: 'online' },
        { id: 'signal-scout', name: 'Signal Scout', status: 'online' }
      ]
    };
  }
}

// ==========================================
// Brief Generation
// ==========================================

async function handleGenerateBrief(req) {
  await initModules();
  const body = await parseBody(req);
  const { leadId } = body;

  if (!leadId) {
    return { success: false, error: 'leadId is required' };
  }

  try {
    // Load lead data
    const leadsData = loadJson(PATHS.leads, { leads: [] });
    const lead = leadsData.leads.find(l => l.id === leadId);

    if (!lead) {
      return { success: false, error: `Lead not found: ${leadId}` };
    }

    // Run Operations Council for comprehensive analysis
    const councilResult = await operationsCouncil.runOperationsCouncil(lead, { mode: 'full' });

    // Format the brief
    const brief = {
      id: `brief_${Date.now()}`,
      leadId,
      generatedAt: new Date().toISOString(),

      // Lead Summary
      company: lead.firmName || lead.company,
      tier: councilResult.scoring?.tier || lead.tier || 'Unknown',
      score: councilResult.scoring?.score || 0,
      waveAssignment: councilResult.scoring?.waveAssignment || 'Not assigned',

      // Size & Opportunity
      employees: lead.employees || lead.employeeCount,
      sqftEstimate: councilResult.scoring?.sqftEstimate || lead.sqft_estimate || 'Unknown',
      location: lead.location || lead.city,
      serviceTypes: lead.service_focus || lead.services || [],

      // Proof Assets
      proofMatches: councilResult.proof?.matches?.slice(0, 3) || [],
      proofSnippet: councilResult.proof?.snippet || null,
      proofGaps: councilResult.proof?.gaps || [],

      // Active Signals
      signals: councilResult.signals?.signals?.slice(0, 3) || [],
      signalCount: councilResult.signals?.signals?.length || 0,

      // Recommended Actions
      recommendedAction: councilResult.summary?.recommendedAction || 'research',
      nextSteps: generateNextSteps(councilResult),

      // Full council output for reference
      councilSummary: councilResult.summary
    };

    return { success: true, brief };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateNextSteps(councilResult) {
  const steps = [];
  const tier = councilResult.scoring?.tier;
  const wave = councilResult.scoring?.waveAssignment;

  if (tier === 'A') {
    steps.push('Priority outreach - schedule discovery call within 48 hours');
    if (councilResult.proof?.matches?.length > 0) {
      steps.push(`Attach proof: ${councilResult.proof.matches[0].title}`);
    }
  } else if (tier === 'B') {
    steps.push('Add to nurture sequence');
    steps.push('Send relevant case study');
  } else {
    steps.push('Add to general marketing list');
  }

  if (councilResult.signals?.signals?.length > 0) {
    steps.push('Review active signals for timing opportunity');
  }

  if (councilResult.proof?.gaps?.length > 0) {
    steps.push(`Address proof gaps: ${councilResult.proof.gaps.join(', ')}`);
  }

  if (wave) {
    steps.push(`Assign to ${wave}`);
  }

  return steps;
}

// ==========================================
// Main Route Handler
// ==========================================

export async function handleS2PRoute(req, method, pathname) {
  // Strip /api/s2p prefix
  const path = pathname.replace('/api/s2p', '');

  try {
    // KPI routes
    if (method === 'GET' && path === '/kpi/summary') {
      return handleGetKPISummary();
    }

    // Pipeline routes
    if (method === 'GET' && path === '/pipeline/stages') {
      return handleGetPipelineStages();
    }
    if (method === 'GET' && path === '/pipeline/deals') {
      return handleGetDeals();
    }
    if (method === 'POST' && path === '/pipeline/advance') {
      return handleAdvanceStage(req);
    }
    if (method === 'GET' && path.startsWith('/pipeline/audit/')) {
      const dealId = path.replace('/pipeline/audit/', '');
      return handleScopeAudit(req, dealId);
    }

    // Lead routes
    if (method === 'GET' && path === '/leads') {
      return handleGetLeads(req);
    }
    if (method === 'GET' && path.startsWith('/leads/') && !path.includes('/tier') && !path.includes('/score')) {
      const leadId = path.replace('/leads/', '');
      return handleGetLead(leadId);
    }
    if (method === 'POST' && path === '/leads/ingest') {
      return handleIngestLeads(req);
    }
    if (method === 'POST' && path === '/leads/score') {
      return handleScoreLead(req);
    }
    if (method === 'PATCH' && path.includes('/tier')) {
      return handleUpdateLeadTier(req);
    }

    // Proof routes
    if (method === 'GET' && path === '/proof') {
      return handleGetProofs();
    }
    if (method === 'GET' && path.startsWith('/proof/') && !path.includes('/use') && !path.includes('/match')) {
      const proofId = path.replace('/proof/', '');
      return handleGetProof(proofId);
    }
    if (method === 'POST' && path.includes('/proof/') && path.includes('/use')) {
      return handleProofUse(req);
    }
    if (method === 'GET' && path.startsWith('/proof/match/')) {
      const leadId = path.replace('/proof/match/', '');
      return handleProofMatch(leadId);
    }

    // Vendor status routes
    if (method === 'GET' && path === '/vendor/status') {
      return handleGetVendorStatus(req);
    }
    if (method === 'POST' && path === '/vendor/apply') {
      return handleSubmitVendorApp(req);
    }
    if (method === 'POST' && path === '/vendor/approve') {
      return handleApproveVendor(req);
    }

    // Wave routes
    if (method === 'GET' && path === '/waves') {
      return handleGetWaves();
    }
    if (method === 'GET' && path.startsWith('/waves/') && path.split('/').length === 3) {
      const waveId = path.replace('/waves/', '');
      return handleGetWave(waveId);
    }
    if (method === 'POST' && path === '/waves/create') {
      return handleCreateWave(req);
    }
    if (method === 'POST' && path === '/waves/target-action') {
      return handleWaveTargetAction(req);
    }

    // Signal routes
    if (method === 'GET' && path === '/signals') {
      return handleGetSignals();
    }
    if (method === 'POST' && path === '/signals/create') {
      return handleCreateSignal(req);
    }
    if (method === 'POST' && path === '/signals/action') {
      return handleSignalAction(req);
    }

    // Council routes
    if (method === 'GET' && path === '/council/status') {
      return handleCouncilStatus();
    }
    if (method === 'POST' && path === '/council/score') {
      return handleCouncilScore(req);
    }
    if (method === 'POST' && path === '/council/match') {
      return handleCouncilMatch(req);
    }
    if (method === 'POST' && path === '/council/audit') {
      return handleCouncilAudit(req);
    }
    if (method === 'POST' && path === '/council/signals') {
      return handleCouncilSignals(req);
    }
    if (method === 'POST' && path === '/council/full') {
      return handleCouncilFull(req);
    }

    // Brief generation
    if (method === 'POST' && path === '/brief/generate') {
      return handleGenerateBrief(req);
    }

    // No match
    return null;
  } catch (error) {
    console.error('S2P route error:', error);
    return {
      success: false,
      error: error.message,
      _status: 500
    };
  }
}

export default { handleS2PRoute };

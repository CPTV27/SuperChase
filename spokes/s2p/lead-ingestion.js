/**
 * Lead Ingestion Pipeline
 * Part of S2P Command Center
 *
 * Features:
 * - CSV parsing for Clutch.co firm data
 * - Auto-scoring via lead-scorer.js
 * - Auto-proof matching via proof-matcher.js
 * - Duplicate detection
 * - Enrichment gap flagging
 * - Tier summary generation
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scoreLead, getTierSummary } from '../../lib/lead-scorer.js';
import { matchProofToLead, loadProofCatalog } from '../../lib/proof-matcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to leads database
const LEADS_DB_PATH = join(__dirname, '../../clients/s2p/memory/leads.json');

// Required fields for a complete lead
const REQUIRED_FIELDS = ['firmName', 'website'];
const ENRICHMENT_FIELDS = ['principalEmail', 'principalPhone', 'portfolioSF', 'buildingTypes'];

// Column mapping from Clutch.co CSV
const COLUMN_MAPPING = {
  'Profile_Title': 'firmName',
  'Company': 'firmName',
  'Firm Name': 'firmName',
  'Website': 'website',
  'URL': 'website',
  'Employees': 'employees',
  'Employee Count': 'employees',
  'Location': 'location',
  'City': 'city',
  'State': 'state',
  'Service_Focus': 'serviceFocus',
  'Focus': 'serviceFocus',
  'Building Types': 'buildingTypes',
  'Categories': 'buildingTypes',
  'Contact Name': 'contactName',
  'Contact Email': 'principalEmail',
  'Email': 'principalEmail',
  'Phone': 'principalPhone',
  'ENR Rank': 'enrRank',
  'ENR_Rank': 'enrRank',
  'Multi-Site': 'multiSitePortfolio',
  'Portfolio SF': 'portfolioSF',
  'Portfolio_SF': 'portfolioSF'
};

/**
 * Parse CSV string into array of objects
 * @param {string} csvData - Raw CSV content
 * @returns {Array} Parsed records
 */
function parseCSV(csvData) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Map headers to normalized field names
  const fieldMap = headers.map(header => {
    const trimmed = header.trim();
    return COLUMN_MAPPING[trimmed] || trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
  });

  // Parse data rows
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const record = {};
    for (let j = 0; j < fieldMap.length; j++) {
      const field = fieldMap[j];
      const value = values[j]?.trim();

      if (value) {
        // Special handling for certain fields
        if (field === 'employees') {
          record[field] = parseEmployeeCount(value);
        } else if (field === 'multiSitePortfolio') {
          record[field] = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1';
        } else if (field === 'enrRank' || field === 'portfolioSF') {
          record[field] = parseInt(value.replace(/[^0-9]/g, '')) || null;
        } else if (field === 'buildingTypes') {
          record[field] = value.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
        } else {
          record[field] = value;
        }
      }
    }

    // Generate ID if missing
    if (!record.id) {
      record.id = `lead_${Date.now()}_${i}`;
    }

    // Combine city/state into location if needed
    if (!record.location && (record.city || record.state)) {
      record.location = [record.city, record.state].filter(Boolean).join(', ');
    }

    records.push(record);
  }

  return records;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse employee count from various formats
 */
function parseEmployeeCount(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;

  const cleaned = String(value).replace(/[,+]/g, '');
  const parts = cleaned.split('-');
  return parseInt(parts[0]) || null;
}

/**
 * Detect duplicates in a set of leads
 * @param {Array} newLeads - New leads to check
 * @param {Array} existingLeads - Existing leads database
 * @returns {Object} { unique, duplicates }
 */
function detectDuplicates(newLeads, existingLeads) {
  const unique = [];
  const duplicates = [];

  // Build lookup set from existing leads
  const existingSet = new Set();
  for (const lead of existingLeads) {
    if (lead.firmName) {
      existingSet.add(normalizeForDedupe(lead.firmName));
    }
    if (lead.website) {
      existingSet.add(normalizeForDedupe(lead.website));
    }
  }

  // Also track within new batch
  const newBatchSet = new Set();

  for (const lead of newLeads) {
    const firmKey = lead.firmName ? normalizeForDedupe(lead.firmName) : null;
    const websiteKey = lead.website ? normalizeForDedupe(lead.website) : null;

    const isDuplicate =
      (firmKey && (existingSet.has(firmKey) || newBatchSet.has(firmKey))) ||
      (websiteKey && (existingSet.has(websiteKey) || newBatchSet.has(websiteKey)));

    if (isDuplicate) {
      duplicates.push(lead);
    } else {
      unique.push(lead);
      if (firmKey) newBatchSet.add(firmKey);
      if (websiteKey) newBatchSet.add(websiteKey);
    }
  }

  return { unique, duplicates };
}

/**
 * Normalize string for deduplication
 */
function normalizeForDedupe(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(www|http|https)/g, '');
}

/**
 * Identify enrichment gaps
 * @param {Array} leads - Leads to check
 * @returns {Object} Enrichment needs summary
 */
function identifyEnrichmentNeeds(leads) {
  const needs = {
    missingPrincipalEmail: [],
    missingPhone: [],
    missingPortfolioSF: [],
    missingBuildingTypes: [],
    total: 0
  };

  for (const lead of leads) {
    if (!lead.principalEmail) {
      needs.missingPrincipalEmail.push(lead.id || lead.firmName);
    }
    if (!lead.principalPhone) {
      needs.missingPhone.push(lead.id || lead.firmName);
    }
    if (!lead.portfolioSF) {
      needs.missingPortfolioSF.push(lead.id || lead.firmName);
    }
    if (!lead.buildingTypes || lead.buildingTypes.length === 0) {
      needs.missingBuildingTypes.push(lead.id || lead.firmName);
    }
  }

  needs.total = new Set([
    ...needs.missingPrincipalEmail,
    ...needs.missingPhone,
    ...needs.missingPortfolioSF,
    ...needs.missingBuildingTypes
  ]).size;

  return needs;
}

/**
 * Load existing leads database
 */
async function loadExistingLeads() {
  try {
    const data = await readFile(LEADS_DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.leads || [];
  } catch {
    return [];
  }
}

/**
 * Save leads to database
 */
async function saveLeads(leads) {
  const data = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    leads
  };
  await writeFile(LEADS_DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * Main lead ingestion function
 * @param {string} csvData - Raw CSV content
 * @param {Object} options - Ingestion options
 * @returns {Object} Ingestion results
 */
async function ingestLeads(csvData, options = {}) {
  const { dryRun = false, skipDuplicates = true, autoScore = true, autoMatch = true } = options;

  // Parse CSV
  const parsedLeads = parseCSV(csvData);

  if (parsedLeads.length === 0) {
    return {
      success: false,
      error: 'No valid leads found in CSV',
      summary: null
    };
  }

  // Load existing leads for duplicate detection
  const existingLeads = await loadExistingLeads();

  // Detect duplicates
  const { unique, duplicates } = skipDuplicates
    ? detectDuplicates(parsedLeads, existingLeads)
    : { unique: parsedLeads, duplicates: [] };

  // Score leads
  let scoredLeads = unique;
  if (autoScore) {
    scoredLeads = unique.map(lead => ({
      ...lead,
      scoring: scoreLead(lead),
      ingestedAt: new Date().toISOString()
    }));
  }

  // Match proofs
  if (autoMatch) {
    const proofCatalog = await loadProofCatalog();
    for (const lead of scoredLeads) {
      const matchResult = matchProofToLead({
        ...lead,
        buildingTypes: lead.buildingTypes || inferBuildingTypes(lead.serviceFocus)
      }, proofCatalog);

      lead.proofMatches = matchResult.matches.slice(0, 3);
      lead.proofGaps = matchResult.gaps;
      lead.hasProofMatch = matchResult.matches.length > 0;
    }
  }

  // Get tier summary
  const tierSummary = getTierSummary(scoredLeads);

  // Identify enrichment needs
  const enrichmentNeeds = identifyEnrichmentNeeds(scoredLeads);

  // Save if not dry run
  if (!dryRun && scoredLeads.length > 0) {
    const allLeads = [...existingLeads, ...scoredLeads];
    await saveLeads(allLeads);
  }

  return {
    success: true,
    summary: {
      total: parsedLeads.length,
      unique: unique.length,
      duplicates: duplicates.length,
      ...tierSummary,
      enrichmentNeeded: enrichmentNeeds.total
    },
    tierSummary,
    enrichmentNeeds: {
      missingPrincipalEmail: enrichmentNeeds.missingPrincipalEmail.length,
      missingPhone: enrichmentNeeds.missingPhone.length,
      missingPortfolioSF: enrichmentNeeds.missingPortfolioSF.length,
      missingBuildingTypes: enrichmentNeeds.missingBuildingTypes.length
    },
    preview: scoredLeads.slice(0, 10).map(l => ({
      firmName: l.firmName,
      tier: l.scoring?.tier,
      score: l.scoring?.score,
      wave: l.scoring?.waveAssignment,
      hasProof: l.hasProofMatch
    })),
    duplicatesList: duplicates.slice(0, 10).map(d => d.firmName),
    dryRun
  };
}

/**
 * Infer building types from service focus string
 */
function inferBuildingTypes(serviceFocus) {
  if (!serviceFocus) return [];

  const focus = serviceFocus.toLowerCase();
  const types = [];

  if (focus.includes('healthcare') || focus.includes('hospital') || focus.includes('medical')) {
    types.push('Healthcare');
  }
  if (focus.includes('education') || focus.includes('school') || focus.includes('university')) {
    types.push('Education');
  }
  if (focus.includes('commercial') || focus.includes('office')) {
    types.push('Commercial');
  }
  if (focus.includes('residential') || focus.includes('housing') || focus.includes('apartment')) {
    types.push('Residential');
  }
  if (focus.includes('industrial') || focus.includes('warehouse') || focus.includes('manufacturing')) {
    types.push('Industrial');
  }
  if (focus.includes('historic') || focus.includes('preservation') || focus.includes('renovation')) {
    types.push('Historic');
  }
  if (focus.includes('retail') || focus.includes('hospitality') || focus.includes('restaurant')) {
    types.push('Retail');
  }

  return types.length > 0 ? types : ['Commercial'];
}

/**
 * API handler for lead ingestion endpoint
 */
async function handleLeadIngest(req, body) {
  try {
    const { csvData, options = {} } = body;

    if (!csvData) {
      return {
        success: false,
        error: 'Missing csvData in request body'
      };
    }

    const result = await ingestLeads(csvData, options);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all leads with optional filtering
 */
async function getLeads(filters = {}) {
  const leads = await loadExistingLeads();

  let filtered = leads;

  if (filters.tier) {
    filtered = filtered.filter(l => l.scoring?.tier === filters.tier);
  }

  if (filters.wave) {
    filtered = filtered.filter(l => l.scoring?.waveAssignment === filters.wave);
  }

  if (filters.minScore) {
    filtered = filtered.filter(l => (l.scoring?.score || 0) >= filters.minScore);
  }

  if (filters.hasProof !== undefined) {
    filtered = filtered.filter(l => l.hasProofMatch === filters.hasProof);
  }

  return {
    leads: filtered,
    count: filtered.length,
    total: leads.length
  };
}

/**
 * Get a single lead by ID
 */
async function getLead(leadId) {
  const leads = await loadExistingLeads();
  return leads.find(l => l.id === leadId) || null;
}

/**
 * Update a lead
 */
async function updateLead(leadId, updates) {
  const leads = await loadExistingLeads();
  const index = leads.findIndex(l => l.id === leadId);

  if (index === -1) {
    return { success: false, error: 'Lead not found' };
  }

  // Re-score if relevant fields changed
  const needsRescore = ['portfolioSF', 'employees', 'enrRank', 'multiSitePortfolio', 'buildingTypes']
    .some(field => updates[field] !== undefined);

  leads[index] = {
    ...leads[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (needsRescore) {
    leads[index].scoring = scoreLead(leads[index]);
  }

  await saveLeads(leads);

  return { success: true, lead: leads[index] };
}

export {
  ingestLeads,
  parseCSV,
  detectDuplicates,
  identifyEnrichmentNeeds,
  handleLeadIngest,
  getLeads,
  getLead,
  updateLead,
  loadExistingLeads,
  saveLeads,
  COLUMN_MAPPING
};

export default {
  ingestLeads,
  parseCSV,
  detectDuplicates,
  identifyEnrichmentNeeds,
  handleLeadIngest,
  getLeads,
  getLead,
  updateLead,
  loadExistingLeads,
  saveLeads,
  COLUMN_MAPPING
};

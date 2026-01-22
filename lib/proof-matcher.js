/**
 * Proof Matcher - Match proof assets to leads based on relevance
 * Part of S2P Operations Council
 *
 * Relevance Scoring:
 * - Building type match: +30 points
 * - Scale match (within 0.5x-2x): +20 points
 * - Buyer persona match: +25 points
 * - Award match: +15 points
 * - LOD spec match: +10 points
 *
 * Returns top 5 matches with relevance >= 50
 * Also identifies proof gaps (building types without coverage)
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Relevance score weights
const SCORE_WEIGHTS = {
  buildingType: 30,      // Building type match
  scale: 20,             // Project scale similarity
  buyerPersona: 25,      // Buyer persona alignment
  award: 15,             // Award-winning project
  lodSpec: 10            // LOD specification match
};

// Minimum score to be considered a match
const MIN_MATCH_SCORE = 50;

// Maximum matches to return
const MAX_MATCHES = 5;

/**
 * Load proof catalog from file
 * @returns {Promise<Array>} Proof catalog array
 */
async function loadProofCatalog() {
  try {
    const catalogPath = join(__dirname, '../clients/s2p/memory/proof-catalog.json');
    const data = await readFile(catalogPath, 'utf-8');
    const catalog = JSON.parse(data);
    return catalog.proofs || catalog;
  } catch (error) {
    console.error('Failed to load proof catalog:', error.message);
    return [];
  }
}

/**
 * Calculate relevance score between a proof asset and a lead
 * @param {Object} asset - Proof asset
 * @param {Object} lead - Lead data
 * @returns {Object} { score, reasons }
 */
function calculateRelevance(asset, lead) {
  let score = 0;
  const reasons = [];

  // Building type match (+30 points)
  const leadBuildingTypes = lead.buildingTypes || [];
  const assetBuildingTypes = asset.buildingTypes || asset.building_types || [];

  const buildingTypeMatch = leadBuildingTypes.some(
    type => assetBuildingTypes.includes(type)
  );

  if (buildingTypeMatch) {
    score += SCORE_WEIGHTS.buildingType;
    const matchedTypes = leadBuildingTypes.filter(t => assetBuildingTypes.includes(t));
    reasons.push(`Building type match: ${matchedTypes.join(', ')}`);
  }

  // Scale match (+20 points)
  const leadSF = lead.portfolioSF || lead.sqft_estimate || 0;
  const assetSF = asset.projectSF || asset.sqft || 0;

  if (leadSF && assetSF) {
    const scaleSimilarity = assetSF / leadSF;
    if (scaleSimilarity >= 0.5 && scaleSimilarity <= 2.0) {
      score += SCORE_WEIGHTS.scale;
      reasons.push(`Similar project scale (${formatSF(assetSF)})`);
    } else if (scaleSimilarity >= 0.2 && scaleSimilarity <= 5.0) {
      // Partial credit for reasonable scale difference
      score += Math.round(SCORE_WEIGHTS.scale * 0.5);
      reasons.push(`Related project scale (${formatSF(assetSF)})`);
    }
  }

  // Buyer persona match (+25 points)
  if (lead.buyerPersona && asset.buyerPersonaFit) {
    const personaFit = Array.isArray(asset.buyerPersonaFit)
      ? asset.buyerPersonaFit
      : [asset.buyerPersonaFit];

    if (personaFit.includes(lead.buyerPersona)) {
      score += SCORE_WEIGHTS.buyerPersona;
      reasons.push(`Buyer persona alignment: ${lead.buyerPersona}`);
    }
  }

  // Award match (+15 points)
  if (lead.recentAwards && asset.awards && asset.awards.length > 0) {
    score += SCORE_WEIGHTS.award;
    reasons.push(`Award-winning: ${asset.awards[0]}`);
  }

  // LOD spec match (+10 points)
  const usesLodSpecs = lead.specLanguageAdoption === 'Uses_LOD_Specs' ||
                       lead.usesLodSpecs === true;
  if (usesLodSpecs && asset.lodLevel) {
    score += SCORE_WEIGHTS.lodSpec;
    reasons.push(`LOD ${asset.lodLevel} specification`);
  }

  // Bonus for exact deliverable match
  if (lead.deliverableNeeded && asset.deliverableType) {
    if (lead.deliverableNeeded === asset.deliverableType) {
      score += 5;
      reasons.push(`Exact deliverable match: ${asset.deliverableType}`);
    }
  }

  // Bonus for geographic proximity
  if (lead.location && asset.location) {
    const leadRegion = extractRegion(lead.location);
    const assetRegion = extractRegion(asset.location);
    if (leadRegion && leadRegion === assetRegion) {
      score += 5;
      reasons.push(`Same region: ${leadRegion}`);
    }
  }

  return { score, reasons };
}

/**
 * Extract region from location string
 */
function extractRegion(location) {
  if (!location) return null;
  const loc = location.toLowerCase();

  if (loc.includes('new york') || loc.includes('nyc') || loc.includes('ny')) return 'Northeast';
  if (loc.includes('boston') || loc.includes('ma')) return 'Northeast';
  if (loc.includes('washington') || loc.includes('dc')) return 'Mid-Atlantic';
  if (loc.includes('philadelphia') || loc.includes('pa')) return 'Mid-Atlantic';
  if (loc.includes('chicago') || loc.includes('il')) return 'Midwest';
  if (loc.includes('los angeles') || loc.includes('la') || loc.includes('ca')) return 'West';
  if (loc.includes('texas') || loc.includes('tx')) return 'Southwest';
  if (loc.includes('florida') || loc.includes('fl')) return 'Southeast';

  return null;
}

/**
 * Format square footage for display
 */
function formatSF(sf) {
  if (sf >= 1000000) return `${(sf / 1000000).toFixed(1)}M SF`;
  if (sf >= 1000) return `${(sf / 1000).toFixed(0)}k SF`;
  return `${sf} SF`;
}

/**
 * Match proof assets to a lead
 * @param {Object} lead - Lead data
 * @param {Array} proofCatalog - Array of proof assets
 * @returns {Object} { matches: ProofMatch[], gaps: string[] }
 */
function matchProofToLead(lead, proofCatalog) {
  const matches = [];

  for (const asset of proofCatalog) {
    const { score, reasons } = calculateRelevance(asset, lead);

    if (score >= MIN_MATCH_SCORE) {
      matches.push({
        assetId: asset.id,
        assetName: asset.name || asset.title,
        relevanceScore: score,
        matchReasons: reasons,
        thumbnail: asset.thumbnail_url || asset.thumbnail,
        snippet: asset.snippet || asset.description,
        lodLevel: asset.lodLevel || asset.lod_level,
        buildingTypes: asset.buildingTypes || asset.building_types
      });
    }
  }

  // Sort by relevance score descending
  matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Identify proof gaps
  const gaps = identifyGaps(lead, matches, proofCatalog);

  return {
    matches: matches.slice(0, MAX_MATCHES),
    gaps,
    totalMatches: matches.length,
    bestMatch: matches[0] || null
  };
}

/**
 * Identify proof gaps - building types and scales without coverage
 * @param {Object} lead - Lead data
 * @param {Array} matches - Matched proof assets
 * @param {Array} proofCatalog - Full proof catalog
 * @returns {Array} Array of gap descriptions
 */
function identifyGaps(lead, matches, proofCatalog) {
  const gaps = [];

  // Get building types covered by matches
  const coveredTypes = new Set(
    matches.flatMap(m => {
      const asset = proofCatalog.find(p => p.id === m.assetId);
      return asset?.buildingTypes || asset?.building_types || [];
    })
  );

  // Check for uncovered building types
  const leadTypes = lead.buildingTypes || [];
  for (const type of leadTypes) {
    if (!coveredTypes.has(type)) {
      gaps.push(`Need ${type} proof examples`);
    }
  }

  // Check for scale gaps
  const leadSF = lead.portfolioSF || lead.sqft_estimate || 0;
  if (leadSF > 200000) {
    const hasLargeScale = matches.some(m => {
      const asset = proofCatalog.find(p => p.id === m.assetId);
      const assetSF = asset?.projectSF || asset?.sqft || 0;
      return assetSF > 200000;
    });

    if (!hasLargeScale) {
      gaps.push('Need large-scale project examples (>200k SF)');
    }
  }

  // Check for LOD gaps
  if (lead.specLanguageAdoption === 'Uses_LOD_Specs' || lead.usesLodSpecs) {
    const hasLodProof = matches.some(m => {
      const asset = proofCatalog.find(p => p.id === m.assetId);
      return asset?.lodLevel || asset?.lod_level;
    });

    if (!hasLodProof) {
      gaps.push('Need LOD-spec compliant examples');
    }
  }

  // Check for award gaps
  if (lead.recentAwards) {
    const hasAwardedProof = matches.some(m => {
      const asset = proofCatalog.find(p => p.id === m.assetId);
      return asset?.awards && asset.awards.length > 0;
    });

    if (!hasAwardedProof) {
      gaps.push('Need award-winning project examples');
    }
  }

  return gaps;
}

/**
 * Generate copy-paste snippet for lead outreach
 * @param {Array} matches - Top matched proofs
 * @param {Object} lead - Lead data
 * @returns {string} Formatted snippet
 */
function generateSnippet(matches, lead) {
  if (!matches || matches.length === 0) {
    return '';
  }

  const topMatch = matches[0];
  const firmName = lead.firmName || lead.company || 'your team';

  let snippet = `Based on ${firmName}'s focus on `;

  if (lead.buildingTypes && lead.buildingTypes.length > 0) {
    snippet += lead.buildingTypes.slice(0, 2).join(' and ');
  } else {
    snippet += 'commercial projects';
  }

  snippet += `, I wanted to share our ${topMatch.assetName} case study`;

  if (topMatch.lodLevel) {
    snippet += ` (LOD ${topMatch.lodLevel})`;
  }

  snippet += '.';

  if (matches.length > 1) {
    snippet += ` We also have relevant examples in ${matches.slice(1, 3).map(m => m.assetName).join(' and ')}.`;
  }

  return snippet;
}

/**
 * Get proof attachments for outreach
 * @param {Array} matches - Matched proofs
 * @param {Array} proofCatalog - Full catalog
 * @returns {Array} Attachment file paths
 */
function getAttachments(matches, proofCatalog) {
  const attachments = [];

  for (const match of matches.slice(0, 3)) {
    const asset = proofCatalog.find(p => p.id === match.assetId);
    if (asset?.attachmentPath || asset?.pdf_url) {
      attachments.push(asset.attachmentPath || asset.pdf_url);
    }
  }

  return attachments;
}

/**
 * Run Proof Matcher agent (for Operations Council integration)
 * @param {Object} lead - Lead data
 * @param {Object} scoring - Lead scoring results (optional)
 * @param {Object} options - Options
 * @returns {Object} Matcher results
 */
async function runProofMatcher(lead, scoring = {}, options = {}) {
  const proofCatalog = options.proofCatalog || await loadProofCatalog();

  const result = matchProofToLead(lead, proofCatalog);
  const snippet = generateSnippet(result.matches, lead);
  const attachments = getAttachments(result.matches, proofCatalog);

  return {
    agentId: 'proof-matcher',
    model: 'local',
    matches: result.matches,
    gaps: result.gaps,
    totalMatches: result.totalMatches,
    bestMatch: result.bestMatch,
    snippet,
    attachments,
    hasGaps: result.gaps.length > 0,
    timestamp: new Date().toISOString()
  };
}

export {
  matchProofToLead,
  calculateRelevance,
  identifyGaps,
  generateSnippet,
  getAttachments,
  loadProofCatalog,
  runProofMatcher,
  SCORE_WEIGHTS,
  MIN_MATCH_SCORE,
  MAX_MATCHES
};

export default {
  matchProofToLead,
  calculateRelevance,
  identifyGaps,
  generateSnippet,
  getAttachments,
  loadProofCatalog,
  runProofMatcher,
  SCORE_WEIGHTS,
  MIN_MATCH_SCORE,
  MAX_MATCHES
};

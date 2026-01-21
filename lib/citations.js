/**
 * Citation Parser & Verification System
 *
 * Moves SuperChase from "Model-Memory" to "Inference-Time Evidence"
 * Every claim must have a citation with source URL and confidence score.
 *
 * @module lib/citations
 */

import { createLogger } from './logger.js';

const logger = createLogger({ module: 'citations' });

/**
 * Citation confidence thresholds
 */
export const CONFIDENCE = {
  HIGH: 0.9,      // Direct quote from source
  MEDIUM: 0.7,    // Paraphrased from source
  LOW: 0.5,       // Inferred from source
  UNVERIFIED: 0   // No source found
};

/**
 * Citation types
 */
export const CITATION_TYPES = {
  SITEMAP: 'sitemap',           // From sitemap.xml crawl
  WEBPAGE: 'webpage',           // From specific page content
  API: 'api',                   // From API response
  DOCUMENT: 'document',         // From PDF/doc
  SOCIAL: 'social',             // From social media
  DATABASE: 'database',         // From structured database
  INTERNAL: 'internal',         // From SuperChase memory
  INFERRED: 'inferred'          // AI inference (lowest confidence)
};

/**
 * Generate unique citation ID
 * @returns {string}
 */
export function generateCitationId() {
  return `src_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Create a citation object
 * @param {Object} params
 * @returns {Object}
 */
export function createCitation({
  text,
  url = null,
  type = CITATION_TYPES.INFERRED,
  confidence = CONFIDENCE.UNVERIFIED,
  metadata = {},
  timestamp = new Date().toISOString()
}) {
  return {
    id: generateCitationId(),
    text: text?.slice(0, 500) || '',  // Limit snippet length
    url,
    type,
    confidence,
    verified: confidence >= CONFIDENCE.MEDIUM,
    timestamp,
    metadata
  };
}

/**
 * Parse citations from agent response
 * Extracts [Source X] references and builds citation array
 *
 * @param {string} text - Agent response text
 * @param {Object[]} rawSources - Raw source data from research
 * @returns {Object} { cleanText, citations }
 */
export function parseCitations(text, rawSources = []) {
  const citations = [];
  const sourceMap = new Map();

  // Build source map from raw sources
  rawSources.forEach((source, idx) => {
    const id = generateCitationId();
    sourceMap.set(idx + 1, {
      ...source,
      id
    });
    citations.push(createCitation({
      text: source.snippet || source.text || '',
      url: source.url,
      type: source.type || CITATION_TYPES.WEBPAGE,
      confidence: source.confidence || CONFIDENCE.MEDIUM,
      metadata: source.metadata || {}
    }));
  });

  // Replace [Source X] references with citation IDs
  let cleanText = text;
  const sourceRefPattern = /\[Source\s*(\d+)\]/gi;
  const matches = [...text.matchAll(sourceRefPattern)];

  matches.forEach(match => {
    const sourceNum = parseInt(match[1], 10);
    const source = sourceMap.get(sourceNum);
    if (source) {
      cleanText = cleanText.replace(match[0], `[${source.id}]`);
    }
  });

  return { cleanText, citations };
}

/**
 * Verify a citation by re-fetching the source
 * @param {Object} citation
 * @returns {Promise<Object>}
 */
export async function verifyCitation(citation) {
  if (!citation.url) {
    return {
      ...citation,
      verified: false,
      verificationError: 'No URL provided'
    };
  }

  try {
    const response = await fetch(citation.url, {
      method: 'GET',
      headers: { 'User-Agent': 'SuperChase-Verifier/1.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return {
        ...citation,
        verified: false,
        verificationError: `HTTP ${response.status}`
      };
    }

    const content = await response.text();

    // Check if cited text appears in source
    const citedTextNormalized = citation.text.toLowerCase().replace(/\s+/g, ' ').trim();
    const contentNormalized = content.toLowerCase().replace(/\s+/g, ' ');

    // Fuzzy match - check if key phrases appear
    const keyPhrases = citedTextNormalized.split(/[.!?]/).filter(p => p.length > 20);
    const matchCount = keyPhrases.filter(phrase =>
      contentNormalized.includes(phrase.trim())
    ).length;

    const matchRatio = keyPhrases.length > 0 ? matchCount / keyPhrases.length : 0;

    return {
      ...citation,
      verified: matchRatio > 0.3,
      verificationScore: matchRatio,
      verificationTimestamp: new Date().toISOString()
    };
  } catch (e) {
    logger.warn('Citation verification failed', { url: citation.url, error: e.message });
    return {
      ...citation,
      verified: false,
      verificationError: e.message
    };
  }
}

/**
 * Build citation requirements prompt for agents
 * @param {string} agentRole
 * @returns {string}
 */
export function getCitationPromptRequirements(agentRole = 'researcher') {
  return `
**CITATION REQUIREMENTS (MANDATORY):**

Every factual claim MUST include a citation. Use this format:

For each claim, provide a "sources" array in your JSON output:
{
  "sources": [
    {
      "id": 1,
      "text": "Exact quote or close paraphrase from source",
      "url": "https://source-url.com/page",
      "type": "webpage|sitemap|api|document",
      "confidence": 0.9,
      "metadata": {
        "selector": "CSS selector if applicable",
        "crawledAt": "ISO timestamp"
      }
    }
  ]
}

**Confidence Levels:**
- 0.9+ HIGH: Direct quote, exact data
- 0.7-0.9 MEDIUM: Paraphrased, inferred from clear source
- 0.5-0.7 LOW: Weak inference, partial match
- <0.5 UNVERIFIED: No clear source (AVOID)

**Rules:**
1. If you cannot cite a source, mark confidence as LOW and note "inferred"
2. Sitemap data must include crawl timestamp
3. Competitor claims must link to their actual page
4. Internal SuperChase data should cite the memory file path

Claims without citations will be flagged as "unverified" in the final output.
`;
}

/**
 * Extract and validate citations from agent JSON response
 * @param {Object} agentResponse - Parsed JSON from agent
 * @returns {Object[]} Validated citations
 */
export function extractCitations(agentResponse) {
  const citations = [];

  // Extract from sources array if present
  if (agentResponse.sources && Array.isArray(agentResponse.sources)) {
    agentResponse.sources.forEach(source => {
      citations.push(createCitation({
        text: source.text || source.snippet || '',
        url: source.url,
        type: source.type || CITATION_TYPES.WEBPAGE,
        confidence: source.confidence || CONFIDENCE.MEDIUM,
        metadata: source.metadata || {}
      }));
    });
  }

  // Extract from nested objects (competitors, keywords, etc.)
  const extractFromObject = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return;

    if (obj.source || obj.sourceUrl || obj.citation) {
      citations.push(createCitation({
        text: obj.source || obj.citation || '',
        url: obj.sourceUrl || obj.url,
        type: CITATION_TYPES.WEBPAGE,
        confidence: obj.confidence || CONFIDENCE.MEDIUM,
        metadata: { path }
      }));
    }

    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => extractFromObject(item, `${path}[${idx}]`));
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        if (key !== 'sources' && typeof value === 'object') {
          extractFromObject(value, path ? `${path}.${key}` : key);
        }
      });
    }
  };

  extractFromObject(agentResponse);

  return citations;
}

/**
 * Calculate overall citation quality score
 * @param {Object[]} citations
 * @returns {Object}
 */
export function calculateCitationQuality(citations) {
  if (!citations || citations.length === 0) {
    return {
      score: 0,
      grade: 'F',
      verified: 0,
      unverified: 0,
      avgConfidence: 0,
      warnings: ['No citations provided']
    };
  }

  const verified = citations.filter(c => c.verified).length;
  const avgConfidence = citations.reduce((sum, c) => sum + (c.confidence || 0), 0) / citations.length;

  const score = (verified / citations.length) * 0.6 + avgConfidence * 0.4;

  let grade;
  if (score >= 0.9) grade = 'A';
  else if (score >= 0.8) grade = 'B';
  else if (score >= 0.7) grade = 'C';
  else if (score >= 0.6) grade = 'D';
  else grade = 'F';

  const warnings = [];
  if (verified < citations.length * 0.5) {
    warnings.push('Less than 50% of citations are verified');
  }
  if (avgConfidence < CONFIDENCE.MEDIUM) {
    warnings.push('Average confidence below threshold');
  }

  return {
    score: Math.round(score * 100) / 100,
    grade,
    verified,
    unverified: citations.length - verified,
    total: citations.length,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    warnings
  };
}

/**
 * Format citations for display
 * @param {Object[]} citations
 * @returns {string}
 */
export function formatCitationsForDisplay(citations) {
  if (!citations || citations.length === 0) {
    return 'No citations available.';
  }

  return citations.map((c, idx) => {
    const status = c.verified ? '✓' : '⚠';
    const confidence = Math.round((c.confidence || 0) * 100);
    return `[${c.id}] ${status} (${confidence}%) ${c.text.slice(0, 100)}...
   └─ ${c.url || 'No URL'} (${c.type})`;
  }).join('\n\n');
}

/**
 * Create citation trace for observability
 * @param {string} traceId - Parent trace ID
 * @param {Object[]} citations
 * @returns {Object}
 */
export function createCitationTrace(traceId, citations) {
  const quality = calculateCitationQuality(citations);

  return {
    traceId,
    timestamp: new Date().toISOString(),
    citationCount: citations.length,
    quality,
    citations: citations.map(c => ({
      id: c.id,
      type: c.type,
      confidence: c.confidence,
      verified: c.verified,
      url: c.url
    }))
  };
}

export default {
  CONFIDENCE,
  CITATION_TYPES,
  generateCitationId,
  createCitation,
  parseCitations,
  verifyCitation,
  getCitationPromptRequirements,
  extractCitations,
  calculateCitationQuality,
  formatCitationsForDisplay,
  createCitationTrace
};

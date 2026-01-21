/**
 * Discovery Spoke
 *
 * Handles document-based business discovery:
 * - File uploads
 * - AI-powered extraction
 * - Dynamic questions based on gaps
 * - Data commitment to business configs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
  unlinkSync
} from 'fs';
import { createLogger } from '../../lib/logger.js';
import { parseDocument, isSupported, getSupportedTypes } from '../../lib/document-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

dotenv.config({ path: join(ROOT_DIR, '.env') });

const logger = createLogger({ module: 'discovery' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CLIENTS_DIR = join(ROOT_DIR, 'clients');

/**
 * Discovery question categories
 */
const QUESTION_CATEGORIES = {
  financial: {
    label: 'Financial & Pipeline',
    questions: [
      { id: 'revenue_target', label: 'Annual revenue target', type: 'currency', required: true },
      { id: 'gross_margin', label: 'Gross margin percentage', type: 'percentage' },
      { id: 'average_sale_price', label: 'Average sale price', type: 'currency' },
      { id: 'pipeline_value', label: 'Current pipeline value', type: 'currency' },
    ],
  },
  competitive: {
    label: 'Competitive Landscape',
    questions: [
      { id: 'competitors', label: 'Main competitors', type: 'list' },
      { id: 'differentiators', label: 'Key differentiators', type: 'textarea' },
      { id: 'turnaround_time', label: 'Typical turnaround time', type: 'text' },
    ],
  },
  services: {
    label: 'Service Offerings',
    questions: [
      { id: 'service_tiers', label: 'Service tiers/packages', type: 'list' },
      { id: 'pricing_model', label: 'Pricing model', type: 'select', options: ['Project-based', 'Hourly', 'Retainer', 'Subscription'] },
      { id: 'risk_multiplier', label: 'Risk/complexity multiplier', type: 'percentage' },
    ],
  },
  market: {
    label: 'Target Market',
    questions: [
      { id: 'target_personas', label: 'Target customer personas', type: 'list' },
      { id: 'geography', label: 'Target geography', type: 'text' },
      { id: 'verticals', label: 'Industry verticals', type: 'list' },
    ],
  },
  marketing: {
    label: 'Marketing & Content',
    questions: [
      { id: 'content_capacity', label: 'Weekly content capacity', type: 'select', options: ['1 piece', '2-3 pieces', '4-5 pieces', '6+ pieces'] },
      { id: 'marketing_budget', label: 'Monthly marketing budget', type: 'currency' },
      { id: 'channels', label: 'Active marketing channels', type: 'list' },
    ],
  },
  operations: {
    label: 'Operations',
    questions: [
      { id: 'crm_system', label: 'CRM system', type: 'text' },
      { id: 'team_size', label: 'Team size', type: 'number' },
      { id: 'monthly_capacity', label: 'Monthly project capacity', type: 'number' },
    ],
  },
};

/**
 * Ensure discovery directories exist for a business
 * @param {string} businessId - The business ID
 */
function ensureDiscoveryDirs(businessId) {
  const clientDir = join(CLIENTS_DIR, businessId);
  const discoveryDir = join(clientDir, 'discovery');
  const uploadsDir = join(discoveryDir, 'uploads');

  if (!existsSync(clientDir)) mkdirSync(clientDir, { recursive: true });
  if (!existsSync(discoveryDir)) mkdirSync(discoveryDir, { recursive: true });
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  return { clientDir, discoveryDir, uploadsDir };
}

/**
 * Handle file upload for discovery
 * @param {string} businessId - The business ID
 * @param {Array} files - Array of uploaded files
 * @returns {Promise<object>} - Upload result
 */
export async function handleUpload(businessId, files) {
  const { uploadsDir } = ensureDiscoveryDirs(businessId);

  logger.info('Processing uploads', { businessId, fileCount: files.length });

  const uploaded = [];
  const errors = [];

  for (const file of files) {
    const filename = file.originalFilename || file.name || basename(file.filepath || file.path);

    if (!isSupported(filename)) {
      errors.push({
        filename,
        error: `Unsupported file type. Supported: ${getSupportedTypes().join(', ')}`,
      });
      continue;
    }

    try {
      const destPath = join(uploadsDir, filename);
      const sourcePath = file.filepath || file.path;

      // Copy file to uploads directory
      copyFileSync(sourcePath, destPath);

      // Parse the document
      const parsed = await parseDocument(destPath);

      uploaded.push({
        filename,
        path: destPath,
        type: parsed.structure.type,
        metadata: parsed.metadata,
        textLength: parsed.text.length,
      });

      // Clean up temp file if exists
      if (sourcePath !== destPath && existsSync(sourcePath)) {
        unlinkSync(sourcePath);
      }
    } catch (error) {
      logger.error('File upload error', { filename, error: error.message });
      errors.push({ filename, error: error.message });
    }
  }

  // Update status file
  const statusPath = join(ensureDiscoveryDirs(businessId).discoveryDir, 'status.json');
  const status = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf-8')) : {};
  status.phase = 'UPLOADED';
  status.uploads = uploaded;
  status.uploadedAt = new Date().toISOString();
  writeFileSync(statusPath, JSON.stringify(status, null, 2));

  return {
    success: uploaded.length > 0,
    uploaded,
    errors,
    totalUploaded: uploaded.length,
    totalErrors: errors.length,
  };
}

/**
 * Extract structured data from uploaded documents using AI
 * @param {string} businessId - The business ID
 * @returns {Promise<object>} - Extraction result
 */
export async function handleExtraction(businessId) {
  const { discoveryDir, uploadsDir } = ensureDiscoveryDirs(businessId);

  logger.info('Starting extraction', { businessId });

  // Get uploaded files
  const files = readdirSync(uploadsDir).filter(f => isSupported(f));

  if (files.length === 0) {
    return {
      success: false,
      error: 'No files to extract from. Please upload documents first.',
    };
  }

  // Parse all documents
  const documents = [];
  for (const file of files) {
    try {
      const parsed = await parseDocument(join(uploadsDir, file));
      documents.push({
        filename: file,
        ...parsed,
      });
    } catch (error) {
      logger.warn('Failed to parse document', { file, error: error.message });
    }
  }

  // Build extraction prompt
  const documentContext = documents.map(d =>
    `=== Document: ${d.filename} ===\n${d.text.substring(0, 8000)}`
  ).join('\n\n');

  const extractionSchema = Object.entries(QUESTION_CATEGORIES).flatMap(([category, cat]) =>
    cat.questions.map(q => ({ category, ...q }))
  );

  const prompt = `You are analyzing business documents to extract structured data.

## Documents
${documentContext}

## Required Fields
Extract the following fields if found in the documents. Return JSON only.

${JSON.stringify(extractionSchema, null, 2)}

## Response Format
Return a JSON object with:
{
  "fields": [
    {
      "key": "field_id",
      "value": "extracted value or best guess",
      "confidence": 0.0-1.0,
      "source": "exact quote or description of where this was found",
      "document": "filename where found"
    }
  ],
  "gaps": ["field_id1", "field_id2"],
  "summary": "Brief summary of what these documents describe"
}

Be thorough but only include fields you can reasonably infer from the text. Mark confidence appropriately:
- 0.95+ = explicitly stated
- 0.80+ = strongly implied
- 0.60+ = reasonable inference
- Below 0.60 = don't include, add to gaps instead

Return ONLY valid JSON, no markdown formatting.`;

  try {
    // Call OpenRouter API for extraction
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://superchase.dev',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Save extraction results
    const extractedPath = join(discoveryDir, 'extracted.json');
    writeFileSync(extractedPath, JSON.stringify({
      ...extracted,
      extractedAt: new Date().toISOString(),
      documentsProcessed: files.length,
    }, null, 2));

    // Update status
    const statusPath = join(discoveryDir, 'status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.phase = 'EXTRACTED';
    status.extractedAt = new Date().toISOString();
    status.fieldsExtracted = extracted.fields.length;
    status.gapsIdentified = extracted.gaps.length;
    writeFileSync(statusPath, JSON.stringify(status, null, 2));

    logger.info('Extraction complete', {
      businessId,
      fieldsExtracted: extracted.fields.length,
      gapsIdentified: extracted.gaps.length,
    });

    return {
      success: true,
      fields: extracted.fields,
      gaps: extracted.gaps,
      summary: extracted.summary,
      documentsProcessed: files.length,
    };
  } catch (error) {
    logger.error('Extraction failed', { businessId, error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get discovery questions based on gaps
 * @param {string} businessId - The business ID
 * @returns {object} - Questions organized by category
 */
export function getDiscoveryQuestions(businessId) {
  const { discoveryDir } = ensureDiscoveryDirs(businessId);
  const extractedPath = join(discoveryDir, 'extracted.json');

  // Load extracted data if exists
  let extracted = { fields: [], gaps: [] };
  if (existsSync(extractedPath)) {
    extracted = JSON.parse(readFileSync(extractedPath, 'utf-8'));
  }

  // Build questions, marking which are pre-filled and which are gaps
  const extractedKeys = new Set(extracted.fields.map(f => f.key));
  const gapKeys = new Set(extracted.gaps || []);

  const questions = {};
  for (const [categoryId, category] of Object.entries(QUESTION_CATEGORIES)) {
    questions[categoryId] = {
      label: category.label,
      questions: category.questions.map(q => {
        const extractedField = extracted.fields.find(f => f.key === q.id);

        return {
          ...q,
          status: extractedField ? 'extracted' : (gapKeys.has(q.id) ? 'gap' : 'missing'),
          extractedValue: extractedField?.value || null,
          confidence: extractedField?.confidence || null,
          source: extractedField?.source || null,
        };
      }),
    };
  }

  return {
    businessId,
    questions,
    extractedCount: extractedKeys.size,
    gapCount: gapKeys.size,
    totalQuestions: Object.values(QUESTION_CATEGORIES).reduce(
      (sum, cat) => sum + cat.questions.length, 0
    ),
  };
}

/**
 * Save user answers for discovery questions
 * @param {string} businessId - The business ID
 * @param {object} answers - User-provided answers
 * @returns {object} - Save result
 */
export function saveAnswers(businessId, answers) {
  const { discoveryDir } = ensureDiscoveryDirs(businessId);
  const answersPath = join(discoveryDir, 'answers.json');

  logger.info('Saving answers', { businessId, answerCount: Object.keys(answers).length });

  // Merge with existing answers if any
  let existing = {};
  if (existsSync(answersPath)) {
    existing = JSON.parse(readFileSync(answersPath, 'utf-8'));
  }

  const merged = {
    ...existing,
    ...answers,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(answersPath, JSON.stringify(merged, null, 2));

  // Update status
  const statusPath = join(discoveryDir, 'status.json');
  if (existsSync(statusPath)) {
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.phase = 'ANSWERED';
    status.answeredAt = new Date().toISOString();
    status.answerCount = Object.keys(merged).length;
    writeFileSync(statusPath, JSON.stringify(status, null, 2));
  }

  return {
    success: true,
    saved: Object.keys(merged).length,
  };
}

/**
 * Commit discovery data to business configs
 * @param {string} businessId - The business ID
 * @returns {Promise<object>} - Commit result
 */
export async function commitDiscovery(businessId) {
  const { clientDir, discoveryDir } = ensureDiscoveryDirs(businessId);

  logger.info('Committing discovery', { businessId });

  // Load extracted and answered data
  const extractedPath = join(discoveryDir, 'extracted.json');
  const answersPath = join(discoveryDir, 'answers.json');

  const extracted = existsSync(extractedPath)
    ? JSON.parse(readFileSync(extractedPath, 'utf-8'))
    : { fields: [] };

  const answers = existsSync(answersPath)
    ? JSON.parse(readFileSync(answersPath, 'utf-8'))
    : {};

  // Build combined data map
  const dataMap = {};

  // Add extracted fields
  for (const field of extracted.fields) {
    dataMap[field.key] = field.value;
  }

  // Override with user answers
  for (const [key, value] of Object.entries(answers)) {
    if (key !== 'updatedAt') {
      dataMap[key] = value;
    }
  }

  // Files modified
  const filesModified = [];

  // Update config.json
  const configPath = join(clientDir, 'config.json');
  let config = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf-8'))
    : { id: businessId };

  // Map data to config fields
  if (dataMap.revenue_target) config.revenueTarget = dataMap.revenue_target;
  if (dataMap.gross_margin) config.grossMargin = dataMap.gross_margin;
  if (dataMap.average_sale_price) config.averageSalePrice = dataMap.average_sale_price;
  if (dataMap.pricing_model) config.pricingModel = dataMap.pricing_model;
  if (dataMap.crm_system) config.crmSystem = dataMap.crm_system;
  if (dataMap.team_size) config.teamSize = dataMap.team_size;
  if (dataMap.monthly_capacity) config.monthlyCapacity = dataMap.monthly_capacity;
  if (dataMap.geography) config.geography = dataMap.geography;
  if (dataMap.turnaround_time) config.turnaroundTime = dataMap.turnaround_time;

  config.updatedAt = new Date().toISOString();
  config.discoveryCompleted = true;

  writeFileSync(configPath, JSON.stringify(config, null, 2));
  filesModified.push('config.json');

  // Update gst.json
  const gstPath = join(clientDir, 'gst.json');
  let gst = existsSync(gstPath)
    ? JSON.parse(readFileSync(gstPath, 'utf-8'))
    : { businessId, goals: [], strategies: [], tactics: [] };

  // Add financial goal if revenue target exists
  if (dataMap.revenue_target && !gst.goals?.some(g => g.metric === 'revenue')) {
    gst.goals = gst.goals || [];
    gst.goals.push({
      id: `goal_${businessId}_revenue`,
      title: 'Revenue Target',
      metric: 'revenue',
      target: dataMap.revenue_target,
      current: dataMap.pipeline_value || 0,
      status: 'in_progress',
      deadline: `${new Date().getFullYear()}-12-31`,
      createdAt: new Date().toISOString(),
    });
  }

  gst.updatedAt = new Date().toISOString();
  writeFileSync(gstPath, JSON.stringify(gst, null, 2));
  filesModified.push('gst.json');

  // Update brand.json
  const brandPath = join(clientDir, 'brand.json');
  let brand = existsSync(brandPath)
    ? JSON.parse(readFileSync(brandPath, 'utf-8'))
    : { businessId };

  if (dataMap.differentiators) brand.differentiators = dataMap.differentiators;
  if (dataMap.competitors) brand.competitors = Array.isArray(dataMap.competitors)
    ? dataMap.competitors
    : dataMap.competitors.split(',').map(c => c.trim());
  if (dataMap.target_personas) brand.targetPersonas = dataMap.target_personas;
  if (dataMap.verticals) brand.verticals = dataMap.verticals;
  if (dataMap.channels) brand.channels = dataMap.channels;

  brand.updatedAt = new Date().toISOString();
  writeFileSync(brandPath, JSON.stringify(brand, null, 2));
  filesModified.push('brand.json');

  // Update status
  const statusPath = join(discoveryDir, 'status.json');
  const status = existsSync(statusPath)
    ? JSON.parse(readFileSync(statusPath, 'utf-8'))
    : {};
  status.phase = 'COMMITTED';
  status.committedAt = new Date().toISOString();
  status.filesModified = filesModified;
  writeFileSync(statusPath, JSON.stringify(status, null, 2));

  logger.info('Discovery committed', { businessId, filesModified });

  return {
    success: true,
    businessId,
    filesModified,
    dataCommitted: Object.keys(dataMap).length,
  };
}

/**
 * Get current discovery status for a business
 * @param {string} businessId - The business ID
 * @returns {object} - Status object
 */
export function getDiscoveryStatus(businessId) {
  const { discoveryDir, uploadsDir } = ensureDiscoveryDirs(businessId);
  const statusPath = join(discoveryDir, 'status.json');

  let status = {
    phase: 'INIT',
    businessId,
  };

  if (existsSync(statusPath)) {
    status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  }

  // Count uploads
  const uploads = existsSync(uploadsDir)
    ? readdirSync(uploadsDir).filter(f => isSupported(f))
    : [];

  return {
    ...status,
    uploadCount: uploads.length,
    uploads: uploads.map(f => ({ filename: f })),
    phases: ['INIT', 'UPLOADED', 'EXTRACTED', 'ANSWERED', 'COMMITTED'],
    currentPhaseIndex: ['INIT', 'UPLOADED', 'EXTRACTED', 'ANSWERED', 'COMMITTED'].indexOf(status.phase),
  };
}

export default {
  handleUpload,
  handleExtraction,
  getDiscoveryQuestions,
  saveAnswers,
  commitDiscovery,
  getDiscoveryStatus,
  QUESTION_CATEGORIES,
};

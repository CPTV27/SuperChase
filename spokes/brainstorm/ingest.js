#!/usr/bin/env node
/**
 * Brainstorm Spoke - SuperChase v2.1 Ideation Ingest
 *
 * Aligned with .claude/skills/brainstorm-ingest/SKILL.md
 * 
 * Features:
 * - Ingests conversation transcripts from Limitless/Google Docs
 * - Categorizes ideas: Infrastructure, Marketing, Client Experience, R&D
 * - Flags strategic matches against market research unmet needs
 * - Uses v2.1 logging, caching, and error handling
 * 
 * Safety: Does NOT auto-execute ideas. Flags for human review only.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// v2.1 Infrastructure imports
import { createLogger } from '../../lib/logger.js';
import { SimpleCache } from '../../lib/cache.js';
import { AppError, ExternalServiceError, withFallback } from '../../lib/errors.js';

const logger = createLogger({ spoke: 'brainstorm' });
const brainstormCache = new SimpleCache({ defaultTTL: 60 * 60 * 1000 }); // 1 hour

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const PATHS = {
  memoryDir: join(__dirname, '..', '..', 'memory', 'brainstorms'),
  manifest: join(__dirname, '..', '..', 'manifest.jsonl'),
  marketResearch: join(__dirname, '..', '..', 'manual', 'docs', 'market-research.md')
};

// Category definitions from SKILL.md
const CATEGORIES = {
  INFRASTRUCTURE: ['api', 'server', 'database', 'deploy', 'ci/cd', 'railway', 'automation', 'script', 'refactor', 'architecture'],
  MARKETING: ['content', 'social', 'brand', 'campaign', 'video', 'tiktok', 'linkedin', 'lead gen', 'seo', 'purist', 'town media'],
  CLIENT_EXPERIENCE: ['portal', 'onboard', 'proposal', 'deliverable', 'communication', 'feedback', 'ux', 'client'],
  RD: ['ai', 'agent', 'experiment', 'prototype', 'research', 'future', 'cross-business', 'synergy', 'new product']
};

/**
 * Generate content hash for deduplication
 * @param {string} content 
 * @returns {string}
 */
function generateHash(content) {
  return createHash('sha256').update(content.trim().toLowerCase()).digest('hex').slice(0, 16);
}

/**
 * Categorize an idea based on keywords
 * @param {string} text 
 * @returns {string}
 */
function categorizeIdea(text) {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category.replace('_', ' ');
      }
    }
  }

  return 'R&D'; // Default category for uncategorized ideas
}

/**
 * Check if idea matches any unmet needs in market research
 * @param {string} ideaText 
 * @returns {{matched: boolean, need?: string}}
 */
function checkStrategicMatch(ideaText) {
  if (!existsSync(PATHS.marketResearch)) {
    return { matched: false };
  }

  try {
    const marketResearch = readFileSync(PATHS.marketResearch, 'utf8');
    const needsMatch = marketResearch.match(/unmet-need-\d+:\s*([^\n]+)/gi);

    if (needsMatch) {
      const ideaLower = ideaText.toLowerCase();
      for (const need of needsMatch) {
        const needText = need.split(':')[1]?.trim().toLowerCase() || '';
        // Simple keyword overlap check
        const needWords = needText.split(/\s+/);
        const matches = needWords.filter(word => word.length > 4 && ideaLower.includes(word));

        if (matches.length >= 2) {
          return { matched: true, need };
        }
      }
    }
  } catch (error) {
    logger.warn('Could not check market research', { error: error.message });
  }

  return { matched: false };
}

/**
 * Process a single brainstorm entry (from Google Doc or direct input)
 * Aligned with SKILL.md workflow
 * 
 * @param {string} content - Raw brainstorm content
 * @param {Object} options
 * @param {string} [options.source='Manual Input'] - Source of the content
 * @param {boolean} [options.dryRun=false] - If true, don't write to manifest
 * @returns {Promise<{status: string, traceId: string, entry?: Object}>}
 */
export async function processBrainstorm(content, options = {}) {
  const { source = 'Manual Input', dryRun = false } = options;
  const traceId = `bs-${Date.now().toString(36)}`;

  const startTime = Date.now();
  logger.info('Processing brainstorm entry', { traceId, source });

  try {
    // 1. Deduplication Check (using v2.1 cache)
    const contentHash = generateHash(content);
    if (brainstormCache.get(contentHash)) {
      logger.info('Duplicate brainstorm entry detected. Skipping.', { traceId });
      return { status: 'skipped', reason: 'duplicate', traceId };
    }

    // 2. Categorize the idea
    const category = categorizeIdea(content);

    // 3. Check for strategic match
    const strategicMatch = checkStrategicMatch(content);

    // 4. Build the manifest entry
    const entry = {
      id: `idea-${new Date().toISOString().split('T')[0]}-${traceId}`,
      type: strategicMatch.matched ? 'STRATEGIC_MATCH' : 'IDEA',
      title: content.substring(0, 100).replace(/\n/g, ' ').trim() + (content.length > 100 ? '...' : ''),
      category,
      source,
      ...(strategicMatch.matched && { matchedNeed: strategicMatch.need }),
      ...(strategicMatch.matched && { priority: 4 }),
      timestamp: new Date().toISOString(),
      status: 'PENDING_CATEGORIZATION',
      agent: 'The Scout',
      traceId
    };

    // 5. Write to manifest (unless dry run)
    if (!dryRun) {
      appendFileSync(PATHS.manifest, JSON.stringify(entry) + '\n');
      logger.info('Entry written to manifest', { traceId, type: entry.type, category });
    }

    // 6. Update deduplication cache (1 hour TTL)
    brainstormCache.set(contentHash, true);

    const duration = Date.now() - startTime;
    logger.info('Brainstorm processed successfully', { traceId, duration, type: entry.type });

    return {
      status: 'success',
      traceId,
      entry,
      strategicMatch: strategicMatch.matched
    };

  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Brainstorm ingest failed', { error: err.message, traceId, duration });
    throw new AppError('Failed to process brainstorm note', 500, 'BRAINSTORM_INGEST_ERROR', {
      cause: err.message,
      traceId
    });
  }
}

/**
 * Extract insights from transcript using Gemini (enhanced with v2.1 error handling)
 */
async function analyzeTranscript(text, filename) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'NEEDS_VALUE') {
    throw new ExternalServiceError('Gemini', 'API key not configured');
  }

  const prompt = `You are analyzing a conversation transcript for an executive assistant system.

Extract the following from this transcript:

1. **Action Items**: Tasks that need to be done (who, what, when if mentioned)
2. **Key Decisions**: Important decisions made during the conversation
3. **Ideas**: Creative ideas or concepts worth remembering
4. **People Mentioned**: Names and their context
5. **Follow-ups**: Things to circle back on later
6. **Category**: Classify the main topic as one of: Infrastructure, Marketing, Client Experience, R&D

Transcript:
${text.substring(0, 15000)}

Respond in JSON format:
{
  "title": "Brief title for this conversation",
  "date": "YYYY-MM-DD if mentioned, otherwise null",
  "participants": ["list of people"],
  "category": "Infrastructure|Marketing|Client Experience|R&D",
  "actionItems": [
    {"task": "description", "assignee": "person or null", "priority": "high/medium/low", "dueDate": "if mentioned"}
  ],
  "decisions": ["decision 1", "decision 2"],
  "ideas": ["idea 1", "idea 2"],
  "followUps": ["follow up 1"],
  "summary": "2-3 sentence summary of the conversation",
  "tags": ["relevant", "topic", "tags"]
}`;

  return logger.time('gemini-analysis', async () => {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      throw new ExternalServiceError('Gemini', `API returned ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new AppError('Could not parse Gemini response', 500, 'GEMINI_PARSE_ERROR');
  });
}

/**
 * Create Asana tasks from action items (with v2.1 error handling)
 * Note: Only creates tasks, does not auto-execute ideas
 */
async function createTasksFromActions(actionItems, sourceTitle) {
  const asana = await import('../asana/pusher.js');

  const created = [];
  for (const item of actionItems) {
    if (item.priority === 'high' || item.priority === 'medium') {
      try {
        const task = await asana.createTask({
          name: item.task,
          notes: `From brainstorm: ${sourceTitle}\n\nAssignee: ${item.assignee || 'Unassigned'}\nDue: ${item.dueDate || 'Not specified'}`,
          dueOn: item.dueDate || null
        });
        created.push(task);
        logger.info(`Task created: ${item.task.substring(0, 50)}...`);
      } catch (e) {
        logger.error(`Failed to create task: ${e.message}`);
      }
    }
  }
  return created;
}

/**
 * Save brainstorm to memory and manifest
 */
function saveBrainstorm(analysis, filename, rawText) {
  if (!existsSync(PATHS.memoryDir)) {
    mkdirSync(PATHS.memoryDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const slug = (analysis.title || filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);

  const outputPath = join(PATHS.memoryDir, `${timestamp}_${slug}.json`);

  const record = {
    ...analysis,
    sourceFile: filename,
    ingestedAt: new Date().toISOString(),
    rawTextLength: rawText.length
  };

  writeFileSync(outputPath, JSON.stringify(record, null, 2));
  logger.info(`Saved to memory: ${outputPath}`);

  // Also add to manifest for tracking
  const manifestEntry = {
    id: `transcript-${timestamp}-${slug}`,
    type: 'TRANSCRIPT',
    title: analysis.title,
    category: analysis.category || 'R&D',
    source: filename,
    timestamp: new Date().toISOString(),
    status: 'PROCESSED',
    actionItemsCount: analysis.actionItems?.length || 0,
    ideasCount: analysis.ideas?.length || 0
  };

  appendFileSync(PATHS.manifest, JSON.stringify(manifestEntry) + '\n');

  return outputPath;
}

/**
 * Main ingestion function (full transcript processing)
 */
export async function ingest(filePath) {
  const traceId = `ingest-${Date.now().toString(36)}`;
  logger.info('Starting brainstorm ingestion', { traceId });

  console.log('\n=== SuperChase Brainstorm Ingestion v2.1 ===\n');

  // Resolve path
  const resolvedPath = filePath.startsWith('/')
    ? filePath
    : join(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
    logger.error(`File not found: ${resolvedPath}`, { traceId });
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const filename = basename(resolvedPath);
  console.log(`[1/4] Reading: ${filename}`);

  const rawText = readFileSync(resolvedPath, 'utf8');
  console.log(`      ${rawText.length} characters, ~${Math.round(rawText.split(/\s+/).length)} words`);

  console.log('\n[2/4] Analyzing with Gemini...');
  const analysis = await analyzeTranscript(rawText, filename);

  if (!analysis) {
    logger.error('Failed to analyze transcript', { traceId });
    console.error('Failed to analyze transcript');
    process.exit(1);
  }

  console.log(`      Title: ${analysis.title}`);
  console.log(`      Category: ${analysis.category}`);
  console.log(`      Action items: ${analysis.actionItems?.length || 0}`);
  console.log(`      Decisions: ${analysis.decisions?.length || 0}`);
  console.log(`      Ideas: ${analysis.ideas?.length || 0}`);

  console.log('\n[3/4] Creating tasks for high/medium priority items...');
  const tasks = await createTasksFromActions(analysis.actionItems || [], analysis.title);
  console.log(`      Created ${tasks.length} tasks in Asana`);

  console.log('\n[4/4] Saving to memory & manifest...');
  const savedPath = saveBrainstorm(analysis, filename, rawText);

  console.log('\n=== Ingestion Complete ===\n');
  console.log('Summary:', analysis.summary);
  console.log('\nTags:', analysis.tags?.join(', ') || 'None');

  if (analysis.followUps?.length > 0) {
    console.log('\nFollow-ups:');
    analysis.followUps.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  // Process individual ideas through the SKILL.md workflow
  if (analysis.ideas?.length > 0) {
    console.log('\n📝 Processing ideas through SKILL.md workflow...');
    let strategicMatches = 0;

    for (const idea of analysis.ideas) {
      const result = await processBrainstorm(idea, {
        source: `Transcript: ${analysis.title}`
      });
      if (result.strategicMatch) {
        strategicMatches++;
        console.log(`  🎯 STRATEGIC_MATCH: ${idea.substring(0, 50)}...`);
      }
    }

    console.log(`\n      Ideas logged: ${analysis.ideas.length}`);
    console.log(`      Strategic matches: ${strategicMatches}`);
    console.log('\n⚠️  Ideas flagged for review - NOT auto-executed');
    console.log('⚠️  Move to /manual/docs/projects/ to activate');
  }

  logger.info('Ingestion complete', {
    traceId,
    title: analysis.title,
    actionItems: analysis.actionItems?.length || 0,
    ideas: analysis.ideas?.length || 0
  });

  return analysis;
}

// CLI execution - only run when called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node spokes/brainstorm/ingest.js <path-to-transcript>');
    console.log('');
    console.log('Supported formats:');
    console.log('  - Limitless export (.txt)');
    console.log('  - Plain text transcripts');
    console.log('  - Meeting notes');
    console.log('  - Google Doc exports');
    console.log('');
    console.log('Or use processBrainstorm() for single ideas');
    process.exit(0);
  }

  ingest(args[0]);
}

export { analyzeTranscript, categorizeIdea, checkStrategicMatch };

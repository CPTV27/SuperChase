#!/usr/bin/env node
/**
 * Limitless Spoke - Pendant Lifelog Integration
 * 
 * Fetches lifelogs from Limitless API and processes them through
 * the SuperChase brainstorm ingest pipeline.
 * 
 * Features:
 * - Queries lifelogs by date range or keyword search
 * - Extracts strategic insights using Gemini
 * - Filters for SuperChase-relevant content (@bigmuddy, @s2p, TikTok, George)
 * - Logs findings to manifest.jsonl
 * 
 * @module spokes/limitless/scout
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// v2.1 Infrastructure
import { createLogger } from '../../lib/logger.js';
import { SimpleCache } from '../../lib/cache.js';
import { AppError, ExternalServiceError, withRetry, withFallback } from '../../lib/errors.js';

const logger = createLogger({ spoke: 'limitless' });
const limitlessCache = new SimpleCache({ defaultTTL: 5 * 60 * 1000 }); // 5 min cache

// Configuration
const LIMITLESS_API_KEY = process.env.LIMITLESS_API_KEY;
const LIMITLESS_BASE_URL = 'https://api.limitless.ai/v1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const PATHS = {
    manifest: join(__dirname, '..', '..', 'manifest.jsonl'),
    brainstormDir: join(__dirname, '..', '..', 'manual', 'docs', 'brainstorm'),
    limitlessContext: join(__dirname, '..', '..', 'memory', 'limitless_context.json')
};

// Keywords that trigger SuperChase processing
const TRIGGER_KEYWORDS = [
    'george', 'superchase', 'tiktok', 'bigmuddy', 's2p', 'scan2plan',
    'studio c', 'cptv', 'tuthill', 'purist', 'idea', 'should we',
    'what if', 'marketing', 'client', 'proposal'
];

/**
 * Check if Limitless API is configured
 * @returns {boolean}
 */
export function isConfigured() {
    return !!(LIMITLESS_API_KEY && LIMITLESS_API_KEY !== 'NEEDS_VALUE');
}

/**
 * Make authenticated request to Limitless API
 * @param {string} endpoint 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
async function limitlessRequest(endpoint, options = {}) {
    if (!isConfigured()) {
        throw new ExternalServiceError('Limitless', 'API key not configured. Set LIMITLESS_API_KEY in .env');
    }

    const url = `${LIMITLESS_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${LIMITLESS_API_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new ExternalServiceError('Limitless', `API error ${response.status}: ${error}`);
    }

    return response.json();
}

/**
 * Get lifelogs for a specific date range
 * @param {Object} options
 * @param {string} [options.date] - ISO date string (defaults to today)
 * @param {string} [options.timezone] - Timezone (defaults to America/Chicago)
 * @param {number} [options.limit] - Max results
 * @returns {Promise<Object>}
 */
export async function getLifelogs(options = {}) {
    const {
        date = new Date().toISOString().split('T')[0],
        timezone = 'America/Chicago',
        limit = 50
    } = options;

    const cacheKey = `lifelogs-${date}`;
    const cached = limitlessCache.get(cacheKey);
    if (cached) {
        logger.debug('Returning cached lifelogs', { date });
        return cached;
    }

    logger.info('Fetching lifelogs from Limitless', { date, limit });

    const result = await withRetry(async () => {
        return limitlessRequest(`/lifelogs?date=${date}&timezone=${timezone}&limit=${limit}`);
    }, { maxRetries: 2, initialDelay: 1000 });

    limitlessCache.set(cacheKey, result);
    return result;
}

/**
 * Search lifelogs using natural language
 * @param {string} query - Search query
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function searchLifelogs(query, options = {}) {
    const { limit = 20 } = options;

    logger.info('Searching lifelogs', { query });

    return withRetry(async () => {
        return limitlessRequest(`/lifelogs/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    }, { maxRetries: 2, initialDelay: 1000 });
}

/**
 * Get a specific lifelog by ID
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export async function getLifelog(id) {
    const cacheKey = `lifelog-${id}`;
    const cached = limitlessCache.get(cacheKey);
    if (cached) return cached;

    const result = await limitlessRequest(`/lifelogs/${id}`);
    limitlessCache.set(cacheKey, result);
    return result;
}

/**
 * Get daily summary from Limitless
 * @param {string} [date] - ISO date string
 * @returns {Promise<Object>}
 */
export async function getDailySummary(date) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    logger.info('Fetching daily summary', { date: targetDate });

    return withFallback(
        async () => limitlessRequest(`/lifelogs/summary?date=${targetDate}`),
        { summary: 'Summary unavailable', date: targetDate }
    );
}

/**
 * Check if transcript contains SuperChase-relevant keywords
 * @param {string} text 
 * @returns {{relevant: boolean, keywords: string[]}}
 */
function checkRelevance(text) {
    const lowerText = text.toLowerCase();
    const matches = TRIGGER_KEYWORDS.filter(kw => lowerText.includes(kw));
    return {
        relevant: matches.length > 0,
        keywords: matches
    };
}

/**
 * Extract strategic insights from lifelog using Gemini
 * @param {Object} lifelog 
 * @returns {Promise<Object>}
 */
async function extractInsights(lifelog) {
    if (!GEMINI_API_KEY) {
        logger.warn('Gemini not configured, returning raw lifelog');
        return {
            title: lifelog.title || 'Untitled',
            insights: [],
            actionItems: [],
            marketingTrigger: false
        };
    }

    const prompt = `Analyze this conversation transcript from my Limitless Pendant.

1. **Extract High-Value Ideas:** Identify any business concepts, TikTok strategies, or client pain points mentioned.
2. **Filter for SuperChase:** Match against active projects (@bigmuddy, @s2p, Scan2Plan, Studio C, CPTV, Tuthill).
3. **Actionable Intelligence:** Extract specific action items or follow-ups.
4. **Marketing Potential:** Identify if any content could be repurposed for social media or marketing.

Transcript:
${lifelog.transcript || lifelog.content || JSON.stringify(lifelog).substring(0, 5000)}

Respond in JSON format:
{
  "title": "Brief descriptive title",
  "insights": ["Key insight 1", "Key insight 2"],
  "actionItems": ["Action 1", "Action 2"],
  "clientMentions": ["@bigmuddy", "@s2p"],
  "marketingTrigger": true/false,
  "category": "Infrastructure|Marketing|Client Experience|R&D",
  "priority": 1-5,
  "summary": "2-3 sentence summary"
}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        logger.error('Insight extraction failed', { error: error.message });
    }

    return {
        title: lifelog.title || 'Untitled',
        insights: [],
        actionItems: [],
        marketingTrigger: false
    };
}

/**
 * Process lifelogs and extract SuperChase-relevant findings
 * @param {Object} options
 * @param {string} [options.date] - Date to process (defaults to yesterday)
 * @param {string[]} [options.keywords] - Additional keywords to search for
 * @param {boolean} [options.dryRun] - If true, don't write to manifest
 * @returns {Promise<Object>}
 */
export async function processLifelogs(options = {}) {
    const traceId = `limitless-${Date.now().toString(36)}`;
    logger.info('Processing lifelogs', { traceId, ...options });

    const {
        date = new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        keywords = TRIGGER_KEYWORDS,
        dryRun = false
    } = options;

    console.log(`\n🎙️ SuperChase Limitless Scout v2.1\n`);
    console.log(`═`.repeat(50));
    console.log(`\n📅 Processing: ${date}`);
    console.log(`🔍 Keywords: ${keywords.slice(0, 5).join(', ')}...`);

    try {
        // Step 1: Fetch lifelogs
        console.log(`\n[1/4] Fetching lifelogs from Limitless API...`);
        const lifelogs = await getLifelogs({ date });
        console.log(`      Found ${lifelogs.data?.length || 0} lifelogs`);

        if (!lifelogs.data?.length) {
            console.log(`\n⚠️ No lifelogs found for ${date}`);
            return { processed: 0, findings: [], traceId };
        }

        // Step 2: Filter for relevant content
        console.log(`\n[2/4] Filtering for SuperChase-relevant content...`);
        const relevant = lifelogs.data.filter(log => {
            const text = log.transcript || log.content || log.title || '';
            return checkRelevance(text).relevant;
        });
        console.log(`      ${relevant.length} relevant conversations found`);

        // Step 3: Extract insights
        console.log(`\n[3/4] Extracting strategic insights...`);
        const findings = [];

        for (const log of relevant) {
            const insights = await extractInsights(log);

            const finding = {
                id: `limitless-${date}-${log.id || Date.now()}`,
                type: insights.marketingTrigger ? 'MARKETING_OPPORTUNITY' : 'SCOUT_FINDING',
                agent: 'Limitless_Scout',
                source: 'Pendant_Lifelog',
                title: insights.title,
                category: insights.category || 'R&D',
                insights: insights.insights,
                actionItems: insights.actionItems,
                clientMentions: insights.clientMentions || [],
                marketingTrigger: insights.marketingTrigger,
                priority: insights.priority || 3,
                summary: insights.summary,
                lifelogId: log.id,
                timestamp: new Date().toISOString(),
                status: 'PENDING_REVIEW',
                traceId
            };

            findings.push(finding);

            const marker = finding.marketingTrigger ? '📢' : '💡';
            console.log(`      ${marker} ${finding.title}`);
        }

        // Step 4: Log to manifest
        console.log(`\n[4/4] Logging findings to manifest...`);

        if (!dryRun) {
            for (const finding of findings) {
                const manifestEntry = {
                    timestamp: finding.timestamp,
                    agent: finding.agent,
                    finding: finding.summary || finding.title,
                    type: finding.type,
                    status: finding.status,
                    linked_task: null,
                    marketing_trigger: finding.marketingTrigger,
                    source: finding.source,
                    traceId: finding.traceId
                };

                appendFileSync(PATHS.manifest, JSON.stringify(manifestEntry) + '\n');
            }
            console.log(`      ✅ ${findings.length} entries written to manifest.jsonl`);

            // Save detailed findings to brainstorm directory
            if (!existsSync(PATHS.brainstormDir)) {
                mkdirSync(PATHS.brainstormDir, { recursive: true });
            }

            const detailedPath = join(PATHS.brainstormDir, `limitless_${date}.json`);
            writeFileSync(detailedPath, JSON.stringify({ date, findings, traceId }, null, 2));
            console.log(`      ✅ Detailed findings saved to ${detailedPath}`);
        } else {
            console.log(`      ⏭️ Dry run - no changes written`);
        }

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🏁 Scout Complete`);
        console.log(`   Processed: ${lifelogs.data.length} lifelogs`);
        console.log(`   Relevant:  ${relevant.length}`);
        console.log(`   Findings:  ${findings.length}`);
        console.log(`   Marketing: ${findings.filter(f => f.marketingTrigger).length}`);
        console.log(`\n⚠️ Findings logged for review - NOT auto-executed\n`);

        logger.info('Lifelog processing complete', {
            traceId,
            processed: lifelogs.data.length,
            relevant: relevant.length,
            findings: findings.length
        });

        return {
            processed: lifelogs.data.length,
            relevant: relevant.length,
            findings,
            traceId
        };

    } catch (error) {
        logger.error('Lifelog processing failed', { error: error.message, traceId });
        console.error(`\n❌ Error: ${error.message}\n`);
        throw error;
    }
}

/**
 * Quick search for specific topic in recent lifelogs
 * @param {string} topic 
 * @returns {Promise<Object[]>}
 */
export async function quickSearch(topic) {
    logger.info('Quick search', { topic });

    console.log(`\n🔍 Searching lifelogs for: "${topic}"\n`);

    const results = await searchLifelogs(topic);

    if (results.data?.length) {
        for (const result of results.data.slice(0, 5)) {
            console.log(`  📝 ${result.title || 'Untitled'}`);
            console.log(`     ${result.date || 'Unknown date'}`);
        }
    } else {
        console.log(`  No results found for "${topic}"`);
    }

    return results.data || [];
}

/**
 * Test Limitless API connection
 * @returns {Promise<Object>}
 */
export async function testConnection() {
    if (!isConfigured()) {
        return {
            connected: false,
            error: 'LIMITLESS_API_KEY not configured'
        };
    }

    try {
        const result = await getLifelogs({ limit: 1 });
        return {
            connected: true,
            lifelogsAvailable: result.data?.length || 0
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const command = args[0] || 'process';

    switch (command) {
        case 'search':
            if (!args[1]) {
                console.log('Usage: node scout.js search <topic>');
                process.exit(1);
            }
            quickSearch(args[1]);
            break;

        case 'test':
            testConnection().then(result => {
                console.log('\n🔌 Limitless Connection Test\n');
                console.log(JSON.stringify(result, null, 2));
            });
            break;

        case 'summary':
            getDailySummary(args[1]).then(result => {
                console.log('\n📋 Daily Summary\n');
                console.log(JSON.stringify(result, null, 2));
            });
            break;

        case 'process':
        default:
            processLifelogs({
                date: args[1],
                dryRun: args.includes('--dry-run')
            }).catch(err => {
                console.error('Processing failed:', err.message);
                process.exit(1);
            });
    }
}

export default {
    isConfigured,
    getLifelogs,
    searchLifelogs,
    getLifelog,
    getDailySummary,
    processLifelogs,
    quickSearch,
    testConnection
};

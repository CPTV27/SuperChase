#!/usr/bin/env node
/**
 * S2P Northeast Scout - Business Development Intelligence Agent
 * 
 * Monitors the DC-to-Maine corridor for high-intent signals:
 * - LinkedIn: Architecture firm activity, job posts, project announcements
 * - Architectural journals: AIA publications, regional design magazines
 * - Regional permit databases: NYC DOB, Boston ISD, DC DCRA
 * 
 * Technical Center of Gravity: Troy, NY
 * 
 * @module spokes/s2p/northeast-scout
 * @tenant s2p (ISOLATED - do not mix with @bigmuddy or @tuthill)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// v2.1 Infrastructure
import { createLogger } from '../../lib/logger.js';
import { SimpleCache } from '../../lib/cache.js';
import { ExternalServiceError, withRetry } from '../../lib/errors.js';

const logger = createLogger({ spoke: 's2p-northeast-scout', tenant: 's2p' });
const scoutCache = new SimpleCache({ defaultTTL: 15 * 60 * 1000 }); // 15 min cache

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const PATHS = {
    prospectVault: join(__dirname, '..', '..', 'memory', 's2p_prospect_vault.jsonl'),
    manifest: join(__dirname, '..', '..', 'manifest.jsonl')
};

// Northeast Corridor Markets
const NORTHEAST_MARKETS = {
    metro_ny: {
        name: 'Metro New York',
        cities: ['New York', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Jersey City', 'Newark', 'Hoboken'],
        distanceFromTroy: 150, // miles
        permitApi: 'NYC DOB BIS',
        priority: 1
    },
    capital_region: {
        name: 'Capital Region',
        cities: ['Albany', 'Troy', 'Schenectady', 'Saratoga Springs'],
        distanceFromTroy: 0,
        permitApi: 'NY DOS',
        priority: 1
    },
    boston_metro: {
        name: 'Boston Metro',
        cities: ['Boston', 'Cambridge', 'Somerville', 'Brookline'],
        distanceFromTroy: 170,
        permitApi: 'Boston ISD',
        priority: 1
    },
    dc_metro: {
        name: 'DC Metro',
        cities: ['Washington DC', 'Arlington', 'Alexandria', 'Bethesda'],
        distanceFromTroy: 350,
        permitApi: 'DC DCRA',
        priority: 2
    },
    philadelphia: {
        name: 'Philadelphia',
        cities: ['Philadelphia', 'Camden'],
        distanceFromTroy: 230,
        permitApi: 'Philly L&I',
        priority: 2
    },
    new_england: {
        name: 'New England',
        cities: ['Hartford', 'Providence', 'Portland ME', 'Burlington VT'],
        distanceFromTroy: 200,
        permitApi: 'Various',
        priority: 2
    }
};

// High-intent signal keywords
const HIGH_INTENT_SIGNALS = [
    // Project Types (S2P sweet spot)
    'historic renovation', 'adaptive reuse', 'as-built documentation',
    'existing conditions', 'site survey', 'BIM conversion',
    'point cloud', 'laser scanning', 'reality capture',
    'heritage preservation', 'landmark restoration',

    // Decision Triggers
    'RFP', 'seeking proposals', 'project kickoff',
    'DD phase', 'design development', 'schematic design',
    'need accurate drawings', 'existing drawings outdated',

    // Pain Points
    'field verification', 'as-built discrepancies',
    'coordination issues', 'clash detection'
];

// Architectural firm signals
const FIRM_SIGNALS = [
    'hiring project architect', 'expanding team',
    'new office location', 'awarded project',
    'seeking sub-consultants', 'looking for scanning'
];

/**
 * Calculate "Distance to Meeting" score
 * Higher score = more likely to book a meeting
 * 
 * Factors:
 * - Project type alignment (historic, renovation = +30)
 * - Geographic proximity to Troy (+20 if < 100 miles)
 * - Signal strength (direct intent = +25)
 * - Firm size/prestige (+15 for top firms)
 * - Timeline urgency (+10 if active RFP)
 */
function calculateDistanceToMeeting(prospect) {
    let score = 50; // Base score

    // Project type alignment
    const projectType = (prospect.projectType || '').toLowerCase();
    if (projectType.includes('historic') || projectType.includes('renovation')) {
        score += 30;
    } else if (projectType.includes('existing') || projectType.includes('as-built')) {
        score += 25;
    } else if (projectType.includes('commercial') || projectType.includes('residential')) {
        score += 10;
    }

    // Geographic proximity
    const distance = prospect.distanceFromTroy || 500;
    if (distance < 50) score += 25;
    else if (distance < 100) score += 20;
    else if (distance < 200) score += 10;
    else if (distance > 400) score -= 10;

    // Signal strength
    const signalType = (prospect.signalType || '').toLowerCase();
    if (signalType.includes('rfp') || signalType.includes('seeking')) {
        score += 25;
    } else if (signalType.includes('awarded') || signalType.includes('kickoff')) {
        score += 20;
    } else if (signalType.includes('hiring')) {
        score += 15;
    }

    // Firm size boost
    if (prospect.firmSize === 'large' || prospect.prestige === 'high') {
        score += 15;
    }

    // Timeline urgency
    if (prospect.timeline === 'immediate') {
        score += 15;
    } else if (prospect.timeline === 'quarter') {
        score += 5;
    }

    return Math.min(100, Math.max(0, score));
}

/**
 * Search LinkedIn for architecture firm signals (simulated)
 * In production, would use LinkedIn Sales Navigator API
 */
async function scanLinkedIn(market) {
    logger.info('Scanning LinkedIn for architecture signals', { market: market.name });

    // Simulated LinkedIn scan - in production would use actual API
    const mockSignals = [
        {
            source: 'LinkedIn',
            firmName: 'Beyer Blinder Belle',
            principalArchitect: 'Richard Blinder',
            signalType: 'Historic Renovation Project Awarded',
            location: 'Brooklyn, NY',
            projectType: 'Historic Preservation',
            description: 'Just awarded the restoration of a 1920s warehouse in Dumbo for adaptive reuse as creative office space.',
            timestamp: new Date().toISOString()
        },
        {
            source: 'LinkedIn',
            firmName: 'Gensler Boston',
            principalArchitect: 'Studio Director',
            signalType: 'Seeking As-Built Documentation',
            location: 'Boston, MA',
            projectType: 'Commercial Renovation',
            description: 'Looking for laser scanning partners for upcoming existing conditions survey in Financial District.',
            timestamp: new Date().toISOString()
        }
    ];

    return mockSignals.filter(s =>
        market.cities.some(city => s.location.includes(city))
    );
}

/**
 * Monitor architectural journals and publications
 */
async function scanArchitecturalJournals() {
    logger.info('Scanning architectural journals');

    // Would integrate with:
    // - Architect Magazine RSS
    // - AIA publications
    // - Regional design magazines

    const mockJournalSignals = [
        {
            source: 'Architect Magazine',
            headline: 'DC Firm Wins National Trust Preservation Contract',
            firmName: 'Hartman-Cox Architects',
            location: 'Washington DC',
            projectType: 'Heritage Preservation',
            signalType: 'Project Awarded',
            url: 'https://architectmagazine.com/example',
            timestamp: new Date().toISOString()
        }
    ];

    return mockJournalSignals;
}

/**
 * Monitor regional permit databases
 * High-value permits: demolition, renovation, landmark
 */
async function scanPermitDatabases(market) {
    logger.info('Scanning permit databases', { market: market.name, api: market.permitApi });

    // Would integrate with:
    // - NYC DOB BIS API
    // - Boston ISD permit feed
    // - DC DCRA permit database

    const mockPermits = [
        {
            source: market.permitApi,
            permitType: 'Alteration Type 1',
            address: '123 Historic Ave',
            location: market.cities[0],
            ownerName: 'Example Holdings LLC',
            architect: 'Pending Filing',
            estimatedCost: 2500000,
            projectType: 'Major Renovation',
            signalType: 'Permit Filed',
            filedDate: new Date().toISOString(),
            timestamp: new Date().toISOString()
        }
    ];

    return mockPermits;
}

/**
 * Enrich prospect with AI analysis
 */
async function enrichProspect(rawSignal, market) {
    if (!GEMINI_API_KEY) {
        logger.warn('Gemini not configured, returning raw signal');
        return {
            ...rawSignal,
            distanceFromTroy: market?.distanceFromTroy || 250,
            enriched: false
        };
    }

    const prompt = `Analyze this business development signal for an architectural reality capture firm (laser scanning, BIM conversion).

Signal:
${JSON.stringify(rawSignal, null, 2)}

Respond in JSON:
{
  "firmQuality": "high|medium|low",
  "projectFit": "perfect|good|marginal|poor",
  "urgencyLevel": "immediate|quarter|year|unknown",
  "keyDecisionMaker": "Name or role if identifiable",
  "recommendedApproach": "Brief strategy for outreach",
  "technicalNeeds": ["List of likely technical requirements"],
  "competitivePosition": "Why S2P would win this"
}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
            })
        });

        if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const enrichment = JSON.parse(jsonMatch[0]);
            return {
                ...rawSignal,
                ...enrichment,
                distanceFromTroy: market?.distanceFromTroy || 250,
                timeline: enrichment.urgencyLevel,
                enriched: true
            };
        }
    } catch (error) {
        logger.debug('Enrichment failed', { error: error.message });
    }

    return {
        ...rawSignal,
        distanceFromTroy: market?.distanceFromTroy || 250,
        enriched: false
    };
}

/**
 * Save prospect to vault
 */
function saveToVault(prospect) {
    const vaultEntry = {
        id: `s2p_prospect_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        tenant: 's2p', // ISOLATION: S2P only
        ...prospect,
        distanceToMeeting: calculateDistanceToMeeting(prospect),
        status: 'new',
        outreachHistory: []
    };

    // Ensure memory directory exists
    const memoryDir = join(__dirname, '..', '..', 'memory');
    if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
    }

    appendFileSync(PATHS.prospectVault, JSON.stringify(vaultEntry) + '\n');
    logger.info('Prospect saved to vault', { id: vaultEntry.id, score: vaultEntry.distanceToMeeting });

    return vaultEntry;
}

/**
 * Log to manifest
 */
function logToManifest(prospect) {
    const entry = {
        timestamp: new Date().toISOString(),
        agent: 'S2P_Northeast_Scout',
        tenant: 's2p',
        finding: `${prospect.signalType}: ${prospect.firmName || prospect.address} (${prospect.location})`,
        type: 'BD_SIGNAL',
        status: 'NEW_PROSPECT',
        distanceToMeeting: prospect.distanceToMeeting,
        source: prospect.source
    };

    appendFileSync(PATHS.manifest, JSON.stringify(entry) + '\n');
}

/**
 * Run full Northeast corridor scan
 */
export async function runNortheastScan(options = {}) {
    const traceId = `s2p-scout-${Date.now().toString(36)}`;
    logger.info('Starting Northeast corridor scan', { traceId });

    console.log(`\n🏗️ S2P Northeast Scout v1.0\n`);
    console.log(`═`.repeat(50));
    console.log(`📍 Technical Hub: Troy, NY`);
    console.log(`🗺️ Corridor: DC → Maine`);
    console.log(`\n`);

    const allProspects = [];
    const markets = options.markets || Object.values(NORTHEAST_MARKETS);

    for (const market of markets) {
        console.log(`\n[${market.name}] Scanning...`);

        try {
            // Scan LinkedIn
            const linkedInSignals = await scanLinkedIn(market);
            console.log(`  LinkedIn: ${linkedInSignals.length} signals`);

            // Scan permit databases
            const permitSignals = await scanPermitDatabases(market);
            console.log(`  Permits: ${permitSignals.length} signals`);

            // Process and enrich signals
            const signals = [...linkedInSignals, ...permitSignals];

            for (const signal of signals) {
                const enriched = await enrichProspect(signal, market);
                const saved = saveToVault(enriched);
                logToManifest(saved);
                allProspects.push(saved);

                const score = saved.distanceToMeeting;
                const scoreEmoji = score >= 80 ? '🔥' : score >= 60 ? '⚡' : '📋';
                console.log(`  ${scoreEmoji} [${score}] ${saved.firmName || saved.address}`);
            }
        } catch (error) {
            logger.error('Market scan failed', { market: market.name, error: error.message });
            console.log(`  ❌ Scan failed: ${error.message}`);
        }
    }

    // Also scan journals (not market-specific)
    console.log(`\n[Architectural Journals] Scanning...`);
    const journalSignals = await scanArchitecturalJournals();
    for (const signal of journalSignals) {
        const market = Object.values(NORTHEAST_MARKETS).find(m =>
            m.cities.some(c => signal.location?.includes(c))
        ) || NORTHEAST_MARKETS.metro_ny;

        const enriched = await enrichProspect(signal, market);
        const saved = saveToVault(enriched);
        logToManifest(saved);
        allProspects.push(saved);
        console.log(`  📰 [${saved.distanceToMeeting}] ${saved.firmName || saved.headline}`);
    }

    // Summary
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🏁 Scan Complete`);
    console.log(`   Total Prospects: ${allProspects.length}`);
    console.log(`   Hot Leads (80+): ${allProspects.filter(p => p.distanceToMeeting >= 80).length}`);
    console.log(`   Warm Leads (60+): ${allProspects.filter(p => p.distanceToMeeting >= 60).length}`);
    console.log(`\n`);

    return {
        traceId,
        prospects: allProspects,
        hotLeads: allProspects.filter(p => p.distanceToMeeting >= 80),
        warmLeads: allProspects.filter(p => p.distanceToMeeting >= 60 && p.distanceToMeeting < 80)
    };
}

/**
 * Get prospects from vault with filters
 */
export function getProspects(filters = {}) {
    if (!existsSync(PATHS.prospectVault)) {
        return [];
    }

    const lines = readFileSync(PATHS.prospectVault, 'utf-8').trim().split('\n');
    let prospects = lines.filter(Boolean).map(line => JSON.parse(line));

    // Apply filters
    if (filters.minScore) {
        prospects = prospects.filter(p => p.distanceToMeeting >= filters.minScore);
    }
    if (filters.market) {
        prospects = prospects.filter(p =>
            p.location?.toLowerCase().includes(filters.market.toLowerCase())
        );
    }
    if (filters.status) {
        prospects = prospects.filter(p => p.status === filters.status);
    }

    // Sort by score descending
    prospects.sort((a, b) => (b.distanceToMeeting || 0) - (a.distanceToMeeting || 0));

    return prospects;
}

/**
 * Get live signals for UI
 */
export function getLiveSignals(limit = 10) {
    const prospects = getProspects();
    return prospects.slice(0, limit).map(p => ({
        id: p.id,
        headline: p.signalType || p.headline,
        firmName: p.firmName,
        location: p.location,
        projectType: p.projectType,
        distanceToMeeting: p.distanceToMeeting,
        timestamp: p.timestamp,
        source: p.source
    }));
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const command = args[0] || 'scan';

    switch (command) {
        case 'scan':
            runNortheastScan().catch(console.error);
            break;
        case 'list':
            const minScore = parseInt(args[1]) || 0;
            const prospects = getProspects({ minScore });
            console.log(JSON.stringify(prospects, null, 2));
            break;
        case 'signals':
            const signals = getLiveSignals(parseInt(args[1]) || 10);
            console.log(JSON.stringify(signals, null, 2));
            break;
        default:
            console.log('Usage: node northeast-scout.js [scan|list|signals]');
    }
}

export default {
    runNortheastScan,
    getProspects,
    getLiveSignals,
    calculateDistanceToMeeting,
    NORTHEAST_MARKETS
};

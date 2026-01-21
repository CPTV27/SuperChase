#!/usr/bin/env node
/**
 * Query Hub - Business Context Search
 *
 * Enables conversational queries about business state by searching:
 * - memory/daily_summary.json (recent briefings)
 * - evolution/LEARNINGS.md (patterns and learnings)
 * - Asana tasks (current work items)
 * - cache/audit.jsonl (recent actions)
 *
 * Used by ElevenLabs Agent for voice conversations.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const ASANA_WORKSPACE = process.env.ASANA_WORKSPACE_ID;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';

const PATHS = {
  dailySummary: join(__dirname, '..', 'memory', 'daily_summary.json'),
  learnings: join(__dirname, '..', 'evolution', 'LEARNINGS.md'),
  patterns: join(__dirname, '..', 'memory', 'patterns.json'),
  auditLog: join(__dirname, '..', 'cache', 'audit.jsonl'),
  limitlessContext: join(__dirname, '..', 'memory', 'limitless_context.json')
};

/**
 * High-Value People - George treats these as priority context
 */
const HIGH_VALUE_PEOPLE = {
  'Owen': { context: 'Scan2Plan team', role: 'Operations/Sales' },
  'Agata': { context: 'Scan2Plan team', role: 'Operations' },
  'Tracy': { context: 'Big Muddy Inn', role: 'Owner' },
  'Amy': { context: 'Big Muddy Inn', role: 'Owner/Singer' },
  'Patricia': { context: 'Purist', role: 'Partner' },
  'Chris': { context: 'Purist', role: 'Partner' },
  'Miles': { context: 'Studio C', role: 'Technical Director' }
};

/**
 * Identify high-value people mentioned in query
 */
function identifyPeopleMentioned(text) {
  const mentioned = [];
  const textLower = text.toLowerCase();

  for (const [name, info] of Object.entries(HIGH_VALUE_PEOPLE)) {
    if (textLower.includes(name.toLowerCase())) {
      mentioned.push({ name, ...info });
    }
  }

  return mentioned;
}

/**
 * Query the business context
 * @param {string} query - Natural language question
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - { answer, sources, confidence }
 */
export async function queryBusinessContext(query, options = {}) {
  const {
    includeAsana = true,
    includeAudit = true,
    maxResults = 5,
    conversationHistory = []
  } = options;

  console.log(`[QueryHub] Processing: "${query}" (history: ${conversationHistory.length} msgs)`);

  // Gather context from all sources
  const context = await gatherContext(includeAsana, includeAudit, maxResults);

  // Use Gemini to synthesize an answer (with conversation history)
  const answer = await synthesizeAnswer(query, context, conversationHistory);

  return answer;
}

/**
 * Gather context from all data sources
 */
async function gatherContext(includeAsana, includeAudit, maxResults) {
  const context = {
    dailySummary: null,
    learnings: null,
    patterns: null,
    tasks: [],
    recentActions: [],
    limitless: null
  };

  // 1. Daily Summary
  if (existsSync(PATHS.dailySummary)) {
    try {
      context.dailySummary = JSON.parse(readFileSync(PATHS.dailySummary, 'utf8'));
    } catch (e) {
      console.warn('[QueryHub] Could not read daily summary');
    }
  }

  // 2. Learnings
  if (existsSync(PATHS.learnings)) {
    try {
      const content = readFileSync(PATHS.learnings, 'utf8');
      // Get last 2000 chars (most recent learnings)
      context.learnings = content.slice(-2000);
    } catch (e) {
      console.warn('[QueryHub] Could not read learnings');
    }
  }

  // 3. Patterns
  if (existsSync(PATHS.patterns)) {
    try {
      context.patterns = JSON.parse(readFileSync(PATHS.patterns, 'utf8'));
    } catch (e) {
      console.warn('[QueryHub] Could not read patterns');
    }
  }

  // 4. Asana Tasks
  if (includeAsana && ASANA_TOKEN) {
    context.tasks = await fetchAsanaTasks(maxResults);
  }

  // 5. Recent Audit Actions
  if (includeAudit && existsSync(PATHS.auditLog)) {
    context.recentActions = getRecentAuditEntries(maxResults);
  }

  // 6. Limitless Context (30-day business intelligence)
  if (existsSync(PATHS.limitlessContext)) {
    try {
      context.limitless = JSON.parse(readFileSync(PATHS.limitlessContext, 'utf8'));
    } catch (e) {
      console.warn('[QueryHub] Could not read Limitless context');
    }
  }

  return context;
}

/**
 * Fetch tasks from Asana
 */
async function fetchAsanaTasks(limit = 5) {
  try {
    // Get all projects
    const projectsResponse = await fetch(
      `${ASANA_BASE_URL}/workspaces/${ASANA_WORKSPACE}/projects`,
      { headers: { Authorization: `Bearer ${ASANA_TOKEN}` } }
    );

    if (!projectsResponse.ok) return [];

    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];

    // Focus on SC: Tasks and SuperChase Live
    const relevantProjects = projects.filter(p =>
      p.name.includes('SC:') || p.name.toLowerCase().includes('superchase')
    );

    const allTasks = [];

    for (const project of relevantProjects.slice(0, 3)) {
      const tasksResponse = await fetch(
        `${ASANA_BASE_URL}/projects/${project.gid}/tasks?opt_fields=name,due_on,completed,notes&completed_since=now&limit=${limit}`,
        { headers: { Authorization: `Bearer ${ASANA_TOKEN}` } }
      );

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        allTasks.push(...tasksData.data.map(t => ({
          name: t.name,
          project: project.name,
          dueOn: t.due_on,
          notes: t.notes?.substring(0, 200)
        })));
      }
    }

    return allTasks.slice(0, limit * 2);
  } catch (error) {
    console.warn('[QueryHub] Asana fetch failed:', error.message);
    return [];
  }
}

/**
 * Get recent audit entries
 */
function getRecentAuditEntries(limit = 10) {
  try {
    const content = readFileSync(PATHS.auditLog, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines.slice(-limit).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Use Gemini to synthesize an answer
 */
async function synthesizeAnswer(query, context, conversationHistory = []) {
  if (!GEMINI_API_KEY) {
    return generateFallbackAnswer(query, context);
  }

  const prompt = buildQueryPrompt(query, context, conversationHistory);

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      return generateFallbackAnswer(query, context);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse as JSON, fall back to text
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch { }

    return {
      answer: text.trim(),
      sources: Object.keys(context).filter(k => context[k] && (Array.isArray(context[k]) ? context[k].length > 0 : true)),
      confidence: 0.7
    };

  } catch (error) {
    console.error('[QueryHub] Gemini error:', error.message);
    return generateFallbackAnswer(query, context);
  }
}

/**
 * Build prompt for Gemini
 */
function buildQueryPrompt(query, context, conversationHistory = []) {
  // Check for high-value people mentioned (in query and recent history)
  const fullText = query + ' ' + conversationHistory.map(m => m.content).join(' ');
  const peopleMentioned = identifyPeopleMentioned(fullText);
  const peopleContext = peopleMentioned.length > 0
    ? `\nHIGH-VALUE PEOPLE MENTIONED:\n${peopleMentioned.map(p => `- ${p.name}: ${p.context} (${p.role})`).join('\n')}\n`
    : '';

  // Build conversation history section
  let conversationSection = '';
  if (conversationHistory.length > 0) {
    conversationSection = `\nRECENT CONVERSATION:
${conversationHistory.map(m => `${m.role === 'user' ? 'Chase' : 'George'}: ${m.content}`).join('\n')}

IMPORTANT: The above conversation provides context. The user's current question may be a follow-up. Stay on the same topic unless they clearly change subjects.
`;
  }

  // Build limitless context section
  let limitlessSection = '';
  if (context.limitless) {
    const l = context.limitless;
    limitlessSection = `
30-DAY BUSINESS INTELLIGENCE:
- Executive Decisions: ${JSON.stringify(l.executiveDecisions || {}).substring(0, 500)}
- Current Friction: ${(l.frictionLog || []).map(f => f.area).join(', ')}
- Top Recurring Topics: ${(l.recurringTopics || []).map(t => t.topic).join(', ')}
- Immediate Actions: ${(l.immediateActions || []).slice(0, 3).join('; ')}
`;

    // Add client intelligence if query mentions a client
    const queryLower = query.toLowerCase();
    if (queryLower.includes('big muddy') || queryLower.includes('tracy') || queryLower.includes('amy')) {
      limitlessSection += `\nBIG MUDDY INN CONTEXT:\n- Contacts: Tracy, Amy\n- Preferences: ${(l.clientIntelligence?.BigMuddy?.preferences || []).join('; ')}\n`;
    }
    if (queryLower.includes('scan2plan') || queryLower.includes('owen') || queryLower.includes('agata')) {
      limitlessSection += `\nSCAN2PLAN CONTEXT:\n- Contacts: Owen, Agata\n- Preferences: ${(l.clientIntelligence?.Scan2Plan?.preferences || []).join('; ')}\n`;
    }
    if (queryLower.includes('purist') || queryLower.includes('patricia') || queryLower.includes('chris')) {
      limitlessSection += `\nPURIST CONTEXT:\n- Contacts: Patricia, Chris\n- Preferences: ${(l.clientIntelligence?.Purist?.preferences || []).join('; ')}\n`;
    }
    if (queryLower.includes('studio c') || queryLower.includes('studioc') || queryLower.includes('miles')) {
      limitlessSection += `\nSTUDIO C CONTEXT:
- Website: StudioC.video
- Business: Production-as-a-Service (video, streaming, virtual production)
- Location: Utopia Studios, Bearsville, NY
- Key Contact: Miles (Technical Director)
- Services: Video production, live streaming, virtual production
- Equipment: Blackmagic 6K, ATEM, Matterport, DJI Ronin 4D
- Packages: $1,500-$4,500/shoot
- Note: This is a SEPARATE business from Scan2Plan
- Preferences: ${(l.clientIntelligence?.StudioC?.preferences || []).join('; ')}\n`;
    }
  }

  return `You are George, an AI executive assistant for Chase Pierson. Answer his question based on the business context below.

QUESTION: "${query}"
${conversationSection}${peopleContext}
BUSINESS CONTEXT:

${context.dailySummary ? `DAILY SUMMARY (${context.dailySummary.generatedAt || 'recent'}):
- Briefing: ${context.dailySummary.briefing || 'No briefing'}
- Urgent emails: ${context.dailySummary.stats?.urgentCount || 0}
- Active tasks: ${context.dailySummary.stats?.taskCount || 0}
` : ''}

${context.tasks.length > 0 ? `CURRENT TASKS:
${context.tasks.map(t => `- [${t.project}] ${t.name}${t.dueOn ? ` (due: ${t.dueOn})` : ''}`).join('\n')}
` : ''}

${context.recentActions.length > 0 ? `RECENT ACTIONS:
${context.recentActions.map(a => `- ${a.action}: ${a.emailSubject || a.subject || 'unknown'} (${a.category})`).join('\n')}
` : ''}

${context.learnings ? `RECENT LEARNINGS:
${context.learnings.substring(0, 500)}
` : ''}

${context.patterns && Object.keys(context.patterns).length > 0 ? `AUTOMATION PATTERNS:
${JSON.stringify(context.patterns, null, 2).substring(0, 300)}
` : ''}
${limitlessSection}
Respond in JSON format:
{
  "answer": "Your conversational response to Chase (2-3 sentences, as George would speak)",
  "sources": ["list", "of", "sources", "used"],
  "confidence": 0.0-1.0
}

CRITICAL INSTRUCTIONS:
- Stay focused on the SPECIFIC business being asked about. If asked about Studio C, discuss ONLY Studio C - not Scan2Plan or other businesses.
- Chase's businesses are SEPARATE entities: Studio C, Scan2Plan, Tuthill Design, CPTV, Big Muddy Inn are all different companies.
- If you don't have specific information about the business being asked about, say so honestly rather than talking about a different business.
- Be conversational, warm, and direct. Use "Sir" occasionally.
- When high-value people are mentioned, provide relevant context about them.`;
}

/**
 * Fallback answer when Gemini unavailable
 */
function generateFallbackAnswer(query, context) {
  const queryLower = query.toLowerCase();

  // Task queries
  if (queryLower.includes('task') || queryLower.includes('todo') || queryLower.includes('work')) {
    if (context.tasks.length > 0) {
      return {
        answer: `You have ${context.tasks.length} active tasks, Sir. The top one is "${context.tasks[0].name}" in ${context.tasks[0].project}.`,
        sources: ['asana'],
        confidence: 0.8
      };
    }
    return {
      answer: "I couldn't fetch your current tasks, Sir. The Asana connection may need attention.",
      sources: [],
      confidence: 0.3
    };
  }

  // Email queries
  if (queryLower.includes('email') || queryLower.includes('inbox') || queryLower.includes('urgent')) {
    const urgentCount = context.dailySummary?.stats?.urgentCount || 0;
    return {
      answer: urgentCount > 0
        ? `You have ${urgentCount} urgent email${urgentCount > 1 ? 's' : ''} flagged, Sir.`
        : "Your inbox is clear of urgent matters, Sir.",
      sources: ['daily_summary'],
      confidence: 0.7
    };
  }

  // Status queries
  if (queryLower.includes('status') || queryLower.includes('how') || queryLower.includes('what')) {
    if (context.dailySummary?.briefing) {
      return {
        answer: context.dailySummary.briefing,
        sources: ['daily_summary'],
        confidence: 0.8
      };
    }
  }

  return {
    answer: "I don't have enough context to answer that specifically, Sir. Could you rephrase the question?",
    sources: [],
    confidence: 0.2
  };
}

/**
 * HTTP handler for API endpoint
 */
export async function handleQueryRequest(req) {
  const { query, options, conversationHistory } = req;

  if (!query) {
    return {
      error: 'Missing required field: query',
      status: 400
    };
  }

  // Merge conversationHistory into options
  const mergedOptions = {
    ...(options || {}),
    conversationHistory: conversationHistory || []
  };

  const result = await queryBusinessContext(query, mergedOptions);

  return {
    ...result,
    status: 200
  };
}

export default {
  queryBusinessContext,
  handleQueryRequest
};

// Test if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const testQuery = process.argv[2] || 'What are my current tasks?';
  console.log(`\nTesting query: "${testQuery}"\n`);

  queryBusinessContext(testQuery).then(result => {
    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));
  });
}

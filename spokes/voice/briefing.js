#!/usr/bin/env node
/**
 * Voice Briefing Generator
 *
 * Generates an executive briefing by:
 * 1. Reading urgent emails from audit log
 * 2. Fetching top tasks from Asana SC: Tasks
 * 3. Using Gemini to distill into 3-sentence natural language summary
 *
 * Output saved to memory/daily_summary.json
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const ASANA_WORKSPACE = process.env.ASANA_WORKSPACE_ID;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';

/**
 * Generate the executive briefing
 */
export async function generateBriefing() {
  console.log('[Briefing] Generating executive briefing...\n');

  // 1. Get urgent emails from audit log
  const urgentEmails = getUrgentEmailsFromAudit();
  console.log(`[Briefing] Found ${urgentEmails.length} urgent emails`);

  // 2. Get top tasks from Asana
  const tasks = await getTopTasks(5);
  console.log(`[Briefing] Found ${tasks.length} active tasks`);

  // 3. Generate natural language briefing via Gemini
  const briefingText = await generateNaturalBriefing(urgentEmails, tasks);

  // 4. Build full summary object
  const summary = {
    generatedAt: new Date().toISOString(),
    briefing: briefingText,
    urgentEmails: urgentEmails.map(e => ({
      subject: e.emailSubject,
      sender: e.emailSender,
      timestamp: e.timestamp
    })),
    topTasks: tasks.map(t => ({
      name: t.name,
      dueOn: t.dueOn,
      id: t.id
    })),
    stats: {
      urgentCount: urgentEmails.length,
      taskCount: tasks.length,
      overdueCount: tasks.filter(t => t.dueOn && new Date(t.dueOn) < new Date()).length
    }
  };

  // 5. Save to memory
  const summaryPath = join(__dirname, '..', '..', 'memory', 'daily_summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log('[Briefing] Saved to memory/daily_summary.json\n');

  return summary;
}

/**
 * Read urgent emails from audit log
 */
function getUrgentEmailsFromAudit() {
  const auditPath = join(__dirname, '..', '..', 'cache', 'audit.jsonl');

  if (!existsSync(auditPath)) {
    return [];
  }

  try {
    const lines = readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean);
    const entries = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Get urgent entries from last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return entries.filter(e =>
      e.category?.includes('URGENT') &&
      new Date(e.timestamp).getTime() > cutoff
    );
  } catch (error) {
    console.warn('[Briefing] Could not read audit log:', error.message);
    return [];
  }
}

/**
 * Fetch top tasks from Asana project
 */
async function getTopTasks(limit = 5) {
  const ASANA_PROJECT = process.env.ASANA_PROJECT_ID;

  if (!ASANA_TOKEN) {
    console.warn('[Briefing] ASANA_ACCESS_TOKEN not set');
    return [];
  }

  if (!ASANA_PROJECT) {
    console.warn('[Briefing] ASANA_PROJECT_ID not set');
    return [];
  }

  try {
    // Fetch incomplete tasks directly from project
    const tasksResponse = await fetch(
      `${ASANA_BASE_URL}/projects/${ASANA_PROJECT}/tasks?opt_fields=name,due_on,completed,notes&completed_since=now&limit=${limit}`,
      { headers: { Authorization: `Bearer ${ASANA_TOKEN}` } }
    );

    if (!tasksResponse.ok) {
      throw new Error('Failed to fetch tasks');
    }

    const tasksData = await tasksResponse.json();
    return tasksData.data.map(t => ({
      id: t.gid,
      name: t.name,
      dueOn: t.due_on,
      notes: t.notes?.substring(0, 200)
    }));
  } catch (error) {
    console.error('[Briefing] Asana error:', error.message);
    return [];
  }
}

/**
 * Use Gemini to generate natural language briefing
 */
async function generateNaturalBriefing(emails, tasks) {
  if (!GEMINI_API_KEY) {
    return generateFallbackBriefing(emails, tasks);
  }

  const prompt = buildBriefingPrompt(emails, tasks);

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300
        }
      })
    });

    if (!response.ok) {
      console.warn('[Briefing] Gemini API error, using fallback');
      return generateFallbackBriefing(emails, tasks);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return text.trim();
  } catch (error) {
    console.warn('[Briefing] Gemini error:', error.message);
    return generateFallbackBriefing(emails, tasks);
  }
}

/**
 * Build the Gemini prompt for briefing generation
 */
function buildBriefingPrompt(emails, tasks) {
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

  let context = `You are George, a professional British butler serving as Chase Pierson's executive assistant. Generate a concise 3-sentence briefing for this ${timeOfDay}.

Speak directly to Chase in second person ("You have..."). Be warm but efficient. Prioritize what needs immediate attention.

DATA:
`;

  if (emails.length > 0) {
    context += `\nURGENT EMAILS (${emails.length}):\n`;
    emails.forEach(e => {
      context += `- "${e.emailSubject}" from ${e.emailSender}\n`;
    });
  } else {
    context += `\nNo urgent emails.\n`;
  }

  if (tasks.length > 0) {
    context += `\nTOP TASKS (${tasks.length}):\n`;
    tasks.forEach(t => {
      const due = t.dueOn ? ` (due: ${t.dueOn})` : '';
      context += `- ${t.name}${due}\n`;
    });
  } else {
    context += `\nNo active tasks.\n`;
  }

  context += `\nGenerate exactly 3 sentences. No greetings like "Good morning" - start directly with the status.`;

  return context;
}

/**
 * Fallback briefing when Gemini is unavailable
 */
function generateFallbackBriefing(emails, tasks) {
  const parts = [];

  if (emails.length > 0) {
    parts.push(`You have ${emails.length} urgent email${emails.length > 1 ? 's' : ''} requiring attention.`);
  } else {
    parts.push('Your inbox is clear of urgent matters.');
  }

  if (tasks.length > 0) {
    const overdue = tasks.filter(t => t.dueOn && new Date(t.dueOn) < new Date());
    if (overdue.length > 0) {
      parts.push(`${overdue.length} task${overdue.length > 1 ? 's are' : ' is'} overdue.`);
    } else {
      parts.push(`You have ${tasks.length} active task${tasks.length > 1 ? 's' : ''} on your plate.`);
    }
    parts.push(`Top priority: "${tasks[0].name}".`);
  } else {
    parts.push('No tasks currently assigned.');
    parts.push('A fine opportunity to plan ahead.');
  }

  return parts.join(' ');
}

/**
 * Get cached briefing from memory
 */
export function getCachedBriefing() {
  const summaryPath = join(__dirname, '..', '..', 'memory', 'daily_summary.json');
  try {
    if (existsSync(summaryPath)) {
      return JSON.parse(readFileSync(summaryPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[Briefing] Could not read cached briefing');
  }
  return null;
}

export default {
  generateBriefing,
  getCachedBriefing
};

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateBriefing().then(summary => {
    console.log('Briefing:', summary.briefing);
  });
}

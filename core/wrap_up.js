#!/usr/bin/env node
/**
 * SuperChase Daily Wrap-Up
 *
 * End-of-day script that:
 * 1. Scans CONSTRUCTION_LOG.md for today's changes
 * 2. Analyzes cache/audit.jsonl for patterns
 * 3. Uses Gemini to distill learnings
 * 4. Updates evolution/LEARNINGS.md
 * 5. Updates memory/patterns.json with new rules
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const PATHS = {
  constructionLog: join(__dirname, '..', 'CONSTRUCTION_LOG.md'),
  auditLog: join(__dirname, '..', 'cache', 'audit.jsonl'),
  learnings: join(__dirname, '..', 'evolution', 'LEARNINGS.md'),
  patterns: join(__dirname, '..', 'memory', 'patterns.json')
};

/**
 * Main wrap-up process
 */
async function runWrapUp() {
  console.log('\n=== SuperChase Daily Wrap-Up ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // 1. Gather today's data
  console.log('[1/4] Gathering data...');
  const constructionLog = readConstructionLog();
  const auditEntries = readAuditLog();
  const existingPatterns = readPatterns();

  console.log(`     Construction entries: ${constructionLog.todayEntries.length}`);
  console.log(`     Audit entries: ${auditEntries.length}`);
  console.log(`     Existing patterns: ${Object.keys(existingPatterns).length}\n`);

  // 2. Analyze patterns in audit data
  console.log('[2/4] Analyzing patterns...');
  const analysis = analyzeAuditData(auditEntries);
  console.log(`     Categories seen: ${Object.keys(analysis.categoryDistribution).join(', ')}`);
  console.log(`     Avg confidence: ${(analysis.avgConfidence * 100).toFixed(0)}%`);
  console.log(`     Actions: ${Object.entries(analysis.actionDistribution).map(([k,v]) => `${k}:${v}`).join(', ')}\n`);

  // 3. Generate learnings via Gemini
  console.log('[3/4] Generating learnings via Gemini...');
  const learnings = await generateLearnings(constructionLog, analysis, existingPatterns);
  console.log(`     Generated ${learnings.insights.length} insights`);
  console.log(`     New patterns: ${learnings.newPatterns.length}\n`);

  // 4. Write outputs
  console.log('[4/4] Writing outputs...');

  // Update LEARNINGS.md
  appendLearnings(learnings);
  console.log('     ✓ Updated evolution/LEARNINGS.md');

  // Update patterns.json
  if (learnings.newPatterns.length > 0) {
    updatePatterns(existingPatterns, learnings.newPatterns);
    console.log('     ✓ Updated memory/patterns.json');
  }

  console.log('\n=== Wrap-Up Complete ===\n');

  // Print summary
  console.log('Today\'s Learnings:');
  learnings.insights.forEach((insight, i) => {
    console.log(`  ${i + 1}. ${insight}`);
  });

  if (learnings.newPatterns.length > 0) {
    console.log('\nNew Patterns Added:');
    learnings.newPatterns.forEach(p => {
      console.log(`  - ${p.name}: ${p.description}`);
    });
  }

  return learnings;
}

/**
 * Read and parse CONSTRUCTION_LOG.md
 */
function readConstructionLog() {
  if (!existsSync(PATHS.constructionLog)) {
    return { content: '', todayEntries: [] };
  }

  const content = readFileSync(PATHS.constructionLog, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  // Find entries from today
  const entryPattern = /## Entry \d+:([^\n]+)\n\n\*\*Date:\*\* (\d{4}-\d{2}-\d{2})/g;
  const todayEntries = [];
  let match;

  while ((match = entryPattern.exec(content)) !== null) {
    if (match[2] === today) {
      todayEntries.push({
        title: match[1].trim(),
        date: match[2]
      });
    }
  }

  return { content, todayEntries };
}

/**
 * Read and parse audit.jsonl
 */
function readAuditLog() {
  if (!existsSync(PATHS.auditLog)) {
    return [];
  }

  const content = readFileSync(PATHS.auditLog, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return lines.map(line => {
    try {
      const entry = JSON.parse(line);
      const entryDate = new Date(entry.timestamp);
      // Only include entries from last 24 hours
      if (entryDate >= today) {
        return entry;
      }
      return null;
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Read patterns.json
 */
function readPatterns() {
  if (!existsSync(PATHS.patterns)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(PATHS.patterns, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Analyze audit data for patterns
 */
function analyzeAuditData(entries) {
  if (entries.length === 0) {
    return {
      categoryDistribution: {},
      actionDistribution: {},
      avgConfidence: 0,
      successRate: 0,
      commonSenders: []
    };
  }

  const categoryDistribution = {};
  const actionDistribution = {};
  const senderCounts = {};
  let totalConfidence = 0;
  let successCount = 0;

  for (const entry of entries) {
    // Category distribution
    const cat = entry.category || 'unknown';
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

    // Action distribution
    const action = entry.action || 'unknown';
    actionDistribution[action] = (actionDistribution[action] || 0) + 1;

    // Confidence
    totalConfidence += entry.confidence || 0;

    // Success rate
    if (entry.result === 'processed' || entry.result === 'success') {
      successCount++;
    }

    // Sender tracking
    const sender = entry.emailSender || entry.sender || 'unknown';
    senderCounts[sender] = (senderCounts[sender] || 0) + 1;
  }

  // Top senders
  const commonSenders = Object.entries(senderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sender, count]) => ({ sender, count }));

  return {
    categoryDistribution,
    actionDistribution,
    avgConfidence: totalConfidence / entries.length,
    successRate: successCount / entries.length,
    commonSenders,
    totalProcessed: entries.length
  };
}

/**
 * Generate learnings using Gemini
 */
async function generateLearnings(constructionLog, analysis, existingPatterns) {
  if (!GEMINI_API_KEY) {
    return generateFallbackLearnings(constructionLog, analysis);
  }

  const prompt = buildLearningsPrompt(constructionLog, analysis, existingPatterns);

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      console.warn('[Wrap-up] Gemini API error, using fallback');
      return generateFallbackLearnings(constructionLog, analysis);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return parseLearningsResponse(text, analysis);

  } catch (error) {
    console.warn('[Wrap-up] Gemini error:', error.message);
    return generateFallbackLearnings(constructionLog, analysis);
  }
}

/**
 * Build prompt for Gemini learnings generation
 */
function buildLearningsPrompt(constructionLog, analysis, existingPatterns) {
  return `You are analyzing a day's work on SuperChase, an AI executive assistant system.

TODAY'S CONSTRUCTION LOG ENTRIES:
${constructionLog.todayEntries.map(e => `- ${e.title}`).join('\n') || 'No new entries'}

AUDIT DATA ANALYSIS:
- Total emails processed: ${analysis.totalProcessed || 0}
- Categories: ${JSON.stringify(analysis.categoryDistribution)}
- Actions taken: ${JSON.stringify(analysis.actionDistribution)}
- Average classification confidence: ${((analysis.avgConfidence || 0) * 100).toFixed(0)}%
- Success rate: ${((analysis.successRate || 0) * 100).toFixed(0)}%
- Top senders: ${analysis.commonSenders?.map(s => s.sender).join(', ') || 'None'}

EXISTING PATTERNS:
${JSON.stringify(existingPatterns, null, 2)}

Generate a JSON response with:
1. "insights": Array of 3-5 brief learnings from today (strings)
2. "newPatterns": Array of new automation patterns to add (each with "name", "description", "trigger", "action")

Focus on:
- What worked well
- What could be automated
- Patterns in sender behavior
- Classification accuracy improvements

Respond ONLY with valid JSON, no markdown.`;
}

/**
 * Parse Gemini's response
 */
function parseLearningsResponse(text, analysis) {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        insights: parsed.insights || [],
        newPatterns: parsed.newPatterns || [],
        analysis
      };
    }
  } catch (e) {
    console.warn('[Wrap-up] Failed to parse Gemini response');
  }

  return generateFallbackLearnings({ todayEntries: [] }, analysis);
}

/**
 * Fallback learnings when Gemini unavailable
 */
function generateFallbackLearnings(constructionLog, analysis) {
  const insights = [];

  if (analysis.totalProcessed > 0) {
    insights.push(`Processed ${analysis.totalProcessed} emails with ${(analysis.avgConfidence * 100).toFixed(0)}% average confidence`);
  }

  if (analysis.categoryDistribution?.NEWSLETTER > 2) {
    insights.push(`High newsletter volume (${analysis.categoryDistribution.NEWSLETTER}) - consider bulk unsubscribe`);
  }

  if (analysis.successRate >= 0.9) {
    insights.push('High success rate indicates stable triage pipeline');
  }

  if (constructionLog.todayEntries.length > 0) {
    insights.push(`Completed ${constructionLog.todayEntries.length} construction log entries`);
  }

  return {
    insights: insights.length > 0 ? insights : ['No significant patterns detected today'],
    newPatterns: [],
    analysis
  };
}

/**
 * Append learnings to LEARNINGS.md
 */
function appendLearnings(learnings) {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();

  const markdown = `
## Daily Wrap-Up: ${today}

**Generated:** ${timestamp}

### Insights

${learnings.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

### Statistics

- Emails processed: ${learnings.analysis.totalProcessed || 0}
- Average confidence: ${((learnings.analysis.avgConfidence || 0) * 100).toFixed(0)}%
- Success rate: ${((learnings.analysis.successRate || 0) * 100).toFixed(0)}%

${learnings.newPatterns.length > 0 ? `### New Patterns Added

${learnings.newPatterns.map(p => `- **${p.name}**: ${p.description}`).join('\n')}` : ''}

---
`;

  appendFileSync(PATHS.learnings, markdown);
}

/**
 * Update patterns.json with new patterns
 */
function updatePatterns(existing, newPatterns) {
  const updated = { ...existing };

  for (const pattern of newPatterns) {
    const key = pattern.name.toLowerCase().replace(/\s+/g, '_');
    updated[key] = {
      name: pattern.name,
      description: pattern.description,
      trigger: pattern.trigger,
      action: pattern.action,
      created: new Date().toISOString()
    };
  }

  writeFileSync(PATHS.patterns, JSON.stringify(updated, null, 2));
}

export default { runWrapUp };

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runWrapUp().catch(error => {
    console.error('Wrap-up failed:', error);
    process.exit(1);
  });
}

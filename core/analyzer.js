#!/usr/bin/env node
/**
 * SuperChase Analyzer - Cross-Business Leverage Detection
 *
 * Analyzes context to find synergies between:
 * - Scan2Plan (tech/product)
 * - Studio C (production/media)
 * - Tuthill Design (creative/brand)
 * - CPTV (distribution/network)
 *
 * Outputs actionable leverage opportunities.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const PATHS = {
  limitlessContext: join(__dirname, '..', 'memory', 'limitless_context.json'),
  patterns: join(__dirname, '..', 'memory', 'patterns.json'),
  dailySummary: join(__dirname, '..', 'memory', 'daily_summary.json'),
  roadmap: join(__dirname, '..', 'ROADMAP.md')
};

/**
 * Load all available context
 */
function loadContext() {
  const context = {};

  if (existsSync(PATHS.limitlessContext)) {
    context.limitless = JSON.parse(readFileSync(PATHS.limitlessContext, 'utf8'));
  }

  if (existsSync(PATHS.patterns)) {
    context.patterns = JSON.parse(readFileSync(PATHS.patterns, 'utf8'));
  }

  if (existsSync(PATHS.dailySummary)) {
    context.daily = JSON.parse(readFileSync(PATHS.dailySummary, 'utf8'));
  }

  return context;
}

/**
 * Analyze cross-business leverage opportunities
 */
async function analyzeLeverage(context) {
  const prompt = `You are a strategic business analyst for Chase Pierson's portfolio of companies.

PORTFOLIO:
1. **Scan2Plan** - Reality capture & 3D scanning services. Tech: React, Node, PostgreSQL. Building Scan2Plan OS (CRM, CPQ, Project Management).
2. **Studio C** - Production-as-a-service. Video, streaming, virtual production at Utopia Studios.
3. **Tuthill Design** - Editorial vision, methodology, taste. "Editions" model for scalable design.
4. **CPTV Inc.** - Personal brand, content distribution, local media networks.

CONTEXT FROM LAST 30 DAYS:
${JSON.stringify(context.limitless || {}, null, 2)}

TASK: Identify cross-business leverage opportunities. Look for:
1. **Tech → Media**: How can Scan2Plan tech enhance Studio C productions?
2. **Media → Sales**: How can Studio C content drive Scan2Plan leads?
3. **Templates → Scale**: What Studio C templates could be productized for other businesses?
4. **Network → Distribution**: How does CPTV amplify reach for all businesses?
5. **Design → Brand**: How does Tuthill elevate positioning across portfolio?

OUTPUT FORMAT (JSON):
{
  "leverageOpportunities": [
    {
      "id": "short-id",
      "title": "Opportunity title",
      "fromBusiness": "Source business",
      "toBusiness": "Target business",
      "mechanism": "How the leverage works",
      "effort": "low/medium/high",
      "impact": "low/medium/high",
      "actionItems": ["specific next step 1", "specific next step 2"]
    }
  ],
  "quickWins": [
    "Thing that can be done this week with existing resources"
  ],
  "blockers": [
    "What's preventing leverage right now"
  ],
  "recommendation": "Single most important leverage play to execute first"
}`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Could not parse response');
  } catch (error) {
    console.error('[Analyzer] Error:', error.message);
    return null;
  }
}

/**
 * Generate prioritized roadmap
 */
async function generateRoadmap(context, leverage) {
  const buildNow = context.limitless?.immediateActions || [];
  const someday = context.limitless?.somedayProjects || [];
  const friction = context.limitless?.frictionLog || [];

  const roadmapContent = `# SuperChase Roadmap

> Auto-generated from 30-day Limitless context analysis
> Last updated: ${new Date().toISOString()}

## Executive Summary

**Top Recurring Topics:**
${(context.limitless?.recurringTopics || []).map(t => `- ${t.topic} (${t.occurrences} mentions)`).join('\n')}

**Primary Recommendation:** ${leverage?.recommendation || 'Complete analysis pending'}

---

## Build Now (This Week)

${buildNow.map((item, i) => `### ${i + 1}. ${item}`).join('\n\n')}

---

## Friction to Resolve

| Area | Symptom | Impact |
|------|---------|--------|
${friction.map(f => `| ${f.area} | ${f.symptom} | ${f.impact} |`).join('\n')}

---

## Cross-Business Leverage Opportunities

${(leverage?.leverageOpportunities || []).map(opp => `
### ${opp.title}
- **From:** ${opp.fromBusiness} → **To:** ${opp.toBusiness}
- **Mechanism:** ${opp.mechanism}
- **Effort:** ${opp.effort} | **Impact:** ${opp.impact}
- **Actions:**
${opp.actionItems.map(a => `  - ${a}`).join('\n')}
`).join('\n')}

---

## Quick Wins (This Week)

${(leverage?.quickWins || []).map(w => `- ${w}`).join('\n')}

---

## Someday / Maybe

| Project | Status | Description |
|---------|--------|-------------|
${someday.map(p => `| ${p.title} | ${p.status} | ${p.description} |`).join('\n')}

---

## Blockers

${(leverage?.blockers || []).map(b => `- ${b}`).join('\n')}

---

## Key People

| Name | Context | Priority |
|------|---------|----------|
${Object.entries(context.limitless?.highValuePeople || {}).map(([name, info]) => `| ${name} | ${info.context} - ${info.role} | ${info.priority} |`).join('\n')}

---

*Generated by SuperChase Analyzer v1.0*
`;

  writeFileSync(PATHS.roadmap, roadmapContent);
  return roadmapContent;
}

/**
 * Main analysis function
 */
async function runAnalysis() {
  console.log('\n=== SuperChase Business Analyzer ===\n');

  console.log('[1/4] Loading context...');
  const context = loadContext();

  if (!context.limitless) {
    console.error('No Limitless context found. Run ingest first.');
    process.exit(1);
  }

  console.log(`      Found: ${Object.keys(context.limitless.highValuePeople || {}).length} key people`);
  console.log(`      Found: ${(context.limitless.recurringTopics || []).length} recurring topics`);
  console.log(`      Found: ${(context.limitless.somedayProjects || []).length} someday projects`);

  console.log('\n[2/4] Analyzing cross-business leverage...');
  const leverage = await analyzeLeverage(context);

  if (leverage) {
    console.log(`      Found: ${leverage.leverageOpportunities?.length || 0} leverage opportunities`);
    console.log(`      Found: ${leverage.quickWins?.length || 0} quick wins`);
  }

  console.log('\n[3/4] Generating roadmap...');
  await generateRoadmap(context, leverage);
  console.log('      ✓ Written to ROADMAP.md');

  console.log('\n[4/4] Updating patterns...');
  if (leverage) {
    const patterns = existsSync(PATHS.patterns)
      ? JSON.parse(readFileSync(PATHS.patterns, 'utf8'))
      : {};

    patterns.crossBusinessLeverage = {
      opportunities: leverage.leverageOpportunities,
      quickWins: leverage.quickWins,
      recommendation: leverage.recommendation,
      analyzedAt: new Date().toISOString()
    };

    writeFileSync(PATHS.patterns, JSON.stringify(patterns, null, 2));
    console.log('      ✓ Updated patterns.json');
  }

  console.log('\n=== Analysis Complete ===\n');

  if (leverage?.recommendation) {
    console.log('TOP RECOMMENDATION:');
    console.log(`  ${leverage.recommendation}\n`);
  }

  if (leverage?.quickWins?.length > 0) {
    console.log('QUICK WINS THIS WEEK:');
    leverage.quickWins.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  }

  return { context, leverage };
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAnalysis();
}

export { runAnalysis, analyzeLeverage, loadContext };

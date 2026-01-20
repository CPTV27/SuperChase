#!/usr/bin/env node
/**
 * Brainstorm Spoke - Limitless Export Ingestion
 *
 * Ingests conversation transcripts from Limitless and extracts:
 * - Action items → Asana tasks
 * - Key insights → Memory/learnings
 * - Topics discussed → Tags for searchability
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const MEMORY_DIR = join(__dirname, '..', '..', 'memory', 'brainstorms');

/**
 * Extract insights from transcript using Gemini
 */
async function analyzeTranscript(text, filename) {
  const prompt = `You are analyzing a conversation transcript for an executive assistant system.

Extract the following from this transcript:

1. **Action Items**: Tasks that need to be done (who, what, when if mentioned)
2. **Key Decisions**: Important decisions made during the conversation
3. **Ideas**: Creative ideas or concepts worth remembering
4. **People Mentioned**: Names and their context
5. **Follow-ups**: Things to circle back on later

Transcript:
${text.substring(0, 15000)}

Respond in JSON format:
{
  "title": "Brief title for this conversation",
  "date": "YYYY-MM-DD if mentioned, otherwise null",
  "participants": ["list of people"],
  "actionItems": [
    {"task": "description", "assignee": "person or null", "priority": "high/medium/low", "dueDate": "if mentioned"}
  ],
  "decisions": ["decision 1", "decision 2"],
  "ideas": ["idea 1", "idea 2"],
  "followUps": ["follow up 1"],
  "summary": "2-3 sentence summary of the conversation",
  "tags": ["relevant", "topic", "tags"]
}`;

  try {
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
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Could not parse Gemini response');
  } catch (error) {
    console.error('[Brainstorm] Analysis error:', error.message);
    return null;
  }
}

/**
 * Create Asana tasks from action items
 */
async function createTasksFromActions(actionItems, sourceTitle) {
  // Dynamic import to avoid circular dependencies
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
        console.log(`  ✓ Created task: ${item.task.substring(0, 50)}...`);
      } catch (e) {
        console.error(`  ✗ Failed to create task: ${e.message}`);
      }
    }
  }
  return created;
}

/**
 * Save brainstorm to memory
 */
function saveBrainstorm(analysis, filename, rawText) {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const slug = (analysis.title || filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);

  const outputPath = join(MEMORY_DIR, `${timestamp}_${slug}.json`);

  const record = {
    ...analysis,
    sourceFile: filename,
    ingestedAt: new Date().toISOString(),
    rawTextLength: rawText.length
  };

  writeFileSync(outputPath, JSON.stringify(record, null, 2));
  console.log(`  ✓ Saved to: ${outputPath}`);

  return outputPath;
}

/**
 * Main ingestion function
 */
async function ingest(filePath) {
  console.log('\n=== Brainstorm Ingestion ===\n');

  // Resolve path
  const resolvedPath = filePath.startsWith('/')
    ? filePath
    : join(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
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
    console.error('Failed to analyze transcript');
    process.exit(1);
  }

  console.log(`      Title: ${analysis.title}`);
  console.log(`      Action items: ${analysis.actionItems?.length || 0}`);
  console.log(`      Decisions: ${analysis.decisions?.length || 0}`);
  console.log(`      Ideas: ${analysis.ideas?.length || 0}`);

  console.log('\n[3/4] Creating tasks for high/medium priority items...');
  const tasks = await createTasksFromActions(analysis.actionItems || [], analysis.title);
  console.log(`      Created ${tasks.length} tasks in Asana`);

  console.log('\n[4/4] Saving to memory...');
  const savedPath = saveBrainstorm(analysis, filename, rawText);

  console.log('\n=== Ingestion Complete ===\n');
  console.log('Summary:', analysis.summary);
  console.log('\nTags:', analysis.tags?.join(', ') || 'None');

  if (analysis.followUps?.length > 0) {
    console.log('\nFollow-ups:');
    analysis.followUps.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  return analysis;
}

// CLI execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node spokes/brainstorm/ingest.js <path-to-transcript>');
  console.log('');
  console.log('Supported formats:');
  console.log('  - Limitless export (.txt)');
  console.log('  - Plain text transcripts');
  console.log('  - Meeting notes');
  process.exit(0);
}

ingest(args[0]);

export { ingest, analyzeTranscript };

#!/usr/bin/env node
/**
 * SuperChase Email Triage - Main Entry Point
 *
 * Fetches unread emails → Classifies via Hub → Creates tasks in Asana
 *
 * Usage: node triage.js [--dry-run]
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appendFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import hub from './core/hub.js';
import gmail from './spokes/gmail/triage.js';
import asana from './spokes/asana/pusher.js';
import sheets from './spokes/sheets/logger.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SHEET_ID = process.env.SHEET_ID;

/**
 * Main triage flow
 */
async function runTriage() {
  console.log('\n=== SuperChase Email Triage ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Gmail configured: ${gmail.isConfigured()}`);
  console.log(`Sheets configured: ${sheets.isConfigured()}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results = {
    processed: 0,
    tasksCreated: 0,
    archived: 0,
    errors: []
  };

  try {
    // 1. Fetch unread emails
    console.log('[1/4] Fetching unread emails...');
    const emails = await gmail.fetchUnreadEmails(5);
    console.log(`     Found ${emails.length} emails\n`);

    if (emails.length === 0) {
      console.log('No emails to process.');
      return results;
    }

    // 2. Classify each email
    console.log('[2/4] Classifying emails...');
    const classified = [];
    for (const email of emails) {
      const classification = await hub.classify({
        type: 'email',
        subject: email.subject,
        body: email.body,
        sender: email.sender
      });
      classified.push({ email, classification });
      console.log(`     ${email.subject.substring(0, 40)}...`);
      console.log(`       → ${classification.category} (${(classification.confidence * 100).toFixed(0)}%)\n`);
    }

    // 3. Execute actions
    console.log('[3/4] Executing actions...');
    for (const { email, classification } of classified) {
      results.processed++;

      try {
        if (classification.action === 'create_task') {
          if (DRY_RUN) {
            console.log(`     [DRY RUN] Would create task: ${email.subject}`);
          } else {
            const task = await asana.createTask({
              name: email.subject,
              notes: `From: ${email.sender}\n\n${email.snippet || email.body?.substring(0, 500)}`,
              priority: classification.priority,
              source: 'gmail',
              metadata: {
                emailId: email.id,
                category: classification.category,
                confidence: classification.confidence
              }
            });
            console.log(`     ✓ Created task: ${task.name}`);
            console.log(`       ${task.url}`);
            results.tasksCreated++;

            // Mark email as read after creating task
            if (!email.mock) {
              await gmail.markAsRead(email.id);
            }
          }
        } else if (classification.action === 'archive') {
          if (DRY_RUN) {
            console.log(`     [DRY RUN] Would archive: ${email.subject}`);
          } else if (!email.mock) {
            await gmail.archiveEmail(email.id);
            console.log(`     ✓ Archived: ${email.subject.substring(0, 40)}...`);
            results.archived++;
          }
        } else {
          console.log(`     → Logged (FYI): ${email.subject.substring(0, 40)}...`);
        }

        // Log to audit (local + Sheets)
        const auditEntry = {
          timestamp: new Date().toISOString(),
          action: classification.action,
          subject: email.subject,
          sender: email.sender,
          category: classification.category,
          confidence: classification.confidence,
          source: 'gmail',
          result: DRY_RUN ? 'dry_run' : 'processed'
        };

        await logAudit(auditEntry);

        // Push to Google Sheets in real-time
        if (!DRY_RUN && sheets.isConfigured()) {
          await sheets.logTriageEvent(auditEntry);
        }

      } catch (error) {
        console.error(`     ✗ Error processing: ${email.subject}`);
        console.error(`       ${error.message}`);
        results.errors.push({ email: email.subject, error: error.message });
      }
    }

    // 4. Update daily summary
    console.log('\n[4/4] Updating daily summary...');
    const summary = hub.getDailySummary();
    hub.updateDailySummary({
      ...summary,
      lastTriage: {
        timestamp: new Date().toISOString(),
        processed: results.processed,
        tasksCreated: results.tasksCreated,
        archived: results.archived
      },
      recentEmails: classified.map(c => ({
        subject: c.email.subject,
        category: c.classification.category,
        action: c.classification.action
      }))
    });

    // Print summary
    console.log('\n=== Summary ===');
    console.log(`Processed: ${results.processed}`);
    console.log(`Tasks created: ${results.tasksCreated}`);
    console.log(`Archived: ${results.archived}`);
    console.log(`Errors: ${results.errors.length}`);

    return results;

  } catch (error) {
    console.error('\n[ERROR] Triage failed:', error.message);
    results.errors.push({ stage: 'main', error: error.message });

    // Log failure to learnings
    logLearning({
      timestamp: new Date().toISOString(),
      type: 'TRIAGE_FAILURE',
      error: error.message,
      stack: error.stack
    });

    return results;
  }
}

/**
 * Log to local audit trail (cache/audit.jsonl)
 */
async function logAudit(entry) {
  const auditPath = join(__dirname, 'cache', 'audit.jsonl');

  // Ensure cache directory exists
  const cacheDir = join(__dirname, 'cache');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  // Normalize entry format for local storage
  const localEntry = {
    timestamp: entry.timestamp,
    action: entry.action,
    category: entry.category,
    confidence: entry.confidence,
    emailSubject: entry.subject,
    emailSender: entry.sender,
    source: entry.source,
    result: entry.result
  };

  appendFileSync(auditPath, JSON.stringify(localEntry) + '\n');
}

/**
 * Log failures to learnings file
 */
function logLearning(entry) {
  const learningsPath = join(__dirname, 'evolution', 'LEARNINGS.md');

  const markdown = `
## ${entry.type} - ${entry.timestamp}

**Error:** ${entry.error}

\`\`\`
${entry.stack || 'No stack trace'}
\`\`\`

---
`;

  appendFileSync(learningsPath, markdown);
}

// Run if called directly
runTriage().then(results => {
  if (results.errors.length > 0) {
    process.exit(1);
  }
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Orchestrator CLI
 *
 * Command-line interface for running multi-agent workflows.
 *
 * Usage:
 *   node orchestrator-cli.js list                    # List workflow templates
 *   node orchestrator-cli.js agents                  # List available agents
 *   node orchestrator-cli.js run microsite @tuthill  # Run microsite workflow
 *   node orchestrator-cli.js status <traceId>        # Check workflow status
 *   node orchestrator-cli.js resume <traceId> --approve
 *
 * @module core/orchestrator-cli
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

import { orchestrator, agentRegistry, AgentState } from './orchestrator.js';
import { registerAllAgents } from './agents/index.js';
import { createWorkflow, listWorkflowTemplates, assembleMicrositeData, assembleContentSprint } from './workflows/index.js';
import fs from 'fs';

// Ensure agents are registered
registerAllAgents();

const args = process.argv.slice(2);
const command = args[0];

function parseBusinessId(arg) {
  if (!arg) return null;
  return arg.startsWith('@') ? arg.slice(1) : arg;
}

function printHelp() {
  console.log(`
Multi-Agent Orchestrator CLI

Usage:
  orchestrate list                          List workflow templates
  orchestrate agents                        List available agents
  orchestrate run <template> @business      Run a workflow
  orchestrate status <traceId>              Check workflow status
  orchestrate resume <traceId> [--approve|--reject]

Options:
  --dry-run              Don't execute agents, just show plan
  --no-checkpoint        Skip HITL checkpoints
  --depth <level>        Depth for content workflow (quick/standard/deep)
  --template <type>      Template type for microsite (landing/portfolio/service)

Examples:
  orchestrate run microsite @tuthill --template landing
  orchestrate run content @s2p --depth standard
  orchestrate run research @bigmuddy --focus "lodging market"
`);
}

async function main() {
  try {
    switch (command) {
      case 'list': {
        const templates = listWorkflowTemplates();
        console.log('\nAvailable Workflow Templates:\n');
        for (const t of templates) {
          console.log(`  ${t.name.padEnd(15)} ${t.description}`);
        }
        console.log('');
        break;
      }

      case 'agents': {
        const agents = agentRegistry.list();
        console.log('\nRegistered Agents:\n');
        for (const a of agents) {
          console.log(`  ${a.type.padEnd(15)} ${a.name}`);
          console.log(`  ${''.padEnd(15)} ${a.description}`);
          console.log('');
        }
        break;
      }

      case 'run': {
        const templateName = args[1];
        const businessId = parseBusinessId(args[2]);

        if (!templateName || !businessId) {
          console.error('Usage: orchestrate run <template> @business');
          process.exit(1);
        }

        // Parse options
        const dryRun = args.includes('--dry-run');
        const noCheckpoint = args.includes('--no-checkpoint');

        const depthIdx = args.indexOf('--depth');
        const depth = depthIdx > -1 ? args[depthIdx + 1] : 'standard';

        const templateTypeIdx = args.indexOf('--template');
        const templateType = templateTypeIdx > -1 ? args[templateTypeIdx + 1] : 'landing';

        const focusIdx = args.indexOf('--focus');
        const focus = focusIdx > -1 ? args.slice(focusIdx + 1).join(' ') : null;

        console.log(`\nRunning workflow: ${templateName}`);
        console.log(`Business: ${businessId}`);
        if (dryRun) console.log('Mode: DRY RUN');
        console.log('');

        // Create workflow
        const workflow = createWorkflow(templateName, {
          businessId,
          templateType,
          depth,
          focus,
        });

        // Show execution plan
        const layers = workflow.getExecutionLayers();
        console.log('Execution Plan:');
        layers.forEach((layer, i) => {
          console.log(`  Stage ${i + 1}: ${layer.join(', ')}`);
        });
        console.log('');

        // Execute
        const ctx = await orchestrator.execute(workflow, {
          inputs: { businessId },
          dryRun,
          pauseOnCheckpoint: !noCheckpoint,
        });

        // Show results
        const summary = ctx.getSummary();
        console.log('\n=== WORKFLOW RESULT ===\n');
        console.log(`Trace ID: ${summary.traceId}`);
        console.log(`Status: ${summary.status}`);
        console.log(`Progress: ${summary.progress.completed}/${summary.progress.total} agents`);
        console.log(`Duration: ${summary.duration}ms`);
        console.log(`Cost: $${summary.costs.actual.toFixed(4)}`);

        if (summary.status === 'paused') {
          console.log(`\nPaused at checkpoint. Resume with:`);
          console.log(`  orchestrate resume ${summary.traceId} --approve`);
        }

        if (summary.errors && Object.keys(summary.errors).length > 0) {
          console.log('\nErrors:');
          for (const [agent, error] of Object.entries(summary.errors)) {
            console.log(`  ${agent}: ${error}`);
          }
        }

        // Save outputs
        if (!dryRun && summary.status === 'completed') {
          const outputDir = join(__dirname, '..', 'memory', 'workflows', businessId);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const outputPath = join(outputDir, `${summary.traceId}.json`);
          fs.writeFileSync(outputPath, JSON.stringify({
            ...summary,
            outputs: ctx.outputs ? Object.fromEntries(ctx.outputs) : {},
          }, null, 2));

          console.log(`\nOutput saved: ${outputPath}`);

          // Assemble template-specific output
          if (templateName === 'microsite') {
            const data = assembleMicrositeData(Object.fromEntries(ctx.outputs), { businessId });
            const dataPath = join(outputDir, `${summary.traceId}-data.json`);
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            console.log(`Microsite data: ${dataPath}`);
          }
        }

        break;
      }

      case 'status': {
        const traceId = args[1];
        if (!traceId) {
          console.error('Usage: orchestrate status <traceId>');
          process.exit(1);
        }

        const status = orchestrator.getStatus(traceId);
        if (!status) {
          console.log(`No active workflow found: ${traceId}`);
        } else {
          console.log(JSON.stringify(status, null, 2));
        }
        break;
      }

      case 'resume': {
        const traceId = args[1];
        const approve = args.includes('--approve');
        const reject = args.includes('--reject');

        if (!traceId) {
          console.error('Usage: orchestrate resume <traceId> [--approve|--reject]');
          process.exit(1);
        }

        if (!approve && !reject) {
          console.error('Must specify --approve or --reject');
          process.exit(1);
        }

        const feedbackIdx = args.indexOf('--feedback');
        const feedback = feedbackIdx > -1 ? args.slice(feedbackIdx + 1).join(' ') : null;

        console.log(`Resuming workflow: ${traceId}`);
        console.log(`Decision: ${approve ? 'APPROVED' : 'REJECTED'}`);

        const ctx = await orchestrator.resume(traceId, approve, feedback);
        const summary = ctx.getSummary();

        console.log('\nResult:');
        console.log(`Status: ${summary.status}`);
        console.log(`Progress: ${summary.progress.completed}/${summary.progress.total}`);

        break;
      }

      case 'active': {
        const active = orchestrator.listActive();
        if (active.length === 0) {
          console.log('No active workflows');
        } else {
          console.log('\nActive Workflows:\n');
          for (const w of active) {
            console.log(`  ${w.traceId}`);
            console.log(`    Workflow: ${w.workflow}`);
            console.log(`    Status: ${w.status}`);
            console.log(`    Progress: ${w.progress.completed}/${w.progress.total}`);
            console.log('');
          }
        }
        break;
      }

      case 'help':
      case '--help':
      case '-h':
      default:
        printHelp();
        break;
    }
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

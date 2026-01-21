#!/usr/bin/env node
/**
 * Project Agent System
 *
 * Autonomous agent teams that work on specific projects/businesses.
 * Each project gets a dedicated agent context with:
 * - GST (Goals, Strategies, Tactics) manifest
 * - Business intelligence from Limitless
 * - Current tasks (via TaskProvider)
 * - Historical decisions and learnings
 *
 * Agents can:
 * - Analyze current state
 * - Propose strategy updates
 * - Generate content briefs
 * - Queue actions for human approval
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Project configurations
const PROJECTS = {
  studioc: {
    id: 'studioc',
    name: 'Studio C',
    description: 'Production-as-a-Service business at Utopia Studios',
    gstPath: join(__dirname, '..', 'memory', 'projects', 'studioc_gst.json'),
    color: '#8b0000'
  },
  s2p: {
    id: 's2p',
    name: 'Scan2Plan',
    description: 'Reality capture and 3D scanning services',
    gstPath: join(__dirname, '..', 'memory', 'projects', 's2p_gst.json'),
    color: '#3b82f6'
  },
  bigmuddy: {
    id: 'bigmuddy',
    name: 'Big Muddy Inn',
    description: 'Boutique hotel with blues heritage focus',
    gstPath: join(__dirname, '..', 'memory', 'projects', 'bigmuddy_gst.json'),
    color: '#8b4513'
  },
  cptv: {
    id: 'cptv',
    name: 'Chase Pierson TV',
    description: 'Personal brand and content platform',
    gstPath: join(__dirname, '..', 'memory', 'projects', 'cptv_gst.json'),
    color: '#a855f7'
  },
  tuthill: {
    id: 'tuthill',
    name: 'Tuthill Design',
    description: 'Design methodology and editions model',
    gstPath: join(__dirname, '..', 'memory', 'projects', 'tuthill_gst.json'),
    color: '#f97316'
  },
  utopia: {
    id: 'utopia',
    name: 'Utopia Studios',
    description: 'Physical studio space and venue',
    gstPath: join(__dirname, '..', 'memory', 'projects', 'utopia_gst.json'),
    color: '#4a7c59'
  }
};

// Agent personas
const AGENT_PERSONAS = {
  strategist: {
    name: 'Strategist',
    role: 'Analyzes market position, identifies opportunities, develops high-level strategy',
    prompt: `You are the Strategist agent. Your role is to:
- Analyze the current business position and market context
- Identify growth opportunities and competitive advantages
- Develop high-level strategic recommendations
- Align tactics with overarching goals
Be specific, actionable, and data-driven in your analysis.`
  },
  copywriter: {
    name: 'Copywriter',
    role: 'Creates content briefs, messaging frameworks, and draft copy',
    prompt: `You are the Copywriter agent. Your role is to:
- Develop content briefs based on strategic priorities
- Create messaging frameworks that resonate with target audiences
- Draft copy for various channels (blog, social, email)
- Maintain brand voice consistency
Be creative but strategic, always tying content back to business goals.`
  },
  analyst: {
    name: 'Analyst',
    role: 'Reviews performance, identifies patterns, surfaces insights',
    prompt: `You are the Analyst agent. Your role is to:
- Review recent performance and activity
- Identify patterns and trends
- Surface actionable insights
- Recommend optimizations based on data
Be thorough but concise, focusing on insights that drive decisions.`
  },
  executor: {
    name: 'Executor',
    role: 'Creates actionable task lists and implementation plans',
    prompt: `You are the Executor agent. Your role is to:
- Break down strategies into concrete tasks
- Create implementation timelines
- Identify dependencies and blockers
- Prioritize actions by impact and effort
Be practical and specific, with clear ownership and deadlines.`
  }
};

/**
 * Load project context
 */
function loadProjectContext(projectId) {
  const project = PROJECTS[projectId];
  if (!project) {
    throw new Error(`Unknown project: ${projectId}`);
  }

  const context = {
    project,
    gst: null,
    intelligence: null,
    recentActivity: []
  };

  // Load GST manifest
  if (existsSync(project.gstPath)) {
    try {
      context.gst = JSON.parse(readFileSync(project.gstPath, 'utf8'));
    } catch (e) {
      console.warn(`[ProjectAgent] Could not load GST for ${projectId}`);
    }
  }

  // Load limitless intelligence
  const limitlessPath = join(__dirname, '..', 'memory', 'limitless_context.json');
  if (existsSync(limitlessPath)) {
    try {
      const limitless = JSON.parse(readFileSync(limitlessPath, 'utf8'));

      // Extract project-specific intelligence
      const projectKey = projectId === 's2p' ? 'Scan2Plan' :
                        projectId === 'studioc' ? 'StudioC' :
                        projectId === 'bigmuddy' ? 'BigMuddy' :
                        projectId === 'cptv' ? 'CPTV' :
                        projectId === 'tuthill' ? 'Tuthill' :
                        projectId === 'utopia' ? 'Utopia' : projectId;

      context.intelligence = {
        clientData: limitless.clientIntelligence?.[projectKey] || null,
        decisions: limitless.executiveDecisions?.[projectKey] || [],
        recurringTopics: limitless.recurringTopics?.filter(t =>
          t.topic.toLowerCase().includes(project.name.toLowerCase())
        ) || [],
        friction: limitless.frictionLog?.filter(f =>
          f.area.toLowerCase().includes(project.name.toLowerCase()) ||
          f.area.toLowerCase().includes(projectId)
        ) || [],
        somedayProjects: limitless.somedayProjects?.filter(p =>
          p.title.toLowerCase().includes(project.name.toLowerCase()) ||
          p.id.toLowerCase().includes(projectId)
        ) || []
      };
    } catch (e) {
      console.warn(`[ProjectAgent] Could not load limitless context`);
    }
  }

  return context;
}

/**
 * Run a specific agent on a project
 */
async function runAgent(projectId, agentType, task, options = {}) {
  const { conversationHistory = [] } = options;

  console.log(`[ProjectAgent] Running ${agentType} agent on ${projectId}: "${task}"`);

  const context = loadProjectContext(projectId);
  const persona = AGENT_PERSONAS[agentType];

  if (!persona) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  const prompt = buildAgentPrompt(context, persona, task, conversationHistory);

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse as JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          projectId,
          agent: agentType,
          task,
          ...result,
          rawResponse: text
        };
      }
    } catch (e) {
      // Return as text if not JSON
    }

    return {
      success: true,
      projectId,
      agent: agentType,
      task,
      response: text,
      structured: false
    };

  } catch (error) {
    console.error(`[ProjectAgent] Error:`, error.message);
    return {
      success: false,
      projectId,
      agent: agentType,
      task,
      error: error.message
    };
  }
}

/**
 * Run the full agent team on a project
 */
async function runAgentTeam(projectId, task, options = {}) {
  console.log(`[ProjectAgent] Running full agent team on ${projectId}: "${task}"`);

  const results = {
    projectId,
    task,
    timestamp: new Date().toISOString(),
    agents: {}
  };

  // Run strategist first
  results.agents.strategist = await runAgent(projectId, 'strategist', task, options);

  // Use strategist output to inform other agents
  const strategistContext = results.agents.strategist.response ||
                           results.agents.strategist.analysis || '';

  const enrichedOptions = {
    ...options,
    conversationHistory: [
      ...(options.conversationHistory || []),
      { role: 'assistant', content: `Strategist analysis: ${strategistContext}` }
    ]
  };

  // Run other agents in parallel
  const [copywriter, analyst, executor] = await Promise.all([
    runAgent(projectId, 'copywriter', task, enrichedOptions),
    runAgent(projectId, 'analyst', task, enrichedOptions),
    runAgent(projectId, 'executor', task, enrichedOptions)
  ]);

  results.agents.copywriter = copywriter;
  results.agents.analyst = analyst;
  results.agents.executor = executor;

  // Save results
  saveAgentResults(projectId, results);

  return results;
}

/**
 * Build the prompt for an agent
 */
function buildAgentPrompt(context, persona, task, conversationHistory = []) {
  const { project, gst, intelligence } = context;

  let gstSection = '';
  if (gst) {
    gstSection = `
PROJECT GST (Goals, Strategies, Tactics):
${JSON.stringify(gst, null, 2)}
`;
  }

  let intelligenceSection = '';
  if (intelligence) {
    intelligenceSection = `
BUSINESS INTELLIGENCE:
${intelligence.clientData ? `Client Preferences: ${JSON.stringify(intelligence.clientData)}` : ''}
${intelligence.decisions?.length ? `Executive Decisions: ${JSON.stringify(intelligence.decisions)}` : ''}
${intelligence.recurringTopics?.length ? `Recurring Topics: ${intelligence.recurringTopics.map(t => t.topic).join(', ')}` : ''}
${intelligence.friction?.length ? `Current Friction: ${intelligence.friction.map(f => f.area + ': ' + f.symptom).join('; ')}` : ''}
${intelligence.somedayProjects?.length ? `Someday Projects: ${intelligence.somedayProjects.map(p => p.title).join(', ')}` : ''}
`;
  }

  let historySection = '';
  if (conversationHistory.length > 0) {
    historySection = `
CONVERSATION CONTEXT:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}
`;
  }

  return `${persona.prompt}

PROJECT: ${project.name}
DESCRIPTION: ${project.description}
${gstSection}
${intelligenceSection}
${historySection}

TASK: ${task}

Respond in JSON format:
{
  "analysis": "Your analysis of the situation (2-3 paragraphs)",
  "recommendations": ["List of specific recommendations"],
  "actions": [
    {
      "action": "Specific action to take",
      "priority": "high|medium|low",
      "owner": "Who should do this",
      "timeline": "When this should happen"
    }
  ],
  "contentIdeas": ["Content ideas if applicable"],
  "risks": ["Potential risks or concerns"],
  "nextSteps": "Immediate next step"
}

Be specific to ${project.name}. Reference actual data from the context. Avoid generic advice.`;
}

/**
 * Save agent results to file
 */
function saveAgentResults(projectId, results) {
  const outputDir = join(__dirname, '..', 'memory', 'agent_outputs');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${projectId}_${Date.now()}.json`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`[ProjectAgent] Results saved to ${filename}`);

  return filepath;
}

/**
 * HTTP handler for API endpoint
 */
export async function handleProjectAgentRequest(req) {
  const { projectId, task, agentType, runFullTeam } = req;

  if (!projectId) {
    return { error: 'Missing required field: projectId', status: 400 };
  }

  if (!task) {
    return { error: 'Missing required field: task', status: 400 };
  }

  if (!PROJECTS[projectId]) {
    return {
      error: `Unknown project: ${projectId}. Valid projects: ${Object.keys(PROJECTS).join(', ')}`,
      status: 400
    };
  }

  try {
    let result;

    if (runFullTeam) {
      result = await runAgentTeam(projectId, task);
    } else {
      const agent = agentType || 'strategist';
      result = await runAgent(projectId, agent, task);
    }

    return { ...result, status: 200 };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
}

/**
 * Get available projects
 */
export function getProjects() {
  return Object.values(PROJECTS).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color
  }));
}

export default {
  runAgent,
  runAgentTeam,
  handleProjectAgentRequest,
  getProjects,
  PROJECTS,
  AGENT_PERSONAS
};

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectId = process.argv[2] || 'studioc';
  const task = process.argv[3] || 'Develop a Q1 marketing strategy';
  const fullTeam = process.argv.includes('--team');

  console.log(`\n🤖 Project Agent System`);
  console.log(`Project: ${projectId}`);
  console.log(`Task: ${task}`);
  console.log(`Mode: ${fullTeam ? 'Full Team' : 'Strategist Only'}\n`);

  const run = fullTeam ? runAgentTeam : (p, t) => runAgent(p, 'strategist', t);

  run(projectId, task).then(result => {
    console.log('\n📊 Results:');
    console.log(JSON.stringify(result, null, 2));
  });
}

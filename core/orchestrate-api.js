/**
 * Orchestrator API
 *
 * Conversational command center that:
 * 1. Takes natural language questions
 * 2. Generates research briefs
 * 3. Dispatches to council (multi-model)
 * 4. Streams responses in real-time
 * 5. Synthesizes and stores results
 *
 * @module core/orchestrate-api
 */

import { createLogger, generateTraceId } from '../lib/logger.js';
import { queryLLM, estimateCost } from '../lib/llm-client.js';
import * as opennotebook from '../lib/opennotebook.js';
import * as costController from '../lib/cost-controller.js';
import { ValidationError } from '../lib/errors.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger({ module: 'orchestrate-api' });

// Council models - each brings different strengths
const COUNCIL_MODELS = {
  grok: {
    id: 'x-ai/grok-4-fast',
    name: 'Grok',
    color: '🔴',
    strength: 'Real-time data, X/Twitter context, contrarian views'
  },
  gemini: {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini',
    color: '🟡',
    strength: 'Broad knowledge, business context, market analysis'
  },
  gpt4: {
    id: 'openai/gpt-4o',
    name: 'GPT-4',
    color: '🔵',
    strength: 'Deep reasoning, technical analysis, structured thinking'
  },
  claude: {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude',
    color: '🟣',
    strength: 'Synthesis, nuance, strategic recommendations'
  }
};

// Synthesizer model (final aggregation)
const SYNTHESIZER_MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * Generate a research brief from a natural language question
 */
async function generateResearchBrief(question, context = {}) {
  const briefPrompt = `You are a research brief generator. Given a question, create a structured research brief that will be sent to multiple AI models for analysis.

Question: ${question}

${context.businessId ? `Business Context: ${context.businessId}` : ''}
${context.additionalContext ? `Additional Context: ${context.additionalContext}` : ''}

Generate a research brief with:
1. **Core Question**: Restate the question clearly
2. **Research Angles**: 3-4 specific angles to investigate
3. **Key Terms**: Important terms/concepts to explore
4. **Success Criteria**: What would a good answer include?

Output as JSON:
{
  "coreQuestion": "...",
  "researchAngles": ["...", "..."],
  "keyTerms": ["...", "..."],
  "successCriteria": ["...", "..."]
}`;

  const response = await queryLLM({
    model: 'openai/gpt-4o-mini',
    prompt: briefPrompt,
    temperature: 0.3,
    maxTokens: 500
  });

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    logger.warn('Failed to parse research brief JSON', { error: e.message });
  }

  // Fallback: return structured brief from question
  return {
    coreQuestion: question,
    researchAngles: ['Market analysis', 'Technical feasibility', 'Competitive landscape'],
    keyTerms: question.split(' ').filter(w => w.length > 4),
    successCriteria: ['Actionable insights', 'Specific recommendations', 'Risk assessment']
  };
}

/**
 * Dispatch question to a single council member
 */
async function dispatchToCouncilMember(memberId, member, brief, onChunk) {
  const prompt = `You are ${member.name}, an AI council member. Your strength is: ${member.strength}

A research brief has been generated for the following question:

**Core Question**: ${brief.coreQuestion}

**Research Angles to Consider**:
${brief.researchAngles.map((a, i) => `${i + 1}. ${a}`).join('\n')}

**Key Terms**: ${brief.keyTerms.join(', ')}

**Success Criteria**: ${brief.successCriteria.join(', ')}

Provide your analysis focusing on your area of strength. Be concise but insightful. Include:
- Your key insight (1-2 sentences)
- Supporting evidence or reasoning (2-3 points)
- One contrarian consideration or risk

Keep response under 300 words.`;

  const startTime = Date.now();

  try {
    const response = await queryLLM({
      model: member.id,
      prompt,
      temperature: 0.7,
      maxTokens: 600,
      stream: false // TODO: Add streaming support
    });

    const timing = Date.now() - startTime;

    // Notify of completion
    if (onChunk) {
      onChunk({
        type: 'council_response',
        memberId,
        memberName: member.name,
        color: member.color,
        response,
        timing
      });
    }

    return {
      memberId,
      memberName: member.name,
      color: member.color,
      strength: member.strength,
      response,
      timing,
      model: member.id
    };
  } catch (error) {
    logger.error('Council member failed', { memberId, error: error.message });

    if (onChunk) {
      onChunk({
        type: 'council_error',
        memberId,
        memberName: member.name,
        color: member.color,
        error: error.message
      });
    }

    return {
      memberId,
      memberName: member.name,
      color: member.color,
      error: error.message
    };
  }
}

/**
 * Synthesize council responses into final answer
 */
async function synthesizeResponses(question, brief, councilResponses, onChunk) {
  const successfulResponses = councilResponses.filter(r => !r.error);

  if (successfulResponses.length === 0) {
    return {
      synthesis: 'All council members failed to respond. Please try again.',
      confidence: 'low',
      recommendations: []
    };
  }

  const synthesisPrompt = `You are the Chief Synthesis Officer. Your job is to aggregate insights from multiple AI council members and provide a unified, actionable response.

**Original Question**: ${question}

**Research Brief**:
- Core Question: ${brief.coreQuestion}
- Research Angles: ${brief.researchAngles.join(', ')}

**Council Responses**:

${successfulResponses.map(r => {
  // Extract content from response object if needed
  const content = typeof r.response === 'object' ? (r.response.content || JSON.stringify(r.response)) : r.response;
  return `### ${r.color} ${r.memberName} (${r.strength})
${content}
`;
}).join('\n')}

Synthesize these perspectives into:

1. **Executive Summary** (2-3 sentences): The key insight that emerges from combining these perspectives

2. **Consensus Points**: Where do the council members agree?

3. **Divergent Views**: Where do they disagree or offer contrasting perspectives?

4. **Recommended Actions**: 2-3 specific next steps

5. **Confidence Level**: How confident should we be in this synthesis? (high/medium/low)

6. **What We Don't Know**: Key uncertainties or gaps in the analysis

Be direct and actionable. This is for a decision-maker who needs to move fast.`;

  if (onChunk) {
    onChunk({ type: 'synthesizing', message: 'Synthesizing council responses...' });
  }

  const startTime = Date.now();

  const response = await queryLLM({
    model: SYNTHESIZER_MODEL,
    prompt: synthesisPrompt,
    temperature: 0.5,
    maxTokens: 1000
  });

  const timing = Date.now() - startTime;

  if (onChunk) {
    onChunk({
      type: 'synthesis_complete',
      synthesis: response,
      timing
    });
  }

  return {
    synthesis: response,
    timing,
    model: SYNTHESIZER_MODEL
  };
}

/**
 * Main orchestration handler
 *
 * @param {string} question - Natural language question
 * @param {object} options - Orchestration options
 * @param {function} onEvent - Callback for streaming events
 * @returns {object} Complete orchestration result
 */
export async function orchestrate(question, options = {}, onEvent = null) {
  const traceId = generateTraceId('orch');
  const startTime = Date.now();

  logger.info('Orchestration starting', { traceId, question: question.substring(0, 100) });

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new ValidationError('Question is required');
  }

  // Notify: starting
  if (onEvent) {
    onEvent({ type: 'start', traceId, question });
  }

  // Pre-flight cost check
  const estimatedCost = estimateCost('gpt-4o', 2000, 2000) * 5; // Rough estimate for full council
  const preFlightResult = costController.preFlightCheck(estimatedCost);

  if (!preFlightResult.allowed) {
    throw new ValidationError(`Budget exceeded: ${preFlightResult.reason}`);
  }

  // Create OpenNotebook session
  let notebookId = null;
  if (opennotebook.isAvailable()) {
    notebookId = await opennotebook.initWorkflow(traceId, 'Council Session', {
      question,
      businessId: options.businessId
    });
  }

  try {
    // Step 1: Generate research brief
    if (onEvent) {
      onEvent({ type: 'generating_brief', message: 'Generating research brief...' });
    }

    const brief = await generateResearchBrief(question, {
      businessId: options.businessId,
      additionalContext: options.context
    });

    if (onEvent) {
      onEvent({ type: 'brief_ready', brief });
    }

    // Step 2: Dispatch to council (parallel)
    if (onEvent) {
      onEvent({ type: 'dispatching', message: 'Dispatching to council...', members: Object.keys(COUNCIL_MODELS) });
    }

    const councilPromises = Object.entries(COUNCIL_MODELS).map(([id, member]) =>
      dispatchToCouncilMember(id, member, brief, onEvent)
    );

    const councilResponses = await Promise.all(councilPromises);

    // Step 3: Synthesize
    const synthesis = await synthesizeResponses(question, brief, councilResponses, onEvent);

    // Calculate total cost
    const totalCost = councilResponses.reduce((sum, r) => {
      if (r.model) {
        return sum + estimateCost(r.model, 500, 300);
      }
      return sum;
    }, 0) + estimateCost(SYNTHESIZER_MODEL, 1500, 500);

    const totalTime = Date.now() - startTime;

    // Build result
    const result = {
      traceId,
      question,
      brief,
      council: councilResponses,
      synthesis: synthesis.synthesis,
      meta: {
        totalTime,
        totalCost,
        modelsUsed: councilResponses.filter(r => !r.error).map(r => r.model),
        successCount: councilResponses.filter(r => !r.error).length,
        failCount: councilResponses.filter(r => r.error).length
      }
    };

    // Store in OpenNotebook
    if (notebookId) {
      await opennotebook.storeAgentOutput(notebookId, 'council-session', result, {
        timing: totalTime,
        cost: totalCost
      });
      await opennotebook.updateWorkflowStatus(notebookId, 'completed', {
        question,
        modelsUsed: result.meta.modelsUsed.length
      });
    }

    // Store locally
    await storeResult(traceId, result);

    // Final event
    if (onEvent) {
      onEvent({ type: 'complete', result });
    }

    logger.info('Orchestration complete', {
      traceId,
      totalTime,
      totalCost,
      successCount: result.meta.successCount
    });

    return result;

  } catch (error) {
    logger.error('Orchestration failed', { traceId, error: error.message });

    if (notebookId) {
      await opennotebook.updateWorkflowStatus(notebookId, 'failed', {
        error: error.message
      });
    }

    if (onEvent) {
      onEvent({ type: 'error', error: error.message });
    }

    throw error;
  }
}

/**
 * Store orchestration result locally
 */
async function storeResult(traceId, result) {
  const dir = path.join(process.cwd(), 'memory', 'council');
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${traceId}.json`);
  await fs.writeFile(filePath, JSON.stringify(result, null, 2));

  logger.debug('Result stored', { filePath });
}

/**
 * List recent council sessions
 */
export async function listSessions(limit = 10) {
  const dir = path.join(process.cwd(), 'memory', 'council');

  try {
    const files = await fs.readdir(dir);
    const sessions = [];

    for (const file of files.slice(-limit)) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        const session = JSON.parse(content);
        sessions.push({
          traceId: session.traceId,
          question: session.question,
          time: session.meta?.totalTime,
          cost: session.meta?.totalCost,
          successCount: session.meta?.successCount
        });
      }
    }

    return sessions.reverse();
  } catch (error) {
    return [];
  }
}

/**
 * Get a specific session by trace ID
 */
export async function getSession(traceId) {
  const filePath = path.join(process.cwd(), 'memory', 'council', `${traceId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Export council configuration for frontend
export const councilConfig = COUNCIL_MODELS;

export default {
  orchestrate,
  listSessions,
  getSession,
  councilConfig
};

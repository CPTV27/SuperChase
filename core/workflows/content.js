/**
 * Content Sprint Workflow
 *
 * Multi-agent workflow for generating a content sprint:
 * social posts, blog outlines, email sequences.
 *
 * Flow:
 *   Research ──> Analyst (trends) ──┐
 *                                   ├──> Architect (plan) ──> Copywriter (batch) ──> Editor
 *   Research ──> Analyst (audience) ┘
 *
 * @module core/workflows/content
 */

import { WorkflowDefinition } from '../orchestrator.js';
import { AgentTypes } from '../agents/index.js';

/**
 * Create a content sprint workflow
 * @param {object} options
 * @param {string} options.businessId - Business unit ID
 * @param {string} options.depth - Depth level (quick, standard, deep)
 * @param {string[]} options.formats - Content formats to generate
 * @returns {WorkflowDefinition}
 */
export function createContentWorkflow(options = {}) {
  const {
    businessId,
    depth = 'standard',
    formats = ['social', 'blog', 'email'],
  } = options;

  const workflow = new WorkflowDefinition({
    id: 'content-sprint',
    name: 'Content Sprint',
    description: `Generate content sprint for ${businessId}`,
    metadata: { businessId, depth, formats },
  });

  // Stage 1: Research (foundation)
  workflow.addAgent('research', {
    type: AgentTypes.RESEARCH,
    inputs: {
      businessId,
      focus: 'content marketing and audience engagement',
    },
  });

  // Stage 2: Parallel analysis
  workflow.addAgent('trend-analysis', {
    type: AgentTypes.ANALYST,
    dependsOn: ['research'],
    inputs: {
      analysisType: 'market',
      question: 'What content topics are trending and underserved in this market?',
    },
    inputMap: {
      data: 'research',
      context: 'research.competitiveAdvantages',
    },
  });

  workflow.addAgent('audience-analysis', {
    type: AgentTypes.ANALYST,
    dependsOn: ['research'],
    inputs: {
      analysisType: 'market',
      question: 'What content formats and topics resonate most with the target audience?',
    },
    inputMap: {
      data: 'research',
    },
  });

  // Stage 3: Content architecture
  workflow.addAgent('content-plan', {
    type: AgentTypes.ARCHITECT,
    dependsOn: ['trend-analysis', 'audience-analysis'],
    inputs: {
      designType: 'content',
      objective: `Create a ${depth} content sprint plan`,
    },
    inputMap: {
      research: 'research',
      targetAudience: 'audience-analysis',
    },
    checkpoint: true, // HITL: Approve content plan before writing
  });

  // Stage 4: Content generation (parallel by format)
  if (formats.includes('social')) {
    workflow.addAgent('social-copy', {
      type: AgentTypes.COPYWRITER,
      dependsOn: ['content-plan'],
      inputs: {
        format: 'social',
        topic: 'Pillar content topics',
        constraints: {
          postsPerPillar: depth === 'quick' ? 2 : depth === 'deep' ? 5 : 3,
        },
      },
      inputMap: {
        brandVoice: 'research.brandVoice',
        keyMessages: 'research.keyMessages',
        topic: 'content-plan.pillars',
      },
    });
  }

  if (formats.includes('blog')) {
    workflow.addAgent('blog-copy', {
      type: AgentTypes.COPYWRITER,
      dependsOn: ['content-plan'],
      inputs: {
        format: 'blog',
        topic: 'Pillar blog posts',
      },
      inputMap: {
        brandVoice: 'research.brandVoice',
        keyMessages: 'research.keyMessages',
        topic: 'content-plan.pillars',
      },
    });
  }

  if (formats.includes('email')) {
    workflow.addAgent('email-copy', {
      type: AgentTypes.COPYWRITER,
      dependsOn: ['content-plan'],
      inputs: {
        format: 'email',
        topic: 'Nurture sequence',
      },
      inputMap: {
        brandVoice: 'research.brandVoice',
        keyMessages: 'research.keyMessages',
      },
    });
  }

  // Stage 5: Editorial review
  const copyDeps = formats.map(f => `${f}-copy`).filter(d =>
    workflow.agents.has(d)
  );

  if (copyDeps.length > 0) {
    workflow.addAgent('editor', {
      type: AgentTypes.EDITOR,
      dependsOn: copyDeps,
      inputs: {
        purpose: 'Content sprint editorial review',
      },
      inputMap: {
        brandVoice: 'research.brandVoice',
      },
      checkpoint: true, // HITL: Final approval
    });
  }

  return workflow;
}

/**
 * Assemble content sprint from workflow outputs
 */
export function assembleContentSprint(outputs, options = {}) {
  const { businessId } = options;

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    research: outputs.research,
    plan: outputs['content-plan'],
    content: {
      social: outputs['social-copy'],
      blog: outputs['blog-copy'],
      email: outputs['email-copy'],
    },
    editorial: outputs.editor,
  };
}

export default {
  createContentWorkflow,
  assembleContentSprint,
};

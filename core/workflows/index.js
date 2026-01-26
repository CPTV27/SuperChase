/**
 * Workflow Templates Index
 *
 * Pre-defined workflow templates for common capabilities.
 *
 * @module core/workflows
 */

export * from './microsite.js';
export * from './content.js';

import { createMicrositeWorkflow, assembleMicrositeData } from './microsite.js';
import { createContentWorkflow, assembleContentSprint } from './content.js';
import { WorkflowDefinition } from '../orchestrator.js';
import { AgentTypes } from '../agents/index.js';
import { ValidationError } from '../../lib/errors.js';

/**
 * Validate workflow options
 * @param {object} options - Workflow options
 * @param {string[]} required - Required field names
 * @throws {ValidationError} If required fields are missing
 */
function validateWorkflowOptions(options, required) {
  const missing = required.filter(field => !options[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required workflow options: ${missing.join(', ')}`);
  }
}

/**
 * Research Brief Workflow
 *
 * Simple workflow for generating a research brief.
 *
 * @param {object} options - Workflow options
 * @param {string} options.businessId - Required business unit ID
 * @param {string} [options.focus] - Optional focus area
 * @throws {ValidationError} If businessId is missing
 */
export function createResearchWorkflow(options = {}) {
  validateWorkflowOptions(options, ['businessId']);
  const { businessId, focus } = options;

  const workflow = new WorkflowDefinition({
    id: 'research-brief',
    name: 'Research Brief',
    description: `Generate research brief for ${businessId}`,
    metadata: { businessId },
  });

  workflow.addAgent('research', {
    type: AgentTypes.RESEARCH,
    inputs: { businessId, focus },
  });

  workflow.addAgent('analysis', {
    type: AgentTypes.ANALYST,
    dependsOn: ['research'],
    inputs: {
      analysisType: 'swot',
      question: focus || 'Provide comprehensive strategic analysis',
    },
    inputMap: {
      data: 'research',
    },
  });

  return workflow;
}

/**
 * Competitive Analysis Workflow
 *
 * Research + Analysis for competitive positioning.
 *
 * @param {object} options - Workflow options
 * @param {string} options.businessId - Required business unit ID
 * @throws {ValidationError} If businessId is missing
 */
export function createCompetitiveWorkflow(options = {}) {
  validateWorkflowOptions(options, ['businessId']);
  const { businessId } = options;

  const workflow = new WorkflowDefinition({
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    description: `Competitive analysis for ${businessId}`,
    metadata: { businessId },
  });

  workflow.addAgent('research', {
    type: AgentTypes.RESEARCH,
    inputs: {
      businessId,
      focus: 'competitive landscape and positioning',
    },
  });

  workflow.addAgent('competitive-analysis', {
    type: AgentTypes.ANALYST,
    dependsOn: ['research'],
    inputs: {
      analysisType: 'competitive',
      question: 'How should we position against competitors?',
    },
    inputMap: {
      data: 'research',
    },
  });

  workflow.addAgent('offer-design', {
    type: AgentTypes.ARCHITECT,
    dependsOn: ['competitive-analysis'],
    inputs: {
      designType: 'offer',
      objective: 'Design differentiated offer based on competitive gaps',
    },
    inputMap: {
      research: 'research',
      constraints: 'competitive-analysis.classification',
    },
    checkpoint: true,
  });

  return workflow;
}

/**
 * Available workflow templates
 */
export const WorkflowTemplates = {
  microsite: createMicrositeWorkflow,
  content: createContentWorkflow,
  research: createResearchWorkflow,
  competitive: createCompetitiveWorkflow,
};

/**
 * Create workflow from template name
 */
export function createWorkflow(templateName, options = {}) {
  const factory = WorkflowTemplates[templateName];
  if (!factory) {
    throw new Error(`Unknown workflow template: ${templateName}`);
  }
  return factory(options);
}

/**
 * List available templates
 */
export function listWorkflowTemplates() {
  return Object.keys(WorkflowTemplates).map(name => ({
    name,
    description: {
      microsite: 'Generate microsite content (landing, portfolio, service)',
      content: 'Generate content sprint (social, blog, email)',
      research: 'Generate research brief with analysis',
      competitive: 'Competitive analysis with offer design',
    }[name],
  }));
}

export default {
  createMicrositeWorkflow,
  assembleMicrositeData,
  createContentWorkflow,
  assembleContentSprint,
  createResearchWorkflow,
  createCompetitiveWorkflow,
  WorkflowTemplates,
  createWorkflow,
  listWorkflowTemplates,
};

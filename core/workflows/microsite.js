/**
 * Microsite Generation Workflow
 *
 * Multi-agent workflow for generating high-quality microsite content.
 *
 * Flow:
 *   Research (context) ──┐
 *                        ├──> Architect (structure) ──> Copywriter (content) ──> Editor (review)
 *   Analyst (audience)  ──┘
 *
 * @module core/workflows/microsite
 */

import { WorkflowDefinition } from '../orchestrator.js';
import { AgentTypes } from '../agents/index.js';

/**
 * Create a microsite generation workflow
 * @param {object} options
 * @param {string} options.businessId - Business unit ID
 * @param {string} options.templateType - Template type (landing, portfolio, service)
 * @param {object} options.customContent - Custom content overrides
 * @returns {WorkflowDefinition}
 */
export function createMicrositeWorkflow(options = {}) {
  const { businessId, templateType = 'landing', customContent = {} } = options;

  const workflow = new WorkflowDefinition({
    id: `microsite-${templateType}`,
    name: `Microsite Generation (${templateType})`,
    description: `Generate ${templateType} microsite content for ${businessId}`,
    metadata: { businessId, templateType },
  });

  // Stage 1: Parallel research (runs concurrently)
  workflow.addAgent('research', {
    type: AgentTypes.RESEARCH,
    inputs: {
      businessId,
      focus: `${templateType} page content`,
    },
  });

  workflow.addAgent('audience-analysis', {
    type: AgentTypes.ANALYST,
    inputs: {
      businessId,
      analysisType: 'market',
      question: 'Who is the target audience and what are their key pain points and desires?',
    },
    inputMap: {
      context: 'research',
    },
    dependsOn: ['research'],
  });

  // Stage 2: Architecture (depends on research)
  workflow.addAgent('architect', {
    type: AgentTypes.ARCHITECT,
    dependsOn: ['research', 'audience-analysis'],
    inputs: {
      designType: 'microsite',
      objective: `Create a high-converting ${templateType} page`,
    },
    inputMap: {
      research: 'research',
      targetAudience: 'audience-analysis.targetAudience',
    },
    checkpoint: true, // HITL: Review structure before copywriting
  });

  // Stage 3: Copywriting (depends on architecture)
  workflow.addAgent('hero-copy', {
    type: AgentTypes.COPYWRITER,
    dependsOn: ['architect'],
    inputs: {
      format: 'hero',
      topic: customContent.topic || 'Main value proposition',
    },
    inputMap: {
      brandVoice: 'research.brandVoice',
      keyMessages: 'research.keyMessages',
      targetAudience: 'audience-analysis.targetAudience',
    },
  });

  workflow.addAgent('features-copy', {
    type: AgentTypes.COPYWRITER,
    dependsOn: ['architect'],
    inputs: {
      format: 'landing',
      topic: 'Features and benefits',
    },
    inputMap: {
      brandVoice: 'research.brandVoice',
      research: 'research',
    },
  });

  workflow.addAgent('cta-copy', {
    type: AgentTypes.COPYWRITER,
    dependsOn: ['architect'],
    inputs: {
      format: 'headline',
      topic: 'Call to action and contact section',
    },
    inputMap: {
      brandVoice: 'research.brandVoice',
    },
  });

  // Stage 4: Editorial review (depends on all copy)
  workflow.addAgent('editor', {
    type: AgentTypes.EDITOR,
    dependsOn: ['hero-copy', 'features-copy', 'cta-copy'],
    inputs: {
      purpose: `${templateType} page for ${businessId}`,
    },
    inputMap: {
      content: 'hero-copy',
      brandVoice: 'research.brandVoice',
      targetAudience: 'audience-analysis.targetAudience',
    },
    checkpoint: true, // HITL: Final review before assembly
  });

  return workflow;
}

/**
 * Assemble microsite data from workflow outputs
 * @param {object} outputs - Workflow execution outputs
 * @param {object} options - Assembly options
 * @returns {object} Assembled data.json for template
 */
export function assembleMicrositeData(outputs, options = {}) {
  const { businessId } = options;

  const research = outputs.research || {};
  const architect = outputs.architect || {};
  const heroCopy = outputs['hero-copy'] || {};
  const featuresCopy = outputs['features-copy'] || {};
  const ctaCopy = outputs['cta-copy'] || {};
  const editor = outputs.editor || {};

  // Use edited content if available, otherwise original
  const finalHero = editor.revised?.hero || heroCopy;
  const finalFeatures = editor.revised?.features || featuresCopy;

  return {
    brand: {
      colors: research.brandVoice?.colors || {},
      fonts: research.brandVoice?.fonts || {},
      voice: research.brandVoice || {},
    },
    config: {
      id: businessId,
      name: research.businessSummary?.split('.')[0] || businessId,
    },
    content: {
      meta: {
        title: architect.structure?.seo?.title || `${businessId} | Landing Page`,
        description: architect.structure?.seo?.description || '',
      },
      hero: {
        headline: finalHero.headline || 'Welcome',
        subheadline: finalHero.subheadline || '',
        cta: architect.ctas?.primary || { text: 'Get Started', href: '#contact' },
        secondaryCta: architect.ctas?.secondary,
      },
      features: {
        title: 'What We Offer',
        items: finalFeatures.sections?.filter(s => s.type === 'features')
          .flatMap(s => s.content?.items || []) || [],
      },
      testimonials: { items: [] },
      contact: {
        title: ctaCopy.headlines?.[0] || 'Get in Touch',
        subtitle: research.keyMessages?.[0] || '',
      },
    },
    _workflow: {
      scores: editor.scores,
      suggestions: editor.feedback?.suggestions,
    },
  };
}

export default {
  createMicrositeWorkflow,
  assembleMicrositeData,
};

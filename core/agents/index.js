/**
 * Agent Registry Index
 *
 * Exports all agents and registers them with the orchestrator.
 *
 * @module core/agents
 */

import { agentRegistry } from '../orchestrator.js';

// Import all agents
import { researchAgent } from './research.js';
import { copywriterAgent } from './copywriter.js';
import { editorAgent } from './editor.js';
import { analystAgent } from './analyst.js';
import { architectAgent } from './architect.js';

// Re-export base utilities
export * from './base.js';

// Export individual agents
export { researchAgent } from './research.js';
export { copywriterAgent } from './copywriter.js';
export { editorAgent } from './editor.js';
export { analystAgent } from './analyst.js';
export { architectAgent } from './architect.js';

/**
 * Register all agents with the orchestrator
 */
export function registerAllAgents() {
  agentRegistry.register('research', researchAgent);
  agentRegistry.register('copywriter', copywriterAgent);
  agentRegistry.register('editor', editorAgent);
  agentRegistry.register('analyst', analystAgent);
  agentRegistry.register('architect', architectAgent);

  return agentRegistry;
}

/**
 * Agent type constants for workflow definitions
 */
export const AgentTypes = {
  RESEARCH: 'research',
  COPYWRITER: 'copywriter',
  EDITOR: 'editor',
  ANALYST: 'analyst',
  ARCHITECT: 'architect',
};

// NOTE: Auto-registration removed to avoid side effects on import.
// Call registerAllAgents() explicitly in your entry point (e.g., orchestrator-cli.js, server.js)

export default {
  registerAllAgents,
  AgentTypes,
  researchAgent,
  copywriterAgent,
  editorAgent,
  analystAgent,
  architectAgent,
};

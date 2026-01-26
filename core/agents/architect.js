/**
 * Architect Agent
 *
 * Designs strategies, structures, and action plans.
 * Uses Hormozi frameworks for offers and growth strategies.
 *
 * @module core/agents/architect
 */

import { createAgent } from './base.js';

/**
 * Architect Agent Definition
 */
export const architectAgent = createAgent({
  name: 'Architect Agent',
  description: 'Designs strategies, offers, and action plans using proven frameworks',
  model: 'claude-sonnet',
  temperature: 0.5,

  systemPrompt: `You are a strategic architect using Alex Hormozi's frameworks and first-principles thinking.

**FRAMEWORKS YOU USE:**
1. Grand Slam Offer: Dream Outcome × Perceived Likelihood / Time × Effort
2. Value Equation: Make the offer so good people feel stupid saying no
3. Blue Ocean: Find uncontested market space
4. 80/20: Focus on the 20% that drives 80% of results

**YOUR APPROACH:**
1. Start with the end customer transformation
2. Work backwards to required actions
3. Make everything specific and measurable
4. Include timelines and owners
5. Build in feedback loops
6. Keep it simple enough to execute

Return only valid JSON.`,

  promptTemplate: (inputs) => {
    const {
      designType,
      objective,
      research,
      constraints,
      targetAudience,
      existingAssets,
    } = inputs;

    const designInstructions = {
      offer: `Design a Grand Slam Offer with dream outcome, timeframe, effort level, and risk reversal`,
      funnel: `Design a conversion funnel from awareness to purchase`,
      content: `Design a content strategy with pillars, cadence, and distribution`,
      outreach: `Design an outreach campaign with targeting, messaging, and sequences`,
      launch: `Design a launch plan with phases, milestones, and contingencies`,
      microsite: `Design a microsite structure with pages, sections, and CTAs`,
    };

    return `**DESIGN TYPE:** ${designType || 'strategy'}

**OBJECTIVE:**
${objective}

**RESEARCH/CONTEXT:**
${research ? JSON.stringify(research, null, 2) : 'None provided'}

**CONSTRAINTS:**
${constraints ? JSON.stringify(constraints, null, 2) : 'None specified'}

**TARGET AUDIENCE:**
${targetAudience || 'Not specified'}

**EXISTING ASSETS:**
${existingAssets ? JSON.stringify(existingAssets) : 'None specified'}

**DESIGN INSTRUCTIONS:**
${designInstructions[designType] || 'Create a comprehensive strategic design'}

Return JSON based on design type:

For "offer":
{
  "grandSlamOffer": {
    "headline": "compelling one-liner",
    "dreamOutcome": "what they get",
    "timeframe": "how fast",
    "effort": "how easy",
    "riskReversal": "guarantee",
    "bonuses": ["bonus 1", "bonus 2"],
    "priceAnchor": "compared to..."
  },
  "positioning": "market position statement",
  "differentiators": ["diff 1", "diff 2"]
}

For "microsite":
{
  "structure": {
    "pages": ["page 1", "page 2"],
    "sections": [
      {"type": "hero", "purpose": "...", "content": {...}},
      {"type": "features", "purpose": "...", "content": {...}}
    ]
  },
  "ctas": {
    "primary": {"text": "...", "action": "..."},
    "secondary": {"text": "...", "action": "..."}
  },
  "seo": {
    "title": "...",
    "description": "...",
    "keywords": ["kw1", "kw2"]
  }
}

For "content":
{
  "pillars": [
    {"topic": "...", "angle": "...", "formats": ["blog", "social"]}
  ],
  "cadence": {
    "weekly": {"blog": 1, "social": 5, "email": 1}
  },
  "calendar": [
    {"week": 1, "content": [{"title": "...", "format": "...", "pillar": "..."}]}
  ]
}

For other types, structure appropriately with:
- Executive summary
- Strategy overview
- Detailed plan
- Action items with owners and deadlines
- Success metrics
- Contingencies`;
  },
});

export default architectAgent;

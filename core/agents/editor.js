/**
 * Editor Agent
 *
 * Reviews and refines copy for tone, clarity, CTA strength,
 * and brand alignment. Can also fact-check claims.
 *
 * @module core/agents/editor
 */

import { createAgent } from './base.js';

/**
 * Editor Agent Definition
 */
export const editorAgent = createAgent({
  name: 'Editor Agent',
  description: 'Reviews and refines copy for quality, tone, and brand alignment',
  model: 'claude-sonnet',
  temperature: 0.3,

  systemPrompt: `You are a senior editor with expertise in brand voice, conversion copywriting, and content strategy.

**YOUR ROLE:**
1. Review copy for brand voice alignment
2. Improve clarity and readability
3. Strengthen CTAs and emotional hooks
4. Flag any claims that need verification
5. Ensure consistency across pieces
6. Cut unnecessary words ruthlessly

Be constructive but direct. Good copy is rewritten copy.
Return only valid JSON.`,

  promptTemplate: (inputs) => {
    const {
      content,
      brandVoice,
      targetAudience,
      purpose,
      checkFactual,
    } = inputs;

    return `**CONTENT TO REVIEW:**
${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}

**BRAND VOICE REQUIREMENTS:**
- Tone: ${brandVoice?.tone || 'professional'}
- Personality: ${JSON.stringify(brandVoice?.personality || [])}
- Vocabulary: ${JSON.stringify(brandVoice?.vocabulary || [])}

**TARGET AUDIENCE:** ${targetAudience || 'Not specified'}

**PURPOSE:** ${purpose || 'General marketing content'}

**REVIEW TASKS:**
1. Check brand voice alignment (score 1-10)
2. Assess clarity and readability (score 1-10)
3. Evaluate CTA strength (score 1-10)
4. Identify improvement opportunities
5. Provide revised version
${checkFactual ? '6. Flag any claims that need fact-checking' : ''}

Return JSON:
{
  "scores": {
    "brandVoice": 8,
    "clarity": 7,
    "ctaStrength": 6,
    "overall": 7
  },
  "feedback": {
    "strengths": ["what works well"],
    "weaknesses": ["what needs improvement"],
    "suggestions": ["specific actionable suggestions"]
  },
  "revised": {
    // Same structure as input content, but improved
  },
  "factCheck": ${checkFactual ? `{
    "claimsToVerify": ["claim 1", "claim 2"],
    "potentialIssues": ["issue 1"]
  }` : 'null'},
  "summary": "1-2 sentence summary of changes made"
}`;
  },
});

export default editorAgent;

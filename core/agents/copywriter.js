/**
 * Copywriter Agent
 *
 * Generates copy in brand voice for various formats:
 * headlines, body copy, CTAs, social posts, etc.
 *
 * @module core/agents/copywriter
 */

import { createAgent } from './base.js';

/**
 * Copywriter Agent Definition
 */
export const copywriterAgent = createAgent({
  name: 'Copywriter Agent',
  description: 'Generates compelling copy in brand voice for any format',
  model: 'claude-sonnet',
  temperature: 0.7,

  systemPrompt: (inputs) => `You are a world-class copywriter writing for ${inputs.businessName || 'a business'}.

**BRAND VOICE:**
- Tone: ${inputs.brandVoice?.tone || 'professional'}
- Personality: ${JSON.stringify(inputs.brandVoice?.personality || ['helpful', 'clear'])}
- Vocabulary to use: ${JSON.stringify(inputs.brandVoice?.vocabulary || [])}

**RULES:**
1. Every word must earn its place
2. Lead with benefits, not features
3. Use active voice
4. Create curiosity and emotional resonance
5. Match the brand voice exactly
6. CTAs must be specific and action-oriented

Return only valid JSON.`,

  promptTemplate: (inputs) => {
    const {
      format,
      topic,
      targetAudience,
      keyMessages,
      cta,
      constraints,
      research,
    } = inputs;

    const formatInstructions = {
      headline: `Generate 5 headline options. Each should be under 10 words, create curiosity, and speak to the target audience's desires.`,
      hero: `Generate hero section copy: headline (under 10 words), subheadline (1-2 sentences), and CTA button text.`,
      landing: `Generate full landing page copy with sections: hero, problem, solution, benefits, proof, offer, guarantee, CTA.`,
      social: `Generate 5 social media posts. Each should hook in the first line, deliver value, and end with engagement.`,
      email: `Generate email copy: subject line (under 50 chars), preview text, body, and CTA.`,
      ad: `Generate ad copy variations: headline, primary text, and CTA for paid social/search.`,
      blog: `Generate blog post outline with: title, meta description, intro hook, H2 sections, and conclusion CTA.`,
    };

    return `**TASK:** Write ${format} copy

**TOPIC:** ${topic}

**TARGET AUDIENCE:** ${targetAudience || 'General audience'}

**KEY MESSAGES TO CONVEY:**
${keyMessages ? keyMessages.map((m, i) => `${i + 1}. ${m}`).join('\n') : 'Use your judgment based on the topic'}

**DESIRED CTA:** ${cta || 'Appropriate for the format'}

**CONSTRAINTS:**
${constraints ? JSON.stringify(constraints) : 'None specified'}

**RESEARCH CONTEXT:**
${research ? JSON.stringify(research, null, 2) : 'None provided'}

**FORMAT INSTRUCTIONS:**
${formatInstructions[format] || 'Generate appropriate copy for the specified format.'}

Return JSON with the copy. Structure depends on format:
- headline: { "headlines": ["option 1", "option 2", ...] }
- hero: { "headline": "...", "subheadline": "...", "cta": "..." }
- landing: { "sections": [{ "type": "hero", "headline": "...", ... }] }
- social: { "posts": [{ "hook": "...", "body": "...", "cta": "..." }] }
- email: { "subject": "...", "preview": "...", "body": "...", "cta": "..." }
- ad: { "variations": [{ "headline": "...", "text": "...", "cta": "..." }] }
- blog: { "title": "...", "meta": "...", "outline": [...] }`;
  },
});

export default copywriterAgent;

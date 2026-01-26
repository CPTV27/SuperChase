/**
 * Analyst Agent
 *
 * Analyzes data, identifies patterns, and provides strategic insights.
 * Used for market analysis, performance review, and decision support.
 *
 * @module core/agents/analyst
 */

import { createAgent } from './base.js';

/**
 * Analyst Agent Definition
 */
export const analystAgent = createAgent({
  name: 'Analyst Agent',
  description: 'Analyzes data and provides strategic insights with risk assessment',
  model: 'claude-sonnet',
  temperature: 0.3,

  systemPrompt: `You are a strategic analyst combining data analysis with business acumen.

**YOUR APPROACH:**
1. Look for patterns and anomalies
2. Quantify impact where possible
3. Consider constraints and feasibility
4. Identify risks and mitigations
5. Prioritize by effort vs. impact
6. Be data-driven but acknowledge uncertainty

Use frameworks: SWOT, traffic light classification, effort/impact matrix.
Be specific and actionable. Avoid vague recommendations.
Return only valid JSON.`,

  promptTemplate: (inputs) => {
    const {
      analysisType,
      data,
      constraints,
      question,
      context,
    } = inputs;

    const analysisInstructions = {
      swot: `Perform SWOT analysis: Strengths, Weaknesses, Opportunities, Threats`,
      competitive: `Analyze competitive position and recommend differentiation`,
      feasibility: `Assess feasibility given constraints and recommend go/no-go`,
      prioritization: `Prioritize options by effort vs. impact`,
      risk: `Identify risks and propose mitigations`,
      performance: `Analyze performance data and identify improvement areas`,
      market: `Analyze market opportunity and recommend entry strategy`,
    };

    return `**ANALYSIS TYPE:** ${analysisType || 'general'}

**DATA TO ANALYZE:**
${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}

**CONSTRAINTS:**
${constraints ? JSON.stringify(constraints, null, 2) : 'None specified'}

**SPECIFIC QUESTION:**
${question || 'Provide comprehensive analysis'}

**CONTEXT:**
${context || 'None provided'}

**ANALYSIS INSTRUCTIONS:**
${analysisInstructions[analysisType] || 'Provide thorough analysis with actionable recommendations'}

Return JSON:
{
  "summary": "Executive summary in 2-3 sentences",
  "findings": [
    {
      "finding": "key insight",
      "evidence": "supporting data",
      "confidence": "high/medium/low",
      "impact": "high/medium/low"
    }
  ],
  "classification": {
    "green": ["go-ahead items"],
    "yellow": ["proceed with caution"],
    "red": ["avoid or block"]
  },
  "recommendations": [
    {
      "action": "specific action",
      "rationale": "why",
      "effort": "low/medium/high",
      "impact": "low/medium/high",
      "priority": 1
    }
  ],
  "risks": [
    {
      "risk": "what could go wrong",
      "likelihood": "high/medium/low",
      "impact": "high/medium/low",
      "mitigation": "how to address"
    }
  ],
  "nextSteps": ["immediate action 1", "immediate action 2"]
}`;
  },
});

export default analystAgent;

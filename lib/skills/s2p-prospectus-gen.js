#!/usr/bin/env node
/**
 * S2P Prospectus Generator - Technical 1-Pager Generator
 * 
 * Generates bespoke, technical 1-page proposals for target architects.
 * Voice: Technical Minimalist - precise, confident, zero fluff.
 * 
 * Focus Areas:
 * - Point Cloud to BIM conversion
 * - 48-hour turnarounds
 * - LOD standards (100-500)
 * - National reach from Troy, NY hub
 * 
 * @module lib/skills/s2p-prospectus-gen
 * @tenant s2p (ISOLATED)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

import { createLogger } from '../logger.js';

const logger = createLogger({ spoke: 's2p-prospectus', tenant: 's2p' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// S2P Capabilities Database
const S2P_CAPABILITIES = {
    services: [
        {
            name: 'Point Cloud Capture',
            description: 'Leica RTC360 & BLK360 for millimeter-accurate reality capture',
            turnaround: '24-48 hours on-site'
        },
        {
            name: 'Point Cloud to BIM',
            description: 'Revit-native modeling from scan data, LOD 100-500',
            turnaround: '5-10 business days'
        },
        {
            name: 'As-Built Documentation',
            description: 'Floor plans, elevations, sections from existing conditions',
            turnaround: '3-5 business days'
        },
        {
            name: 'Clash Detection',
            description: 'MEP coordination and existing/proposed integration',
            turnaround: '2-3 business days'
        },
        {
            name: 'Historic Documentation',
            description: 'HABS/HAER compliant documentation for preservation projects',
            turnaround: 'Project-dependent'
        }
    ],
    differentiators: [
        '48-hour turnaround on standard projects',
        'National reach from Troy, NY technical hub',
        'Direct Revit integration - no format conversion needed',
        'LOD 100-500 flexibility based on project phase',
        'Fixed-fee pricing with no surprises'
    ],
    lodLevels: {
        LOD100: 'Conceptual - massing studies, early design',
        LOD200: 'Schematic - approximate geometry, SD phase',
        LOD300: 'Design Development - accurate modeling for DD/CD',
        LOD350: 'Construction Documents - coordination geometry',
        LOD400: 'Fabrication - shop-drawing ready',
        LOD500: 'As-Built - field-verified final documentation'
    },
    equipment: [
        'Leica RTC360 (high-speed terrestrial)',
        'Leica BLK360 (compact interiors)',
        'DJI Matrice 300 RTK (aerial)',
        'Cyclone REGISTER 360',
        'Autodesk Revit 2024',
        'Autodesk Recap Pro'
    ]
};

// Voice Guidelines
const VOICE = {
    archetype: 'Technical Minimalist',
    tone: 'Precise, confident, zero fluff',
    vocabulary: [
        'reality capture', 'point cloud', 'BIM', 'LOD',
        'as-built', 'existing conditions', 'scan-to-BIM',
        'coordination', 'deliverables', 'field-verified'
    ],
    avoid: [
        'cutting-edge', 'revolutionary', 'world-class',
        'synergy', 'leveraging', 'best-in-class',
        'holistic', 'ecosystem', 'seamless'
    ],
    sample: `Your existing conditions are the foundation. 
We capture them with sub-centimeter accuracy. 
You get Revit-ready models in 48 hours.
No translation. No guesswork. Just geometry you can trust.`
};

/**
 * Generate a technical prospectus for a specific prospect
 */
export async function generateProspectus(prospect, options = {}) {
    const traceId = `prospectus-${Date.now().toString(36)}`;
    logger.info('Generating prospectus', { traceId, firmName: prospect.firmName });

    const {
        format = 'markdown',
        includeEquipment = true,
        includePricing = false
    } = options;

    // Build context for AI
    const context = {
        prospect,
        capabilities: S2P_CAPABILITIES,
        voice: VOICE
    };

    const prompt = `Generate a technical 1-page prospectus for Scan2Plan to send to this architectural firm.

## Target Prospect
${JSON.stringify(prospect, null, 2)}

## S2P Capabilities
${JSON.stringify(S2P_CAPABILITIES.services, null, 2)}

## Differentiators
${S2P_CAPABILITIES.differentiators.join('\n')}

## Voice Guidelines
- Archetype: ${VOICE.archetype}
- Tone: ${VOICE.tone}
- AVOID these words: ${VOICE.avoid.join(', ')}

## Required Sections
1. **Opening Hook** (1-2 sentences addressing their specific project/need)
2. **Relevant Capability** (focus on what matches their project type)
3. **Technical Specifications** (LOD levels, equipment if relevant)
4. **Turnaround & Logistics** (emphasize 48-hour capability, Troy NY hub)
5. **Next Step** (specific CTA - site visit, sample deliverable, etc.)

## Constraints
- Maximum 400 words
- No buzzwords or fluff
- Technical precision over marketing polish
- Include specific LOD recommendations for their project type
- Reference their location relative to Troy, NY if relevant

Generate the prospectus in Markdown format:`;

    if (!GEMINI_API_KEY) {
        logger.warn('Gemini not configured, using template');
        return generateTemplateProspectus(prospect);
    }

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
            })
        });

        if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const prospectus = {
            id: traceId,
            prospect: prospect.firmName || prospect.address,
            content,
            generatedAt: new Date().toISOString(),
            format
        };

        // Save to outputs directory
        await saveProspectus(prospectus);

        return prospectus;

    } catch (error) {
        logger.error('Prospectus generation failed', { error: error.message });
        return generateTemplateProspectus(prospect);
    }
}

/**
 * Generate template-based prospectus (fallback)
 */
function generateTemplateProspectus(prospect) {
    const projectType = prospect.projectType || 'renovation';
    const location = prospect.location || 'Northeast Corridor';
    const firmName = prospect.firmName || 'Your Firm';

    const lodRecommendation = projectType.toLowerCase().includes('historic')
        ? 'LOD 300-400 for preservation documentation'
        : projectType.toLowerCase().includes('renovation')
            ? 'LOD 300 for design development coordination'
            : 'LOD 200-300 for schematic design support';

    const content = `# Technical Prospectus: ${firmName}

## Existing Conditions. Accurate Geometry. Zero Guesswork.

Your ${projectType.toLowerCase()} project in ${location} needs reliable existing conditions documentation. We deliver point cloud capture and Revit-native BIM models with sub-centimeter accuracy.

---

## Recommended Approach

**Project Type:** ${projectType}
**LOD Recommendation:** ${lodRecommendation}

### Deliverables
- Registered point cloud (E57, RCP)
- Revit model at specified LOD
- Floor plans, sections, elevations
- Clash detection report (if applicable)

### Timeline
- On-site capture: 1-2 days
- Point cloud processing: 24 hours
- BIM modeling: 5-7 business days
- **Total: Under 2 weeks**

---

## Technical Specifications

**Capture Equipment:**
- Leica RTC360 (2mm accuracy at 10m)
- BLK360 for tight spaces
- Aerial capture available

**Software:**
- Cyclone REGISTER 360
- Autodesk Revit 2024
- Direct RVT delivery

---

## Logistics

**Technical Hub:** Troy, NY
**Your Location:** ${location}
**Coverage:** National, with priority response for Northeast Corridor

---

## Next Step

Let's schedule a 15-minute technical scoping call. I'll review your drawings, understand your LOD requirements, and provide a fixed-fee quote within 24 hours.

**Chase Pierson**
Scan2Plan
chase@scan2plan.com
`;

    return {
        id: `template-${Date.now().toString(36)}`,
        prospect: firmName,
        content,
        generatedAt: new Date().toISOString(),
        format: 'markdown',
        isTemplate: true
    };
}

/**
 * Save prospectus to outputs directory
 */
async function saveProspectus(prospectus) {
    const outputDir = join(__dirname, '..', '..', 'outputs', 's2p', 'prospectus');

    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${prospectus.id}_${prospectus.prospect.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
    const filepath = join(outputDir, filename);

    writeFileSync(filepath, prospectus.content);
    logger.info('Prospectus saved', { path: filepath });

    return filepath;
}

/**
 * Generate "Proof of Precision" report
 * A mini case study showing scan accuracy and BIM quality
 */
export async function generateProofOfPrecision(prospect, caseStudy = 'default') {
    const caseStudies = {
        default: {
            project: 'Historic Brownstone Renovation',
            location: 'Brooklyn, NY',
            challenge: 'Original 1890s drawings missing. Owner needed as-built documentation for gut renovation.',
            solution: '2-day scan with BLK360. 15,000 sqft captured. Revit model at LOD 300.',
            result: 'Architect identified 6 structural discrepancies vs. assumptions. Saved estimated $45k in field changes.',
            accuracy: '3mm average deviation from field verification'
        },
        commercial: {
            project: 'Office Tower MEP Coordination',
            location: 'Boston, MA',
            challenge: 'Existing ceiling void needed for new HVAC routing. No reliable drawings.',
            solution: 'RTC360 scan of 3 floors. Point cloud + Revit MEP model in 8 days.',
            result: 'Zero field conflicts during installation. Contractor reported "first time in 20 years."',
            accuracy: '2mm accuracy at ceiling plenum'
        }
    };

    const study = caseStudies[caseStudy] || caseStudies.default;

    const content = `# Proof of Precision

## How Accurate Documentation Saves Time and Money

### Project: ${study.project}
**Location:** ${study.location}

---

### Challenge
${study.challenge}

### Solution
${study.solution}

### Result
${study.result}

**Measured Accuracy:** ${study.accuracy}

---

### Why This Matters for ${prospect.firmName || 'Your Project'}

Your ${prospect.projectType || 'renovation'} project in ${prospect.location || 'the Northeast'} likely has similar documentation challenges. 

We solve them the same way: accurate capture, precise modeling, zero assumptions.

---

**Ready to see what accurate looks like?**

Chase Pierson | Scan2Plan | chase@scan2plan.com
`;

    return {
        id: `proof-${Date.now().toString(36)}`,
        prospect: prospect.firmName || 'Prospect',
        content,
        type: 'proof_of_precision',
        generatedAt: new Date().toISOString()
    };
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const testProspect = {
        firmName: 'Test Architecture Firm',
        location: 'Brooklyn, NY',
        projectType: 'Historic Renovation',
        signalType: 'Seeking As-Built Documentation'
    };

    console.log('\n🏗️ S2P Prospectus Generator\n');
    generateProspectus(testProspect).then(result => {
        console.log(result.content);
    });
}

export default {
    generateProspectus,
    generateProofOfPrecision,
    S2P_CAPABILITIES,
    VOICE
};

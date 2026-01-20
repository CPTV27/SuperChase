/**
 * SuperChase Agency - Style Engine
 * 
 * Multi-tenant brand voice and visual style management.
 * Loads client personality profiles and applies "Style Wash"
 * to all generated content.
 * 
 * @module lib/style-engine
 */

import { createLogger } from './logger.js';
import tenantManager from '../core/tenant-manager.js';

const logger = createLogger({ module: 'style-engine' });

/**
 * Brand archetypes with associated content generation prompts
 */
export const BRAND_ARCHETYPES = {
    visionary_artist: {
        name: 'The Visionary Artist',
        description: 'Sophisticated, evocative, and rhythmic; focuses on emotional resonance of space',
        contentStyle: 'Do not just describe—reveal. Focus on the alchemical balance of color and texture.',
        visualLanguage: 'High-contrast, clean lines, deep shadows (Architectural Noir)'
    },
    cultural_archivist: {
        name: 'The Cultural Archivist',
        description: 'Intellectual, collaborative, gritty; prioritizes raw human narrative over polish',
        contentStyle: 'Empathetic but direct. Speak like a trusted collaborator, warm and engaging.',
        visualLanguage: 'Analogue warmth, grainy textures, behind-the-scenes raw captures'
    },
    tech_rebellion: {
        name: 'The Tech Rebellion',
        description: 'Immediate, visceral, dangerous; shoots with urgency and build-in-public grit',
        contentStyle: 'Bold and electric. Capture the urgent chaos of creation.',
        visualLanguage: 'Cinematic revelations, bold palettes, electric concert energy'
    },
    legendary_host: {
        name: 'The Legendary Host',
        description: 'Storied, high-fidelity, East Coast Retreat; bridges past with vibrant future',
        contentStyle: 'Authoritative yet inviting. The voice of a premier destination with history.',
        visualLanguage: 'Cathedral ceilings, API analog gear, storied wood-and-stone aesthetics'
    },
    warm_southern: {
        name: 'The Southern Storyteller',
        description: 'Warm, welcoming, steeped in heritage and blues tradition',
        contentStyle: 'Paint with words. Let the river and the music speak through the prose.',
        visualLanguage: 'Moody twilight, peacock teal accents, 35mm grain, Mississippi soul'
    }
};

/**
 * Visual style prompts for image generation per client
 */
export const STYLE_PROMPTS = {
    bigmuddy: {
        base: 'Southern Gothic atmosphere, moody twilight, peacock teal and warm amber accents, 35mm film grain, Mississippi River soul',
        photography: 'Intimate documentary style, warm tungsten lighting, deep shadows, vintage texture overlay',
        social: 'Warm, inviting, blues-drenched aesthetic with riverboat nostalgia',
        keywords: ['Southern Gothic', 'Blues heritage', 'River mystique', 'Historic charm']
    },
    tuthill: {
        base: 'Architectural Noir, extreme high-contrast shadows, razor-sharp lines, cinematic composition, monochromatic with selective color',
        photography: 'Bold geometric framing, dramatic natural light, minimalist negative space, sculptural shadows',
        social: 'Sophisticated precision, visual poetry of space, electric moments frozen in time',
        keywords: ['Symmetry', 'Visceral energy', 'Sculpted chaos', 'Cinematic revelation']
    },
    studioc: {
        base: 'Documentary grit, warm analogue glow, Pro Tools carbon aesthetic, behind-the-scenes authenticity',
        photography: 'Intimate studio moments, grainy texture, warm color grading, candid captures, gear in context',
        social: 'Raw and real, collaborative energy, the soul behind the sound',
        keywords: ['Intimate vibe', 'Soul of a moment', 'High-fidelity narrative', 'Heart-led commitment']
    },
    utopia: {
        base: 'Lush cathedral light through wooden beams, vintage API console warmth, Woodstock retreat mystique, legendary analog aesthetic',
        photography: 'Grand architectural shots, warm wood tones, vintage equipment beauty, artists in creative flow',
        social: 'Storied legacy, creative sanctuary, where legends record',
        keywords: ['Cathedral acoustics', 'API AXS Legacy', 'Woodstock legend', 'Creative exploration']
    },
    cptv: {
        base: 'Electric concert energy, bold neon palettes, build-in-public urgency, tech-forward rebellion',
        photography: 'High-energy stage captures, dramatic lighting, motion blur, behind-the-gear shots',
        social: 'Immediate and visceral, dangerous creativity, the edge of innovation',
        keywords: ['Tech rebellion', 'Electric urgency', 'Build in public', 'Cinematic revelation']
    }
};

/**
 * Voice guidelines for content generation
 */
export const VOICE_GUIDELINES = {
    bigmuddy: {
        philosophy: 'Where the river meets the blues, stories come alive.',
        tone: ['Warm', 'Welcoming', 'Storytelling', 'Heritage-rich'],
        doSay: [
            'Paint pictures with words',
            'Let the history speak',
            'Invite readers into the experience'
        ],
        dontSay: [
            'Generic hospitality language',
            'Overly formal corporate speak',
            'Rushed or transactional tone'
        ],
        samplePhrases: [
            'Where the Mississippi whispers its secrets...',
            'Step into a story that\'s been playing for centuries',
            'The Blues Room is calling'
        ]
    },
    tuthill: {
        philosophy: 'Color and typography define a brand\'s tone before a word is spoken.',
        tone: ['Sophisticated', 'Evocative', 'Rhythmic', 'Precise'],
        doSay: [
            'Describe the "precise, electric instant where time stops holding its breath"',
            'Focus on the alchemical balance of color and texture',
            'Reveal rather than describe'
        ],
        dontSay: [
            'Basic descriptors like "beautiful" or "nice"',
            'Casual or conversational tone',
            'Technical jargon without poetry'
        ],
        samplePhrases: [
            'In the tension between shadow and light, a room reveals its soul',
            'Every angle whispers intention',
            'Space sculpted with visceral precision'
        ]
    },
    studioc: {
        philosophy: 'Resistance, Resilience & Hope—creating a bridge for stories that need to be part of the world.',
        tone: ['Empathetic', 'Direct', 'Collaborative', 'Authentic'],
        doSay: [
            'Speak like a trusted creative partner',
            'Prioritize raw human narrative over polish',
            'Balance warmth with professional edge'
        ],
        dontSay: [
            'Robotic or templated responses',
            'Overproduced marketing speak',
            'Disconnected corporate voice'
        ],
        samplePhrases: [
            'Your story deserves to be heard',
            'We capture the soul, not just the sound',
            'Real moments, real impact'
        ]
    },
    utopia: {
        philosophy: 'Honoring a star-powered pedigree while remaining a creative headquarters for new masters.',
        tone: ['Authoritative', 'Inviting', 'Legendary', 'Warm'],
        doSay: [
            'Reference the storied history when relevant',
            'Position as premier creative destination',
            'Bridge past legends with future potential'
        ],
        dontSay: [
            'Overly boastful or exclusive tone',
            'Dismissive of new artists',
            'Generic studio marketing'
        ],
        samplePhrases: [
            'Where legends have walked, new history awaits',
            'Cathedral acoustics for cathedral-sized visions',
            'The Woodstock legacy lives in every session'
        ]
    },
    cptv: {
        philosophy: 'Build in public. Break conventions. Capture the edge.',
        tone: ['Immediate', 'Visceral', 'Dangerous', 'Urgent'],
        doSay: [
            'Shoot with urgency and authenticity',
            'Embrace the chaos of creation',
            'Show the tech, show the process'
        ],
        dontSay: [
            'Safe corporate messaging',
            'Overthought or sanitized content',
            'Disconnected from the creative process'
        ],
        samplePhrases: [
            'On the edge of what\'s possible',
            'This is how it\'s really made',
            'Breaking it down, building it up'
        ]
    }
};

/**
 * Get complete style context for a client
 * @param {string} clientId 
 * @returns {Object}
 */
export function getStyleContext(clientId) {
    const normalizedId = clientId.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Try to get tenant config for additional context
    let tenantConfig = null;
    try {
        tenantConfig = tenantManager.getTenant(clientId);
    } catch {
        // Tenant may not exist in system yet
    }

    const stylePrompt = STYLE_PROMPTS[normalizedId] || STYLE_PROMPTS.bigmuddy;
    const voiceGuideline = VOICE_GUIDELINES[normalizedId] || VOICE_GUIDELINES.bigmuddy;

    // Get archetype from tenant config or default
    const archetypeKey = tenantConfig?.branding?.voice || 'warm_southern';
    const archetype = BRAND_ARCHETYPES[archetypeKey] || BRAND_ARCHETYPES.warm_southern;

    return {
        clientId,
        archetype,
        style: stylePrompt,
        voice: voiceGuideline,
        tenant: tenantConfig,
        seo: tenantConfig?.seo || {}
    };
}

/**
 * Apply style wash to content prompt
 * @param {string} clientId 
 * @param {string} contentType - 'image', 'social', 'blog', 'caption'
 * @param {string} basePrompt - Original content request
 * @returns {string}
 */
export function applyStyleWash(clientId, contentType, basePrompt) {
    const context = getStyleContext(clientId);

    let styledPrompt = basePrompt;

    switch (contentType) {
        case 'image':
            styledPrompt = `${basePrompt}. Style: ${context.style.base}. Photography approach: ${context.style.photography}`;
            break;

        case 'social':
            styledPrompt = `Write a social media post in this voice: ${context.archetype.contentStyle}. 
Tone: ${context.voice.tone.join(', ')}. 
Keywords to incorporate: ${context.style.keywords.join(', ')}.
Sample phrases for inspiration: ${context.voice.samplePhrases.join(' | ')}

Content request: ${basePrompt}`;
            break;

        case 'blog':
            styledPrompt = `Write a blog post following these guidelines:
Philosophy: ${context.voice.philosophy}
Tone: ${context.voice.tone.join(', ')}
Style: ${context.archetype.contentStyle}

DO: ${context.voice.doSay.join('. ')}
DON'T: ${context.voice.dontSay.join('. ')}

SEO Keywords to incorporate: ${context.seo.primaryKeywords?.slice(0, 3).join(', ') || 'brand, quality, experience'}

Topic: ${basePrompt}`;
            break;

        case 'caption':
            styledPrompt = `Write a photo caption in this style: ${context.style.social}. 
Voice: ${context.voice.tone.slice(0, 2).join(', ')}.
Content: ${basePrompt}`;
            break;

        default:
            styledPrompt = `${basePrompt}. Apply ${context.archetype.name} voice.`;
    }

    logger.debug('Style wash applied', { clientId, contentType, archetype: context.archetype.name });

    return styledPrompt;
}

/**
 * Get image generation prompt for client
 * @param {string} clientId 
 * @param {string} subject - What to generate
 * @param {string} [variant='base'] - 'base', 'photography', 'social'
 * @returns {string}
 */
export function getImagePrompt(clientId, subject, variant = 'base') {
    const context = getStyleContext(clientId);
    const styleBase = context.style[variant] || context.style.base;

    return `${subject}. ${styleBase}. Keywords: ${context.style.keywords.join(', ')}`;
}

/**
 * Generate authority hook for a client based on their vertical
 * @param {string} clientId 
 * @param {string} trend - Current trend to hook into
 * @returns {Object}
 */
export function generateAuthorityHook(clientId, trend) {
    const context = getStyleContext(clientId);

    return {
        clientId,
        trend,
        hook: `${context.archetype.name} perspective on: ${trend}`,
        voiceGuidelines: context.voice,
        suggestedKeywords: context.style.keywords,
        seoContext: context.seo.primaryKeywords || []
    };
}

/**
 * List all configured client styles
 * @returns {Object[]}
 */
export function listClientStyles() {
    return Object.entries(STYLE_PROMPTS).map(([id, style]) => ({
        clientId: id,
        archetype: VOICE_GUIDELINES[id]?.philosophy?.substring(0, 50) + '...',
        keywords: style.keywords
    }));
}

export default {
    BRAND_ARCHETYPES,
    STYLE_PROMPTS,
    VOICE_GUIDELINES,
    getStyleContext,
    applyStyleWash,
    getImagePrompt,
    generateAuthorityHook,
    listClientStyles
};

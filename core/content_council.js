#!/usr/bin/env node
/**
 * Content Council - AI Content Factory
 *
 * 4-agent system for multi-channel content generation:
 * - Trend Hunter: Research and viral seed identification
 * - Scriptwriter: Video and social content
 * - Web Architect: Landing pages and SEO content
 * - Visual Director: Image prompts and video scenes
 *
 * @module core/content_council
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createLogger } from '../lib/logger.js';
import { ExternalServiceError, ValidationError, withRetry } from '../lib/errors.js';
import {
  extractCitations,
  calculateCitationQuality,
  createCitationTrace
} from '../lib/citations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const logger = createLogger({ module: 'content-council' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

const OUTPUT_DIR = join(__dirname, '..', 'memory', 'content_sprints');
const BATTLECARDS_DIR = join(__dirname, '..', 'memory', 'battlecards');
const CLIENTS_DIR = join(__dirname, '..', 'clients');

// Agent models
const TREND_HUNTER_MODEL = 'openai/gpt-4o';
const SCRIPTWRITER_MODEL = 'anthropic/claude-3.5-sonnet';
const WEB_ARCHITECT_MODEL = 'anthropic/claude-3.5-sonnet';
const VISUAL_DIRECTOR_MODEL = 'openai/gpt-4o';

// Depth configurations
const DEPTH_CONFIG = {
  quick: { hooks: 3, videos: 1, socialPosts: 5, images: 3, includeEmail: false },
  standard: { hooks: 10, videos: 3, socialPosts: 15, images: 10, includeEmail: true },
  deep: { hooks: 20, videos: 5, socialPosts: 30, images: 20, includeEmail: true }
};

/**
 * Generate trace ID
 */
function generateTraceId() {
  return `content-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Query model via OpenRouter
 */
async function queryModel(model, messages, options = {}) {
  const { temperature = 0.7 } = options;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://superchase.app',
      'X-Title': 'SuperChase Content Council'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ExternalServiceError('OpenRouter', `${model} query failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

const queryModelWithRetry = withRetry(queryModel, { maxRetries: 2, baseDelayMs: 1000 });

/**
 * Load battlecard for business
 */
function loadBattlecard(businessId) {
  const path = join(BATTLECARDS_DIR, `${businessId}.json`);
  if (!fs.existsSync(path)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

/**
 * Load brand voice for business
 */
function loadBrandVoice(businessId) {
  const path = join(CLIENTS_DIR, businessId, 'brand.json');
  if (!fs.existsSync(path)) {
    return {
      voice: { tone: 'professional', personality: ['helpful', 'clear'] },
      style: { sentenceLength: 'medium', formatting: 'mixed' }
    };
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

/**
 * Load client config
 */
function loadConfig(businessId) {
  const path = join(CLIENTS_DIR, businessId, 'config.json');
  if (!fs.existsSync(path)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

/**
 * Agent 1: Trend Hunter
 * Research and viral seed identification
 */
async function runTrendHunter(battlecard, brandVoice, depth) {
  logger.info('Agent 1: Trend Hunter starting', { depth });
  const startTime = Date.now();

  const depthConfig = DEPTH_CONFIG[depth];

  const prompt = `You are the Trend Hunter for a content marketing team.

**BATTLECARD INTELLIGENCE:**
- Business: ${battlecard.businessName}
- Grand Slam Offer: ${battlecard.grandSlamOffer?.headline || 'N/A'}
- Target Pain Point: ${battlecard.grandSlamOffer?.targetPainPoint || 'N/A'}
- Green Keywords: ${JSON.stringify(battlecard.keywords?.green?.map(k => k.keyword) || [])}
- Blue Ocean Keywords: ${JSON.stringify(battlecard.keywords?.blueOcean?.map(k => k.keyword) || [])}
- Competitor Weaknesses: ${JSON.stringify(battlecard.competitors?.flatMap(c => c.weaknesses) || [])}
- People Also Ask: ${JSON.stringify(battlecard.analysis?.librarian?.peopleAlsoAsk || [])}

**BRAND VOICE:**
${JSON.stringify(brandVoice.voice || {}, null, 2)}

**YOUR MISSION:**
Find the viral seed and create a hook swipe file.

Return JSON:
{
  "viralSeed": {
    "topic": "core topic that will drive all content",
    "hook": "attention-grabbing hook (under 10 words)",
    "emotionalTrigger": "fear/aspiration/curiosity/anger",
    "searchTrend": "rising/stable",
    "competitorGap": "why this is underserved",
    "audiencePainPoint": "specific pain we're addressing"
  },
  "trendingTopics": ["topic1", "topic2", "topic3"],
  "hookSwipeFile": [
    {"hook": "...", "type": "question/statement/statistic", "emotion": "..."}
  ],
  "contentAngles": [
    {"angle": "...", "format": "video/blog/social/email", "viralPotential": "high/medium/low", "effort": "low/medium/high"}
  ],
  "hashtags": ["#tag1", "#tag2"],
  "keyMessages": ["message1", "message2", "message3"]
}

Generate ${depthConfig.hooks} hooks in the swipe file.
Focus on hooks that create curiosity gaps and emotional responses.`;

  try {
    const response = await queryModelWithRetry(TREND_HUNTER_MODEL, [
      { role: 'system', content: 'You are a viral content strategist. Find angles that create emotional responses. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.6 });

    let data;
    try {
      data = JSON.parse(response);
    } catch (e) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { viralSeed: {}, hookSwipeFile: [] };
    }

    const timing = Date.now() - startTime;
    logger.info('Trend Hunter complete', { timing, hooks: data.hookSwipeFile?.length });

    return { ...data, timing, model: TREND_HUNTER_MODEL };
  } catch (e) {
    logger.error('Trend Hunter failed', { error: e.message });
    return { viralSeed: {}, hookSwipeFile: [], timing: Date.now() - startTime, error: e.message };
  }
}

/**
 * Agent 2: Scriptwriter
 * Video and social content generation
 */
async function runScriptwriter(battlecard, brandVoice, trendHunterResults, depth) {
  logger.info('Agent 2: Scriptwriter starting', { depth });
  const startTime = Date.now();

  const depthConfig = DEPTH_CONFIG[depth];

  const prompt = `You are a world-class scriptwriter for social media and video content.

**VIRAL SEED:**
${JSON.stringify(trendHunterResults.viralSeed, null, 2)}

**HOOK SWIPE FILE:**
${JSON.stringify(trendHunterResults.hookSwipeFile?.slice(0, 5), null, 2)}

**GRAND SLAM OFFER:**
- Headline: ${battlecard.grandSlamOffer?.headline || 'N/A'}
- Dream Outcome: ${battlecard.grandSlamOffer?.dreamOutcome || 'N/A'}
- Timeframe: ${battlecard.grandSlamOffer?.timeframe || 'N/A'}
- Risk Reversal: ${battlecard.grandSlamOffer?.riskReversal || 'N/A'}

**BRAND VOICE:**
- Tone: ${brandVoice.voice?.tone || 'professional'}
- Personality: ${JSON.stringify(brandVoice.voice?.personality || [])}
- Vocabulary to use: ${JSON.stringify(brandVoice.voice?.vocabulary?.use || [])}
- Vocabulary to avoid: ${JSON.stringify(brandVoice.voice?.vocabulary?.avoid || [])}

**YOUR MISSION:**
Create high-retention scripts and social content.

Return JSON:
{
  "videoScripts": {
    "tiktok15": {
      "hook": "first 3 seconds (must stop scroll)",
      "body": "value delivery (7-10 seconds)",
      "cta": "clear action (2-3 seconds)",
      "visualNotes": "what should be on screen",
      "textOverlays": ["overlay1", "overlay2"]
    },
    "explainer60": {
      "hook": "opening hook (5 sec)",
      "problem": "agitate the pain (10 sec)",
      "solution": "introduce the fix (20 sec)",
      "proof": "credibility/results (15 sec)",
      "cta": "what to do next (10 sec)",
      "visualNotes": "scene suggestions"
    },
    "youtube180": {
      "hook": "pattern interrupt (10 sec)",
      "promise": "what they'll learn (10 sec)",
      "content": ["point 1 (30 sec)", "point 2 (30 sec)", "point 3 (30 sec)"],
      "recap": "summary (20 sec)",
      "cta": "subscribe + action (10 sec)"
    }
  },
  "socialPosts": {
    "linkedin": [
      {
        "hook": "first line (must create curiosity)",
        "story": "personal/client story",
        "value": "teaching moment",
        "cta": "engagement question or action"
      }
    ],
    "twitter": [
      {
        "tweet": "standalone tweet (under 280 chars)",
        "engagementHook": "reply bait"
      }
    ],
    "thread": {
      "hook": "tweet 1 - must stop scroll",
      "body": ["tweet 2", "tweet 3", "tweet 4", "tweet 5"],
      "closer": "final tweet with CTA"
    }
  }${depthConfig.includeEmail ? `,
  "emailSequences": {
    "welcome": [
      {"subject": "...", "preview": "...", "body": "...", "cta": "..."}
    ],
    "nurture": [
      {"subject": "...", "preview": "...", "body": "...", "cta": "..."}
    ]
  }` : ''}
}

Generate ${depthConfig.videos} video scripts and ${depthConfig.socialPosts} social posts total.
Every piece must match the brand voice exactly.`;

  try {
    const response = await queryModelWithRetry(SCRIPTWRITER_MODEL, [
      { role: 'system', content: 'You are a viral content writer. Every word must earn its place. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.7 });

    let data;
    try {
      data = JSON.parse(response);
    } catch (e) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { videoScripts: {}, socialPosts: {} };
    }

    const timing = Date.now() - startTime;
    logger.info('Scriptwriter complete', { timing });

    return { ...data, timing, model: SCRIPTWRITER_MODEL };
  } catch (e) {
    logger.error('Scriptwriter failed', { error: e.message });
    return { videoScripts: {}, socialPosts: {}, timing: Date.now() - startTime, error: e.message };
  }
}

/**
 * Agent 3: Web Architect
 * Landing pages and SEO content
 */
async function runWebArchitect(battlecard, brandVoice, trendHunterResults, depth) {
  logger.info('Agent 3: Web Architect starting', { depth });
  const startTime = Date.now();

  const prompt = `You are an expert landing page copywriter and SEO strategist.

**VIRAL SEED:**
${JSON.stringify(trendHunterResults.viralSeed, null, 2)}

**GRAND SLAM OFFER:**
${JSON.stringify(battlecard.grandSlamOffer, null, 2)}

**TARGET KEYWORDS:**
- Green (opportunity): ${JSON.stringify(battlecard.keywords?.green?.map(k => k.keyword) || [])}
- Blue Ocean (untapped): ${JSON.stringify(battlecard.keywords?.blueOcean?.map(k => k.keyword) || [])}

**BRAND VOICE:**
${JSON.stringify(brandVoice.voice || {}, null, 2)}

**YOUR MISSION:**
Create high-converting landing page copy and SEO-optimized blog structure.

Return JSON:
{
  "landingPage": {
    "headline": "main headline (Grand Slam Offer)",
    "subheadline": "supporting statement",
    "sections": [
      {"type": "hero", "headline": "...", "subheadline": "...", "cta": "..."},
      {"type": "problem", "headline": "...", "bullets": ["pain 1", "pain 2", "pain 3"]},
      {"type": "agitate", "headline": "...", "content": "..."},
      {"type": "solution", "headline": "...", "bullets": ["benefit 1", "benefit 2", "benefit 3"]},
      {"type": "proof", "headline": "...", "testimonials": ["quote 1", "quote 2"]},
      {"type": "offer", "headline": "...", "includes": ["item 1", "item 2"], "bonuses": ["bonus 1"]},
      {"type": "guarantee", "headline": "...", "content": "..."},
      {"type": "urgency", "headline": "...", "content": "..."},
      {"type": "finalCta", "headline": "...", "button": "...", "subtext": "..."}
    ],
    "seoMeta": {
      "title": "SEO title (under 60 chars)",
      "description": "meta description (under 160 chars)",
      "keywords": ["kw1", "kw2"]
    }
  },
  "blogPillar": {
    "title": "SEO-optimized title",
    "targetKeyword": "primary keyword",
    "metaDescription": "compelling description",
    "wordCount": 2000,
    "outline": [
      {
        "h2": "section heading",
        "h3s": ["subsection 1", "subsection 2"],
        "keyPoints": ["point 1", "point 2"],
        "internalLinks": ["related topic 1"]
      }
    ],
    "featuredSnippetTarget": "question we want to rank for",
    "schema": "article/howto/faq"
  },
  "contentCluster": {
    "pillarTopic": "main topic",
    "supportingPosts": [
      {"title": "...", "keyword": "...", "angle": "...", "wordCount": 800}
    ]
  }
}`;

  try {
    const response = await queryModelWithRetry(WEB_ARCHITECT_MODEL, [
      { role: 'system', content: 'You are a conversion-focused copywriter. Every element must drive action. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.5 });

    let data;
    try {
      data = JSON.parse(response);
    } catch (e) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { landingPage: {}, blogPillar: {} };
    }

    const timing = Date.now() - startTime;
    logger.info('Web Architect complete', { timing });

    return { ...data, timing, model: WEB_ARCHITECT_MODEL };
  } catch (e) {
    logger.error('Web Architect failed', { error: e.message });
    return { landingPage: {}, blogPillar: {}, timing: Date.now() - startTime, error: e.message };
  }
}

/**
 * Agent 4: Visual Director
 * Image prompts and video scene directions
 */
async function runVisualDirector(battlecard, brandVoice, scriptwriterResults, depth) {
  logger.info('Agent 4: Visual Director starting', { depth });
  const startTime = Date.now();

  const depthConfig = DEPTH_CONFIG[depth];

  const prompt = `You are a visual content director creating assets for social media and video.

**VIDEO SCRIPTS:**
${JSON.stringify(scriptwriterResults.videoScripts, null, 2)}

**BRAND COLORS:**
${JSON.stringify(brandVoice.colors || { primary: '#3b82f6', secondary: '#1e40af' })}

**BRAND STYLE:**
${JSON.stringify(brandVoice.style || {})}

**BUSINESS:**
${battlecard.businessName} - ${battlecard.grandSlamOffer?.headline || ''}

**YOUR MISSION:**
Create production-ready visual asset specifications and HeyGen video payload.

Return JSON:
{
  "socialImages": [
    {
      "platform": "linkedin/twitter/instagram",
      "type": "hero/carousel/story",
      "prompt": "detailed image generation prompt for DALL-E or Midjourney",
      "dimensions": "1200x627",
      "textOverlay": {
        "headline": "text to overlay",
        "position": "top/center/bottom",
        "font": "bold sans-serif"
      },
      "brandElements": "how to incorporate brand colors"
    }
  ],
  "carouselSlides": [
    {
      "slideNumber": 1,
      "headline": "slide headline",
      "body": "supporting text",
      "visualPrompt": "background/illustration prompt",
      "brandColor": "which brand color to use"
    }
  ],
  "videoScenes": [
    {
      "sceneNumber": 1,
      "duration": "0:00-0:03",
      "script": "exact words spoken",
      "visualType": "talking_head/b_roll/text_animation/product_shot",
      "bRollSuggestion": "what to show if not talking head",
      "textOverlay": "key phrase to display",
      "transition": "cut/fade/zoom",
      "emotion": "excited/serious/curious"
    }
  ],
  "heygenPayload": {
    "ready": true,
    "avatar": "professional_male_1",
    "voice": "en-US-Neural2-D",
    "background": "modern_office",
    "aspectRatio": "9:16",
    "scenes": [
      {
        "script": "exact text to speak",
        "duration": 5,
        "gesture": "greeting/explaining/emphasizing",
        "emotion": "neutral/happy/serious"
      }
    ]
  },
  "thumbnails": [
    {
      "platform": "youtube/tiktok",
      "prompt": "thumbnail image prompt",
      "textOverlay": "thumbnail text",
      "emotion": "surprised/curious/excited"
    }
  ]
}

Generate ${depthConfig.images} social images and complete video scene breakdowns.`;

  try {
    const response = await queryModelWithRetry(VISUAL_DIRECTOR_MODEL, [
      { role: 'system', content: 'You are a visual content strategist. Create scroll-stopping visuals. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.6 });

    let data;
    try {
      data = JSON.parse(response);
    } catch (e) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { socialImages: [], heygenPayload: {} };
    }

    const timing = Date.now() - startTime;
    logger.info('Visual Director complete', { timing, images: data.socialImages?.length });

    return { ...data, timing, model: VISUAL_DIRECTOR_MODEL };
  } catch (e) {
    logger.error('Visual Director failed', { error: e.message });
    return { socialImages: [], heygenPayload: {}, timing: Date.now() - startTime, error: e.message };
  }
}

/**
 * Generate HeyGen video from payload
 */
async function generateHeyGenVideo(payload) {
  if (!HEYGEN_API_KEY) {
    return { success: false, error: 'HEYGEN_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': HEYGEN_API_KEY
      },
      body: JSON.stringify({
        video_inputs: payload.scenes.map(scene => ({
          character: {
            type: 'avatar',
            avatar_id: payload.avatar || 'josh_lite3_20230714',
            avatar_style: 'normal'
          },
          voice: {
            type: 'text',
            input_text: scene.script,
            voice_id: payload.voice || 'en-US-JennyNeural'
          },
          background: {
            type: 'color',
            value: '#1a1a2e'
          }
        })),
        dimension: {
          width: payload.aspectRatio === '9:16' ? 1080 : 1920,
          height: payload.aspectRatio === '9:16' ? 1920 : 1080
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, videoId: data.data?.video_id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Run full content council
 */
async function runContentCouncil(businessId, options = {}) {
  const { depth = 'standard', battlecardId = null } = options;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'NEEDS_VALUE') {
    throw new ExternalServiceError('OpenRouter', 'API key not configured');
  }

  const traceId = generateTraceId();
  const startTime = Date.now();

  logger.info('Content Council starting', { traceId, businessId, depth });

  // Load inputs
  const battlecard = loadBattlecard(businessId);
  if (!battlecard) {
    throw new ValidationError(`No battlecard found for: ${businessId}. Run competitive intel first.`);
  }

  const brandVoice = loadBrandVoice(businessId);
  const config = loadConfig(businessId);

  // Run agents sequentially (each depends on previous)
  const trendHunterResults = await runTrendHunter(battlecard, brandVoice, depth);
  const scriptwriterResults = await runScriptwriter(battlecard, brandVoice, trendHunterResults, depth);
  const webArchitectResults = await runWebArchitect(battlecard, brandVoice, trendHunterResults, depth);
  const visualDirectorResults = await runVisualDirector(battlecard, brandVoice, scriptwriterResults, depth);

  const totalDuration = Date.now() - startTime;

  // Compile content sprint
  const contentSprint = {
    businessId,
    businessName: battlecard.businessName,
    generatedAt: new Date().toISOString(),
    traceId,
    depth,
    duration: totalDuration,
    battlecardRef: battlecard.traceId,

    seed: trendHunterResults.viralSeed,
    hooks: trendHunterResults.hookSwipeFile,
    keyMessages: trendHunterResults.keyMessages,

    deliverables: {
      landingPage: webArchitectResults.landingPage,
      blogPillar: webArchitectResults.blogPillar,
      contentCluster: webArchitectResults.contentCluster,
      socialPosts: scriptwriterResults.socialPosts,
      videoScripts: scriptwriterResults.videoScripts,
      emailSequences: scriptwriterResults.emailSequences || null,
      visualAssets: {
        images: visualDirectorResults.socialImages,
        carousels: visualDirectorResults.carouselSlides,
        videoScenes: visualDirectorResults.videoScenes,
        thumbnails: visualDirectorResults.thumbnails,
        heygenPayload: visualDirectorResults.heygenPayload
      }
    },

    taskItems: [
      { task: 'Publish landing page', platform: 'website', priority: 'high', status: 'pending' },
      { task: 'Schedule LinkedIn posts', platform: 'taplio', priority: 'high', status: 'pending' },
      { task: 'Schedule X.com thread', platform: 'typefully', priority: 'high', status: 'pending' },
      { task: 'Generate HeyGen video', platform: 'heygen', priority: 'medium', status: 'pending' },
      { task: 'Publish blog pillar', platform: 'wordpress', priority: 'medium', status: 'pending' },
      { task: 'Create social images', platform: 'canva', priority: 'medium', status: 'pending' }
    ],

    analysis: {
      trendHunter: { model: TREND_HUNTER_MODEL, timing: trendHunterResults.timing },
      scriptwriter: { model: SCRIPTWRITER_MODEL, timing: scriptwriterResults.timing },
      webArchitect: { model: WEB_ARCHITECT_MODEL, timing: webArchitectResults.timing },
      visualDirector: { model: VISUAL_DIRECTOR_MODEL, timing: visualDirectorResults.timing }
    }
  };

  // Save content sprint
  const businessDir = join(OUTPUT_DIR, businessId);
  if (!fs.existsSync(businessDir)) {
    fs.mkdirSync(businessDir, { recursive: true });
  }

  const outputPath = join(businessDir, `${traceId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(contentSprint, null, 2));

  // Also save as latest
  const latestPath = join(businessDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(contentSprint, null, 2));

  logger.info('Content Council complete', { traceId, duration: totalDuration, outputPath });

  return {
    success: true,
    traceId,
    businessId,
    duration: totalDuration,
    contentSprint,
    outputPath
  };
}

/**
 * Get latest content sprint
 */
function getContentSprint(businessId) {
  const path = join(OUTPUT_DIR, businessId, 'latest.json');
  if (!fs.existsSync(path)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

/**
 * Get HeyGen payload for video generation
 */
function getHeyGenPayload(businessId) {
  const sprint = getContentSprint(businessId);
  if (!sprint?.deliverables?.visualAssets?.heygenPayload) {
    return null;
  }
  return sprint.deliverables.visualAssets.heygenPayload;
}

/**
 * List all content sprints
 */
function listContentSprints() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return [];
  }

  const businesses = fs.readdirSync(OUTPUT_DIR).filter(f =>
    fs.statSync(join(OUTPUT_DIR, f)).isDirectory()
  );

  return businesses.map(businessId => {
    const latestPath = join(OUTPUT_DIR, businessId, 'latest.json');
    if (!fs.existsSync(latestPath)) return null;

    const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    return {
      businessId: data.businessId,
      businessName: data.businessName,
      generatedAt: data.generatedAt,
      traceId: data.traceId,
      seed: data.seed?.topic
    };
  }).filter(Boolean);
}

/**
 * HTTP request handler
 */
async function handleContentCouncilRequest(body) {
  const { businessId, depth = 'standard', battlecardId } = body;

  if (!businessId) {
    throw new ValidationError('businessId is required');
  }

  if (!['quick', 'standard', 'deep'].includes(depth)) {
    throw new ValidationError('depth must be quick, standard, or deep');
  }

  return await runContentCouncil(businessId, { depth, battlecardId });
}

// CLI support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'run') {
    const businessId = args[1];
    const depth = args[2] || 'standard';

    if (!businessId) {
      console.error('Usage: node content_council.js run <businessId> [depth]');
      process.exit(1);
    }

    console.log(`\nRunning Content Council for: ${businessId} (${depth})\n`);

    runContentCouncil(businessId, { depth })
      .then(result => {
        console.log('\n=== CONTENT SPRINT GENERATED ===\n');
        console.log('Trace ID:', result.traceId);
        console.log('Duration:', result.duration, 'ms');
        console.log('Seed Topic:', result.contentSprint.seed?.topic);
        console.log('\nSaved to:', result.outputPath);

        console.log('\n--- VIRAL SEED ---');
        console.log('Hook:', result.contentSprint.seed?.hook);
        console.log('Emotion:', result.contentSprint.seed?.emotionalTrigger);
      })
      .catch(error => {
        console.error('Failed:', error.message);
        process.exit(1);
      });

  } else if (command === 'list') {
    const sprints = listContentSprints();
    console.log('\n=== CONTENT SPRINTS ===\n');
    if (sprints.length === 0) {
      console.log('No content sprints generated yet.');
    } else {
      sprints.forEach(sprint => {
        console.log(`${sprint.businessId} (${sprint.businessName})`);
        console.log(`  Seed: ${sprint.seed}`);
        console.log(`  Generated: ${sprint.generatedAt}`);
        console.log();
      });
    }

  } else if (command === 'heygen') {
    const businessId = args[1];
    if (!businessId) {
      console.error('Usage: node content_council.js heygen <businessId>');
      process.exit(1);
    }

    const payload = getHeyGenPayload(businessId);
    if (!payload) {
      console.log(`No HeyGen payload found for: ${businessId}`);
    } else {
      console.log(JSON.stringify(payload, null, 2));
    }

  } else {
    console.log('Content Council CLI\n');
    console.log('Usage:');
    console.log('  node content_council.js run <businessId> [quick|standard|deep]');
    console.log('  node content_council.js list');
    console.log('  node content_council.js heygen <businessId>');
  }
}

export default {
  runContentCouncil,
  handleContentCouncilRequest,
  getContentSprint,
  getHeyGenPayload,
  listContentSprints,
  generateHeyGenVideo
};

export {
  runContentCouncil,
  handleContentCouncilRequest,
  getContentSprint,
  getHeyGenPayload,
  listContentSprints,
  generateHeyGenVideo
};

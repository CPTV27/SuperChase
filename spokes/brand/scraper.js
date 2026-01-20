#!/usr/bin/env node
/**
 * Brand Style Scraper Spoke
 *
 * Extracts visual DNA from a client's website to generate a Brand Style Token.
 * Used by the Adaptive Brand Engine to customize client portals.
 *
 * Usage:
 *   node spokes/brand/scraper.js <clientId>
 *   node spokes/brand/scraper.js bigmuddy
 *   node spokes/brand/scraper.js --all
 *
 * Output: clients/<clientId>/brand.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLIENTS_PATH = join(__dirname, '..', '..', 'clients');

// Voice archetype definitions for tone analysis
const VOICE_ARCHETYPES = {
  'Southern Storyteller': {
    markers: ['heritage', 'history', 'soul', 'tradition', 'charm', 'hospitality', 'southern', 'delta', 'river', 'blues', 'roots'],
    tone: ['warm', 'nostalgic', 'welcoming', 'storytelling'],
    style: 'Rich, evocative language with a sense of place and history'
  },
  'Tech Visionary': {
    markers: ['innovation', 'future', 'transform', 'disrupt', 'scale', 'platform', 'ai', 'automation', 'efficiency', 'solution'],
    tone: ['confident', 'forward-thinking', 'precise', 'ambitious'],
    style: 'Clean, direct language focused on outcomes and possibilities'
  },
  'Creative Artisan': {
    markers: ['craft', 'design', 'aesthetic', 'vision', 'create', 'studio', 'art', 'beauty', 'detail', 'custom', 'bespoke'],
    tone: ['thoughtful', 'refined', 'passionate', 'meticulous'],
    style: 'Elegant, considered language that values process and quality'
  },
  'Architectural Noir': {
    markers: ['space', 'form', 'light', 'material', 'structure', 'modern', 'minimal', 'lines', 'context', 'environment'],
    tone: ['intellectual', 'contemplative', 'bold', 'sophisticated'],
    style: 'Sparse, evocative language with visual precision'
  },
  'Production Pro': {
    markers: ['production', 'capture', 'shoot', 'studio', 'equipment', 'broadcast', 'stream', 'video', 'audio', 'live'],
    tone: ['professional', 'technical', 'reliable', 'experienced'],
    style: 'Clear, capability-focused language that builds trust'
  },
  'Personal Brand': {
    markers: ['i', 'my', 'journey', 'story', 'passion', 'mission', 'believe', 'experience', 'help', 'share'],
    tone: ['authentic', 'relatable', 'inspiring', 'personal'],
    style: 'First-person narrative that connects on a human level'
  }
};

// Color name mappings for common values
const COLOR_NAMES = {
  primary: ['primary', 'main', 'brand', 'accent-primary', 'color-primary'],
  secondary: ['secondary', 'accent', 'highlight', 'color-secondary'],
  background: ['background', 'bg', 'surface', 'base'],
  text: ['text', 'foreground', 'body', 'content']
};

/**
 * Fetch HTML from URL with timeout
 */
async function fetchHTML(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SuperChase-BrandScraper/1.0 (https://superchase.dev)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract colors from HTML/CSS
 */
function extractColors(html) {
  const colors = {
    primary: null,
    secondary: null,
    accent: null,
    background: null,
    text: null,
    extracted: []
  };

  // 1. Meta theme-color
  const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
  if (themeColorMatch) {
    colors.primary = themeColorMatch[1];
    colors.extracted.push({ source: 'meta-theme-color', value: themeColorMatch[1] });
  }

  // 2. CSS custom properties (--color-*, --primary, etc.)
  const cssVarRegex = /--([\w-]+):\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\))/gi;
  let match;
  while ((match = cssVarRegex.exec(html)) !== null) {
    const [, name, value] = match;
    colors.extracted.push({ source: 'css-variable', name: `--${name}`, value });

    // Map to semantic color slots
    const lowerName = name.toLowerCase();
    for (const [slot, keywords] of Object.entries(COLOR_NAMES)) {
      if (keywords.some(k => lowerName.includes(k))) {
        if (!colors[slot]) colors[slot] = value;
      }
    }
  }

  // 3. Inline style colors on key elements
  const heroStyleMatch = html.match(/(?:hero|banner|header|nav)[^>]*style=["'][^"']*(?:background-color|background|color):\s*([^;"']+)/gi);
  if (heroStyleMatch) {
    heroStyleMatch.forEach(match => {
      const colorMatch = match.match(/(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/i);
      if (colorMatch) {
        colors.extracted.push({ source: 'inline-style', value: colorMatch[1] });
      }
    });
  }

  // 4. Background colors from common classes
  const bgColorRegex = /\.(?:bg-|background-)[\w-]+\s*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/gi;
  while ((match = bgColorRegex.exec(html)) !== null) {
    colors.extracted.push({ source: 'css-class', value: match[1] });
  }

  // 5. Link colors (often brand colors)
  const linkColorMatch = html.match(/a\s*\{[^}]*color:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/i);
  if (linkColorMatch && !colors.accent) {
    colors.accent = linkColorMatch[1];
    colors.extracted.push({ source: 'link-color', value: linkColorMatch[1] });
  }

  // Deduplicate and get unique colors
  const uniqueColors = [...new Set(colors.extracted.map(c => c.value))];

  // If we didn't find semantic colors, use first unique colors
  if (!colors.primary && uniqueColors[0]) colors.primary = uniqueColors[0];
  if (!colors.secondary && uniqueColors[1]) colors.secondary = uniqueColors[1];
  if (!colors.accent && uniqueColors[2]) colors.accent = uniqueColors[2];

  return {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.background,
    text: colors.text,
    palette: uniqueColors.slice(0, 8) // Top 8 unique colors found
  };
}

/**
 * Extract fonts from HTML/CSS
 */
function extractFonts(html) {
  const fonts = {
    heading: null,
    body: null,
    extracted: []
  };

  // 1. Google Fonts links
  const googleFontsMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi);
  if (googleFontsMatch) {
    googleFontsMatch.forEach(match => {
      const familyMatch = match.match(/family=([^:&"']+)/);
      if (familyMatch) {
        const fontName = decodeURIComponent(familyMatch[1]).replace(/\+/g, ' ');
        fonts.extracted.push({ source: 'google-fonts', value: fontName });
      }
    });
  }

  // 2. Font-family declarations
  const fontFamilyRegex = /font-family:\s*["']?([^"';,}]+)/gi;
  let match;
  while ((match = fontFamilyRegex.exec(html)) !== null) {
    const fontName = match[1].trim();
    if (!fontName.match(/^(inherit|sans-serif|serif|monospace|cursive|fantasy|system-ui)$/i)) {
      fonts.extracted.push({ source: 'css', value: fontName });
    }
  }

  // 3. Heading-specific fonts
  const headingFontMatch = html.match(/h[1-3][^{]*\{[^}]*font-family:\s*["']?([^"';,}]+)/i);
  if (headingFontMatch) {
    fonts.heading = headingFontMatch[1].trim();
  }

  // 4. Body font
  const bodyFontMatch = html.match(/body[^{]*\{[^}]*font-family:\s*["']?([^"';,}]+)/i);
  if (bodyFontMatch) {
    fonts.body = bodyFontMatch[1].trim();
  }

  // Deduplicate
  const uniqueFonts = [...new Set(fonts.extracted.map(f => f.value))];

  // Default assignments if not found
  if (!fonts.heading && uniqueFonts[0]) fonts.heading = uniqueFonts[0];
  if (!fonts.body && uniqueFonts[1]) fonts.body = uniqueFonts[1];
  if (!fonts.body && uniqueFonts[0]) fonts.body = uniqueFonts[0];

  return {
    heading: fonts.heading,
    body: fonts.body,
    stack: uniqueFonts.slice(0, 4)
  };
}

/**
 * Extract text content for voice analysis
 */
function extractTextContent(html) {
  // Remove scripts, styles, and HTML tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.substring(0, 10000); // Limit to first 10k chars
}

/**
 * Analyze voice/tone from text content
 */
function analyzeVoice(text, existingBranding = {}) {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  // Score each archetype
  const scores = {};
  for (const [archetype, config] of Object.entries(VOICE_ARCHETYPES)) {
    let score = 0;
    const matchedMarkers = [];

    for (const marker of config.markers) {
      const regex = new RegExp(`\\b${marker}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length;
        matchedMarkers.push(marker);
      }
    }

    scores[archetype] = { score, matchedMarkers };
  }

  // Find best matching archetype
  const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  const bestMatch = sorted[0];
  const archetypeConfig = VOICE_ARCHETYPES[bestMatch[0]];

  // Extract vocabulary (frequent meaningful words)
  const wordFreq = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'can', 'our', 'your', 'from', 'as']);

  words.forEach(word => {
    const clean = word.replace(/[^a-z]/g, '');
    if (clean.length > 3 && !stopWords.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });

  const topVocab = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);

  return {
    archetype: bestMatch[0],
    confidence: Math.min(bestMatch[1].score / 20, 1), // Normalize to 0-1
    tone: archetypeConfig.tone,
    style: archetypeConfig.style,
    vocabulary: topVocab,
    markers: bestMatch[1].matchedMarkers.slice(0, 6)
  };
}

/**
 * Load client config
 */
function loadClientConfig(clientId) {
  const configPath = join(CLIENTS_PATH, clientId, 'config.json');

  if (!existsSync(configPath)) {
    throw new Error(`Client config not found: ${configPath}`);
  }

  return JSON.parse(readFileSync(configPath, 'utf8'));
}

/**
 * Save brand token
 */
function saveBrandToken(clientId, token) {
  const brandPath = join(CLIENTS_PATH, clientId, 'brand.json');
  writeFileSync(brandPath, JSON.stringify(token, null, 2));
  return brandPath;
}

/**
 * Main scraper function
 */
export async function scrapeClientBrand(clientId) {
  console.log(`\n🎨 Scraping brand for: ${clientId}`);

  // Load client config
  const config = loadClientConfig(clientId);
  const websiteUrl = config.integrations?.website?.url;

  if (!websiteUrl) {
    throw new Error(`No website URL configured for ${clientId}`);
  }

  console.log(`   📡 Fetching: ${websiteUrl}`);

  // Fetch main page
  let html;
  try {
    html = await fetchHTML(websiteUrl);
  } catch (error) {
    console.error(`   ❌ Failed to fetch: ${error.message}`);

    // Fall back to existing branding from config
    if (config.branding) {
      console.log(`   📋 Using existing branding from config`);
      return {
        clientId,
        name: config.name,
        colors: config.branding.colors || {},
        fonts: config.branding.fonts || {},
        voice: {
          archetype: config.branding.voice || 'Unknown',
          tone: config.branding.tone ? [config.branding.tone] : [],
          vocabulary: config.branding.personality || []
        },
        scrapedFrom: websiteUrl,
        scraped: false,
        fallback: true,
        generatedAt: new Date().toISOString()
      };
    }
    throw error;
  }

  console.log(`   ✅ Fetched ${(html.length / 1024).toFixed(1)}KB`);

  // Extract colors
  console.log(`   🎨 Extracting colors...`);
  const colors = extractColors(html);
  console.log(`      Found ${colors.palette.length} unique colors`);

  // Extract fonts
  console.log(`   📝 Extracting fonts...`);
  const fonts = extractFonts(html);
  console.log(`      Heading: ${fonts.heading || 'not found'}`);
  console.log(`      Body: ${fonts.body || 'not found'}`);

  // Extract text and analyze voice
  console.log(`   🗣️  Analyzing voice...`);
  const textContent = extractTextContent(html);
  const voice = analyzeVoice(textContent, config.branding);
  console.log(`      Archetype: ${voice.archetype} (${(voice.confidence * 100).toFixed(0)}% confidence)`);

  // Try to fetch About page for better voice analysis
  const aboutUrls = [
    `${websiteUrl}/about`,
    `${websiteUrl}/about-us`,
    `${websiteUrl}/story`,
    `${websiteUrl}/our-story`
  ];

  for (const aboutUrl of aboutUrls) {
    try {
      console.log(`   📄 Trying: ${aboutUrl}`);
      const aboutHtml = await fetchHTML(aboutUrl, 5000);
      const aboutText = extractTextContent(aboutHtml);
      const aboutVoice = analyzeVoice(aboutText);

      // Merge vocabulary if About page has better content
      if (aboutVoice.confidence > voice.confidence) {
        console.log(`      ✅ Found richer content (${aboutVoice.archetype})`);
        voice.archetype = aboutVoice.archetype;
        voice.confidence = aboutVoice.confidence;
        voice.tone = aboutVoice.tone;
        voice.vocabulary = [...new Set([...aboutVoice.vocabulary, ...voice.vocabulary])].slice(0, 12);
        voice.markers = [...new Set([...aboutVoice.markers, ...voice.markers])].slice(0, 6);
      }
      break;
    } catch {
      // About page not found, continue
    }
  }

  // Merge with existing config branding (prefer scraped values)
  const existingColors = config.branding?.colors || {};
  const existingFonts = config.branding?.fonts || {};

  const brandToken = {
    clientId,
    name: config.name,
    colors: {
      primary: colors.primary || existingColors.primary || '#3b82f6',
      secondary: colors.secondary || existingColors.secondary || '#6366f1',
      accent: colors.accent || existingColors.accent || '#10b981',
      background: colors.background || existingColors.background || '#09090b',
      text: colors.text || '#fafafa',
      palette: colors.palette
    },
    fonts: {
      heading: fonts.heading || existingFonts.heading || 'Inter',
      body: fonts.body || existingFonts.body || 'Inter',
      stack: fonts.stack
    },
    voice: {
      archetype: voice.archetype,
      confidence: voice.confidence,
      tone: voice.tone,
      style: voice.style,
      vocabulary: voice.vocabulary,
      markers: voice.markers
    },
    scrapedFrom: websiteUrl,
    scraped: true,
    generatedAt: new Date().toISOString()
  };

  // Save brand token
  const savedPath = saveBrandToken(clientId, brandToken);
  console.log(`   💾 Saved: ${savedPath}`);

  return brandToken;
}

/**
 * Get list of all clients
 */
function getAllClients() {
  return readdirSync(CLIENTS_PATH, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => existsSync(join(CLIENTS_PATH, d.name, 'config.json')))
    .map(d => d.name);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Brand Style Scraper - SuperChase Adaptive Brand Engine

Usage:
  node spokes/brand/scraper.js <clientId>    Scrape single client
  node spokes/brand/scraper.js --all         Scrape all clients
  node spokes/brand/scraper.js --list        List available clients

Examples:
  node spokes/brand/scraper.js bigmuddy
  node spokes/brand/scraper.js --all
`);
    process.exit(0);
  }

  if (args[0] === '--list') {
    const clients = getAllClients();
    console.log('\nAvailable clients:');
    clients.forEach(c => console.log(`  - ${c}`));
    process.exit(0);
  }

  if (args[0] === '--all') {
    const clients = getAllClients();

    console.log(`\n🚀 Scraping ${clients.length} clients...\n`);

    const results = [];
    for (const clientId of clients) {
      try {
        const token = await scrapeClientBrand(clientId);
        results.push({ clientId, success: true, archetype: token.voice.archetype });
      } catch (error) {
        results.push({ clientId, success: false, error: error.message });
      }
    }

    console.log('\n📊 Results:');
    console.log('─'.repeat(50));
    results.forEach(r => {
      if (r.success) {
        console.log(`  ✅ ${r.clientId}: ${r.archetype}`);
      } else {
        console.log(`  ❌ ${r.clientId}: ${r.error}`);
      }
    });

    process.exit(0);
  }

  // Single client
  const clientId = args[0];
  try {
    const token = await scrapeClientBrand(clientId);
    console.log('\n📋 Brand Token:');
    console.log('─'.repeat(50));
    console.log(JSON.stringify(token, null, 2));
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

export default { scrapeClientBrand };

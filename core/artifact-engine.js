/**
 * Artifact Engine
 *
 * Generates microsites, decks, and visual artifacts from council output.
 * Part of MARS Phase 2.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createLogger } from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ module: 'artifact-engine' });

// Artifact storage directory
export const ARTIFACTS_DIR = join(__dirname, '..', 'artifacts');

// Business template configurations
export const BUSINESS_TEMPLATES = {
  s2p: {
    name: 'Scan2Plan',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    accentColor: '#60a5fa',
    font: 'Inter',
    logo: '/assets/s2p-logo.svg',
    vibe: 'Technical precision',
    tagline: 'Reality Capture & As-Built Documentation'
  },
  'studio-c': {
    name: 'Studio C',
    primaryColor: '#000000',
    secondaryColor: '#1f2937',
    accentColor: '#d4af37',
    font: 'Montserrat',
    logo: '/assets/studio-c-logo.svg',
    vibe: 'Premium media',
    tagline: 'Premium Content Creation'
  },
  bigmuddy: {
    name: 'Big Muddy Inn',
    primaryColor: '#166534',
    secondaryColor: '#14532d',
    accentColor: '#86efac',
    font: 'Playfair Display',
    logo: '/assets/bigmuddy-logo.svg',
    vibe: 'Southern hospitality',
    tagline: 'Where the River Meets the Road'
  },
  tuthill: {
    name: 'Tuthill Design',
    primaryColor: '#7c3aed',
    secondaryColor: '#5b21b6',
    accentColor: '#c4b5fd',
    font: 'Poppins',
    logo: '/assets/tuthill-logo.svg',
    vibe: 'Modern elegance',
    tagline: 'Real Estate Media That Sells'
  },
  cptv: {
    name: 'CPTV',
    primaryColor: '#dc2626',
    secondaryColor: '#991b1b',
    accentColor: '#fca5a5',
    font: 'Roboto',
    logo: '/assets/cptv-logo.svg',
    vibe: 'Bold storytelling',
    tagline: 'Video Production Excellence'
  },
  utopia: {
    name: 'Utopia Studios',
    primaryColor: '#0891b2',
    secondaryColor: '#0e7490',
    accentColor: '#67e8f9',
    font: 'Space Grotesk',
    logo: '/assets/utopia-logo.svg',
    vibe: 'Creative innovation',
    tagline: 'Where Ideas Come to Life'
  }
};

/**
 * Generate a unique artifact ID
 */
function generateArtifactId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `art-${timestamp}-${random}`;
}

/**
 * Get business template config
 */
export function getBusinessTemplate(business) {
  return BUSINESS_TEMPLATES[business] || BUSINESS_TEMPLATES.s2p;
}

/**
 * Ensure artifacts directory exists
 */
function ensureArtifactsDir() {
  if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
}

/**
 * Get artifact directory path
 */
function getArtifactDir(artifactId) {
  return join(ARTIFACTS_DIR, artifactId);
}

/**
 * Save artifact metadata
 */
function saveArtifactMeta(artifact) {
  const artifactDir = getArtifactDir(artifact.id);
  if (!existsSync(artifactDir)) {
    mkdirSync(artifactDir, { recursive: true });
  }
  writeFileSync(
    join(artifactDir, 'meta.json'),
    JSON.stringify(artifact, null, 2)
  );
}

/**
 * Load artifact metadata
 */
export function loadArtifactMeta(artifactId) {
  const metaPath = join(getArtifactDir(artifactId), 'meta.json');
  if (!existsSync(metaPath)) {
    return null;
  }
  return JSON.parse(readFileSync(metaPath, 'utf8'));
}

/**
 * List all artifacts
 */
export function listArtifacts(filters = {}) {
  ensureArtifactsDir();
  const artifacts = [];

  const dirs = readdirSync(ARTIFACTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('art-'));

  for (const dir of dirs) {
    const meta = loadArtifactMeta(dir.name);
    if (meta) {
      // Apply filters
      if (filters.business && meta.business !== filters.business) continue;
      if (filters.type && meta.type !== filters.type) continue;
      if (filters.status && meta.status !== filters.status) continue;

      artifacts.push(meta);
    }
  }

  // Sort by created date, newest first
  artifacts.sort((a, b) => new Date(b.created) - new Date(a.created));

  return artifacts;
}

/**
 * Generate microsite HTML from council output
 */
function generateMicrositeHTML(artifact) {
  const template = getBusinessTemplate(artifact.business);
  const sections = artifact.sections || {};

  // Default sections if not provided
  const hero = sections.hero || artifact.title;
  const problem = sections.problem || '';
  const solution = sections.solution || '';
  const specifics = sections.specifics || {};
  const cta = sections.cta || 'Get in Touch';

  // Build specifics list
  let specificsHTML = '';
  if (specifics.timeline) {
    specificsHTML += `<div class="spec-item"><strong>Timeline:</strong> ${specifics.timeline}</div>`;
  }
  if (specifics.price) {
    specificsHTML += `<div class="spec-item"><strong>Investment:</strong> ${specifics.price}</div>`;
  }
  if (specifics.deliverables && Array.isArray(specifics.deliverables)) {
    specificsHTML += `<div class="spec-item"><strong>Deliverables:</strong><ul>${specifics.deliverables.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
  }

  // Council synthesis section (if available)
  let synthesisHTML = '';
  if (artifact.councilOutput?.synthesis) {
    synthesisHTML = `
    <section class="synthesis">
      <h2>Strategic Analysis</h2>
      <div class="synthesis-content">${markdownToHTML(artifact.councilOutput.synthesis)}</div>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${artifact.title} | ${template.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${template.font.replace(' ', '+')}:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${template.primaryColor};
      --secondary: ${template.secondaryColor};
      --accent: ${template.accentColor};
      --font-family: '${template.font}', system-ui, sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-family);
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
    }

    .hero {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: white;
      padding: 4rem 2rem;
      text-align: center;
    }

    .hero h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .hero .tagline {
      font-size: 1.25rem;
      opacity: 0.9;
    }

    .business-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    section {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    section h2 {
      color: var(--primary);
      font-size: 1.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--accent);
    }

    .problem {
      border-left: 4px solid #ef4444;
    }

    .solution {
      border-left: 4px solid #10b981;
    }

    .specifics {
      border-left: 4px solid var(--primary);
    }

    .spec-item {
      margin-bottom: 1rem;
    }

    .spec-item ul {
      margin-top: 0.5rem;
      margin-left: 1.5rem;
    }

    .spec-item li {
      margin-bottom: 0.25rem;
    }

    .synthesis {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-left: 4px solid var(--accent);
    }

    .synthesis-content {
      font-size: 0.95rem;
      line-height: 1.8;
    }

    .cta-section {
      text-align: center;
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: white;
    }

    .cta-section h2 {
      color: white;
      border-bottom-color: rgba(255,255,255,0.3);
    }

    .cta-button {
      display: inline-block;
      background: white;
      color: var(--primary);
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.125rem;
      margin-top: 1rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .footer {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .footer a {
      color: var(--primary);
      text-decoration: none;
    }

    .mars-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      border-radius: 2rem;
      font-size: 0.75rem;
    }

    @media (max-width: 640px) {
      .hero h1 {
        font-size: 1.75rem;
      }
      .container {
        padding: 1rem;
      }
      section {
        padding: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="business-badge">${template.name}</div>
    <h1>${hero}</h1>
    <p class="tagline">${template.tagline}</p>
  </header>

  <main class="container">
    ${problem ? `
    <section class="problem">
      <h2>The Challenge</h2>
      <p>${problem}</p>
    </section>` : ''}

    ${solution ? `
    <section class="solution">
      <h2>Our Approach</h2>
      <p>${solution}</p>
    </section>` : ''}

    ${specificsHTML ? `
    <section class="specifics">
      <h2>Project Details</h2>
      ${specificsHTML}
    </section>` : ''}

    ${synthesisHTML}

    <section class="cta-section">
      <h2>Ready to Start?</h2>
      <p>Let's discuss how we can help bring this vision to life.</p>
      <a href="#contact" class="cta-button">${cta}</a>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; ${new Date().getFullYear()} ${template.name}. All rights reserved.</p>
    <div class="mars-badge">
      <span>Generated by</span>
      <strong>MARS</strong>
    </div>
  </footer>
</body>
</html>`;
}

/**
 * Simple markdown to HTML converter
 */
function markdownToHTML(md) {
  if (!md) return '';
  return md
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

/**
 * Generate artifact from council output
 */
export async function generateArtifact(options) {
  const {
    type = 'microsite',
    business = 's2p',
    title,
    councilOutput = null,
    sections = {},
    traceId = null
  } = options;

  logger.info('Generating artifact', {
    type,
    business,
    title: title?.substring(0, 50)
  });

  ensureArtifactsDir();

  const artifactId = generateArtifactId();
  const now = new Date().toISOString();

  const artifact = {
    id: artifactId,
    type,
    business,
    title,
    created: now,
    updated: now,
    status: 'draft',

    // Content
    sections,
    councilOutput,
    traceId,

    // Feedback tracking
    feedback: {
      rating: null,
      editCount: 0,
      timeToPublish: null,
      shared: false,
      revisions: []
    }
  };

  // Generate HTML based on type
  let html = '';
  switch (type) {
    case 'microsite':
      html = generateMicrositeHTML(artifact);
      break;
    case 'deck':
      // TODO: Implement deck generation
      html = '<html><body>Deck template coming soon</body></html>';
      break;
    case 'one-pager':
      // TODO: Implement one-pager generation
      html = '<html><body>One-pager template coming soon</body></html>';
      break;
    case 'diagram':
      // TODO: Implement diagram generation
      html = '<html><body>Diagram template coming soon</body></html>';
      break;
    default:
      throw new Error(`Unknown artifact type: ${type}`);
  }

  // Create artifact directory and save files
  const artifactDir = getArtifactDir(artifactId);
  mkdirSync(artifactDir, { recursive: true });

  // Save HTML
  writeFileSync(join(artifactDir, 'index.html'), html);

  // Save metadata
  saveArtifactMeta(artifact);

  logger.info('Artifact generated', {
    artifactId,
    type,
    business,
    path: artifactDir
  });

  return artifact;
}

/**
 * Update artifact
 */
export function updateArtifact(artifactId, updates) {
  const artifact = loadArtifactMeta(artifactId);
  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  // Track edit
  artifact.feedback.editCount++;
  artifact.feedback.revisions.push({
    timestamp: new Date().toISOString(),
    fields: Object.keys(updates)
  });

  // Apply updates
  Object.assign(artifact, updates);
  artifact.updated = new Date().toISOString();

  // Regenerate HTML if content changed
  if (updates.sections || updates.title) {
    const html = generateMicrositeHTML(artifact);
    writeFileSync(join(getArtifactDir(artifactId), 'index.html'), html);
  }

  saveArtifactMeta(artifact);

  logger.info('Artifact updated', {
    artifactId,
    editCount: artifact.feedback.editCount
  });

  return artifact;
}

/**
 * Publish artifact (mark as published)
 */
export function publishArtifact(artifactId) {
  const artifact = loadArtifactMeta(artifactId);
  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  artifact.status = 'published';
  artifact.publishedAt = new Date().toISOString();
  artifact.feedback.timeToPublish = Date.now() - new Date(artifact.created).getTime();

  saveArtifactMeta(artifact);

  logger.info('Artifact published', {
    artifactId,
    timeToPublish: artifact.feedback.timeToPublish
  });

  return artifact;
}

/**
 * Record feedback on artifact
 */
export function recordFeedback(artifactId, feedbackData) {
  const artifact = loadArtifactMeta(artifactId);
  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  if (feedbackData.rating !== undefined) {
    artifact.feedback.rating = feedbackData.rating;
  }
  if (feedbackData.shared !== undefined) {
    artifact.feedback.shared = feedbackData.shared;
  }
  if (feedbackData.notes) {
    artifact.feedback.notes = feedbackData.notes;
  }

  saveArtifactMeta(artifact);

  logger.info('Feedback recorded', {
    artifactId,
    rating: feedbackData.rating,
    shared: feedbackData.shared
  });

  return artifact;
}

/**
 * Delete artifact
 */
export function deleteArtifact(artifactId) {
  const artifactDir = getArtifactDir(artifactId);
  if (!existsSync(artifactDir)) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  // Remove directory recursively
  rmSync(artifactDir, { recursive: true });

  logger.info('Artifact deleted', { artifactId });

  return { success: true, artifactId };
}

/**
 * Get artifact HTML content
 */
export function getArtifactHTML(artifactId) {
  const htmlPath = join(getArtifactDir(artifactId), 'index.html');
  if (!existsSync(htmlPath)) {
    return null;
  }
  return readFileSync(htmlPath, 'utf8');
}

export default {
  generateArtifact,
  listArtifacts,
  loadArtifactMeta,
  updateArtifact,
  publishArtifact,
  recordFeedback,
  deleteArtifact,
  getArtifactHTML,
  getBusinessTemplate,
  BUSINESS_TEMPLATES,
  ARTIFACTS_DIR
};

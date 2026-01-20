#!/usr/bin/env node
/**
 * George Bridge - Voice Persona Interface
 *
 * Presents the executive briefing in George's voice.
 * George is a professional British butler - warm, efficient, slightly formal.
 *
 * Uses ElevenLabs TTS API for voice synthesis.
 * Falls back to console text if TTS unavailable.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, writeFileSync, unlinkSync, mkdirSync, readdirSync, statSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generateBriefing, getCachedBriefing } from './briefing.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

// Audio cache directory
const AUDIO_CACHE_DIR = join(__dirname, '..', '..', 'cache', 'audio');

/**
 * High-Value Context - Key people George should recognize
 * These names trigger enhanced context awareness in responses
 */
const HIGH_VALUE_PEOPLE = {
  'Owen': { context: 'Scan2Plan team', role: 'Operations/Sales', priority: 'high' },
  'Agata': { context: 'Scan2Plan team', role: 'Operations', priority: 'high' },
  'Tracy': { context: 'Big Muddy Inn', role: 'Owner', priority: 'high' },
  'Amy': { context: 'Big Muddy Inn', role: 'Owner/Singer', priority: 'high' },
  'Patricia': { context: 'Purist', role: 'Partner', priority: 'high' },
  'Chris': { context: 'Purist', role: 'Partner', priority: 'high' },
  'Miles': { context: 'Studio C', role: 'Technical Director', priority: 'high' }
};

/**
 * Check if text contains high-value person names
 * Returns context for mentioned people
 */
export function identifyHighValuePeople(text) {
  const mentioned = [];
  const textLower = text.toLowerCase();

  for (const [name, info] of Object.entries(HIGH_VALUE_PEOPLE)) {
    if (textLower.includes(name.toLowerCase())) {
      mentioned.push({ name, ...info });
    }
  }

  return mentioned;
}

/**
 * Get high-value people registry
 */
export function getHighValuePeople() {
  return HIGH_VALUE_PEOPLE;
}

/**
 * George's greeting based on time of day
 */
function getGreeting() {
  const hour = new Date().getHours();
  const name = 'Sir';

  if (hour < 12) {
    return `Good morning, ${name}.`;
  } else if (hour < 17) {
    return `Good afternoon, ${name}.`;
  } else if (hour < 21) {
    return `Good evening, ${name}.`;
  } else {
    return `Still burning the midnight oil, ${name}?`;
  }
}

/**
 * George's sign-off
 */
function getSignOff(stats) {
  if (stats.urgentCount > 2) {
    return "Shall I prioritize these matters for you?";
  } else if (stats.overdueCount > 0) {
    return "I'd recommend addressing the overdue items first.";
  } else if (stats.taskCount === 0 && stats.urgentCount === 0) {
    return "A rare moment of calm. Perhaps a good time for strategic thinking?";
  } else {
    return "Will there be anything else?";
  }
}

/**
 * Format the briefing text for speech (no visual formatting)
 */
function formatForSpeech(summary) {
  const greeting = getGreeting();
  const signOff = getSignOff(summary.stats || {});

  return `${greeting} ${summary.briefing} ${signOff}`;
}

/**
 * Format the briefing for console display
 */
function formatForConsole(summary) {
  const lines = [];

  lines.push(getGreeting());
  lines.push('');
  lines.push(summary.briefing);
  lines.push('');

  if (summary.stats) {
    const { urgentCount, taskCount, overdueCount } = summary.stats;
    if (overdueCount > 0) {
      lines.push(`[${overdueCount} overdue • ${urgentCount} urgent • ${taskCount} tasks]`);
    } else {
      lines.push(`[${urgentCount} urgent • ${taskCount} active tasks]`);
    }
  }

  lines.push('');
  lines.push(getSignOff(summary.stats || {}));

  return lines.join('\n');
}

/**
 * Generate speech audio using ElevenLabs API
 * @param {string} text - Text to synthesize
 * @returns {Promise<Buffer|null>} - Audio buffer or null on failure
 */
async function synthesizeSpeech(text) {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'NEEDS_VALUE') {
    console.log('[Voice] ElevenLabs API key not configured');
    return null;
  }

  console.log('[Voice] Synthesizing speech via ElevenLabs...');

  try {
    const response = await fetch(ELEVENLABS_URL, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Voice] ElevenLabs API error (${response.status}):`, errorText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    console.error('[Voice] TTS synthesis failed:', error.message);
    return null;
  }
}

/**
 * Play audio file using system command
 * @param {string} audioPath - Path to audio file
 */
async function playAudio(audioPath) {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // macOS
      console.log('[Voice] Playing audio (afplay)...\n');
      await execAsync(`afplay "${audioPath}"`);
    } else if (platform === 'linux') {
      // Linux - try multiple players
      try {
        await execAsync(`aplay "${audioPath}"`);
      } catch {
        try {
          await execAsync(`paplay "${audioPath}"`);
        } catch {
          await execAsync(`mpg123 "${audioPath}"`);
        }
      }
    } else if (platform === 'win32') {
      // Windows
      await execAsync(`powershell -c (New-Object Media.SoundPlayer "${audioPath}").PlaySync()`);
    } else {
      console.log('[Voice] Unsupported platform for audio playback');
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Voice] Audio playback failed:', error.message);
    return false;
  }
}

/**
 * Main speak function - generates briefing and plays audio
 */
async function speak(options = {}) {
  const { refresh = false, textOnly = false } = options;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    🎩 GEORGE                               ║');
  console.log('║              Executive Assistant                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get or generate briefing
  let summary;

  if (refresh) {
    console.log('[Generating fresh briefing...]\n');
    summary = await generateBriefing();
  } else {
    summary = getCachedBriefing();
    if (!summary || !summary.briefing) {
      console.log('[No cached briefing found, generating...]\n');
      summary = await generateBriefing();
    } else {
      const age = Date.now() - new Date(summary.generatedAt).getTime();
      const ageMinutes = Math.floor(age / 60000);
      if (ageMinutes > 30) {
        console.log(`[Briefing is ${ageMinutes}m old, refreshing...]\n`);
        summary = await generateBriefing();
      }
    }
  }

  // Always show text output
  console.log(formatForConsole(summary));
  console.log('\n────────────────────────────────────────────────────────────');

  // Attempt voice synthesis unless text-only mode
  if (textOnly) {
    console.log('[Voice] Text-only mode');
    console.log('────────────────────────────────────────────────────────────\n');
    return summary;
  }

  // Ensure audio cache directory exists
  if (!existsSync(AUDIO_CACHE_DIR)) {
    mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  }

  // Generate speech
  const speechText = formatForSpeech(summary);
  const audioBuffer = await synthesizeSpeech(speechText);

  if (audioBuffer) {
    // Save to temp file
    const audioPath = join(AUDIO_CACHE_DIR, `briefing_${Date.now()}.mp3`);
    writeFileSync(audioPath, audioBuffer);
    console.log(`[Voice] Audio saved: ${audioPath}`);

    // Play audio
    const played = await playAudio(audioPath);

    if (played) {
      console.log('[Voice] Playback complete');
      // Clean up old audio files (keep last 5)
      cleanupOldAudio();
    } else {
      console.log('[Voice] Playback failed - text output above');
    }
  } else {
    console.log('[Voice] TTS unavailable - text output above');
  }

  console.log('────────────────────────────────────────────────────────────\n');

  return summary;
}

/**
 * Clean up old audio files, keeping only the most recent 5
 */
function cleanupOldAudio() {
  try {
    const files = readdirSync(AUDIO_CACHE_DIR)
      .filter(f => f.endsWith('.mp3'))
      .map(f => ({
        name: f,
        path: join(AUDIO_CACHE_DIR, f),
        mtime: statSync(join(AUDIO_CACHE_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Remove all but the 5 most recent
    files.slice(5).forEach(f => {
      try {
        unlinkSync(f.path);
      } catch { }
    });
  } catch { }
}

/**
 * Test ElevenLabs connection
 */
export async function testVoice() {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'NEEDS_VALUE') {
    return { success: false, error: 'ELEVENLABS_API_KEY not set' };
  }

  // Test with a short phrase
  const testAudio = await synthesizeSpeech('Testing voice connection.');

  if (testAudio) {
    return {
      success: true,
      voiceId: ELEVENLABS_VOICE_ID,
      audioSize: testAudio.length
    };
  }

  return { success: false, error: 'TTS synthesis failed' };
}

export default {
  speak,
  formatForSpeech,
  formatForConsole,
  synthesizeSpeech,
  playAudio,
  testVoice
};

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const refresh = process.argv.includes('--refresh') || process.argv.includes('-r');
  const textOnly = process.argv.includes('--text') || process.argv.includes('-t');
  speak({ refresh, textOnly });
}

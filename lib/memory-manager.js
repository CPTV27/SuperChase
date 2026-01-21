/**
 * Memory Manager
 *
 * Handles cleanup, archival, and disk management for SuperChase memory files.
 * Prevents unbounded growth of JSON/JSONL files in /memory/ directory.
 *
 * @module lib/memory-manager
 */

import fs from 'fs';
import path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { createLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger({ module: 'memory-manager' });

// ============================================
// Configuration
// ============================================

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');
const CONFIG_FILE = path.join(MEMORY_DIR, '.memory-manager.json');

// Default retention policies (in days)
const DEFAULT_RETENTION = {
  // Output directories - archive after threshold, delete archives after longer period
  llm_council_outputs: { archiveAfterDays: 7, deleteAfterDays: 90 },
  brainstorms: { archiveAfterDays: 30, deleteAfterDays: 180 },
  agent_outputs: { archiveAfterDays: 7, deleteAfterDays: 60 },
  projects: { archiveAfterDays: 30, deleteAfterDays: 180 },

  // JSONL files - trim entries older than threshold
  's2p_prospect_vault.jsonl': { trimAfterDays: 90, maxEntries: 10000 },
  'audit.jsonl': { trimAfterDays: 30, maxEntries: 5000 },

  // JSON files - keep only recent summaries
  'daily_summary.json': { keepHistory: false }, // Always current day only
  'limitless_context.json': { trimAfterDays: 14 },
  'cost_tracking.json': { keepHistory: true }, // Keep for billing

  // Default for unknown files
  default: { archiveAfterDays: 30, deleteAfterDays: 180 }
};

// Disk limits
const DISK_LIMITS = {
  maxMemoryDirMB: 500, // 500MB max for /memory/
  maxArchiveDirMB: 1000, // 1GB max for archives
  warningThresholdPercent: 80
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get file age in days
 */
function getFileAgeDays(filepath) {
  try {
    const stats = fs.statSync(filepath);
    const ageMs = Date.now() - stats.mtime.getTime();
    return ageMs / (1000 * 60 * 60 * 24);
  } catch {
    return 0;
  }
}

/**
 * Get directory size in bytes
 */
function getDirectorySize(dirPath) {
  let totalSize = 0;

  if (!fs.existsSync(dirPath)) return 0;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += getDirectorySize(fullPath);
    } else if (entry.isFile()) {
      try {
        totalSize += fs.statSync(fullPath).size;
      } catch {
        // Ignore inaccessible files
      }
    }
  }

  return totalSize;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Ensure archive directory exists
 */
function ensureArchiveDir() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

// ============================================
// Archive Functions
// ============================================

/**
 * Compress and archive a file
 * @param {string} sourcePath - Source file path
 * @param {string} archiveName - Name for archived file
 * @returns {Promise<string>} Archive file path
 */
async function archiveFile(sourcePath, archiveName = null) {
  ensureArchiveDir();

  const filename = archiveName || path.basename(sourcePath);
  const archivePath = path.join(ARCHIVE_DIR, `${filename}.gz`);

  await pipeline(
    fs.createReadStream(sourcePath),
    createGzip(),
    fs.createWriteStream(archivePath)
  );

  logger.info('File archived', { source: sourcePath, archive: archivePath });
  return archivePath;
}

/**
 * Archive and delete a file
 */
async function archiveAndDelete(sourcePath, archiveName = null) {
  const archivePath = await archiveFile(sourcePath, archiveName);
  fs.unlinkSync(sourcePath);
  logger.info('File archived and deleted', { source: sourcePath });
  return archivePath;
}

/**
 * Archive old files in a directory
 * @param {string} dirPath - Directory to process
 * @param {number} archiveAfterDays - Archive files older than this
 * @returns {Promise<{archived: number, errors: number}>}
 */
async function archiveOldFiles(dirPath, archiveAfterDays) {
  if (!fs.existsSync(dirPath)) return { archived: 0, errors: 0 };

  let archived = 0;
  let errors = 0;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith('.')) continue;

    const filepath = path.join(dirPath, entry.name);
    const ageDays = getFileAgeDays(filepath);

    if (ageDays > archiveAfterDays) {
      try {
        const dirname = path.basename(dirPath);
        const archiveName = `${dirname}_${entry.name}_${Date.now()}`;
        await archiveAndDelete(filepath, archiveName);
        archived++;
      } catch (error) {
        logger.error('Archive failed', { file: filepath, error: error.message });
        errors++;
      }
    }
  }

  return { archived, errors };
}

/**
 * Delete old archives
 */
function deleteOldArchives(deleteAfterDays) {
  if (!fs.existsSync(ARCHIVE_DIR)) return { deleted: 0 };

  let deleted = 0;
  const entries = fs.readdirSync(ARCHIVE_DIR);

  for (const entry of entries) {
    const filepath = path.join(ARCHIVE_DIR, entry);
    const ageDays = getFileAgeDays(filepath);

    if (ageDays > deleteAfterDays) {
      try {
        fs.unlinkSync(filepath);
        deleted++;
        logger.debug('Old archive deleted', { file: entry });
      } catch (error) {
        logger.error('Delete failed', { file: filepath, error: error.message });
      }
    }
  }

  return { deleted };
}

// ============================================
// JSONL Trimming
// ============================================

/**
 * Trim a JSONL file to keep only recent entries
 * @param {string} filepath - JSONL file path
 * @param {Object} options
 * @param {number} [options.trimAfterDays] - Remove entries older than this
 * @param {number} [options.maxEntries] - Maximum entries to keep
 * @returns {{trimmed: number, remaining: number}}
 */
function trimJsonlFile(filepath, options = {}) {
  const { trimAfterDays = 90, maxEntries = 10000 } = options;

  if (!fs.existsSync(filepath)) return { trimmed: 0, remaining: 0 };

  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);

  const cutoffDate = new Date(Date.now() - trimAfterDays * 24 * 60 * 60 * 1000);

  // Filter by date if entries have timestamps
  let filtered = lines.filter(line => {
    try {
      const entry = JSON.parse(line);
      const timestamp = entry.timestamp || entry.createdAt || entry.date;
      if (timestamp) {
        return new Date(timestamp) >= cutoffDate;
      }
      return true; // Keep entries without timestamps
    } catch {
      return true; // Keep malformed lines
    }
  });

  // Also apply max entries limit (keep most recent)
  if (filtered.length > maxEntries) {
    filtered = filtered.slice(-maxEntries);
  }

  const trimmed = lines.length - filtered.length;

  if (trimmed > 0) {
    // Archive original before trimming
    const archiveName = `${path.basename(filepath)}_trimmed_${Date.now()}`;
    fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName), content);

    // Write trimmed content
    fs.writeFileSync(filepath, filtered.join('\n') + '\n');
    logger.info('JSONL trimmed', { file: filepath, trimmed, remaining: filtered.length });
  }

  return { trimmed, remaining: filtered.length };
}

// ============================================
// JSON File Cleanup
// ============================================

/**
 * Trim JSON file with array data
 * @param {string} filepath - JSON file path
 * @param {Object} options
 */
function trimJsonFile(filepath, options = {}) {
  const { trimAfterDays = 30, arrayKey = null } = options;

  if (!fs.existsSync(filepath)) return { trimmed: 0 };

  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const cutoffDate = new Date(Date.now() - trimAfterDays * 24 * 60 * 60 * 1000);

    // Handle array at root or nested
    const processArray = (arr) => {
      if (!Array.isArray(arr)) return arr;

      return arr.filter(item => {
        const timestamp = item.timestamp || item.createdAt || item.date || item.processedAt;
        if (timestamp) {
          return new Date(timestamp) >= cutoffDate;
        }
        return true;
      });
    };

    let trimmed = 0;

    if (Array.isArray(data)) {
      const filtered = processArray(data);
      trimmed = data.length - filtered.length;
      if (trimmed > 0) {
        fs.writeFileSync(filepath, JSON.stringify(filtered, null, 2));
      }
    } else if (arrayKey && Array.isArray(data[arrayKey])) {
      const original = data[arrayKey].length;
      data[arrayKey] = processArray(data[arrayKey]);
      trimmed = original - data[arrayKey].length;
      if (trimmed > 0) {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      }
    }

    if (trimmed > 0) {
      logger.info('JSON trimmed', { file: filepath, trimmed });
    }

    return { trimmed };
  } catch (error) {
    logger.error('JSON trim failed', { file: filepath, error: error.message });
    return { trimmed: 0, error: error.message };
  }
}

// ============================================
// Main Cleanup Functions
// ============================================

/**
 * Run full memory cleanup
 * @param {Object} [options]
 * @param {boolean} [options.dryRun] - Don't actually delete/archive
 * @param {Object} [options.retention] - Override retention policies
 * @returns {Promise<Object>} Cleanup report
 */
async function runCleanup(options = {}) {
  const { dryRun = false, retention = DEFAULT_RETENTION } = options;

  logger.info('Memory cleanup starting', { dryRun });

  const report = {
    startTime: new Date().toISOString(),
    dryRun,
    directories: {},
    files: {},
    archives: {},
    diskUsage: {}
  };

  ensureArchiveDir();

  // 1. Process output directories
  const outputDirs = ['llm_council_outputs', 'brainstorms', 'agent_outputs', 'projects'];

  for (const dir of outputDirs) {
    const dirPath = path.join(MEMORY_DIR, dir);
    const policy = retention[dir] || retention.default;

    if (fs.existsSync(dirPath)) {
      if (dryRun) {
        const entries = fs.readdirSync(dirPath);
        const oldFiles = entries.filter(f => {
          const fp = path.join(dirPath, f);
          return fs.statSync(fp).isFile() && getFileAgeDays(fp) > policy.archiveAfterDays;
        });
        report.directories[dir] = { wouldArchive: oldFiles.length };
      } else {
        const result = await archiveOldFiles(dirPath, policy.archiveAfterDays);
        report.directories[dir] = result;
      }
    }
  }

  // 2. Trim JSONL files
  const jsonlFiles = fs.readdirSync(MEMORY_DIR)
    .filter(f => f.endsWith('.jsonl'));

  for (const file of jsonlFiles) {
    const filepath = path.join(MEMORY_DIR, file);
    const policy = retention[file] || { trimAfterDays: 90, maxEntries: 10000 };

    if (dryRun) {
      report.files[file] = { wouldTrim: 'check manually' };
    } else if (policy.trimAfterDays) {
      const result = trimJsonlFile(filepath, policy);
      report.files[file] = result;
    }
  }

  // 3. Trim JSON files with arrays
  const jsonArrayFiles = ['limitless_context.json'];

  for (const file of jsonArrayFiles) {
    const filepath = path.join(MEMORY_DIR, file);
    const policy = retention[file] || { trimAfterDays: 30 };

    if (fs.existsSync(filepath) && policy.trimAfterDays) {
      if (dryRun) {
        report.files[file] = { wouldTrim: 'check manually' };
      } else {
        const result = trimJsonFile(filepath, { trimAfterDays: policy.trimAfterDays });
        report.files[file] = result;
      }
    }
  }

  // 4. Delete old archives
  if (!dryRun) {
    const archiveDeleteDays = Math.max(
      ...Object.values(retention).map(p => p.deleteAfterDays || 180)
    );
    report.archives = deleteOldArchives(archiveDeleteDays);
  }

  // 5. Calculate disk usage
  report.diskUsage = {
    memoryDir: formatBytes(getDirectorySize(MEMORY_DIR)),
    archiveDir: formatBytes(getDirectorySize(ARCHIVE_DIR)),
    memoryDirBytes: getDirectorySize(MEMORY_DIR),
    archiveDirBytes: getDirectorySize(ARCHIVE_DIR)
  };

  // Check disk limits
  const memoryMB = report.diskUsage.memoryDirBytes / (1024 * 1024);
  const archiveMB = report.diskUsage.archiveDirBytes / (1024 * 1024);

  if (memoryMB > DISK_LIMITS.maxMemoryDirMB * DISK_LIMITS.warningThresholdPercent / 100) {
    report.warnings = report.warnings || [];
    report.warnings.push(`Memory directory at ${(memoryMB / DISK_LIMITS.maxMemoryDirMB * 100).toFixed(1)}% capacity`);
  }

  if (archiveMB > DISK_LIMITS.maxArchiveDirMB * DISK_LIMITS.warningThresholdPercent / 100) {
    report.warnings = report.warnings || [];
    report.warnings.push(`Archive directory at ${(archiveMB / DISK_LIMITS.maxArchiveDirMB * 100).toFixed(1)}% capacity`);
  }

  report.endTime = new Date().toISOString();

  logger.info('Memory cleanup complete', {
    archived: Object.values(report.directories).reduce((sum, d) => sum + (d.archived || 0), 0),
    trimmed: Object.values(report.files).reduce((sum, f) => sum + (f.trimmed || 0), 0),
    diskUsage: report.diskUsage.memoryDir
  });

  return report;
}

/**
 * Get current memory status
 * @returns {Object}
 */
function getMemoryStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    diskUsage: {
      memoryDir: {
        size: formatBytes(getDirectorySize(MEMORY_DIR)),
        bytes: getDirectorySize(MEMORY_DIR),
        limit: `${DISK_LIMITS.maxMemoryDirMB} MB`
      },
      archiveDir: {
        size: formatBytes(getDirectorySize(ARCHIVE_DIR)),
        bytes: getDirectorySize(ARCHIVE_DIR),
        limit: `${DISK_LIMITS.maxArchiveDirMB} MB`
      }
    },
    files: {},
    warnings: []
  };

  // List files with sizes and ages
  const entries = fs.readdirSync(MEMORY_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'archive') continue;

    const fullPath = path.join(MEMORY_DIR, entry.name);

    if (entry.isDirectory()) {
      const files = fs.readdirSync(fullPath).length;
      status.files[entry.name] = {
        type: 'directory',
        fileCount: files,
        size: formatBytes(getDirectorySize(fullPath))
      };
    } else if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      status.files[entry.name] = {
        type: 'file',
        size: formatBytes(stats.size),
        age: `${Math.round(getFileAgeDays(fullPath))} days`,
        modified: stats.mtime.toISOString()
      };
    }
  }

  // Check for warnings
  const memoryMB = status.diskUsage.memoryDir.bytes / (1024 * 1024);
  if (memoryMB > DISK_LIMITS.maxMemoryDirMB * 0.8) {
    status.warnings.push('Memory directory approaching capacity limit');
  }

  return status;
}

/**
 * Emergency cleanup when disk is nearly full
 */
async function emergencyCleanup() {
  logger.warn('Emergency cleanup triggered');

  // Aggressive cleanup: archive everything older than 3 days
  const result = await runCleanup({
    retention: {
      llm_council_outputs: { archiveAfterDays: 3, deleteAfterDays: 30 },
      brainstorms: { archiveAfterDays: 3, deleteAfterDays: 30 },
      agent_outputs: { archiveAfterDays: 1, deleteAfterDays: 14 },
      projects: { archiveAfterDays: 7, deleteAfterDays: 60 },
      default: { archiveAfterDays: 3, deleteAfterDays: 30 }
    }
  });

  // Also delete old archives more aggressively
  deleteOldArchives(30);

  return result;
}

// ============================================
// Scheduled Cleanup
// ============================================

let cleanupInterval = null;

/**
 * Start scheduled cleanup (runs daily)
 * @param {number} [intervalHours=24]
 */
function startScheduledCleanup(intervalHours = 24) {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;

  cleanupInterval = setInterval(async () => {
    logger.info('Scheduled cleanup running');
    try {
      await runCleanup();
    } catch (error) {
      logger.error('Scheduled cleanup failed', { error: error.message });
    }
  }, intervalMs);

  logger.info('Scheduled cleanup started', { intervalHours });
}

/**
 * Stop scheduled cleanup
 */
function stopScheduledCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Scheduled cleanup stopped');
  }
}

// ============================================
// CLI Support
// ============================================

if (process.argv[1]?.includes('memory-manager')) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      console.log(JSON.stringify(getMemoryStatus(), null, 2));
      break;

    case 'cleanup':
      const dryRun = args.includes('--dry-run');
      runCleanup({ dryRun }).then(report => {
        console.log(JSON.stringify(report, null, 2));
      });
      break;

    case 'emergency':
      emergencyCleanup().then(report => {
        console.log(JSON.stringify(report, null, 2));
      });
      break;

    default:
      console.log('Memory Manager CLI\n');
      console.log('Usage:');
      console.log('  node memory-manager.js status      - Show memory status');
      console.log('  node memory-manager.js cleanup     - Run cleanup');
      console.log('  node memory-manager.js cleanup --dry-run  - Preview cleanup');
      console.log('  node memory-manager.js emergency   - Emergency cleanup');
  }
}

export default {
  runCleanup,
  getMemoryStatus,
  emergencyCleanup,
  archiveFile,
  archiveOldFiles,
  trimJsonlFile,
  trimJsonFile,
  deleteOldArchives,
  startScheduledCleanup,
  stopScheduledCleanup,
  DEFAULT_RETENTION,
  DISK_LIMITS
};

export {
  runCleanup,
  getMemoryStatus,
  emergencyCleanup,
  archiveFile,
  archiveOldFiles,
  trimJsonlFile,
  trimJsonFile,
  deleteOldArchives,
  startScheduledCleanup,
  stopScheduledCleanup,
  DEFAULT_RETENTION,
  DISK_LIMITS
};

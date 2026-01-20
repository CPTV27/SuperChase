#!/usr/bin/env node
/**
 * Portal Spoke - Queue Management
 *
 * Manages client content queues aligned with tenant-manager structure.
 * Handles state transitions: Ingest → Agency Review → Client Review → Published
 *
 * Queue storage: /clients/{clientId}/queue/queue.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use clients directory (aligned with tenant-manager)
const CLIENTS_PATH = join(__dirname, '..', '..', 'clients');
const MANIFEST_PATH = join(__dirname, '..', '..', 'manifest.jsonl');

/**
 * Get the queue file path for a client
 */
function getQueuePath(clientId) {
  return join(CLIENTS_PATH, clientId, 'queue', 'queue.json');
}

/**
 * Get the assets directory path for a client
 */
function getAssetsPath(clientId) {
  return join(CLIENTS_PATH, clientId, 'assets');
}

/**
 * Initialize empty queue structure
 */
function createEmptyQueue() {
  return {
    ingest: [],
    agencyReview: [],
    clientReview: [],
    published: []
  };
}

/**
 * Load queue from JSON file
 */
function loadQueue(clientId) {
  const queuePath = getQueuePath(clientId);

  if (!existsSync(queuePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(queuePath, 'utf8'));
  } catch (e) {
    console.error(`[Portal] Failed to load queue for ${clientId}:`, e.message);
    return null;
  }
}

/**
 * Parse queue into structured response
 */
export function parseQueue(clientId) {
  const queue = loadQueue(clientId);

  if (!queue) {
    // Check if client exists in tenant system
    const configPath = join(CLIENTS_PATH, clientId, 'config.json');
    if (existsSync(configPath)) {
      // Client exists but no queue yet - return empty queue
      return {
        success: true,
        clientId,
        queue: createEmptyQueue(),
        counts: {
          ingest: 0,
          agencyReview: 0,
          clientReview: 0,
          published: 0,
          total: 0
        }
      };
    }

    return {
      success: false,
      error: `Client not found: ${clientId}`,
      queue: null
    };
  }

  return {
    success: true,
    clientId,
    queue,
    counts: {
      ingest: queue.ingest?.length || 0,
      agencyReview: queue.agencyReview?.length || 0,
      clientReview: queue.clientReview?.length || 0,
      published: queue.published?.length || 0,
      total: (queue.ingest?.length || 0) + (queue.agencyReview?.length || 0) +
             (queue.clientReview?.length || 0) + (queue.published?.length || 0)
    }
  };
}

/**
 * Save queue state to file
 */
function saveQueue(clientId, queue) {
  const queuePath = getQueuePath(clientId);

  // Ensure directory exists
  const dir = dirname(queuePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const data = {
    ...queue,
    updatedAt: new Date().toISOString()
  };

  writeFileSync(queuePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Add item to ingest queue
 */
export function addToIngest(clientId, item) {
  let queue = loadQueue(clientId);

  if (!queue) {
    // Check if client exists
    const configPath = join(CLIENTS_PATH, clientId, 'config.json');
    if (!existsSync(configPath)) {
      return {
        success: false,
        error: `Client not found: ${clientId}`
      };
    }
    // Initialize new queue
    queue = createEmptyQueue();
  }

  const newItem = {
    id: item.id || `ASSET_${Date.now()}`,
    complete: false,
    metadata: {
      source: item.source || 'Client Upload',
      notes: item.notes || '',
      type: item.type || 'Image',
      uploadedAt: new Date().toISOString()
    }
  };

  queue.ingest.push(newItem);
  saveQueue(clientId, queue);

  // Log to manifest
  logToManifest('Portal', `New asset uploaded for @${clientId}: ${newItem.id}`, clientId);

  return {
    success: true,
    item: newItem,
    message: `Added ${newItem.id} to ingest queue`
  };
}

/**
 * Move item between queue stages
 */
export function moveItem(clientId, itemId, fromStage, toStage) {
  const queue = loadQueue(clientId);
  if (!queue) {
    return {
      success: false,
      error: `Queue not found for client: ${clientId}`
    };
  }

  if (!queue[fromStage]) {
    return {
      success: false,
      error: `Invalid stage: ${fromStage}`
    };
  }

  // Find item in source stage
  const itemIndex = queue[fromStage].findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return {
      success: false,
      error: `Item ${itemId} not found in ${fromStage}`
    };
  }

  // Move item
  const [item] = queue[fromStage].splice(itemIndex, 1);

  // Update metadata based on transition
  if (toStage === 'published') {
    item.complete = true;
    item.metadata.publishedDate = new Date().toISOString().split('T')[0];
  }
  if (toStage === 'clientReview') {
    item.metadata.status = 'Waiting for client approval';
  }
  if (toStage === 'agencyReview') {
    item.metadata.status = 'In agency processing';
  }

  if (!queue[toStage]) {
    queue[toStage] = [];
  }
  queue[toStage].push(item);
  saveQueue(clientId, queue);

  // Log to manifest
  logToManifest('Portal', `Moved ${itemId} from ${fromStage} to ${toStage} for @${clientId}`, clientId);

  return {
    success: true,
    item,
    message: `Moved ${itemId} to ${toStage}`
  };
}

/**
 * Client approves item (moves from clientReview to published)
 */
export function approveItem(clientId, itemId) {
  return moveItem(clientId, itemId, 'clientReview', 'published');
}

/**
 * Agency approves item (moves from agencyReview to clientReview)
 */
export function sendToClient(clientId, itemId) {
  return moveItem(clientId, itemId, 'agencyReview', 'clientReview');
}

/**
 * Process ingest item (moves from ingest to agencyReview)
 */
export function processIngest(clientId, itemId, thread) {
  const queue = loadQueue(clientId);
  if (!queue) {
    return {
      success: false,
      error: `Queue not found for client: ${clientId}`
    };
  }

  const itemIndex = queue.ingest.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return {
      success: false,
      error: `Item ${itemId} not found in ingest`
    };
  }

  const [item] = queue.ingest.splice(itemIndex, 1);

  // Create new content item
  const contentItem = {
    id: `POST_${String((queue.published?.length || 0) + (queue.clientReview?.length || 0) + (queue.agencyReview?.length || 0) + 1).padStart(3, '0')}`,
    complete: false,
    metadata: {
      thread: thread || 'Untitled',
      status: 'Waiting for Chase approval',
      sourceAsset: item.id,
      type: 'Thread'
    }
  };

  if (!queue.agencyReview) {
    queue.agencyReview = [];
  }
  queue.agencyReview.push(contentItem);
  saveQueue(clientId, queue);

  logToManifest('Portal', `Processed ${item.id} into ${contentItem.id} for @${clientId}`, clientId);

  return {
    success: true,
    item: contentItem,
    message: `Created ${contentItem.id} from ${item.id}`
  };
}

/**
 * Log action to manifest.jsonl
 */
function logToManifest(agent, finding, clientId) {
  const entry = {
    timestamp: new Date().toISOString(),
    agent,
    finding,
    status: 'Complete',
    linked_task: null,
    marketing_trigger: false,
    client: clientId
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    appendFileSync(MANIFEST_PATH, line);
  } catch (e) {
    console.error('[Portal] Failed to log to manifest:', e.message);
  }
}

/**
 * Get list of all clients with portals (from tenant system)
 */
export function listClients() {
  try {
    if (!existsSync(CLIENTS_PATH)) {
      return { success: true, clients: [] };
    }

    const dirs = readdirSync(CLIENTS_PATH, { withFileTypes: true });
    const clients = dirs
      .filter(d => d.isDirectory())
      .filter(d => existsSync(join(CLIENTS_PATH, d.name, 'config.json')))
      .map(d => d.name);

    return { success: true, clients };
  } catch (e) {
    return { success: false, error: e.message, clients: [] };
  }
}

export default {
  parseQueue,
  addToIngest,
  moveItem,
  approveItem,
  sendToClient,
  processIngest,
  listClients
};

/**
 * Asana Spoke - Task Creation & Management
 *
 * This is the ONLY spoke that writes to Asana.
 * Asana is the single source of truth for all tasks.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const ASANA_WORKSPACE = process.env.ASANA_WORKSPACE_ID;
const ASANA_PROJECT = process.env.ASANA_PROJECT_ID;
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';

/**
 * Create a task in Asana
 * @param {Object} task - Task details
 * @param {string} task.name - Task name (required)
 * @param {string} task.notes - Task description
 * @param {string} task.priority - high, medium, low
 * @param {string} task.dueDate - ISO date string
 * @param {string} task.source - Origin (gmail, voice, chat)
 * @param {Object} task.metadata - Additional data to store
 * @returns {Promise<Object>} - Created task from Asana
 */
export async function createTask(task) {
  if (!ASANA_TOKEN) {
    throw new Error('ASANA_ACCESS_TOKEN not configured');
  }

  const dueOn = task.dueDate
    ? new Date(task.dueDate).toISOString().split('T')[0]
    : null;

  // Build notes with source tracking
  const notes = buildTaskNotes(task);

  const payload = {
    data: {
      name: task.name,
      notes: notes,
      workspace: ASANA_WORKSPACE,
      projects: [ASANA_PROJECT],
      ...(dueOn && { due_on: dueOn })
    }
  };

  try {
    const response = await fetch(`${ASANA_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASANA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Asana] Create task failed:', error);
      throw new Error(error.errors?.[0]?.message || 'Failed to create task');
    }

    const data = await response.json();
    console.log(`[Asana] Created task: ${data.data.gid} - ${task.name}`);

    return {
      success: true,
      taskId: data.data.gid,
      name: data.data.name,
      url: `https://app.asana.com/0/${ASANA_PROJECT}/${data.data.gid}`
    };
  } catch (error) {
    console.error('[Asana] Error:', error.message);
    throw error;
  }
}

/**
 * Build task notes with metadata
 */
function buildTaskNotes(task) {
  const lines = [];

  if (task.notes) {
    lines.push(task.notes);
    lines.push('');
  }

  lines.push('---');
  lines.push(`Source: ${task.source || 'unknown'}`);
  lines.push(`Created: ${new Date().toISOString()}`);

  if (task.priority) {
    lines.push(`Priority: ${task.priority}`);
  }

  if (task.metadata) {
    lines.push('');
    lines.push('Metadata:');
    for (const [key, value] of Object.entries(task.metadata)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get tasks from SuperChase Live project
 * @param {Object} options - Filter options
 * @param {boolean} options.completed - Include completed tasks
 * @param {number} options.limit - Max tasks to return
 * @returns {Promise<Array>} - List of tasks
 */
export async function getTasks(options = {}) {
  if (!ASANA_TOKEN) {
    throw new Error('ASANA_ACCESS_TOKEN not configured');
  }

  const params = new URLSearchParams({
    project: ASANA_PROJECT,
    opt_fields: 'name,notes,due_on,completed,created_at,modified_at',
    limit: options.limit || 50
  });

  if (!options.completed) {
    params.append('completed_since', 'now');
  }

  try {
    const response = await fetch(
      `${ASANA_BASE_URL}/tasks?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${ASANA_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to fetch tasks');
    }

    const data = await response.json();
    return data.data.map(task => ({
      id: task.gid,
      name: task.name,
      notes: task.notes,
      dueOn: task.due_on,
      completed: task.completed,
      createdAt: task.created_at,
      modifiedAt: task.modified_at,
      url: `https://app.asana.com/0/${ASANA_PROJECT}/${task.gid}`
    }));
  } catch (error) {
    console.error('[Asana] Fetch tasks error:', error.message);
    throw error;
  }
}

/**
 * Complete a task
 * @param {string} taskId - Asana task GID
 * @returns {Promise<Object>} - Updated task
 */
export async function completeTask(taskId) {
  if (!ASANA_TOKEN) {
    throw new Error('ASANA_ACCESS_TOKEN not configured');
  }

  try {
    const response = await fetch(`${ASANA_BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ASANA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: { completed: true }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to complete task');
    }

    const data = await response.json();
    console.log(`[Asana] Completed task: ${taskId}`);
    return { success: true, taskId: data.data.gid };
  } catch (error) {
    console.error('[Asana] Complete task error:', error.message);
    throw error;
  }
}

/**
 * Add a comment to a task
 * @param {string} taskId - Asana task GID
 * @param {string} text - Comment text
 * @returns {Promise<Object>} - Created comment
 */
export async function addComment(taskId, text) {
  if (!ASANA_TOKEN) {
    throw new Error('ASANA_ACCESS_TOKEN not configured');
  }

  try {
    const response = await fetch(`${ASANA_BASE_URL}/tasks/${taskId}/stories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASANA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: { text }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to add comment');
    }

    const data = await response.json();
    console.log(`[Asana] Added comment to task: ${taskId}`);
    return { success: true, commentId: data.data.gid };
  } catch (error) {
    console.error('[Asana] Add comment error:', error.message);
    throw error;
  }
}

export default {
  createTask,
  getTasks,
  completeTask,
  addComment
};

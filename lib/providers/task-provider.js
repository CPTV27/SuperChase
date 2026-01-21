/**
 * Task Provider Abstraction Layer
 *
 * Implements the Adapter Pattern to decouple SuperChase from specific task management systems.
 * Allows swapping Asana for Jira, ClickUp, Notion, etc. without changing core business logic.
 *
 * @module lib/providers/task-provider
 */

import { createLogger } from '../logger.js';
import { ValidationError, ExternalServiceError } from '../errors.js';

const logger = createLogger({ module: 'task-provider' });

/**
 * @typedef {Object} Task
 * @property {string} id - Unique task identifier
 * @property {string} name - Task title
 * @property {string} [notes] - Task description
 * @property {string} [dueOn] - Due date (YYYY-MM-DD)
 * @property {boolean} [completed] - Completion status
 * @property {string} [priority] - high, medium, low
 * @property {string} [project] - Project/list name
 * @property {string} [url] - Link to task in native system
 * @property {string} [createdAt] - ISO timestamp
 * @property {string} [modifiedAt] - ISO timestamp
 * @property {Object} [metadata] - Provider-specific metadata
 */

/**
 * @typedef {Object} CreateTaskOptions
 * @property {string} name - Task name (required)
 * @property {string} [notes] - Task description
 * @property {string} [priority] - high, medium, low
 * @property {string} [dueDate] - ISO date string
 * @property {string} [source] - Origin (email, voice, chat)
 * @property {string} [projectId] - Target project/list
 * @property {Object} [metadata] - Additional data
 */

/**
 * Abstract Task Provider Interface
 * All task management integrations must implement this interface.
 */
export class TaskProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'AbstractTaskProvider';
  }

  /**
   * Check if provider is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error('isConfigured() must be implemented');
  }

  /**
   * Test connection to the task service
   * @returns {Promise<{connected: boolean, message: string}>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented');
  }

  /**
   * Create a new task
   * @param {CreateTaskOptions} options
   * @returns {Promise<Task>}
   */
  async createTask(options) {
    throw new Error('createTask() must be implemented');
  }

  /**
   * Get tasks with optional filters
   * @param {Object} [filters]
   * @param {string} [filters.projectId] - Filter by project
   * @param {boolean} [filters.completed] - Include completed tasks
   * @param {number} [filters.limit] - Max tasks to return
   * @returns {Promise<Task[]>}
   */
  async getTasks(filters = {}) {
    throw new Error('getTasks() must be implemented');
  }

  /**
   * Get a single task by ID
   * @param {string} taskId
   * @returns {Promise<Task>}
   */
  async getTask(taskId) {
    throw new Error('getTask() must be implemented');
  }

  /**
   * Update a task
   * @param {string} taskId
   * @param {Partial<Task>} updates
   * @returns {Promise<Task>}
   */
  async updateTask(taskId, updates) {
    throw new Error('updateTask() must be implemented');
  }

  /**
   * Mark a task as complete
   * @param {string} taskId
   * @returns {Promise<Task>}
   */
  async completeTask(taskId) {
    throw new Error('completeTask() must be implemented');
  }

  /**
   * Delete a task
   * @param {string} taskId
   * @returns {Promise<{success: boolean}>}
   */
  async deleteTask(taskId) {
    throw new Error('deleteTask() must be implemented');
  }

  /**
   * Add a comment to a task
   * @param {string} taskId
   * @param {string} text
   * @returns {Promise<{success: boolean, commentId: string}>}
   */
  async addComment(taskId, text) {
    throw new Error('addComment() must be implemented');
  }

  /**
   * Get available projects/lists
   * @returns {Promise<Array<{id: string, name: string}>>}
   */
  async getProjects() {
    throw new Error('getProjects() must be implemented');
  }
}

/**
 * Asana Task Provider Implementation
 */
export class AsanaTaskProvider extends TaskProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'Asana';
    this.token = config.token || process.env.ASANA_ACCESS_TOKEN;
    this.workspaceId = config.workspaceId || process.env.ASANA_WORKSPACE_ID;
    this.defaultProjectId = config.projectId || process.env.ASANA_PROJECT_ID;
    this.baseUrl = 'https://app.asana.com/api/1.0';
  }

  isConfigured() {
    return !!(this.token && this.workspaceId);
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ExternalServiceError('Asana', error.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { connected: false, message: 'Asana credentials not configured' };
    }

    try {
      const data = await this._request('/users/me');
      return {
        connected: true,
        message: `Connected as ${data.data.name}`,
        user: data.data.name
      };
    } catch (error) {
      return { connected: false, message: error.message };
    }
  }

  async createTask(options) {
    if (!options.name) {
      throw new ValidationError('Task name is required');
    }

    const notes = this._buildNotes(options);
    const dueOn = options.dueDate
      ? new Date(options.dueDate).toISOString().split('T')[0]
      : null;

    const payload = {
      data: {
        name: options.name,
        notes,
        workspace: this.workspaceId,
        projects: [options.projectId || this.defaultProjectId],
        ...(dueOn && { due_on: dueOn })
      }
    };

    const data = await this._request('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    logger.info('Task created', { provider: 'Asana', taskId: data.data.gid, name: options.name });

    return this._mapTask(data.data);
  }

  async getTasks(filters = {}) {
    const params = new URLSearchParams({
      project: filters.projectId || this.defaultProjectId,
      opt_fields: 'name,notes,due_on,completed,created_at,modified_at',
      limit: String(filters.limit || 50)
    });

    if (!filters.completed) {
      params.append('completed_since', 'now');
    }

    const data = await this._request(`/tasks?${params}`);
    return data.data.map(t => this._mapTask(t));
  }

  async getTask(taskId) {
    const data = await this._request(`/tasks/${taskId}?opt_fields=name,notes,due_on,completed,created_at,modified_at`);
    return this._mapTask(data.data);
  }

  async updateTask(taskId, updates) {
    const payload = { data: {} };

    if (updates.name) payload.data.name = updates.name;
    if (updates.notes) payload.data.notes = updates.notes;
    if (updates.dueOn) payload.data.due_on = updates.dueOn;
    if (updates.completed !== undefined) payload.data.completed = updates.completed;

    const data = await this._request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    return this._mapTask(data.data);
  }

  async completeTask(taskId) {
    return this.updateTask(taskId, { completed: true });
  }

  async deleteTask(taskId) {
    await this._request(`/tasks/${taskId}`, { method: 'DELETE' });
    return { success: true };
  }

  async addComment(taskId, text) {
    const data = await this._request(`/tasks/${taskId}/stories`, {
      method: 'POST',
      body: JSON.stringify({ data: { text } })
    });

    return { success: true, commentId: data.data.gid };
  }

  async getProjects() {
    const data = await this._request(`/workspaces/${this.workspaceId}/projects?opt_fields=name`);
    return data.data.map(p => ({ id: p.gid, name: p.name }));
  }

  _buildNotes(options) {
    const lines = [];
    if (options.notes) {
      lines.push(options.notes, '');
    }
    lines.push('---');
    lines.push(`Source: ${options.source || 'unknown'}`);
    lines.push(`Created: ${new Date().toISOString()}`);
    if (options.priority) lines.push(`Priority: ${options.priority}`);
    if (options.metadata) {
      lines.push('', 'Metadata:');
      for (const [key, value] of Object.entries(options.metadata)) {
        lines.push(`  ${key}: ${value}`);
      }
    }
    return lines.join('\n');
  }

  _mapTask(asanaTask) {
    return {
      id: asanaTask.gid,
      name: asanaTask.name,
      notes: asanaTask.notes,
      dueOn: asanaTask.due_on,
      completed: asanaTask.completed,
      createdAt: asanaTask.created_at,
      modifiedAt: asanaTask.modified_at,
      url: `https://app.asana.com/0/${this.defaultProjectId}/${asanaTask.gid}`,
      metadata: { provider: 'asana', gid: asanaTask.gid }
    };
  }
}

/**
 * In-Memory Task Provider (for testing/fallback)
 */
export class InMemoryTaskProvider extends TaskProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'InMemory';
    this.tasks = new Map();
    this.taskCounter = 0;
  }

  isConfigured() {
    return true;
  }

  async testConnection() {
    return { connected: true, message: 'In-memory store active' };
  }

  async createTask(options) {
    const id = `task_${++this.taskCounter}`;
    const now = new Date().toISOString();
    const task = {
      id,
      name: options.name,
      notes: options.notes || '',
      dueOn: options.dueDate ? new Date(options.dueDate).toISOString().split('T')[0] : null,
      completed: false,
      priority: options.priority || 'medium',
      createdAt: now,
      modifiedAt: now,
      metadata: { ...options.metadata, source: options.source }
    };
    this.tasks.set(id, task);
    return task;
  }

  async getTasks(filters = {}) {
    let tasks = Array.from(this.tasks.values());
    if (!filters.completed) {
      tasks = tasks.filter(t => !t.completed);
    }
    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }
    return tasks;
  }

  async getTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    return task;
  }

  async updateTask(taskId, updates) {
    const task = await this.getTask(taskId);
    Object.assign(task, updates, { modifiedAt: new Date().toISOString() });
    return task;
  }

  async completeTask(taskId) {
    return this.updateTask(taskId, { completed: true });
  }

  async deleteTask(taskId) {
    this.tasks.delete(taskId);
    return { success: true };
  }

  async addComment(taskId, text) {
    const task = await this.getTask(taskId);
    if (!task.comments) task.comments = [];
    const commentId = `comment_${Date.now()}`;
    task.comments.push({ id: commentId, text, createdAt: new Date().toISOString() });
    return { success: true, commentId };
  }

  async getProjects() {
    return [{ id: 'default', name: 'Default Project' }];
  }
}

/**
 * Task Provider Factory
 * Returns the appropriate provider based on configuration.
 */
export function createTaskProvider(type = 'auto', config = {}) {
  if (type === 'auto') {
    // Auto-detect based on environment
    if (process.env.ASANA_ACCESS_TOKEN) {
      type = 'asana';
    } else {
      type = 'memory';
      logger.warn('No task provider configured, using in-memory fallback');
    }
  }

  switch (type.toLowerCase()) {
    case 'asana':
      return new AsanaTaskProvider(config);
    case 'memory':
    case 'inmemory':
      return new InMemoryTaskProvider(config);
    default:
      throw new Error(`Unknown task provider type: ${type}`);
  }
}

// Singleton instance for the default provider
let defaultProvider = null;

/**
 * Get the default task provider instance
 * @returns {TaskProvider}
 */
export function getTaskProvider() {
  if (!defaultProvider) {
    defaultProvider = createTaskProvider('auto');
  }
  return defaultProvider;
}

/**
 * Set a custom default provider (useful for testing)
 * @param {TaskProvider} provider
 */
export function setTaskProvider(provider) {
  defaultProvider = provider;
}

export default {
  TaskProvider,
  AsanaTaskProvider,
  InMemoryTaskProvider,
  createTaskProvider,
  getTaskProvider,
  setTaskProvider
};

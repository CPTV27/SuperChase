/**
 * Prisma Database Provider
 *
 * Implements TaskProvider interface using Prisma + PostgreSQL.
 * Provides persistent storage for tasks, audit logs, patterns, etc.
 *
 * @module lib/providers/prisma-provider
 */

import { PrismaClient } from '@prisma/client';
import { TaskProvider } from './task-provider.js';
import { createLogger } from '../logger.js';
import { NotFoundError, ExternalServiceError } from '../errors.js';

const logger = createLogger({ module: 'prisma-provider' });

// Singleton Prisma client
let prisma = null;

/**
 * Get or create Prisma client
 * @returns {PrismaClient}
 */
export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error']
    });
  }
  return prisma;
}

/**
 * Close Prisma connection
 */
export async function closePrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Prisma Task Provider - Persistent task storage
 */
export class PrismaTaskProvider extends TaskProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'Prisma';
    this.prisma = getPrismaClient();
  }

  isConfigured() {
    return !!process.env.DATABASE_URL;
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { connected: false, message: 'DATABASE_URL not configured' };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { connected: true, message: 'PostgreSQL connected' };
    } catch (error) {
      return { connected: false, message: error.message };
    }
  }

  async createTask(options) {
    const task = await this.prisma.task.create({
      data: {
        name: options.name,
        notes: options.notes || null,
        priority: this._mapPriority(options.priority),
        dueDate: options.dueDate ? new Date(options.dueDate) : null,
        source: options.source || 'manual',
        businessUnitId: options.businessUnitId || null,
        metadata: options.metadata || {}
      }
    });

    logger.info('Task created', { id: task.id, name: task.name });
    return this._mapTask(task);
  }

  async getTasks(filters = {}) {
    const where = {};

    if (!filters.completed) {
      where.status = { not: 'COMPLETED' };
    }

    if (filters.projectId || filters.businessUnitId) {
      where.businessUnitId = filters.projectId || filters.businessUnitId;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      take: filters.limit || 50,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        businessUnit: true
      }
    });

    return tasks.map(t => this._mapTask(t));
  }

  async getTask(taskId) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { businessUnit: true }
    });

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    return this._mapTask(task);
  }

  async updateTask(taskId, updates) {
    const data = {};

    if (updates.name) data.name = updates.name;
    if (updates.notes !== undefined) data.notes = updates.notes;
    if (updates.priority) data.priority = this._mapPriority(updates.priority);
    if (updates.dueOn || updates.dueDate) {
      data.dueDate = new Date(updates.dueOn || updates.dueDate);
    }
    if (updates.completed !== undefined) {
      data.status = updates.completed ? 'COMPLETED' : 'PENDING';
      if (updates.completed) data.completedAt = new Date();
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data,
      include: { businessUnit: true }
    });

    return this._mapTask(task);
  }

  async completeTask(taskId) {
    return this.updateTask(taskId, { completed: true });
  }

  async deleteTask(taskId) {
    await this.prisma.task.delete({
      where: { id: taskId }
    });
    return { success: true };
  }

  async addComment(taskId, text) {
    // Store comments in task metadata
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const metadata = task.metadata || {};
    metadata.comments = metadata.comments || [];
    const commentId = `comment_${Date.now()}`;
    metadata.comments.push({
      id: commentId,
      text,
      createdAt: new Date().toISOString()
    });

    await this.prisma.task.update({
      where: { id: taskId },
      data: { metadata }
    });

    return { success: true, commentId };
  }

  async getProjects() {
    const units = await this.prisma.businessUnit.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' }
    });

    return units.map(u => ({ id: u.id, name: u.name }));
  }

  _mapPriority(priority) {
    const map = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      urgent: 'URGENT'
    };
    return map[priority?.toLowerCase()] || 'MEDIUM';
  }

  _mapTask(task) {
    return {
      id: task.id,
      name: task.name,
      notes: task.notes,
      dueOn: task.dueDate?.toISOString().split('T')[0],
      completed: task.status === 'COMPLETED',
      priority: task.priority?.toLowerCase(),
      project: task.businessUnit?.name,
      createdAt: task.createdAt?.toISOString(),
      modifiedAt: task.updatedAt?.toISOString(),
      metadata: {
        provider: 'prisma',
        businessUnitId: task.businessUnitId,
        source: task.source
      }
    };
  }
}

// ============================================
// Audit Log Functions
// ============================================

/**
 * Log an audit event
 */
export async function logAudit(data) {
  const prismaClient = getPrismaClient();

  try {
    await prismaClient.auditLog.create({
      data: {
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        userId: data.userId,
        requestId: data.requestId,
        ip: data.ip,
        userAgent: data.userAgent,
        details: data.details || {},
        success: data.success !== false,
        errorMessage: data.errorMessage,
        duration: data.duration
      }
    });
  } catch (error) {
    logger.error('Failed to log audit event', { error: error.message });
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters = {}) {
  const prismaClient = getPrismaClient();

  const where = {};

  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.userId) where.userId = filters.userId;
  if (filters.since) where.createdAt = { gte: new Date(filters.since) };

  return prismaClient.auditLog.findMany({
    where,
    take: filters.limit || 100,
    orderBy: { createdAt: 'desc' }
  });
}

// ============================================
// Pattern Functions
// ============================================

/**
 * Get all active patterns
 */
export async function getPatterns() {
  const prismaClient = getPrismaClient();

  return prismaClient.pattern.findMany({
    where: { active: true },
    orderBy: { useCount: 'desc' }
  });
}

/**
 * Record pattern usage
 */
export async function recordPatternUsage(patternId) {
  const prismaClient = getPrismaClient();

  await prismaClient.pattern.update({
    where: { id: patternId },
    data: {
      useCount: { increment: 1 },
      lastUsedAt: new Date()
    }
  });
}

// ============================================
// Council Session Functions
// ============================================

/**
 * Create a council session record
 */
export async function createCouncilSession(data) {
  const prismaClient = getPrismaClient();

  return prismaClient.councilSession.create({
    data: {
      traceId: data.traceId,
      query: data.query,
      models: data.models,
      chairmanModel: data.chairmanModel,
      status: 'pending'
    }
  });
}

/**
 * Update council session with results
 */
export async function completeCouncilSession(traceId, data) {
  const prismaClient = getPrismaClient();

  return prismaClient.councilSession.update({
    where: { traceId },
    data: {
      synthesis: data.synthesis,
      rankings: data.rankings,
      duration: data.duration,
      cost: data.cost,
      status: data.error ? 'failed' : 'complete',
      errorMessage: data.error
    }
  });
}

// ============================================
// Cost Tracking Functions
// ============================================

/**
 * Record a cost event
 */
export async function recordCost(data) {
  const prismaClient = getPrismaClient();

  await prismaClient.costRecord.create({
    data: {
      service: data.service,
      operation: data.operation,
      model: data.model,
      tokens: data.tokens,
      cost: data.cost,
      metadata: data.metadata || {}
    }
  });
}

/**
 * Get cost summary for a period
 */
export async function getCostSummary(since) {
  const prismaClient = getPrismaClient();

  const costs = await prismaClient.costRecord.groupBy({
    by: ['service'],
    where: {
      createdAt: { gte: new Date(since) }
    },
    _sum: {
      cost: true,
      tokens: true
    }
  });

  const total = costs.reduce((sum, c) => sum + (c._sum.cost || 0), 0);

  return {
    byService: costs.map(c => ({
      service: c.service,
      cost: c._sum.cost || 0,
      tokens: c._sum.tokens || 0
    })),
    total
  };
}

// ============================================
// System State Functions
// ============================================

/**
 * Get system state (kill switch status)
 */
export async function getSystemState() {
  const prismaClient = getPrismaClient();

  let state = await prismaClient.systemState.findUnique({
    where: { id: 'singleton' }
  });

  if (!state) {
    state = await prismaClient.systemState.create({
      data: { id: 'singleton' }
    });
  }

  return state;
}

/**
 * Pause automation (kill switch)
 */
export async function pauseAutomation(userId, reason) {
  const prismaClient = getPrismaClient();

  const state = await prismaClient.systemState.upsert({
    where: { id: 'singleton' },
    update: {
      paused: true,
      pausedAt: new Date(),
      pausedBy: userId,
      reason
    },
    create: {
      id: 'singleton',
      paused: true,
      pausedAt: new Date(),
      pausedBy: userId,
      reason
    }
  });

  // Also set global flag for in-memory checks
  globalThis.AUTOMATION_PAUSED = true;

  logger.warn('Automation paused', { userId, reason });
  return state;
}

/**
 * Resume automation
 */
export async function resumeAutomation(userId) {
  const prismaClient = getPrismaClient();

  const state = await prismaClient.systemState.update({
    where: { id: 'singleton' },
    data: {
      paused: false,
      pausedAt: null,
      pausedBy: null,
      reason: null
    }
  });

  globalThis.AUTOMATION_PAUSED = false;

  logger.info('Automation resumed', { userId });
  return state;
}

export default {
  getPrismaClient,
  closePrisma,
  PrismaTaskProvider,
  logAudit,
  getAuditLogs,
  getPatterns,
  recordPatternUsage,
  createCouncilSession,
  completeCouncilSession,
  recordCost,
  getCostSummary,
  getSystemState,
  pauseAutomation,
  resumeAutomation
};

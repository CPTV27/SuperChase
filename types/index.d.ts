/**
 * SuperChase Type Definitions
 * 
 * TypeScript type definitions for the SuperChase application.
 * These provide IDE type checking and documentation without
 * requiring a full TypeScript migration.
 */

// ============================================
// Core Types
// ============================================

/**
 * Business unit identifier
 */
export type BusinessUnit = 'scan2plan' | 'studio' | 'cptv' | 'tuthill' | 'purist';

/**
 * Spoke module names
 */
export type SpokeName = 'asana' | 'twitter' | 'gmail' | 'voice' | 'sheets' | 'hub' | 'portal';

/**
 * Spoke connection status
 */
export type SpokeStatus = 'online' | 'offline' | 'warning';

/**
 * Email classification categories
 */
export type ClassificationCategory =
    | 'URGENT_CLIENT'
    | 'URGENT_INTERNAL'
    | 'ACTION_REQUIRED'
    | 'FYI'
    | 'SPAM'
    | 'NEWSLETTER'
    | 'SOCIAL_SEARCH';

/**
 * Task priority levels
 */
export type Priority = 'high' | 'medium' | 'low' | null;

// ============================================
// API Types
// ============================================

/**
 * Health check response
 */
export interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    version: string;
}

/**
 * Query request body
 */
export interface QueryRequest {
    query: string;
    options?: {
        includeAsana?: boolean;
        includeAudit?: boolean;
        maxResults?: number;
    };
}

/**
 * Query response
 */
export interface QueryResponse {
    answer: string;
    sources: string[];
    confidence: number;
    peopleMentioned?: HighValuePerson[];
    timestamp: string;
}

/**
 * Classification result from Hub
 */
export interface Classification {
    category: ClassificationCategory;
    confidence: number;
    reasoning: string;
    action: 'create_task' | 'archive' | 'log_only' | 'search_social';
    priority: Priority;
    tag: string;
}

/**
 * Spoke status response
 */
export interface SpokeStatusResponse {
    timestamp: string;
    spokes: Record<SpokeName, {
        status: SpokeStatus;
        message: string;
    }>;
}

// ============================================
// Asana Types
// ============================================

/**
 * Asana task
 */
export interface AsanaTask {
    gid: string;
    name: string;
    notes?: string;
    due_on?: string;
    completed: boolean;
    created_at: string;
    modified_at: string;
    tags?: AsanaTag[];
    custom_fields?: AsanaCustomField[];
    assignee?: {
        gid: string;
        name: string;
    };
}

export interface AsanaTag {
    gid: string;
    name: string;
}

export interface AsanaCustomField {
    gid: string;
    name: string;
    type: 'enum' | 'text' | 'number';
    enum_value?: { name: string };
    text_value?: string;
    number_value?: number;
}

// ============================================
// Twitter/X Types
// ============================================

/**
 * Twitter search request
 */
export interface TwitterSearchRequest {
    query?: string;
    topic?: string;
    username?: string;
    action?: 'search' | 'research' | 'user' | 'trends';
    maxResults?: number;
    sortOrder?: 'relevancy' | 'recency';
}

/**
 * Tweet data
 */
export interface Tweet {
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    public_metrics?: {
        retweet_count: number;
        reply_count: number;
        like_count: number;
        quote_count: number;
    };
}

// ============================================
// Strategy/Roadmap Types
// ============================================

/**
 * Strategy data from ROADMAP.md
 */
export interface StrategyData {
    buildNow: string[];
    someday: SomedayItem[];
    friction: FrictionItem[];
    leverage: LeverageOpportunity[];
    priorities: {
        salesAccelerator: string | null;
        productionFactory: string | null;
    };
    highValuePeople: Record<string, HighValuePerson>;
    recurringTopics: RecurringTopic[];
    lastUpdated: string;
}

export interface SomedayItem {
    title: string;
    status: string;
    description: string;
}

export interface FrictionItem {
    area: string;
    symptom: string;
    impact: string;
}

export interface LeverageOpportunity {
    id: string;
    title: string;
    fromBusiness: string;
    toBusiness: string;
    mechanism: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    actionItems?: string[];
}

export interface HighValuePerson {
    context: string;
    role: string;
}

export interface RecurringTopic {
    topic: string;
    count: number;
}

// ============================================
// Portal Types
// ============================================

/**
 * Portal queue stages
 */
export type PortalStage = 'ingest' | 'agency' | 'client' | 'approved' | 'published';

/**
 * Portal queue item
 */
export interface PortalItem {
    id: string;
    source: string;
    notes?: string;
    type: 'Image' | 'Video' | 'Text' | 'Other';
    createdAt: string;
    movedAt?: string;
}

/**
 * Client portal queue state
 */
export interface PortalQueue {
    clientId: string;
    stages: Record<PortalStage, PortalItem[]>;
    lastUpdated: string;
}

// ============================================
// Briefing Types
// ============================================

/**
 * Daily briefing data
 */
export interface DailyBriefing {
    briefing: string;
    stats: {
        tasksProcessed: number;
        emailsTriaged: number;
        urgentItems: number;
    };
    generatedAt: string;
    voiceUrl?: string;
}

// ============================================
// Event Types
// ============================================

/**
 * Hub event for processing
 */
export interface HubEvent {
    type: 'email' | 'voice' | 'chat' | 'webhook';
    data: {
        id?: string;
        subject?: string;
        body?: string;
        sender?: string;
        text?: string;
        content?: string;
        from?: string;
    };
}

/**
 * Hub event processing result
 */
export interface HubEventResult {
    action: string;
    target: SpokeName | 'none';
    payload: Record<string, unknown>;
    classification: Classification;
    timestamp: string;
}

// ============================================
// Pattern Types
// ============================================

/**
 * Learned automation pattern
 */
export interface AutomationPattern {
    name: string;
    description: string;
    trigger: string;
    action: string;
    created: string;
    updated?: string;
}

/**
 * Cross-business leverage pattern
 */
export interface CrossBusinessPattern {
    opportunities: LeverageOpportunity[];
    quickWins: string[];
    recommendation: string;
    analyzedAt: string;
}

// ============================================
// Audit Log Types
// ============================================

/**
 * Audit log entry
 */
export interface AuditLogEntry {
    timestamp: string;
    action: string;
    source: SpokeName;
    target?: SpokeName;
    data?: Record<string, unknown>;
    result?: 'success' | 'failure';
    error?: string;
}

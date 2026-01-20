import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Brand theme tokens for white-label personalization
 */
const BRAND_THEMES = {
    bigmuddy: {
        primary: '#1a365d',
        secondary: '#c6a66d',
        accent: '#8b4513',
        gradient: 'linear-gradient(135deg, #1a365d 0%, #2d4a6f 50%, #8b4513 100%)',
        name: 'Southern Storyteller'
    },
    tuthill: {
        primary: '#1a1a1a',
        secondary: '#f5f5f5',
        accent: '#c9a227',
        gradient: 'linear-gradient(135deg, #1a1a1a 0%, #333333 50%, #c9a227 100%)',
        name: 'Architectural Noir'
    },
    studioc: {
        primary: '#2d2d2d',
        secondary: '#e8e4dc',
        accent: '#8b0000',
        gradient: 'linear-gradient(135deg, #2d2d2d 0%, #4a4a4a 50%, #8b0000 100%)',
        name: 'Documentary Grit'
    },
    utopia: {
        primary: '#2c1810',
        secondary: '#d4a574',
        accent: '#4a7c59',
        gradient: 'linear-gradient(135deg, #2c1810 0%, #5a3828 50%, #4a7c59 100%)',
        name: 'Cathedral Analog'
    },
    cptv: {
        primary: '#0a0a0a',
        secondary: '#00ff88',
        accent: '#ff0066',
        gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #ff0066 100%)',
        name: 'Tech Rebellion'
    }
};

/**
 * Status badge styles
 */
const STATUS_STYLES = {
    DRAFT: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af', label: 'Draft' },
    AGENCY_REVIEW: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', label: 'Awaiting Your Review' },
    CLIENT_REVIEW: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', label: 'With Client' },
    CLIENT_APPROVED: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', label: 'Ready to Publish' },
    PUBLISHED: { bg: 'rgba(16, 185, 129, 0.3)', text: '#10b981', label: 'Live' },
    REJECTED: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', label: 'Rejected' },
    REVISION: { bg: 'rgba(168, 85, 247, 0.2)', text: '#a78bfa', label: 'Needs Revision' }
};

/**
 * Predictive engagement metrics (simulated)
 */
const generateMetrics = (type) => ({
    engagementScore: Math.floor(Math.random() * 30) + 70,
    estimatedReach: Math.floor(Math.random() * 5000) + 1000,
    seoScore: Math.floor(Math.random() * 20) + 80,
    bestPostingTime: ['9:00 AM', '11:30 AM', '2:00 PM', '7:00 PM'][Math.floor(Math.random() * 4)]
});

/**
 * Agency Review Card - Human-in-the-Loop Content Approval
 */
export function AgencyReviewCard({
    item,
    onApprove,
    onReject,
    onEdit,
    onRequestRevision,
    isExpanded = false
}) {
    const [expanded, setExpanded] = useState(isExpanded);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(item.content);
    const [showWhyPanel, setShowWhyPanel] = useState(false);
    const [metrics] = useState(() => generateMetrics(item.type));

    const theme = BRAND_THEMES[item.clientId] || BRAND_THEMES.bigmuddy;
    const status = STATUS_STYLES[item.status] || STATUS_STYLES.DRAFT;

    const handleApprove = async () => {
        if (isEditing && editedContent !== item.content) {
            await onEdit?.(item.id, editedContent);
        }
        await onApprove?.(item.id);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="review-card"
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                marginBottom: '16px'
            }}
        >
            {/* Brand gradient header */}
            <div
                style={{
                    background: theme.gradient,
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        opacity: 0.7
                    }}>
                        @{item.clientId}
                    </span>
                    <span style={{
                        background: status.bg,
                        color: status.text,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600
                    }}>
                        {status.label}
                    </span>
                </div>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>
                    {theme.name}
                </span>
            </div>

            {/* Main content */}
            <div style={{ padding: '20px' }}>
                {/* Title and type */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                    }}>
                        <span style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            textTransform: 'uppercase'
                        }}>
                            {item.type}
                        </span>
                    </div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        lineHeight: 1.3,
                        margin: 0
                    }}>
                        {item.title}
                    </h3>
                </div>

                {/* Predictive metrics bar */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <MetricBadge
                        label="Engagement"
                        value={`${metrics.engagementScore}%`}
                        color={metrics.engagementScore > 80 ? '#34d399' : '#fbbf24'}
                    />
                    <MetricBadge
                        label="Reach"
                        value={metrics.estimatedReach.toLocaleString()}
                        color="#60a5fa"
                    />
                    <MetricBadge
                        label="SEO"
                        value={`${metrics.seoScore}/100`}
                        color={metrics.seoScore > 85 ? '#34d399' : '#fbbf24'}
                    />
                    <MetricBadge
                        label="Best Time"
                        value={metrics.bestPostingTime}
                        color="#a78bfa"
                    />
                </div>

                {/* Content preview/editor */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ marginBottom: '16px' }}
                        >
                            {isEditing ? (
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    style={{
                                        width: '100%',
                                        minHeight: '200px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: `1px solid ${theme.accent}`,
                                        borderRadius: '8px',
                                        padding: '16px',
                                        color: 'white',
                                        fontSize: '14px',
                                        lineHeight: 1.6,
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    fontSize: '14px',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {item.content}
                                </div>
                            )}

                            {/* Explainable AI - "Why?" panel */}
                            <button
                                onClick={() => setShowWhyPanel(!showWhyPanel)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: theme.accent,
                                    padding: '8px 0',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <span>💡</span>
                                {showWhyPanel ? 'Hide reasoning' : 'Why this content?'}
                            </button>

                            <AnimatePresence>
                                {showWhyPanel && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{
                                            background: `${theme.primary}22`,
                                            border: `1px solid ${theme.accent}44`,
                                            borderRadius: '8px',
                                            padding: '12px',
                                            marginTop: '8px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <p style={{ margin: 0, marginBottom: '8px', fontWeight: 600 }}>
                                            Agent Reasoning:
                                        </p>
                                        <ul style={{ margin: 0, paddingLeft: '20px', opacity: 0.9 }}>
                                            <li>Topic matches "{item.metadata?.keywords?.[0] || 'brand keywords'}" content pillar</li>
                                            <li>Predicted {metrics.engagementScore}% engagement based on similar posts</li>
                                            <li>Optimal for {item.clientId}'s {theme.name} voice profile</li>
                                            <li>SEO score of {metrics.seoScore} exceeds 75 threshold</li>
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Action buttons */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        {expanded ? '▲ Collapse' : '▼ Expand'}
                    </button>

                    {expanded && (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            {isEditing ? '✓ Done Editing' : '✏️ Edit'}
                        </button>
                    )}

                    <div style={{ flex: 1 }} />

                    {item.status === 'AGENCY_REVIEW' && (
                        <>
                            <button
                                onClick={() => onReject?.(item.id)}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600
                                }}
                            >
                                ✕ Reject
                            </button>
                            <button
                                onClick={() => onRequestRevision?.(item.id)}
                                style={{
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    color: '#a78bfa',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600
                                }}
                            >
                                ↺ Revision
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleApprove}
                                style={{
                                    background: theme.gradient,
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    boxShadow: `0 4px 20px ${theme.primary}66`
                                }}
                            >
                                ✓ Approve & Send to Client
                            </motion.button>
                        </>
                    )}

                    {item.status === 'CLIENT_APPROVED' && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onApprove?.(item.id, 'publish')}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
                            }}
                        >
                            🚀 Publish Now
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Revision feedback display */}
            {item.status === 'REVISION' && item.metadata?.lastFeedback && (
                <div style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    borderTop: '1px solid rgba(168, 85, 247, 0.2)',
                    padding: '12px 20px',
                    fontSize: '13px'
                }}>
                    <span style={{ fontWeight: 600, marginRight: '8px' }}>Revision requested:</span>
                    <span style={{ opacity: 0.9 }}>{item.metadata.lastFeedback}</span>
                </div>
            )}
        </motion.div>
    );
}

/**
 * Metric badge component
 */
function MetricBadge({ label, value, color }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0.6
            }}>
                {label}
            </div>
        </div>
    );
}

/**
 * Agency Review Dashboard - The Pulse
 */
export function AgencyReviewDashboard({ apiKey, baseUrl = '' }) {
    const [pulse, setPulse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => {
        fetchPulse();
        const interval = setInterval(fetchPulse, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchPulse = async () => {
        try {
            const res = await fetch(`${baseUrl}/api/review/pulse`, {
                headers: { 'X-API-Key': apiKey }
            });
            const data = await res.json();
            setPulse(data);
        } catch (err) {
            console.error('Failed to fetch pulse:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        const item = pulse?.agencyPending?.find(i => i.id === id);
        if (item?.approveUrl) {
            await fetch(item.approveUrl);
            fetchPulse();
        }
    };

    const handleReject = async (id) => {
        const item = pulse?.agencyPending?.find(i => i.id === id);
        if (item?.rejectUrl) {
            await fetch(item.rejectUrl);
            fetchPulse();
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: 'rgba(255, 255, 255, 0.5)'
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ marginRight: '12px' }}
                >
                    ⚙️
                </motion.div>
                Loading Agency Pulse...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header with counts */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <PulseCard
                    label="Agency Review"
                    count={pulse?.counts?.agencyReview || 0}
                    color="#60a5fa"
                    active={activeTab === 'pending'}
                    onClick={() => setActiveTab('pending')}
                />
                <PulseCard
                    label="With Clients"
                    count={pulse?.counts?.clientReview || 0}
                    color="#fbbf24"
                    active={activeTab === 'client'}
                    onClick={() => setActiveTab('client')}
                />
                <PulseCard
                    label="Ready to Publish"
                    count={pulse?.counts?.readyToPublish || 0}
                    color="#34d399"
                    active={activeTab === 'publish'}
                    onClick={() => setActiveTab('publish')}
                />
                <PulseCard
                    label="Needs Revision"
                    count={pulse?.counts?.needsRevision || 0}
                    color="#a78bfa"
                    active={activeTab === 'revision'}
                    onClick={() => setActiveTab('revision')}
                />
            </div>

            {/* Content list */}
            <AnimatePresence mode="wait">
                {activeTab === 'pending' && (
                    <motion.div
                        key="pending"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {pulse?.agencyPending?.length === 0 ? (
                            <EmptyState message="No items awaiting your review" emoji="✨" />
                        ) : (
                            pulse?.agencyPending?.map(item => (
                                <AgencyReviewCard
                                    key={item.id}
                                    item={{ ...item, status: 'AGENCY_REVIEW' }}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                />
                            ))
                        )}
                    </motion.div>
                )}

                {activeTab === 'client' && (
                    <motion.div
                        key="client"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {pulse?.clientPending?.length === 0 ? (
                            <EmptyState message="No items with clients" emoji="📤" />
                        ) : (
                            pulse?.clientPending?.map(item => (
                                <AgencyReviewCard
                                    key={item.id}
                                    item={{ ...item, status: 'CLIENT_REVIEW' }}
                                />
                            ))
                        )}
                    </motion.div>
                )}

                {activeTab === 'publish' && (
                    <motion.div
                        key="publish"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {pulse?.readyToPublish?.length === 0 ? (
                            <EmptyState message="No items ready to publish" emoji="🚀" />
                        ) : (
                            pulse?.readyToPublish?.map(item => (
                                <AgencyReviewCard
                                    key={item.id}
                                    item={{ ...item, status: 'CLIENT_APPROVED' }}
                                    onApprove={handleApprove}
                                />
                            ))
                        )}
                    </motion.div>
                )}

                {activeTab === 'revision' && (
                    <motion.div
                        key="revision"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {pulse?.needsRevision?.length === 0 ? (
                            <EmptyState message="No items need revision" emoji="✅" />
                        ) : (
                            pulse?.needsRevision?.map(item => (
                                <AgencyReviewCard
                                    key={item.id}
                                    item={{ ...item, status: 'REVISION' }}
                                />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Pulse count card
 */
function PulseCard({ label, count, color, active, onClick }) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                background: active ? `${color}22` : 'rgba(255, 255, 255, 0.03)',
                border: active ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{
                fontSize: '32px',
                fontWeight: 700,
                color: active ? color : 'white'
            }}>
                {count}
            </div>
            <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: '4px'
            }}>
                {label}
            </div>
        </motion.button>
    );
}

/**
 * Empty state component
 */
function EmptyState({ message, emoji }) {
    return (
        <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'rgba(255, 255, 255, 0.5)'
        }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{emoji}</div>
            <div>{message}</div>
        </div>
    );
}

export default AgencyReviewDashboard;

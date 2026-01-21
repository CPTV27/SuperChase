import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Marketing Hub
 * 
 * Content creation and publishing workflow interface.
 * Connects to /marketing-brief, /marketing-draft, /publish skills.
 */

const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_BASE = import.meta.env.VITE_API_BASE || 'https://superchase-production.up.railway.app';

// Brand colors for clients
const BRAND_COLORS = {
    bigmuddy: { primary: '#8b4513', name: 'Big Muddy Inn', icon: '🏨' },
    s2p: { primary: '#1e3a5f', name: 'Scan2Plan', icon: '🏗️' },
    studioc: { primary: '#8b0000', name: 'Studio C', icon: '🎬' },
    tuthill: { primary: '#c9a227', name: 'Tuthill Design', icon: '🎨' },
    utopia: { primary: '#4a7c59', name: 'Utopia Studios', icon: '🎵' },
    cptv: { primary: '#ff0066', name: 'CPTV', icon: '📺' }
};

function BriefCard({ brief, onDraft, onPublish }) {
    const brand = BRAND_COLORS[brief.clientId] || { primary: '#3b82f6', name: brief.clientId, icon: '📄' };
    const isReady = brief.status === 'approved';
    const isDrafted = brief.status === 'drafted' || brief.status === 'approved';
    const isPublished = brief.status === 'published';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: isPublished
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isPublished ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px'
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: `${brand.primary}33`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                    }}>
                        {brand.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: brand.primary, fontWeight: 600, textTransform: 'uppercase' }}>
                            {brand.name}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>
                            {brief.strategist?.topic || 'Untitled Brief'}
                        </h3>
                    </div>
                </div>

                {/* Status badge */}
                <span style={{
                    background: isPublished ? 'rgba(16, 185, 129, 0.2)' :
                        isReady ? 'rgba(59, 130, 246, 0.2)' :
                            isDrafted ? 'rgba(245, 158, 11, 0.2)' :
                                'rgba(255, 255, 255, 0.1)',
                    color: isPublished ? '#10b981' :
                        isReady ? '#3b82f6' :
                            isDrafted ? '#f59e0b' :
                                'rgba(255,255,255,0.6)',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                }}>
                    {brief.status}
                </span>
            </div>

            {/* Angle */}
            {brief.strategist?.angle && (
                <p style={{
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.5
                }}>
                    {brief.strategist.angle}
                </p>
            )}

            {/* Outline */}
            {brief.strategist?.blogOutline && (
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '13px'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                        Blog Outline
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.8)' }}>
                        {brief.strategist.blogOutline.map((section, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{section}</li>
                        ))}
                    </ol>
                </div>
            )}

            {/* X.com Hooks */}
            {brief.strategist?.xHooks && (
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '13px'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                        X.com Hooks
                    </div>
                    {brief.strategist.xHooks.slice(0, 2).map((hook, i) => (
                        <div key={i} style={{
                            padding: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '6px',
                            marginBottom: '6px',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.8)'
                        }}>
                            💬 {hook.substring(0, 100)}...
                        </div>
                    ))}
                </div>
            )}

            {/* Published URLs */}
            {isPublished && brief.publisher && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '11px', color: '#10b981', textTransform: 'uppercase' }}>
                        ✅ Published
                    </div>
                    {brief.publisher.blogUrl && (
                        <a
                            href={brief.publisher.blogUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#60a5fa', fontSize: '13px', display: 'block', marginBottom: '4px' }}
                        >
                            📝 {brief.publisher.blogUrl}
                        </a>
                    )}
                    {brief.publisher.threadUrl && (
                        <a
                            href={brief.publisher.threadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#60a5fa', fontSize: '13px', display: 'block' }}
                        >
                            🐦 {brief.publisher.threadUrl}
                        </a>
                    )}
                </div>
            )}

            {/* Actions */}
            {!isPublished && (
                <div style={{ display: 'flex', gap: '8px' }}>
                    {!isDrafted && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onDraft?.(brief)}
                            style={{
                                flex: 1,
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: '8px',
                                padding: '10px',
                                color: '#f59e0b',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600
                            }}
                        >
                            ✏️ Draft Content
                        </motion.button>
                    )}
                    {isReady && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onPublish?.(brief)}
                            style={{
                                flex: 1,
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '8px',
                                padding: '10px',
                                color: '#10b981',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600
                            }}
                        >
                            🚀 Publish Now
                        </motion.button>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export default function MarketingHub() {
    const [queue, setQueue] = useState({ briefs: [] });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, approved, published

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        try {
            // Would fetch from /api/marketing/queue
            // For now, load from demo data
            const demoQueue = {
                version: '1.0',
                briefs: [
                    {
                        id: 'brief_bigmuddy_20260120',
                        clientId: 'bigmuddy',
                        status: 'published',
                        strategist: {
                            topic: 'Silver Street Stories: Where the Blues Were Born',
                            angle: 'Historical deep-dive positioning Big Muddy as the authentic gateway to Natchez Under-the-Hill\'s musical legacy',
                            blogOutline: [
                                'The River\'s Edge: Why Silver Street Matters',
                                'From Steamboats to Speakeasies: The Birth of Delta Blues',
                                'The Blues Room: Keeping the Tradition Alive',
                                'Experience It Yourself: Planning Your Visit'
                            ],
                            xHooks: [
                                'Silver Street in Natchez wasn\'t just a road—it was where the Delta Blues found its voice.',
                                'The Mississippi River brought more than cargo. It brought the sound that changed America.'
                            ]
                        },
                        publisher: {
                            blogUrl: 'https://superchase-manual-production.up.railway.app/blog/silver-street-stories',
                            threadUrl: 'https://twitter.com/i/status/2013773934047502709'
                        }
                    },
                    {
                        id: 'brief_s2p_demo',
                        clientId: 's2p',
                        status: 'pending',
                        strategist: {
                            topic: '48-Hour Turnaround: How Reality Capture Saved a $2M Renovation',
                            angle: 'Case study positioning S2P as the speed leader for existing conditions documentation',
                            blogOutline: [
                                'The Challenge: Outdated Drawings, Tight Timeline',
                                'The Solution: Same-Day Scan, Next-Day BIM',
                                'The Result: Zero Field Conflicts',
                                'Get Your Quote in 24 Hours'
                            ],
                            xHooks: [
                                'Most scan-to-BIM takes 2 weeks. We do it in 48 hours. Here\'s why that matters.',
                                'The architect said "impossible." We proved them wrong in 2 days.'
                            ]
                        }
                    }
                ]
            };
            setQueue(demoQueue);
        } catch (err) {
            console.error('Failed to fetch queue:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredBriefs = queue.briefs.filter(b => {
        if (filter === 'all') return true;
        return b.status === filter;
    });

    const counts = {
        all: queue.briefs.length,
        pending: queue.briefs.filter(b => b.status === 'pending').length,
        approved: queue.briefs.filter(b => b.status === 'approved' || b.status === 'drafted').length,
        published: queue.briefs.filter(b => b.status === 'published').length
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
                color: 'white'
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    style={{ fontSize: '48px' }}
                >
                    📢
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '24px'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    <span>📢</span>
                    Marketing Hub
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                    Content creation and publishing workflow
                </p>
            </div>

            {/* Quick Actions */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '12px',
                marginBottom: '32px'
            }}>
                {Object.entries(BRAND_COLORS).map(([id, brand]) => (
                    <motion.button
                        key={id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            background: `${brand.primary}22`,
                            border: `1px solid ${brand.primary}44`,
                            borderRadius: '12px',
                            padding: '16px 12px',
                            color: 'white',
                            cursor: 'pointer',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{brand.icon}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600 }}>{brand.name}</div>
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>New Brief</div>
                    </motion.button>
                ))}
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px'
            }}>
                {[
                    { key: 'all', label: 'All', color: '#3b82f6' },
                    { key: 'pending', label: 'Pending', color: '#f59e0b' },
                    { key: 'approved', label: 'Ready', color: '#3b82f6' },
                    { key: 'published', label: 'Published', color: '#10b981' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        style={{
                            background: filter === tab.key ? `${tab.color}22` : 'transparent',
                            border: filter === tab.key ? `1px solid ${tab.color}` : '1px solid transparent',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            color: filter === tab.key ? tab.color : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500
                        }}
                    >
                        {tab.label} ({counts[tab.key]})
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            <div style={{ maxWidth: '800px' }}>
                <AnimatePresence>
                    {filteredBriefs.map(brief => (
                        <BriefCard
                            key={brief.id}
                            brief={brief}
                            onDraft={(b) => console.log('Draft:', b)}
                            onPublish={(b) => console.log('Publish:', b)}
                        />
                    ))}
                </AnimatePresence>

                {filteredBriefs.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '64px',
                        color: 'rgba(255,255,255,0.4)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                        <div style={{ fontSize: '18px', marginBottom: '8px' }}>No content in queue</div>
                        <div style={{ fontSize: '14px' }}>Create a new brief to get started</div>
                    </div>
                )}
            </div>
        </div>
    );
}

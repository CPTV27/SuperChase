import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeadRadarCard } from './LeadRadarCard';

/**
 * S2P Business Development Portal
 * 
 * Dedicated view for Scan2Plan lead generation and prospecting.
 * Features:
 * - Lead Radar with Northeast corridor signals
 * - Prospectus generation
 * - Pipeline overview
 */

const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_BASE = import.meta.env.VITE_API_BASE || 'https://superchase-production.up.railway.app';

// S2P Brand Colors
const THEME = {
    primary: '#1e3a5f',
    accent: '#00a878',
    background: '#0a1628',
    text: '#e2e8f0'
};

function StatCard({ label, value, icon, color }) {
    return (
        <div style={{
            background: `${color}11`,
            border: `1px solid ${color}33`,
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                {label}
            </div>
        </div>
    );
}

function ProspectusPreview({ prospect, onClose }) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In production, would call prospectus generation API
        setTimeout(() => {
            setContent(`# Technical Prospectus: ${prospect.firmName || 'Prospect'}

## Existing Conditions. Accurate Geometry. Zero Guesswork.

Your ${prospect.projectType || 'renovation'} project in ${prospect.location || 'the Northeast'} needs reliable existing conditions documentation...

**LOD Recommendation:** LOD 300 for design development coordination

### Deliverables
- Registered point cloud (E57, RCP)
- Revit model at specified LOD
- Floor plans, sections, elevations

### Timeline
- On-site capture: 1-2 days
- BIM modeling: 5-7 business days
- **Total: Under 2 weeks**

---

**Chase Pierson** | Scan2Plan | chase@scan2plan.com`);
            setLoading(false);
        }, 1500);
    }, [prospect]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '24px'
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: THEME.background,
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '80vh',
                    overflow: 'auto'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>
                        ✏️ Technical Prospectus
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '24px',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            style={{ fontSize: '32px', marginBottom: '12px' }}
                        >
                            ⚙️
                        </motion.div>
                        <div>Generating prospectus...</div>
                    </div>
                ) : (
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '20px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                    }}>
                        {content}
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '20px'
                }}>
                    <button
                        style={{
                            flex: 1,
                            background: THEME.accent,
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        📧 Send via Email
                    </button>
                    <button
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: `1px solid ${THEME.accent}`,
                            borderRadius: '8px',
                            padding: '12px',
                            color: THEME.accent,
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        📥 Download PDF
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function S2PPortal() {
    const [stats, setStats] = useState({
        hotLeads: 9,
        warmLeads: 4,
        weeklyScans: 3,
        proposals: 2
    });
    const [selectedProspect, setSelectedProspect] = useState(null);

    const handleAction = useCallback((action, signal) => {
        console.log('Action:', action, signal);
        if (action === 'draft_intro') {
            setSelectedProspect(signal);
        } else if (action === 'send_proof') {
            // Would trigger Proof of Precision generation
            alert('Proof of Precision report will be generated and sent.');
        }
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${THEME.background} 0%, #0f2744 100%)`,
            color: THEME.text,
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '24px'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.accent} 100%)`,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                    }}>
                        🏗️
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>
                            Scan2Plan
                        </h1>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                            Business Development Portal • Northeast Corridor
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '32px'
            }}>
                <StatCard
                    label="Hot Leads"
                    value={stats.hotLeads}
                    icon="🔥"
                    color="#f59e0b"
                />
                <StatCard
                    label="Warm Leads"
                    value={stats.warmLeads}
                    icon="⚡"
                    color="#00a878"
                />
                <StatCard
                    label="Scans This Week"
                    value={stats.weeklyScans}
                    icon="📡"
                    color="#3b82f6"
                />
                <StatCard
                    label="Proposals Sent"
                    value={stats.proposals}
                    icon="📄"
                    color="#a855f7"
                />
            </div>

            {/* Lead Radar */}
            <div style={{ marginBottom: '32px' }}>
                <LeadRadarCard
                    apiKey={API_KEY}
                    baseUrl={API_BASE}
                    onAction={handleAction}
                />
            </div>

            {/* Quick Actions */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '24px'
            }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                    Quick Actions
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px'
                }}>
                    <button
                        style={{
                            background: 'rgba(0, 168, 120, 0.1)',
                            border: '1px solid rgba(0, 168, 120, 0.3)',
                            borderRadius: '12px',
                            padding: '16px',
                            color: '#00a878',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>📡</div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Run Northeast Scan</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>DC → Maine corridor</div>
                    </button>

                    <button
                        style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '12px',
                            padding: '16px',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>📊</div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Batch Prospectus</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>Generate for all hot leads</div>
                    </button>

                    <button
                        style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '12px',
                            padding: '16px',
                            color: '#a855f7',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>📈</div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Pipeline Report</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>Weekly BD summary</div>
                    </button>
                </div>
            </div>

            {/* Prospectus Modal */}
            <AnimatePresence>
                {selectedProspect && (
                    <ProspectusPreview
                        prospect={selectedProspect}
                        onClose={() => setSelectedProspect(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

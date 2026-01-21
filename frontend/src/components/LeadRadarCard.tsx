import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * S2P Lead Radar Card
 * 
 * Displays live regional business development signals for Scan2Plan.
 * Features:
 * - Live signal feed from Northeast corridor
 * - Distance to Meeting scores
 * - Meeting trigger buttons
 * 
 * @component
 * @tenant s2p (ISOLATED - do not mix with @bigmuddy or @tuthill)
 */

// S2P Brand Colors
const S2P_THEME = {
    primary: '#1e3a5f',      // Navy blue
    accent: '#00a878',       // Tech green
    warning: '#f59e0b',      // Amber for hot leads
    background: '#0a1628',   // Dark navy
    text: '#e2e8f0',
    muted: '#64748b'
};

// Northeast Corridor Markets
const MARKET_BADGES = {
    'New York': { color: '#f97316', abbrev: 'NYC' },
    'Brooklyn': { color: '#f97316', abbrev: 'NYC' },
    'Boston': { color: '#3b82f6', abbrev: 'BOS' },
    'Washington DC': { color: '#ef4444', abbrev: 'DC' },
    'Philadelphia': { color: '#8b5cf6', abbrev: 'PHL' },
    'Albany': { color: '#10b981', abbrev: 'ALB' },
    'Troy': { color: '#10b981', abbrev: 'TRY' }
};

/**
 * Score indicator component
 */
function ScoreIndicator({ score }) {
    const getColor = () => {
        if (score >= 80) return '#f59e0b'; // Hot
        if (score >= 60) return '#00a878'; // Warm
        return '#64748b'; // Cold
    };

    const getLabel = () => {
        if (score >= 80) return 'HOT';
        if (score >= 60) return 'WARM';
        return 'COLD';
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `conic-gradient(${getColor()} ${score}%, transparent ${score}%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: S2P_THEME.background,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: getColor()
                }}>
                    {score}
                </div>
            </div>
            <div>
                <div style={{ fontSize: '10px', color: S2P_THEME.muted, textTransform: 'uppercase' }}>
                    Distance to Meeting
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: getColor() }}>
                    {getLabel()}
                </div>
            </div>
        </div>
    );
}

/**
 * Market badge component
 */
function MarketBadge({ location }) {
    const market = Object.entries(MARKET_BADGES).find(([key]) =>
        location?.includes(key)
    );

    if (!market) {
        return (
            <span style={{
                background: 'rgba(100, 116, 139, 0.3)',
                color: S2P_THEME.muted,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600
            }}>
                NE
            </span>
        );
    }

    const [_, config] = market;
    return (
        <span style={{
            background: `${config.color}22`,
            color: config.color,
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600
        }}>
            {config.abbrev}
        </span>
    );
}

/**
 * Signal card component
 */
function SignalCard({ signal, onDraftIntro, onSendProof, isExpanded, onToggle }) {
    const isHot = signal.distanceToMeeting >= 80;
    const isWarm = signal.distanceToMeeting >= 60;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
                background: isHot
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isHot ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer'
            }}
            onClick={onToggle}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                    }}>
                        <MarketBadge location={signal.location} />
                        <span style={{
                            fontSize: '10px',
                            color: S2P_THEME.muted,
                            textTransform: 'uppercase'
                        }}>
                            {signal.source}
                        </span>
                        {isHot && (
                            <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={{ fontSize: '12px' }}
                            >
                                🔥
                            </motion.span>
                        )}
                    </div>
                    <h4 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: S2P_THEME.text
                    }}>
                        {signal.firmName || signal.headline}
                    </h4>
                    <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                        color: S2P_THEME.muted
                    }}>
                        {signal.signalType || signal.projectType}
                    </p>
                </div>
                <ScoreIndicator score={signal.distanceToMeeting} />
            </div>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        {/* Details */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '12px',
                            fontSize: '12px'
                        }}>
                            <div style={{ marginBottom: '8px' }}>
                                <span style={{ color: S2P_THEME.muted }}>Location: </span>
                                <span>{signal.location}</span>
                            </div>
                            {signal.projectType && (
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ color: S2P_THEME.muted }}>Project Type: </span>
                                    <span>{signal.projectType}</span>
                                </div>
                            )}
                            {signal.principalArchitect && (
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ color: S2P_THEME.muted }}>Principal: </span>
                                    <span>{signal.principalArchitect}</span>
                                </div>
                            )}
                            {signal.technicalNeeds && (
                                <div>
                                    <span style={{ color: S2P_THEME.muted }}>Technical Needs: </span>
                                    <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {signal.technicalNeeds.map((need, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    background: `${S2P_THEME.accent}22`,
                                                    color: S2P_THEME.accent,
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px'
                                                }}
                                            >
                                                {need}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div style={{
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={(e) => { e.stopPropagation(); onDraftIntro?.(signal); }}
                                style={{
                                    flex: 1,
                                    background: S2P_THEME.primary,
                                    border: `1px solid ${S2P_THEME.accent}`,
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                ✏️ Draft Technical Intro
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={(e) => { e.stopPropagation(); onSendProof?.(signal); }}
                                style={{
                                    flex: 1,
                                    background: `${S2P_THEME.accent}22`,
                                    border: `1px solid ${S2P_THEME.accent}`,
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    color: S2P_THEME.accent,
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                📊 Send Proof-of-Precision
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/**
 * Main Lead Radar Card Component
 */
export function LeadRadarCard({ apiKey, baseUrl = '', onAction }) {
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [filter, setFilter] = useState('all'); // all, hot, warm

    // Fetch live signals
    useEffect(() => {
        fetchSignals();
        const interval = setInterval(fetchSignals, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchSignals = async () => {
        try {
            // Would call /api/s2p/signals endpoint
            // For now, use demo data
            const demoSignals = [
                {
                    id: 's2p_prospect_demo_001',
                    source: 'LinkedIn',
                    firmName: 'Beyer Blinder Belle',
                    principalArchitect: 'Richard Blinder',
                    signalType: 'Historic Renovation Project Awarded',
                    location: 'Brooklyn, NY',
                    projectType: 'Historic Preservation',
                    distanceToMeeting: 92,
                    technicalNeeds: ['Point cloud capture', 'BIM conversion', 'LOD 300']
                },
                {
                    id: 's2p_prospect_demo_002',
                    source: 'LinkedIn',
                    firmName: 'Gensler Boston',
                    principalArchitect: 'Studio Director',
                    signalType: 'Seeking As-Built Documentation',
                    location: 'Boston, MA',
                    projectType: 'Commercial Renovation',
                    distanceToMeeting: 88,
                    technicalNeeds: ['Laser scanning', 'As-built drawings', 'BIM coordination']
                },
                {
                    id: 's2p_prospect_demo_003',
                    source: 'Architect Magazine',
                    firmName: 'Hartman-Cox Architects',
                    headline: 'DC Firm Wins National Trust Preservation Contract',
                    location: 'Washington DC',
                    projectType: 'Heritage Preservation',
                    signalType: 'Project Awarded',
                    distanceToMeeting: 75,
                    technicalNeeds: ['Historic documentation', 'Point cloud', 'Archival drawings']
                },
                {
                    id: 's2p_prospect_demo_004',
                    source: 'NYC DOB BIS',
                    address: '456 Industrial Blvd',
                    location: 'Queens, NY',
                    projectType: 'Major Renovation',
                    signalType: 'Permit Filed',
                    distanceToMeeting: 70,
                    technicalNeeds: ['Existing conditions survey', 'Point cloud']
                }
            ];

            setSignals(demoSignals);
        } catch (error) {
            console.error('Failed to fetch signals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDraftIntro = useCallback((signal) => {
        console.log('Draft intro for:', signal);
        onAction?.('draft_intro', signal);
    }, [onAction]);

    const handleSendProof = useCallback((signal) => {
        console.log('Send proof for:', signal);
        onAction?.('send_proof', signal);
    }, [onAction]);

    const filteredSignals = signals.filter(s => {
        if (filter === 'hot') return s.distanceToMeeting >= 80;
        if (filter === 'warm') return s.distanceToMeeting >= 60 && s.distanceToMeeting < 80;
        return true;
    });

    const hotCount = signals.filter(s => s.distanceToMeeting >= 80).length;
    const warmCount = signals.filter(s => s.distanceToMeeting >= 60 && s.distanceToMeeting < 80).length;

    if (loading) {
        return (
            <div style={{
                background: S2P_THEME.background,
                borderRadius: '16px',
                padding: '24px',
                color: S2P_THEME.text,
                textAlign: 'center'
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    style={{ fontSize: '32px', marginBottom: '12px' }}
                >
                    📡
                </motion.div>
                <div>Scanning Northeast corridor...</div>
            </div>
        );
    }

    return (
        <div style={{
            background: S2P_THEME.background,
            borderRadius: '16px',
            overflow: 'hidden',
            color: S2P_THEME.text,
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Header */}
            <div style={{
                background: `linear-gradient(135deg, ${S2P_THEME.primary} 0%, #0f2744 100%)`,
                padding: '20px',
                borderBottom: `1px solid ${S2P_THEME.accent}33`
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>📡</span>
                            Lead Radar
                            <span style={{
                                background: `${S2P_THEME.accent}22`,
                                color: S2P_THEME.accent,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 600
                            }}>
                                LIVE
                            </span>
                        </h3>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '12px',
                            color: S2P_THEME.muted
                        }}>
                            Northeast Corridor: DC → Maine
                        </p>
                    </div>
                    <div style={{
                        textAlign: 'right',
                        fontSize: '11px',
                        color: S2P_THEME.muted
                    }}>
                        <div>🏠 Technical Hub</div>
                        <div style={{ fontWeight: 600, color: S2P_THEME.accent }}>Troy, NY</div>
                    </div>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'flex',
                    gap: '16px'
                }}>
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        flex: 1,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                            {hotCount}
                        </div>
                        <div style={{ fontSize: '10px', color: S2P_THEME.muted, textTransform: 'uppercase' }}>
                            Hot Leads
                        </div>
                    </div>
                    <div style={{
                        background: `${S2P_THEME.accent}11`,
                        borderRadius: '8px',
                        padding: '12px 16px',
                        flex: 1,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: S2P_THEME.accent }}>
                            {warmCount}
                        </div>
                        <div style={{ fontSize: '10px', color: S2P_THEME.muted, textTransform: 'uppercase' }}>
                            Warm Leads
                        </div>
                    </div>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        flex: 1,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 700 }}>
                            {signals.length}
                        </div>
                        <div style={{ fontSize: '10px', color: S2P_THEME.muted, textTransform: 'uppercase' }}>
                            Total Signals
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
                {[
                    { key: 'all', label: 'All Signals' },
                    { key: 'hot', label: '🔥 Hot Only' },
                    { key: 'warm', label: '⚡ Warm+' }
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        style={{
                            background: filter === f.key ? `${S2P_THEME.accent}22` : 'transparent',
                            border: filter === f.key ? `1px solid ${S2P_THEME.accent}` : '1px solid transparent',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            color: filter === f.key ? S2P_THEME.accent : S2P_THEME.muted,
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 500
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Signal list */}
            <div style={{
                padding: '16px 20px',
                maxHeight: '400px',
                overflowY: 'auto'
            }}>
                <AnimatePresence>
                    {filteredSignals.map(signal => (
                        <SignalCard
                            key={signal.id}
                            signal={signal}
                            isExpanded={expandedId === signal.id}
                            onToggle={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                            onDraftIntro={handleDraftIntro}
                            onSendProof={handleSendProof}
                        />
                    ))}
                </AnimatePresence>

                {filteredSignals.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '32px',
                        color: S2P_THEME.muted
                    }}>
                        No signals match current filter
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '11px',
                color: S2P_THEME.muted,
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>Last scan: Just now</span>
                <span>🏗️ Scan2Plan BD Engine</span>
            </div>
        </div>
    );
}

export default LeadRadarCard;

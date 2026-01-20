import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Autonomy levels for the Governor Pattern
 */
export const AutonomyLevel = {
    SUGGEST: 'suggest',
    DRAFT: 'draft',
    EXECUTE: 'execute'
};

/**
 * Agent modules configuration
 */
const AGENT_MODULES = {
    scout: {
        name: 'The Scout',
        icon: '🔍',
        description: 'Trend discovery & topic research'
    },
    editor: {
        name: 'The Editor',
        icon: '✏️',
        description: 'Content drafting & refinement'
    },
    publisher: {
        name: 'The Publisher',
        icon: '🚀',
        description: 'Multi-platform distribution'
    }
};

/**
 * Brand themes for dynamic theming
 */
const BRAND_THEMES = {
    bigmuddy: {
        primary: 'hsl(215, 56%, 23%)',
        secondary: 'hsl(38, 45%, 60%)',
        accent: 'hsl(25, 75%, 31%)',
        gradient: 'linear-gradient(135deg, hsl(215, 56%, 23%) 0%, hsl(25, 75%, 31%) 100%)',
        glass: 'rgba(26, 54, 93, 0.15)',
        name: 'Southern Storyteller'
    },
    tuthill: {
        primary: 'hsl(0, 0%, 10%)',
        secondary: 'hsl(0, 0%, 96%)',
        accent: 'hsl(45, 69%, 47%)',
        gradient: 'linear-gradient(135deg, hsl(0, 0%, 10%) 0%, hsl(45, 69%, 47%) 100%)',
        glass: 'rgba(26, 26, 26, 0.2)',
        name: 'Architectural Noir'
    },
    studioc: {
        primary: 'hsl(0, 0%, 18%)',
        secondary: 'hsl(36, 23%, 88%)',
        accent: 'hsl(0, 100%, 27%)',
        gradient: 'linear-gradient(135deg, hsl(0, 0%, 18%) 0%, hsl(0, 100%, 27%) 100%)',
        glass: 'rgba(45, 45, 45, 0.15)',
        name: 'Documentary Grit'
    },
    utopia: {
        primary: 'hsl(20, 47%, 12%)',
        secondary: 'hsl(30, 44%, 64%)',
        accent: 'hsl(144, 26%, 40%)',
        gradient: 'linear-gradient(135deg, hsl(20, 47%, 12%) 0%, hsl(144, 26%, 40%) 100%)',
        glass: 'rgba(44, 24, 16, 0.15)',
        name: 'Cathedral Analog'
    },
    cptv: {
        primary: 'hsl(0, 0%, 4%)',
        secondary: 'hsl(150, 100%, 50%)',
        accent: 'hsl(340, 100%, 50%)',
        gradient: 'linear-gradient(135deg, hsl(0, 0%, 4%) 0%, hsl(340, 100%, 50%) 100%)',
        glass: 'rgba(10, 10, 10, 0.2)',
        name: 'Tech Rebellion'
    }
};

/**
 * Autonomy Slider - 3-stage control for agent behavior
 */
export function AutonomySlider({ module, value, onChange, disabled = false }) {
    const levels = [
        { key: AutonomyLevel.SUGGEST, label: 'Suggest', icon: '💡', desc: 'Agent proposes ideas' },
        { key: AutonomyLevel.DRAFT, label: 'Draft', icon: '📝', desc: 'Agent prepares work, awaits review' },
        { key: AutonomyLevel.EXECUTE, label: 'Execute', icon: '⚡', desc: 'Agent acts independently' }
    ];

    const currentIndex = levels.findIndex(l => l.key === value);
    const agent = AGENT_MODULES[module] || AGENT_MODULES.scout;

    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{agent.icon}</span>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{agent.name}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{agent.description}</div>
                    </div>
                </div>
                <div style={{
                    background: value === AutonomyLevel.EXECUTE
                        ? 'rgba(16, 185, 129, 0.2)'
                        : value === AutonomyLevel.DRAFT
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(251, 191, 36, 0.2)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: value === AutonomyLevel.EXECUTE
                        ? '#34d399'
                        : value === AutonomyLevel.DRAFT
                            ? '#60a5fa'
                            : '#fbbf24'
                }}>
                    {levels[currentIndex]?.label}
                </div>
            </div>

            {/* Slider track */}
            <div style={{
                position: 'relative',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
            }}>
                {/* Progress fill */}
                <motion.div
                    initial={false}
                    animate={{ width: `${((currentIndex + 1) / 3) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        background: value === AutonomyLevel.EXECUTE
                            ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.5) 100%)'
                            : value === AutonomyLevel.DRAFT
                                ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.5) 100%)'
                                : 'linear-gradient(90deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.5) 100%)',
                        borderRadius: '8px'
                    }}
                />

                {/* Level buttons */}
                {levels.map((level, index) => (
                    <motion.button
                        key={level.key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => !disabled && onChange?.(level.key)}
                        disabled={disabled}
                        style={{
                            flex: 1,
                            height: '100%',
                            background: value === level.key ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            color: value === level.key ? 'white' : 'rgba(255, 255, 255, 0.5)',
                            position: 'relative',
                            zIndex: 1,
                            transition: 'color 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>{level.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: 500 }}>{level.label}</span>
                    </motion.button>
                ))}
            </div>

            {/* Description */}
            <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                textAlign: 'center'
            }}>
                {levels[currentIndex]?.desc}
            </div>
        </div>
    );
}

/**
 * Explainability Panel - "Why this?" reasoning display
 */
export function WhyThisPanel({ reasoning, isOpen, onToggle, theme }) {
    return (
        <div style={{ marginTop: '12px' }}>
            <button
                onClick={onToggle}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme?.accent || '#60a5fa',
                    padding: '8px 0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    💡
                </motion.span>
                {isOpen ? 'Hide reasoning' : 'Why this?'}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            overflow: 'hidden',
                            background: `${theme?.glass || 'rgba(59, 130, 246, 0.1)'}`,
                            border: `1px solid ${theme?.accent || '#60a5fa'}44`,
                            borderRadius: '12px',
                            marginTop: '8px'
                        }}
                    >
                        <div style={{ padding: '16px' }}>
                            <div style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: theme?.accent || '#60a5fa',
                                marginBottom: '12px',
                                fontWeight: 600
                            }}>
                                Agent Reasoning
                            </div>

                            {/* Reasoning steps */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {reasoning?.steps?.map((step, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            fontSize: '12px'
                                        }}
                                    >
                                        <span style={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px',
                                            flexShrink: 0
                                        }}>
                                            {index + 1}
                                        </span>
                                        <span style={{ opacity: 0.9 }}>{step}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Data sources */}
                            {reasoning?.sources && (
                                <div style={{
                                    marginTop: '12px',
                                    paddingTop: '12px',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ opacity: 0.5 }}>Data sources: </span>
                                    <span style={{ color: theme?.accent || '#60a5fa' }}>
                                        {reasoning.sources.join(' • ')}
                                    </span>
                                </div>
                            )}

                            {/* Confidence score */}
                            {reasoning?.confidence && (
                                <div style={{
                                    marginTop: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ opacity: 0.5 }}>Confidence:</span>
                                    <div style={{
                                        flex: 1,
                                        height: '4px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${reasoning.confidence}%` }}
                                            style={{
                                                height: '100%',
                                                background: reasoning.confidence > 80 ? '#34d399' : '#fbbf24',
                                                borderRadius: '2px'
                                            }}
                                        />
                                    </div>
                                    <span style={{ color: reasoning.confidence > 80 ? '#34d399' : '#fbbf24' }}>
                                        {reasoning.confidence}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Bento Card - Modular content block for the cockpit
 */
export function BentoCard({
    children,
    span = 1,
    title,
    icon,
    theme,
    isProvisional = false,
    onApprove,
    className = ''
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={className}
            style={{
                gridColumn: `span ${span}`,
                background: isProvisional
                    ? `${theme?.glass || 'rgba(255, 255, 255, 0.03)'}`
                    : 'rgba(255, 255, 255, 0.03)',
                border: isProvisional
                    ? `2px dashed ${theme?.accent || 'rgba(255, 255, 255, 0.2)'}`
                    : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Provisional badge */}
            {isProvisional && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(251, 191, 36, 0.2)',
                    color: '#fbbf24',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '10px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 10
                }}>
                    <span>✏️</span>
                    Provisional
                </div>
            )}

            {/* Header */}
            {(title || icon) && (
                <div style={{
                    padding: '16px 16px 0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
                    {title && (
                        <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.8 }}>
                            {title}
                        </span>
                    )}
                </div>
            )}

            {/* Content */}
            <div style={{ padding: '16px' }}>
                {children}
            </div>

            {/* Quick approve overlay for provisional items */}
            {isProvisional && onApprove && (
                <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)',
                        padding: '24px 16px 16px',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onApprove('approve')}
                        style={{
                            background: 'rgba(16, 185, 129, 0.3)',
                            border: '1px solid rgba(16, 185, 129, 0.5)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            color: '#34d399',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                        }}
                    >
                        ✓ Approve
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onApprove('edit')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        ✏️ Edit
                    </motion.button>
                </motion.div>
            )}
        </motion.div>
    );
}

/**
 * Agency Cockpit - Main Bento Grid Layout
 */
export function AgencyCockpit({
    clientId,
    children,
    autonomyLevels = {},
    onAutonomyChange
}) {
    const theme = BRAND_THEMES[clientId] || BRAND_THEMES.bigmuddy;
    const [showRealtimeIndicator, setShowRealtimeIndicator] = useState(false);

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setShowRealtimeIndicator(true);
            setTimeout(() => setShowRealtimeIndicator(false), 2000);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '24px'
        }}>
            {/* Cockpit header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
            }}>
                <div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{
                            background: theme.gradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 700
                        }}>
                            {theme.name}
                        </span>
                        <span style={{
                            fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            color: 'rgba(255, 255, 255, 0.6)'
                        }}>
                            @{clientId}
                        </span>
                    </h1>
                </div>

                {/* Real-time indicator */}
                <AnimatePresence>
                    {showRealtimeIndicator && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(59, 130, 246, 0.2)',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                color: '#60a5fa'
                            }}
                        >
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: '#60a5fa'
                                }}
                            />
                            Scout analyzing trends...
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Autonomy controls */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {Object.keys(AGENT_MODULES).map(module => (
                    <AutonomySlider
                        key={module}
                        module={module}
                        value={autonomyLevels[module] || AutonomyLevel.DRAFT}
                        onChange={(level) => onAutonomyChange?.(module, level)}
                    />
                ))}
            </div>

            {/* Bento grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: 'minmax(200px, auto)',
                gap: '16px'
            }}>
                {children}
            </div>
        </div>
    );
}

/**
 * Live Metrics Card for the Bento grid
 */
export function MetricsCard({ title, value, change, trend, icon }) {
    const isPositive = change > 0;

    return (
        <div style={{ textAlign: 'center' }}>
            {icon && <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>}
            <div style={{
                fontSize: '28px',
                fontWeight: 700,
                marginBottom: '4px'
            }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>{title}</div>
            {change !== undefined && (
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    background: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isPositive ? '#34d399' : '#f87171',
                    fontSize: '11px'
                }}>
                    {isPositive ? '↑' : '↓'} {Math.abs(change)}%
                </div>
            )}
        </div>
    );
}

export default AgencyCockpit;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Client brand data for multi-tenant visualization
 */
const CLIENTS = {
    bigmuddy: {
        name: 'Big Muddy Inn',
        archetype: 'Southern Storyteller',
        color: '#1a365d',
        accent: '#8b4513'
    },
    tuthill: {
        name: 'Tuthill Design',
        archetype: 'Visionary Artist',
        color: '#1a1a1a',
        accent: '#c9a227'
    },
    studioc: {
        name: 'Studio C',
        archetype: 'Cultural Archivist',
        color: '#2d2d2d',
        accent: '#8b0000'
    },
    utopia: {
        name: 'Utopia Bearsville',
        archetype: 'Legendary Host',
        color: '#2c1810',
        accent: '#4a7c59'
    },
    cptv: {
        name: 'Chase Pierson TV',
        archetype: 'Tech Rebellion',
        color: '#0a0a0a',
        accent: '#ff0066'
    }
};

/**
 * Global Pulse - Multi-Tenant Activity Heatmap
 */
export function GlobalPulse({ apiKey, baseUrl = '' }) {
    const [data, setData] = useState({});
    const [activeClient, setActiveClient] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [agentState, setAgentState] = useState('idle'); // idle, researching, waiting

    useEffect(() => {
        fetchAllClientData();
        const interval = setInterval(fetchAllClientData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllClientData = async () => {
        setAgentState('researching');

        try {
            // Fetch data for each client
            const clientData = {};
            for (const clientId of Object.keys(CLIENTS)) {
                try {
                    const res = await fetch(`${baseUrl}/api/tenants/${clientId}`, {
                        headers: { 'X-API-Key': apiKey }
                    });
                    if (res.ok) {
                        const { tenant } = await res.json();
                        clientData[clientId] = {
                            ...CLIENTS[clientId],
                            config: tenant,
                            activity: Math.random() * 100, // Simulated activity score
                            pendingReviews: Math.floor(Math.random() * 5),
                            lastActivity: new Date(Date.now() - Math.random() * 86400000).toISOString()
                        };
                    }
                } catch {
                    // Client may not exist
                }
            }
            setData(clientData);
        } finally {
            setAgentState('idle');
        }
    };

    const handleNaturalSearch = (query) => {
        setSearchQuery(query);
        // Simulate natural language understanding
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('falling behind') || lowerQuery.includes('needs attention')) {
            // Find client with lowest activity
            const sorted = Object.entries(data).sort((a, b) => a[1].activity - b[1].activity);
            if (sorted.length > 0) setActiveClient(sorted[0][0]);
        } else if (lowerQuery.includes('ready to publish')) {
            // Find client with pending publishes
            const withPending = Object.entries(data).find(([_, d]) => d.pendingReviews > 0);
            if (withPending) setActiveClient(withPending[0]);
        } else {
            // Search by client name
            const match = Object.entries(CLIENTS).find(([id, c]) =>
                c.name.toLowerCase().includes(lowerQuery) || id.includes(lowerQuery)
            );
            if (match) setActiveClient(match[0]);
        }
    };

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '24px'
        }}>
            {/* Header with agent state indicator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span>🎯</span>
                        Global Pulse
                        <AgentStateIndicator state={agentState} />
                    </h1>
                    <p style={{
                        margin: '8px 0 0 0',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '14px'
                    }}>
                        Multi-tenant activity across your agency
                    </p>
                </div>

                {/* Natural language search */}
                <div style={{ position: 'relative', width: '320px' }}>
                    <input
                        type="text"
                        placeholder='Ask: "Which client needs attention?"'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNaturalSearch(searchQuery)}
                        style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            color: 'white',
                            fontSize: '13px'
                        }}
                    />
                    <span style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.5,
                        fontSize: '12px'
                    }}>
                        ⌘K
                    </span>
                </div>
            </div>

            {/* Heatmap grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
            }}>
                {Object.entries(data).map(([clientId, clientData]) => (
                    <ClientHeatmapCard
                        key={clientId}
                        clientId={clientId}
                        data={clientData}
                        isActive={activeClient === clientId}
                        onClick={() => setActiveClient(activeClient === clientId ? null : clientId)}
                    />
                ))}
            </div>

            {/* Expanded client detail panel */}
            <AnimatePresence>
                {activeClient && data[activeClient] && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <ClientDetailPanel
                            clientId={activeClient}
                            data={data[activeClient]}
                            onClose={() => setActiveClient(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick actions footer */}
            <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
                <QuickAction label="Scout All" icon="🔍" />
                <QuickAction label="Review Queue" icon="📋" />
                <QuickAction label="Publish Ready" icon="🚀" />
                <QuickAction label="Generate Reports" icon="📊" />
            </div>
        </div>
    );
}

/**
 * Agent state indicator with liquid glass animation
 */
function AgentStateIndicator({ state }) {
    const states = {
        idle: { color: '#34d399', label: 'Ready', pulse: false },
        researching: { color: '#60a5fa', label: 'Scouting', pulse: true },
        waiting: { color: '#fbbf24', label: 'Awaiting Input', pulse: false }
    };

    const current = states[state] || states.idle;

    return (
        <motion.div
            animate={current.pulse ? { scale: [1, 1.1, 1] } : {}}
            transition={current.pulse ? { duration: 1.5, repeat: Infinity } : {}}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: `${current.color}22`,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                color: current.color
            }}
        >
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: current.color,
                boxShadow: current.pulse ? `0 0 8px ${current.color}` : 'none'
            }} />
            {current.label}
        </motion.div>
    );
}

/**
 * Client heatmap card
 */
function ClientHeatmapCard({ clientId, data, isActive, onClick }) {
    const activityLevel = data.activity || 0;
    const heatColor = activityLevel > 70 ? '#34d399'
        : activityLevel > 40 ? '#fbbf24'
            : '#f87171';

    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                background: isActive
                    ? `linear-gradient(135deg, ${data.color} 0%, ${data.accent}44 100%)`
                    : 'rgba(255, 255, 255, 0.03)',
                border: isActive
                    ? `2px solid ${data.accent}`
                    : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Activity indicator dot */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: heatColor,
                boxShadow: `0 0 12px ${heatColor}`
            }} />

            <div style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '4px'
            }}>
                {data.name}
            </div>

            <div style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '16px'
            }}>
                {data.archetype}
            </div>

            {/* Activity bar */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                height: '4px',
                overflow: 'hidden'
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${activityLevel}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                        height: '100%',
                        background: heatColor,
                        borderRadius: '4px'
                    }}
                />
            </div>

            {/* Stats row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.6)'
            }}>
                <span>{data.pendingReviews} pending</span>
                <span>{Math.floor(activityLevel)}% active</span>
            </div>
        </motion.button>
    );
}

/**
 * Client detail panel
 */
function ClientDetailPanel({ clientId, data, onClose }) {
    const client = CLIENTS[clientId];

    return (
        <div style={{
            background: `linear-gradient(135deg, ${client.color}33 0%, transparent 100%)`,
            border: `1px solid ${client.accent}44`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>{data.name}</h2>
                    <span style={{ fontSize: '12px', color: client.accent }}>{data.archetype}</span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    ✕ Close
                </button>
            </div>

            {/* Quick stats grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px'
            }}>
                <StatBox label="Pending Reviews" value={data.pendingReviews} color="#60a5fa" />
                <StatBox label="Activity Score" value={`${Math.floor(data.activity)}%`} color={data.activity > 70 ? '#34d399' : '#fbbf24'} />
                <StatBox label="Content Pillars" value={data.config?.seo?.contentPillars?.length || 0} color="#a78bfa" />
                <StatBox label="GBP Enabled" value={data.config?.integrations?.gbp?.enabled ? 'Yes' : 'No'} color="#f472b6" />
            </div>

            {/* Action buttons */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '20px'
            }}>
                <ActionButton label="Scout Topics" icon="🔍" color={client.accent} />
                <ActionButton label="Draft Content" icon="✏️" color={client.accent} />
                <ActionButton label="View Portal" icon="🌐" color={client.accent} />
                <ActionButton label="Settings" icon="⚙️" color={client.accent} />
            </div>
        </div>
    );
}

/**
 * Stat box component
 */
function StatBox({ label, value, color }) {
    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>{label}</div>
        </div>
    );
}

/**
 * Quick action button
 */
function QuickAction({ label, icon }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 20px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px'
            }}
        >
            <span>{icon}</span>
            {label}
        </motion.button>
    );
}

/**
 * Action button component
 */
function ActionButton({ label, icon, color }) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
                background: `${color}22`,
                border: `1px solid ${color}44`,
                borderRadius: '8px',
                padding: '10px 16px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px'
            }}
        >
            <span>{icon}</span>
            {label}
        </motion.button>
    );
}

export default GlobalPulse;

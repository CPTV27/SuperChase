import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import all agentic components
import { AgencyReviewCard, AgencyReviewDashboard } from './AgencyReview';
import GlobalPulse from './GlobalPulse';
import {
    AgencyCockpit,
    BentoCard,
    AutonomySlider,
    WhyThisPanel,
    MetricsCard,
    AutonomyLevel
} from './AgencyCockpit';

/**
 * Demo data for showcasing components
 */
const DEMO_REVIEW_ITEMS = [
    {
        id: 'demo-1',
        clientId: 'bigmuddy',
        type: 'blog',
        title: 'The Southern Gothic Blues: A Night at Big Muddy Inn',
        content: `Where the Mississippi whispers its secrets and the Blues Room calls your name...

In the heart of Natchez Under-the-Hill, where the cobblestones hold centuries of stories, there's a place where the past and present dance in perfect harmony. The Big Muddy Inn isn't just a hotel—it's a portal to the soul of the South.

As twilight settles over Silver Street, the warm glow of the Blues Room beckons. Inside, the air is thick with anticipation, the kind that only comes when something magical is about to happen...`,
        status: 'AGENCY_REVIEW',
        metadata: { keywords: ['Natchez blues', 'Southern Gothic', 'Big Muddy Inn'] },
        approveToken: 'demo-token-1',
        rejectToken: 'demo-reject-1'
    },
    {
        id: 'demo-2',
        clientId: 'tuthill',
        type: 'social',
        title: 'The Geometry of Light: New Project Reveal',
        content: `In the tension between shadow and light, a room reveals its soul.

Every angle whispers intention. Every material tells a story of careful selection.

This is not decoration—this is choreography of space.

#InteriorDesign #ArchitecturalNoir #TuthillDesign`,
        status: 'CLIENT_REVIEW',
        metadata: { keywords: ['Interior design', 'Luxury', 'Architecture'] }
    },
    {
        id: 'demo-3',
        clientId: 'utopia',
        type: 'blog',
        title: 'Cathedral Acoustics: The Science Behind the Sound',
        content: `Where legends have walked, new history awaits. The 40-foot cathedral ceilings of Utopia Bearsville don't just look impressive—they're the secret weapon behind that signature Woodstock sound...`,
        status: 'CLIENT_APPROVED',
        metadata: { keywords: ['Woodstock', 'Recording studio', 'API console'] }
    }
];

const DEMO_REASONING = {
    steps: [
        'Identified "Southern Gothic" as trending topic (+40% this week)',
        'Content matches Big Muddy\'s "Blues Heritage" pillar',
        'Optimal posting window: Tuesday 2:00 PM CST',
        'Similar posts averaged 87% engagement rate'
    ],
    sources: ['Google Trends', 'TikTok API', 'Historical Performance'],
    confidence: 92
};

/**
 * Demo Navigation
 */
function DemoNav({ activeSection, onNavigate }) {
    const sections = [
        { id: 'overview', label: 'Overview', icon: '🎯' },
        { id: 'cockpit', label: 'Agency Cockpit', icon: '🛸' },
        { id: 'review', label: 'Review Cards', icon: '📋' },
        { id: 'pulse', label: 'Global Pulse', icon: '🌍' },
        { id: 'autonomy', label: 'Autonomy Controls', icon: '⚙️' }
    ];

    return (
        <nav style={{
            position: 'fixed',
            left: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 100
        }}>
            {sections.map(section => (
                <motion.button
                    key={section.id}
                    whileHover={{ scale: 1.1, x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNavigate(section.id)}
                    style={{
                        background: activeSection === section.id
                            ? 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)'
                            : 'rgba(255, 255, 255, 0.05)',
                        border: activeSection === section.id
                            ? 'none'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'white',
                        fontSize: '13px',
                        minWidth: '48px',
                        justifyContent: 'center'
                    }}
                    title={section.label}
                >
                    <span>{section.icon}</span>
                    {activeSection === section.id && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            style={{ whiteSpace: 'nowrap', fontWeight: 600 }}
                        >
                            {section.label}
                        </motion.span>
                    )}
                </motion.button>
            ))}
        </nav>
    );
}

/**
 * Section Header
 */
function SectionHeader({ title, subtitle, icon }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
                textAlign: 'center',
                marginBottom: '48px'
            }}
        >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
            <h2 style={{
                fontSize: '32px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
            }}>
                {title}
            </h2>
            <p style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.6)',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {subtitle}
            </p>
        </motion.div>
    );
}

/**
 * Overview Hero Section
 */
function OverviewSection() {
    return (
        <section id="overview" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '48px',
            textAlign: 'center'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
            >
                <div style={{ fontSize: '72px', marginBottom: '24px' }}>🎛️</div>
                <h1 style={{
                    fontSize: '56px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '16px',
                    lineHeight: 1.1
                }}>
                    SuperChase Agency<br />Component Library
                </h1>
                <p style={{
                    fontSize: '20px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    maxWidth: '700px',
                    marginBottom: '48px'
                }}>
                    Agentic UX components for multi-tenant agency management.
                    Progressive autonomy, human-in-the-loop controls, and explainable AI.
                </p>

                {/* Feature pills */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '48px'
                }}>
                    {[
                        '5 Client Themes',
                        'HITL Controls',
                        'Explainable AI',
                        'Bento Grid',
                        'Real-time Updates'
                    ].map(feature => (
                        <span
                            key={feature}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '13px'
                            }}
                        >
                            {feature}
                        </span>
                    ))}
                </div>

                {/* Scroll indicator */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ opacity: 0.5 }}
                >
                    <span style={{ fontSize: '24px' }}>↓</span>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>Scroll to explore</div>
                </motion.div>
            </motion.div>
        </section>
    );
}

/**
 * Cockpit Demo Section
 */
function CockpitSection() {
    const [autonomyLevels, setAutonomyLevels] = useState({
        scout: AutonomyLevel.DRAFT,
        editor: AutonomyLevel.SUGGEST,
        publisher: AutonomyLevel.DRAFT
    });
    const [showReasoning, setShowReasoning] = useState(false);

    const theme = {
        primary: '#1a365d',
        secondary: '#c6a66d',
        accent: '#8b4513',
        glass: 'rgba(26, 54, 93, 0.15)'
    };

    return (
        <section id="cockpit" style={{
            minHeight: '100vh',
            padding: '96px 48px'
        }}>
            <SectionHeader
                icon="🛸"
                title="Agency Cockpit"
                subtitle="The Bento-style control center for multi-tenant agency management"
            />

            {/* Autonomy controls demo */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                maxWidth: '1000px',
                margin: '0 auto 48px'
            }}>
                {Object.keys(autonomyLevels).map(module => (
                    <AutonomySlider
                        key={module}
                        module={module}
                        value={autonomyLevels[module]}
                        onChange={(level) => setAutonomyLevels(prev => ({
                            ...prev,
                            [module]: level
                        }))}
                    />
                ))}
            </div>

            {/* Bento grid demo */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <BentoCard span={1} title="Traffic" icon="📊" theme={theme}>
                    <MetricsCard title="This Week" value="12.4K" change={12} />
                </BentoCard>

                <BentoCard span={1} title="Engagement" icon="💬" theme={theme}>
                    <MetricsCard title="Avg Rate" value="4.8%" change={8} />
                </BentoCard>

                <BentoCard
                    span={2}
                    title="New Content Draft"
                    icon="✏️"
                    theme={theme}
                    isProvisional={true}
                    onApprove={(action) => console.log('Action:', action)}
                >
                    <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
                        <strong>The Southern Gothic Blues</strong>
                        <p style={{ opacity: 0.8, marginTop: '8px' }}>
                            Where the Mississippi whispers its secrets and the Blues Room calls your name...
                        </p>
                    </div>
                    <WhyThisPanel
                        reasoning={DEMO_REASONING}
                        isOpen={showReasoning}
                        onToggle={() => setShowReasoning(!showReasoning)}
                        theme={theme}
                    />
                </BentoCard>

                <BentoCard span={2} title="Content Pillars" icon="🎯" theme={theme}>
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                    }}>
                        {['Southern Gothic', 'Blues Heritage', 'Under-the-Hill', 'River Stories'].map(pillar => (
                            <span
                                key={pillar}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                            >
                                {pillar}
                            </span>
                        ))}
                    </div>
                </BentoCard>

                <BentoCard span={2} title="Scout Activity" icon="🔍" theme={theme}>
                    <div style={{ fontSize: '13px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                        }}>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#34d399'
                                }}
                            />
                            <span style={{ opacity: 0.8 }}>Analyzing TikTok trends...</span>
                        </div>
                        <div style={{ opacity: 0.6, fontSize: '12px' }}>
                            Last scan: 2 minutes ago • 3 opportunities found
                        </div>
                    </div>
                </BentoCard>
            </div>
        </section>
    );
}

/**
 * Review Cards Demo Section
 */
function ReviewSection() {
    return (
        <section id="review" style={{
            minHeight: '100vh',
            padding: '96px 48px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.05) 50%, transparent 100%)'
        }}>
            <SectionHeader
                icon="📋"
                title="Human-in-the-Loop Cards"
                subtitle="Brand-themed review cards with inline editing and explainable AI"
            />

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {DEMO_REVIEW_ITEMS.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <AgencyReviewCard
                            item={item}
                            onApprove={(id) => console.log('Approve:', id)}
                            onReject={(id) => console.log('Reject:', id)}
                            onRequestRevision={(id) => console.log('Revision:', id)}
                            isExpanded={index === 0}
                        />
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

/**
 * Global Pulse Demo Section
 */
function PulseSection({ apiKey }) {
    return (
        <section id="pulse" style={{
            minHeight: '100vh',
            padding: '96px 48px'
        }}>
            <SectionHeader
                icon="🌍"
                title="Global Pulse"
                subtitle="Multi-tenant activity heatmap with natural language search"
            />

            <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <GlobalPulse apiKey={apiKey} />
            </div>
        </section>
    );
}

/**
 * Autonomy Controls Deep Dive Section
 */
function AutonomySection() {
    const [levels, setLevels] = useState({
        scout: AutonomyLevel.SUGGEST,
        editor: AutonomyLevel.DRAFT,
        publisher: AutonomyLevel.EXECUTE
    });

    return (
        <section id="autonomy" style={{
            minHeight: '100vh',
            padding: '96px 48px'
        }}>
            <SectionHeader
                icon="⚙️"
                title="Progressive Autonomy"
                subtitle="The Governor Pattern for controlling agent behavior"
            />

            <div style={{
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* Interactive demo */}
                <div style={{ marginBottom: '48px' }}>
                    {Object.keys(levels).map(module => (
                        <AutonomySlider
                            key={module}
                            module={module}
                            value={levels[module]}
                            onChange={(level) => setLevels(prev => ({ ...prev, [module]: level }))}
                        />
                    ))}
                </div>

                {/* Explanation cards */}
                <div style={{
                    display: 'grid',
                    gap: '16px'
                }}>
                    {[
                        {
                            level: '💡 Suggest',
                            desc: 'Agent proposes ideas in your feed. You make all decisions.',
                            color: '#fbbf24'
                        },
                        {
                            level: '📝 Draft',
                            desc: 'Agent prepares complete work and waits in the review queue.',
                            color: '#60a5fa'
                        },
                        {
                            level: '⚡ Execute',
                            desc: 'Agent acts independently and logs results for your review.',
                            color: '#34d399'
                        }
                    ].map(item => (
                        <div
                            key={item.level}
                            style={{
                                background: `${item.color}11`,
                                border: `1px solid ${item.color}33`,
                                borderRadius: '12px',
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}
                        >
                            <span style={{ fontSize: '24px' }}>{item.level.split(' ')[0]}</span>
                            <div>
                                <div style={{ fontWeight: 600, color: item.color }}>
                                    {item.level.split(' ')[1]}
                                </div>
                                <div style={{ fontSize: '13px', opacity: 0.8 }}>{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/**
 * Main Demo Page
 */
export default function AgencyDemo() {
    const [activeSection, setActiveSection] = useState('overview');
    const apiKey = import.meta.env.VITE_API_KEY || '';

    // Update active section on scroll
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['overview', 'cockpit', 'review', 'pulse', 'autonomy'];
            for (const sectionId of sections) {
                const element = document.getElementById(sectionId);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
                        setActiveSection(sectionId);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId) => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f0f23 100%)',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Navigation */}
            <DemoNav
                activeSection={activeSection}
                onNavigate={scrollToSection}
            />

            {/* Sections */}
            <OverviewSection />
            <CockpitSection />
            <ReviewSection />
            <PulseSection apiKey={apiKey} />
            <AutonomySection />

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: '48px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>🚀</div>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                    SuperChase Agency OS v2.1
                </div>
                <div style={{ fontSize: '13px', opacity: 0.5 }}>
                    Built with Progressive Autonomy • Human-in-the-Loop • Explainable AI
                </div>
            </footer>
        </div>
    );
}

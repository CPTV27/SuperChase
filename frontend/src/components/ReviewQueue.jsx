import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgencyReviewCard, AgencyReviewDashboard } from './AgencyReview';

/**
 * Review Queue Page
 * 
 * Dedicated Human-in-the-Loop content approval interface.
 * Shows all pending reviews across clients with filtering.
 */

const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_BASE = import.meta.env.VITE_API_BASE || 'https://superchase-production.up.railway.app';

export default function ReviewQueue() {
    const [pulse, setPulse] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('agency'); // agency, client, ready, revision
    const [selectedItem, setSelectedItem] = useState(null);

    // Fetch pulse data
    useEffect(() => {
        fetchPulse();
        const interval = setInterval(fetchPulse, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchPulse = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/review/pulse`, {
                headers: { 'X-API-Key': API_KEY }
            });
            const data = await res.json();
            setPulse(data);

            // Combine all items
            const allItems = [
                ...(data.agencyPending || []).map(i => ({ ...i, stage: 'agency' })),
                ...(data.clientPending || []).map(i => ({ ...i, stage: 'client' })),
                ...(data.readyToPublish || []).map(i => ({ ...i, stage: 'ready' })),
                ...(data.needsRevision || []).map(i => ({ ...i, stage: 'revision' }))
            ];
            setItems(allItems);
        } catch (err) {
            console.error('Failed to fetch pulse:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await fetch(`${API_BASE}/api/review/${id}/client-approve`, {
                method: 'POST',
                headers: { 'X-API-Key': API_KEY }
            });
            fetchPulse();
        } catch (err) {
            console.error('Approve failed:', err);
        }
    };

    const handleReject = async (id, feedback) => {
        try {
            await fetch(`${API_BASE}/api/review/${id}/revision`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ feedback })
            });
            fetchPulse();
        } catch (err) {
            console.error('Reject failed:', err);
        }
    };

    const handlePublish = async (id) => {
        try {
            await fetch(`${API_BASE}/api/review/${id}/publish`, {
                method: 'POST',
                headers: { 'X-API-Key': API_KEY }
            });
            fetchPulse();
        } catch (err) {
            console.error('Publish failed:', err);
        }
    };

    const filteredItems = items.filter(item => {
        if (activeTab === 'all') return true;
        return item.stage === activeTab;
    });

    const tabs = [
        { key: 'all', label: 'All', count: items.length },
        { key: 'agency', label: 'Agency Review', count: pulse?.counts?.agencyReview || 0, color: '#f59e0b' },
        { key: 'client', label: 'Client Review', count: pulse?.counts?.clientReview || 0, color: '#3b82f6' },
        { key: 'ready', label: 'Ready to Publish', count: pulse?.counts?.readyToPublish || 0, color: '#10b981' },
        { key: 'revision', label: 'Needs Revision', count: pulse?.counts?.needsRevision || 0, color: '#ef4444' }
    ];

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
                    📋
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
                    <span>📋</span>
                    Review Queue
                    <span style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '14px'
                    }}>
                        {items.length} items
                    </span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                    Human-in-the-Loop content approval workflow
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            background: activeTab === tab.key
                                ? tab.color ? `${tab.color}22` : 'rgba(59, 130, 246, 0.2)'
                                : 'rgba(255, 255, 255, 0.05)',
                            border: activeTab === tab.key
                                ? `1px solid ${tab.color || '#3b82f6'}`
                                : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            color: activeTab === tab.key ? (tab.color || '#60a5fa') : 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {tab.label}
                        <span style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px'
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {filteredItems.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '64px',
                    color: 'rgba(255,255,255,0.4)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                    <div style={{ fontSize: '18px', marginBottom: '8px' }}>Queue is empty</div>
                    <div style={{ fontSize: '14px' }}>No items pending review</div>
                </div>
            ) : (
                <div style={{ maxWidth: '800px' }}>
                    <AnimatePresence>
                        {filteredItems.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <AgencyReviewCard
                                    item={item}
                                    onApprove={() => handleApprove(item.id)}
                                    onReject={() => handleReject(item.id, 'Needs revision')}
                                    onPublish={() => handlePublish(item.id)}
                                    isExpanded={selectedItem === item.id}
                                    onToggle={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

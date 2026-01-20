import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

// Content queue state (would be fetched from API in production)
const initialQueue = {
  ingest: [
    { id: 'RAW_IMG_001', name: 'RAW_IMG_001.jpg', source: 'Client Upload', notes: 'Needs "Southern Gothic" wash' }
  ],
  agencyReview: [
    { id: 'POST_001', name: 'The Midnight Speakeasy', type: 'Thread', status: 'Waiting for Chase approval' }
  ],
  clientReview: [],
  published: [
    { id: 'POST_000', name: 'Administrative Tightening', type: 'Thread', date: '2026-01-20', url: 'https://x.com/chaseptv/status/2013519471697129524' }
  ]
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'ingest': '#f59e0b',
    'agency': '#3b82f6',
    'client': '#8b5cf6',
    'published': '#10b981'
  };
  return (
    <span style={{
      background: colors[status] || '#6b7280',
      color: 'white',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase'
    }}>
      {status}
    </span>
  );
}

function QueueSection({ title, items, status, emptyText }: {
  title: string;
  items: any[];
  status: string;
  emptyText: string;
}) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Heading as="h3" style={{ margin: 0 }}>{title}</Heading>
        <StatusBadge status={status} />
        <span style={{ opacity: 0.5 }}>({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p style={{ opacity: 0.5, fontStyle: 'italic' }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map((item) => (
            <div key={item.id} style={{
              background: 'var(--ifm-background-surface-color)',
              border: '1px solid var(--ifm-toc-border-color)',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{item.name}</strong>
                {item.type && <span style={{ opacity: 0.5, marginLeft: '0.5rem' }}>({item.type})</span>}
                {item.notes && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.7 }}>{item.notes}</p>}
                {item.status && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.7 }}>{item.status}</p>}
              </div>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="button button--sm button--primary">
                  View
                </a>
              )}
              {status === 'client' && (
                <button className="button button--sm button--success">
                  Approve
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); alert('Upload functionality coming soon!'); }}
      style={{
        border: `2px dashed ${isDragging ? '#f59e0b' : 'var(--ifm-toc-border-color)'}`,
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center',
        background: isDragging ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        marginBottom: '2rem'
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>+</div>
      <p style={{ margin: 0, fontWeight: 600 }}>Drop assets here</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.7 }}>
        Photos will be tagged for "Southern Gothic" processing
      </p>
    </div>
  );
}

function MetricsCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'center'
    }}>
      <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>{label}</p>
      <p style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 700 }}>{value}</p>
      {trend && <p style={{ margin: 0, fontSize: '0.875rem', color: '#10b981' }}>{trend}</p>}
    </div>
  );
}

export default function BigMuddyPortal() {
  return (
    <Layout
      title="Big Muddy Inn Portal"
      description="Client portal for Big Muddy Inn content management">

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        padding: '3rem 0'
      }}>
        <div className="container">
          <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>CLIENT PORTAL</p>
          <Heading as="h1" style={{ margin: 0, color: 'white' }}>
            Big Muddy Inn
          </Heading>
          <p style={{ opacity: 0.9, marginTop: '0.5rem' }}>
            Natchez's Cultural Hub — Blues Room & Boutique B&B
          </p>
        </div>
      </div>

      <main className="container" style={{ padding: '2rem 0' }}>

        {/* Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <MetricsCard label="Posts Published" value="1" />
          <MetricsCard label="In Queue" value="2" />
          <MetricsCard label="This Week" value="$0" trend="Revenue saved" />
          <MetricsCard label="X.com Reach" value="—" trend="Tracking" />
        </div>

        {/* Upload Zone */}
        <Heading as="h2">Upload Assets</Heading>
        <UploadZone />

        {/* Content Pipeline */}
        <Heading as="h2">Content Pipeline</Heading>

        <QueueSection
          title="Ingest"
          items={initialQueue.ingest}
          status="ingest"
          emptyText="No assets pending processing"
        />

        <QueueSection
          title="Agency Review"
          items={initialQueue.agencyReview}
          status="agency"
          emptyText="No content in agency review"
        />

        <QueueSection
          title="Your Review"
          items={initialQueue.clientReview}
          status="client"
          emptyText="No content waiting for your approval"
        />

        <QueueSection
          title="Published"
          items={initialQueue.published}
          status="published"
          emptyText="No published content yet"
        />

        {/* Footer */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--ifm-toc-border-color)',
          textAlign: 'center',
          opacity: 0.7
        }}>
          <p>Managed by SuperChase OS — <a href="mailto:chase@chasepierson.tv">chase@chasepierson.tv</a></p>
        </div>
      </main>
    </Layout>
  );
}

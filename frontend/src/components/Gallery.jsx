import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  FileText,
  Image as ImageIcon,
  Presentation,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Edit,
  Trash2,
  Share2,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

/**
 * MARS Artifact Gallery
 *
 * Visual grid of all artifacts (microsites, decks, one-pagers, diagrams)
 * organized by business, type, and status.
 */

const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '');

// Artifact type icons
const TYPE_ICONS = {
  microsite: Globe,
  deck: Presentation,
  'one-pager': FileText,
  diagram: ImageIcon
};

// Business color palette
const BUSINESS_COLORS = {
  s2p: { bg: '#2563eb', text: 'white' },
  'studio-c': { bg: '#000000', text: '#d4af37' },
  bigmuddy: { bg: '#166534', text: 'white' },
  tuthill: { bg: '#7c3aed', text: 'white' },
  cptv: { bg: '#dc2626', text: 'white' },
  utopia: { bg: '#0891b2', text: 'white' }
};

// Status badges
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#6b7280', icon: Clock },
  published: { label: 'Published', color: '#10b981', icon: CheckCircle }
};

function ArtifactCard({ artifact, onPreview, onEdit, onDelete, onPublish }) {
  const TypeIcon = TYPE_ICONS[artifact.type] || Globe;
  const businessColor = BUSINESS_COLORS[artifact.business] || BUSINESS_COLORS.s2p;
  const statusConfig = STATUS_CONFIG[artifact.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all"
    >
      {/* Preview thumbnail area */}
      <div
        className="aspect-video relative cursor-pointer overflow-hidden"
        onClick={() => onPreview(artifact)}
        style={{ backgroundColor: businessColor.bg }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <TypeIcon className="w-12 h-12 opacity-30" style={{ color: businessColor.text }} />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(artifact); }}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            title="Preview"
          >
            <ExternalLink className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(artifact); }}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            title="Edit"
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
          {artifact.status === 'draft' && (
            <button
              onClick={(e) => { e.stopPropagation(); onPublish(artifact); }}
              className="p-2 bg-green-500/40 rounded-lg hover:bg-green-500/60 transition-colors"
              title="Publish"
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/40 backdrop-blur rounded text-xs text-white flex items-center gap-1">
          <TypeIcon className="w-3 h-3" />
          {artifact.type}
        </div>

        {/* Status badge */}
        <div
          className="absolute top-2 right-2 px-2 py-1 rounded text-xs flex items-center gap-1"
          style={{ backgroundColor: statusConfig.color }}
        >
          <StatusIcon className="w-3 h-3 text-white" />
          <span className="text-white">{statusConfig.label}</span>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">{artifact.title}</h3>

        <div className="flex items-center justify-between mt-2">
          {/* Business badge */}
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: businessColor.bg,
              color: businessColor.text
            }}
          >
            @{artifact.business}
          </span>

          {/* Time */}
          <span className="text-xs text-zinc-500">
            {new Date(artifact.created).toLocaleDateString()}
          </span>
        </div>

        {/* Feedback stats if available */}
        {artifact.feedback?.editCount > 0 && (
          <div className="mt-2 text-xs text-zinc-500">
            {artifact.feedback.editCount} edit{artifact.feedback.editCount > 1 ? 's' : ''}
            {artifact.feedback.shared && <span className="ml-2">Shared</span>}
          </div>
        )}
      </div>

      {/* Delete button (hidden until hover) */}
      <button
        onClick={() => onDelete(artifact)}
        className="absolute bottom-4 right-4 p-1.5 bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
        title="Delete"
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
    </motion.div>
  );
}

function CreateArtifactModal({ isOpen, onClose, onSubmit, templates }) {
  const [type, setType] = useState('microsite');
  const [business, setBusiness] = useState('s2p');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ type, business, title: title.trim() });
      setTitle('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">New Artifact</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['microsite', 'deck', 'one-pager', 'diagram'].map((t) => {
                const Icon = TYPE_ICONS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                      type === t
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-zinc-700 hover:border-zinc-600 text-zinc-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs capitalize">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Business selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Business</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(templates || BUSINESS_COLORS).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBusiness(key)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                    business === key
                      ? 'border-transparent'
                      : 'border-zinc-700 bg-zinc-800'
                  }`}
                  style={business === key ? {
                    backgroundColor: config.bg || config.primaryColor,
                    color: config.text || 'white'
                  } : {}}
                >
                  @{key}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Tuthill Proposal Q1 2026"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Artifact'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function PreviewModal({ artifact, isOpen, onClose }) {
  if (!isOpen || !artifact) return null;

  const previewUrl = `${API_BASE}/api/artifacts/${artifact.id}/preview`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 rounded-xl w-full max-w-5xl h-[80vh] flex flex-col border border-zinc-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">{artifact.title}</h2>
            <p className="text-sm text-zinc-500">@{artifact.business} / {artifact.type}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* iframe preview */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={artifact.title}
          />
        </div>
      </motion.div>
    </div>
  );
}

export default function Gallery() {
  const [artifacts, setArtifacts] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBusiness, setFilterBusiness] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState(null);

  // Fetch artifacts
  const fetchArtifacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterBusiness !== 'all') params.set('business', filterBusiness);
      if (filterType !== 'all') params.set('type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`${API_BASE}/api/artifacts?${params}`, {
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await res.json();

      if (data.success) {
        setArtifacts(data.artifacts || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterBusiness, filterType, filterStatus]);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/artifacts/templates`, {
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || {});
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  useEffect(() => {
    fetchArtifacts();
    fetchTemplates();
  }, [fetchArtifacts]);

  // Create artifact
  const handleCreate = async ({ type, business, title }) => {
    try {
      const res = await fetch(`${API_BASE}/api/artifacts/generate`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, business, title })
      });
      const data = await res.json();

      if (data.success) {
        fetchArtifacts();
      } else {
        alert(`Failed to create: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Publish artifact
  const handlePublish = async (artifact) => {
    if (!confirm(`Publish "${artifact.title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/artifacts/${artifact.id}/publish`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await res.json();

      if (data.success) {
        fetchArtifacts();
      } else {
        alert(`Failed to publish: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete artifact
  const handleDelete = async (artifact) => {
    if (!confirm(`Delete "${artifact.title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/artifacts/${artifact.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await res.json();

      if (data.success) {
        fetchArtifacts();
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Filter artifacts by search
  const filteredArtifacts = artifacts.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique values for filter options
  const businesses = [...new Set(artifacts.map(a => a.business))];
  const types = [...new Set(artifacts.map(a => a.type))];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Artifact Gallery</h1>
              <p className="text-zinc-500 text-sm">
                {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Artifact
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search artifacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Business filter */}
            <select
              value={filterBusiness}
              onChange={(e) => setFilterBusiness(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All Businesses</option>
              {businesses.map(b => (
                <option key={b} value={b}>@{b}</option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All Types</option>
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400">Error: {error}</p>
            <button
              onClick={() => { setError(null); fetchArtifacts(); }}
              className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"
            >
              Retry
            </button>
          </div>
        ) : filteredArtifacts.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
            <h2 className="text-xl font-semibold text-zinc-400">No artifacts yet</h2>
            <p className="text-zinc-500 mt-2">Create your first microsite, deck, or diagram</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              Create Artifact
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredArtifacts.map(artifact => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  onPreview={setPreviewArtifact}
                  onEdit={() => alert('Editor coming soon!')}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <CreateArtifactModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        templates={templates}
      />

      <PreviewModal
        artifact={previewArtifact}
        isOpen={!!previewArtifact}
        onClose={() => setPreviewArtifact(null)}
      />
    </div>
  );
}

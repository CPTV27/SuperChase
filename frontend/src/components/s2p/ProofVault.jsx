import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image, FileText, Book, Search, Filter,
  TrendingUp, Copy, Download, ExternalLink,
  Building2, Ruler, Award
} from 'lucide-react'

/**
 * Proof Vault (P4)
 * 1 record = 1 tile visual catalog
 */

const TYPE_CONFIG = {
  case_study: {
    label: 'Case Study',
    icon: Book,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  lod_sample: {
    label: 'LOD Sample',
    icon: Building2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  whitepaper: {
    label: 'Whitepaper',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20'
  }
}

function ProofTile({ proof, onSelect, onCopySnippet }) {
  const config = TYPE_CONFIG[proof.type] || TYPE_CONFIG.lod_sample
  const Icon = config.icon

  const conversionRate = proof.vault_to_meeting || 0
  const conversionColor = conversionRate >= 0.25 ? 'text-green-400' :
                          conversionRate >= 0.18 ? 'text-amber-400' :
                          'text-zinc-400'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="glass rounded-xl overflow-hidden cursor-pointer group"
      onClick={() => onSelect?.(proof)}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-zinc-800 relative overflow-hidden">
        {proof.thumbnail_url ? (
          <img
            src={proof.thumbnail_url}
            alt={proof.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-12 h-12 text-zinc-600" />
          </div>
        )}

        {/* Type badge */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg ${config.bgColor} backdrop-blur`}>
          <div className="flex items-center gap-1">
            <Icon className={`w-3 h-3 ${config.color}`} />
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Status badge */}
        {proof.status === 'PRIMARY' && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/20 backdrop-blur rounded-lg">
            <span className="text-xs font-medium text-amber-400">PRIMARY</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCopySnippet?.(proof)
            }}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Copy snippet"
          >
            <Copy className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(proof.pdf_url, '_blank')
            }}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Download PDF"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-medium text-white text-sm line-clamp-2 mb-2">
          {proof.title}
        </h4>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          {proof.sqft && (
            <div className="flex items-center gap-1 text-zinc-400">
              <Ruler className="w-3 h-3" />
              {(proof.sqft / 1000).toFixed(0)}K sqft
            </div>
          )}
          {proof.lod_level && (
            <div className="flex items-center gap-1 text-zinc-400">
              <Building2 className="w-3 h-3" />
              LOD {proof.lod_level}
            </div>
          )}
        </div>

        {/* Usage metrics */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            {proof.uses} uses
          </div>
          <div className={`flex items-center gap-1 text-xs ${conversionColor}`}>
            <TrendingUp className="w-3 h-3" />
            {(conversionRate * 100).toFixed(0)}% → mtg
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function ProofVault({ proofs: propProofs, onSelectProof }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('uses') // uses, conversion, recent

  // Default demo proofs if not provided
  const proofs = propProofs || [
    {
      id: 'proof_001',
      title: 'The Castle - LOD 350 Historic Renovation',
      type: 'case_study',
      status: 'PRIMARY',
      sqft: 45000,
      lod_level: 350,
      snippet: '45,000 sqft historic castle renovation...',
      uses: 47,
      vault_to_meeting: 0.23
    },
    {
      id: 'proof_002',
      title: 'CUNY Baruch - LOD 200 Campus Documentation',
      type: 'lod_sample',
      sqft: 785000,
      lod_level: 200,
      snippet: '785,000 sqft campus-wide documentation...',
      uses: 32,
      vault_to_meeting: 0.19
    },
    {
      id: 'proof_003',
      title: 'Healthcare Facility - LOD 300 MEP Coordination',
      type: 'lod_sample',
      sqft: 125000,
      lod_level: 300,
      snippet: '125,000 sqft hospital wing MEP...',
      uses: 28,
      vault_to_meeting: 0.21
    },
    {
      id: 'proof_004',
      title: 'Mixed-Use Tower - LOD 350 Facade',
      type: 'lod_sample',
      sqft: 320000,
      lod_level: 350,
      snippet: '320,000 sqft mixed-use tower facade...',
      uses: 15,
      vault_to_meeting: 0.27
    },
    {
      id: 'proof_005',
      title: 'Variance Control Whitepaper',
      type: 'whitepaper',
      snippet: 'Technical whitepaper: Why ±3mm variance...',
      uses: 89,
      vault_to_meeting: 0.15
    },
    {
      id: 'proof_006',
      title: 'Industrial Facility - Site Topo + Building',
      type: 'lod_sample',
      sqft: 250000,
      lod_level: 200,
      snippet: '250,000 sqft industrial complex...',
      uses: 12,
      vault_to_meeting: 0.17
    }
  ]

  // Filter and sort proofs
  const filteredProofs = useMemo(() => {
    let result = [...proofs]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.snippet?.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(p => p.type === typeFilter)
    }

    // Sort
    switch (sortBy) {
      case 'uses':
        result.sort((a, b) => b.uses - a.uses)
        break
      case 'conversion':
        result.sort((a, b) => b.vault_to_meeting - a.vault_to_meeting)
        break
      case 'recent':
        result.sort((a, b) => new Date(b.last_used) - new Date(a.last_used))
        break
    }

    return result
  }, [proofs, searchQuery, typeFilter, sortBy])

  // Stats
  const stats = useMemo(() => ({
    total: proofs.length,
    totalUses: proofs.reduce((sum, p) => sum + p.uses, 0),
    avgConversion: proofs.reduce((sum, p) => sum + p.vault_to_meeting, 0) / proofs.length
  }), [proofs])

  const handleCopySnippet = async (proof) => {
    if (proof.snippet) {
      await navigator.clipboard.writeText(proof.snippet)
      // Could add toast notification here
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Proof Vault (P4)</h3>
            <p className="text-xs text-zinc-500">
              {stats.total} assets • {stats.totalUses} total uses • {(stats.avgConversion * 100).toFixed(0)}% avg conversion
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search proofs..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-zinc-500"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-zinc-500" />
          {['all', 'case_study', 'lod_sample', 'whitepaper'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                typeFilter === type
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {type === 'all' ? 'All' :
               type === 'case_study' ? 'Case Study' :
               type === 'lod_sample' ? 'LOD' :
               'Whitepaper'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300"
        >
          <option value="uses">Most Used</option>
          <option value="conversion">Best Conversion</option>
          <option value="recent">Recently Used</option>
        </select>
      </div>

      {/* Proof Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredProofs.map(proof => (
            <ProofTile
              key={proof.id}
              proof={proof}
              onSelect={onSelectProof}
              onCopySnippet={handleCopySnippet}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredProofs.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No proofs match your filters
        </div>
      )}

      {/* Selection Rule */}
      <div className="glass rounded-lg p-3 flex items-center gap-4 text-xs text-zinc-400">
        <span className="font-medium">P4 Selection Rule:</span>
        <span className="text-green-400">Exact Match</span>
        <span>&gt;</span>
        <span className="text-amber-400">Adjacent Match</span>
        <span>&gt;</span>
        <span className="text-zinc-500">Generic</span>
      </div>
    </div>
  )
}

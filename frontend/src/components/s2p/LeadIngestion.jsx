import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle, AlertTriangle,
  X, ChevronRight, Building2, Users, MapPin,
  Zap, Filter, Download
} from 'lucide-react'

/**
 * Lead Ingestion
 * CSV upload with tier classification
 */

const TIER_RULES = {
  A: { label: 'Tier A - Whale', employees: 250, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  B: { label: 'Tier B - Target', employees: 50, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  C: { label: 'Tier C - Standard', employees: 0, color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' }
}

function classifyTier(employeeCount) {
  if (!employeeCount) return 'C'
  const count = typeof employeeCount === 'string'
    ? parseInt(employeeCount.split('-')[0].replace(/\D/g, ''))
    : employeeCount

  if (count >= 250) return 'A'
  if (count >= 50) return 'B'
  return 'C'
}

function parseEmployeeRange(range) {
  if (!range) return null
  // Handle formats like "250-999", "1,000+", "50-249"
  const cleaned = range.replace(/[,+]/g, '')
  const parts = cleaned.split('-')
  return parseInt(parts[0]) || null
}

function PreviewRow({ lead, index }) {
  const tier = TIER_RULES[lead.tier] || TIER_RULES.C

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-zinc-800"
    >
      <td className="py-3 px-4">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${tier.bgColor} ${tier.color}`}>
          {lead.tier}
        </span>
      </td>
      <td className="py-3 px-4 text-white font-medium">{lead.company}</td>
      <td className="py-3 px-4 text-zinc-400">{lead.employees}</td>
      <td className="py-3 px-4 text-zinc-400">{lead.location}</td>
      <td className="py-3 px-4 text-zinc-400 truncate max-w-[200px]">{lead.service_focus}</td>
      <td className="py-3 px-4">
        {lead.isDuplicate ? (
          <span className="text-amber-400 text-xs">Duplicate</span>
        ) : (
          <span className="text-green-400 text-xs">New</span>
        )}
      </td>
    </motion.tr>
  )
}

export default function LeadIngestion({ existingLeads = [], onIngest }) {
  const [file, setFile] = useState(null)
  const [parsedLeads, setParsedLeads] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState('upload') // upload, preview, complete
  const [columnMapping, setColumnMapping] = useState({
    company: 'Profile_Title',
    employees: 'Employees',
    location: 'Location',
    service_focus: 'Service_Focus'
  })

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setIsProcessing(true)

    // Parse CSV
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result
      if (typeof text !== 'string') return

      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

      const leads = []
      const existingCompanies = new Set(existingLeads.map(l => l.company?.toLowerCase()))

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim()) continue

        // Simple CSV parsing (handles basic cases)
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))

        const company = values[headers.indexOf(columnMapping.company)] || ''
        const employees = values[headers.indexOf(columnMapping.employees)] || ''
        const location = values[headers.indexOf(columnMapping.location)] || ''
        const service_focus = values[headers.indexOf(columnMapping.service_focus)] || ''

        if (!company) continue

        const employeeCount = parseEmployeeRange(employees)
        const tier = classifyTier(employeeCount)
        const isDuplicate = existingCompanies.has(company.toLowerCase())

        leads.push({
          id: `import_${i}`,
          company,
          employees,
          location,
          service_focus,
          tier,
          employeeCount,
          isDuplicate,
          source: 'csv_import',
          heat: 'cold'
        })
      }

      setParsedLeads(leads)
      setIsProcessing(false)
      setStep('preview')
    }

    reader.readAsText(selectedFile)
  }, [existingLeads, columnMapping])

  const handleIngest = useCallback(() => {
    // Filter out duplicates and format for ingestion
    const newLeads = parsedLeads
      .filter(l => !l.isDuplicate)
      .map(l => ({
        company: l.company,
        employees: l.employees,
        location: l.location,
        service_focus: l.service_focus,
        tier: l.tier,
        heat: 'cold',
        source: 'clutch_csv',
        created_at: new Date().toISOString()
      }))

    onIngest?.(newLeads)
    setStep('complete')
  }, [parsedLeads, onIngest])

  const stats = {
    total: parsedLeads.length,
    tierA: parsedLeads.filter(l => l.tier === 'A').length,
    tierB: parsedLeads.filter(l => l.tier === 'B').length,
    tierC: parsedLeads.filter(l => l.tier === 'C').length,
    duplicates: parsedLeads.filter(l => l.isDuplicate).length,
    newLeads: parsedLeads.filter(l => !l.isDuplicate).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Lead Ingestion</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Import leads from CSV with automatic tier classification
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {['upload', 'preview', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === s ? 'bg-blue-500/20 text-blue-400' :
              ['upload', 'preview', 'complete'].indexOf(step) > i
                ? 'bg-green-500/20 text-green-400'
                : 'bg-zinc-800 text-zinc-500'
            }`}>
              {['upload', 'preview', 'complete'].indexOf(step) > i ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="w-4 h-4 text-center text-sm">{i + 1}</span>
              )}
              <span className="text-sm capitalize">{s}</span>
            </div>
            {i < 2 && (
              <ChevronRight className="w-4 h-4 text-zinc-600 mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="glass rounded-xl p-8">
          <label className="block cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="border-2 border-dashed border-zinc-700 hover:border-blue-500/50 rounded-xl p-12 text-center transition-colors">
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                </motion.div>
              ) : (
                <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              )}
              <div className="text-white font-medium mb-2">
                {isProcessing ? 'Processing...' : 'Drop CSV or click to upload'}
              </div>
              <div className="text-sm text-zinc-500">
                Supports Clutch.co export format
              </div>
            </div>
          </label>

          {/* Column Mapping Info */}
          <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
            <div className="text-sm font-medium text-zinc-300 mb-2">Expected Columns</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <div>Profile_Title → Company name</div>
              <div>Employees → Employee count (for tier classification)</div>
              <div>Location → City, State</div>
              <div>Service_Focus → Business focus area</div>
            </div>
          </div>

          {/* Tier Rules */}
          <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
            <div className="text-sm font-medium text-zinc-300 mb-2">Tier Classification Rules</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {Object.entries(TIER_RULES).map(([tier, rule]) => (
                <div key={tier} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${rule.bgColor} ${rule.color}`}>
                    {tier}
                  </span>
                  <span className="text-zinc-400">
                    {tier === 'A' ? '≥250' : tier === 'B' ? '50-249' : '<50'} employees
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="glass rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-zinc-500">Total Rows</div>
            </div>
            <div className="glass rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.tierA}</div>
              <div className="text-xs text-zinc-500">Tier A (Whales)</div>
            </div>
            <div className="glass rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.tierB}</div>
              <div className="text-xs text-zinc-500">Tier B</div>
            </div>
            <div className="glass rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-zinc-400">{stats.tierC}</div>
              <div className="text-xs text-zinc-500">Tier C</div>
            </div>
            <div className="glass rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.newLeads}</div>
              <div className="text-xs text-zinc-500">New Leads</div>
            </div>
            <div className="glass rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.duplicates}</div>
              <div className="text-xs text-zinc-500">Duplicates</div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full">
                <thead className="bg-zinc-800 sticky top-0">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Tier</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Company</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Employees</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Location</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Service Focus</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedLeads.slice(0, 50).map((lead, i) => (
                    <PreviewRow key={lead.id} lead={lead} index={i} />
                  ))}
                </tbody>
              </table>
            </div>

            {parsedLeads.length > 50 && (
              <div className="p-3 bg-zinc-800 text-center text-sm text-zinc-400">
                Showing 50 of {parsedLeads.length} leads
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setStep('upload')
                setFile(null)
                setParsedLeads([])
              }}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3">
              {stats.duplicates > 0 && (
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {stats.duplicates} duplicates will be skipped
                </div>
              )}

              <button
                onClick={handleIngest}
                disabled={stats.newLeads === 0}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                  stats.newLeads > 0
                    ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                Ingest {stats.newLeads} Leads
              </button>
            </div>
          </div>
        </>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="glass rounded-xl p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">Import Complete!</h3>
          <p className="text-zinc-400 mb-6">
            {stats.newLeads} new leads added to the system
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="p-4 bg-amber-500/10 rounded-lg">
              <div className="text-2xl font-bold text-amber-400">{stats.tierA}</div>
              <div className="text-xs text-zinc-500">Tier A</div>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{stats.tierB}</div>
              <div className="text-xs text-zinc-500">Tier B</div>
            </div>
            <div className="p-4 bg-zinc-500/10 rounded-lg">
              <div className="text-2xl font-bold text-zinc-400">{stats.tierC}</div>
              <div className="text-xs text-zinc-500">Tier C</div>
            </div>
          </div>

          <button
            onClick={() => {
              setStep('upload')
              setFile(null)
              setParsedLeads([])
            }}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 font-medium transition-colors"
          >
            Import More
          </button>
        </div>
      )}
    </div>
  )
}

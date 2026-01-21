import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, File, FileSpreadsheet, FileText, X, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

const fileTypeIcons = {
  pdf: FileText,
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  txt: FileText,
  md: FileText,
}

export function UploadPhase({ uploads, uploading, onUpload, onContinue, error }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(prev => [...prev, ...files])
  }, [])

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(prev => [...prev, ...files])
  }, [])

  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = async () => {
    if (selectedFiles.length > 0) {
      const result = await onUpload(selectedFiles)
      if (result.success) {
        setSelectedFiles([])
      }
    }
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const Icon = fileTypeIcons[ext] || File
    return Icon
  }

  const canContinue = uploads.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">Upload Business Documents</h2>
        <p className="text-zinc-400 mt-1">
          Upload PDFs, spreadsheets, or text files containing business information
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-600'}
        `}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-400' : 'text-zinc-500'}`} />
        <p className="text-zinc-300 mb-2">
          Drag and drop files here, or{' '}
          <label className="text-blue-400 hover:text-blue-300 cursor-pointer">
            browse
            <input
              type="file"
              multiple
              accept=".pdf,.csv,.xlsx,.xls,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-zinc-500 text-sm">
          Supported: PDF, CSV, Excel, Text files (max 50MB each)
        </p>
      </div>

      {/* Selected files to upload */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">Files to upload:</h3>
          {selectedFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.name)
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
              >
                <FileIcon className="w-5 h-5 text-zinc-400" />
                <span className="flex-1 text-zinc-300 text-sm truncate">{file.name}</span>
                <span className="text-zinc-500 text-xs">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-zinc-700 rounded"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            )
          })}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`
              w-full py-3 rounded-xl font-semibold transition-all min-h-[48px]
              flex items-center justify-center gap-2
              ${uploading
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'}
            `}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}

      {/* Already uploaded files */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">Uploaded files:</h3>
          {uploads.map((file, index) => {
            const FileIcon = getFileIcon(file.filename)
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <FileIcon className="w-5 h-5 text-green-400" />
                <span className="flex-1 text-zinc-300 text-sm truncate">{file.filename}</span>
                <span className="text-green-400 text-xs">Uploaded</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Continue button */}
      {canContinue && (
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all min-h-[48px] flex items-center justify-center gap-2"
        >
          Continue to Extraction
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </motion.div>
  )
}

export default UploadPhase

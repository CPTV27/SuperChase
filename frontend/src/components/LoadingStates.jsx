import { motion } from 'framer-motion'
import { Loader2, AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

/**
 * Loading Spinner
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <Loader2 className={`animate-spin ${sizes[size]} ${className}`} />
  )
}

/**
 * Skeleton loader for cards/content
 */
export function Skeleton({ className = '', animate = true }) {
  return (
    <div
      className={`bg-zinc-700/50 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  )
}

/**
 * Card skeleton loader
 */
export function CardSkeleton() {
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  )
}

/**
 * List skeleton loader
 */
export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-lg p-3 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Full page loading state
 */
export function PageLoading({ message = 'Loading...' }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <LoadingSpinner size="xl" className="text-blue-400 mx-auto mb-4" />
        <p className="text-zinc-400">{message}</p>
      </motion.div>
    </div>
  )
}

/**
 * Error state with retry button
 */
export function ErrorState({
  message = 'Failed to load data',
  error = null,
  onRetry = null,
  retrying = false
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[200px] flex items-center justify-center p-4"
    >
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>

        <p className="text-zinc-400 mb-1">{message}</p>

        {error && (
          <p className="text-red-400/70 text-sm mb-3">{error}</p>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 mx-auto bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 touch-target"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Try Again'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Offline state
 */
export function OfflineState({ onRetry = null }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[200px] flex items-center justify-center p-4"
    >
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-yellow-400" />
        </div>

        <p className="text-zinc-400 mb-1">You appear to be offline</p>
        <p className="text-zinc-500 text-sm mb-3">Check your connection and try again</p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 mx-auto bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors touch-target"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Empty state
 */
export function EmptyState({
  icon: Icon = AlertCircle,
  title = 'No data',
  message = 'Nothing to display yet',
  action = null
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[200px] flex items-center justify-center p-4"
    >
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-zinc-400" />
        </div>

        <p className="text-zinc-400 mb-1">{title}</p>
        <p className="text-zinc-500 text-sm mb-3">{message}</p>

        {action}
      </div>
    </motion.div>
  )
}

/**
 * Inline loading indicator
 */
export function InlineLoading({ text = 'Loading...' }) {
  return (
    <span className="inline-flex items-center gap-2 text-zinc-400">
      <LoadingSpinner size="sm" />
      {text}
    </span>
  )
}

/**
 * Retry wrapper component
 * Wraps children and shows error/loading states automatically
 */
export function DataLoader({
  loading = false,
  error = null,
  onRetry = null,
  retrying = false,
  loadingMessage = 'Loading...',
  errorMessage = 'Failed to load data',
  children
}) {
  if (loading && !retrying) {
    return <PageLoading message={loadingMessage} />
  }

  if (error) {
    return (
      <ErrorState
        message={errorMessage}
        error={error}
        onRetry={onRetry}
        retrying={retrying}
      />
    )
  }

  return children
}

export default {
  LoadingSpinner,
  Skeleton,
  CardSkeleton,
  ListSkeleton,
  PageLoading,
  ErrorState,
  OfflineState,
  EmptyState,
  InlineLoading,
  DataLoader
}

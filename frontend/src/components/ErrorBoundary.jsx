import { Component } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })

    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // In production, you could send this to an error reporting service
    if (import.meta.env.PROD) {
      // TODO: Send to error reporting service
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">
              {this.props.title || 'Something went wrong'}
            </h2>

            <p className="text-zinc-400 mb-6">
              {this.props.message || "We're having trouble displaying this content. Please try again."}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-3 bg-red-500/10 rounded-lg text-left">
                <p className="text-red-400 text-sm font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors touch-target"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              {this.props.showHomeButton && (
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-500/20 hover:bg-zinc-500/30 text-zinc-400 rounded-lg transition-colors touch-target"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

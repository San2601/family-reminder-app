import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // In production, you would send this to your error reporting service
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <div className="error-icon">⚠️</div>
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened. Please try again.</p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="error-details">
              <summary>Error Details (Development Only)</summary>
              <pre>{this.state.error.toString()}</pre>
              {this.state.errorInfo && (
                <pre>{this.state.errorInfo.componentStack}</pre>
              )}
            </details>
          )}
          
          <div className="error-actions">
            <button 
              onClick={this.handleRetry}
              className="error-retry-btn"
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="error-refresh-btn"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
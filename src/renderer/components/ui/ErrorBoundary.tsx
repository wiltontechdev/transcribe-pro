// ErrorBoundary.tsx - Catches React errors and prevents blank screen
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '2rem',
          color: '#ff4444',
          background: 'rgba(222, 41, 16, 0.1)',
          border: '1px solid rgba(222, 41, 16, 0.3)',
          borderRadius: 'var(--radius-md)',
          margin: '1rem'
        }}>
          <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
              Error Details
            </summary>
            <pre style={{
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              overflow: 'auto',
              fontSize: '0.8rem'
            }}>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'rgba(222, 41, 16, 0.3)',
              border: '1px solid rgba(222, 41, 16, 0.5)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-accent-red)',
              cursor: 'pointer'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;



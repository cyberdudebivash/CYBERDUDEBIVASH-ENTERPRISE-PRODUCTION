import { Component, StrictMode } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CDB ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{
          background: '#06080a', minHeight: '100vh', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
          color: '#94a3b8', padding: '2rem', textAlign: 'center'
        }}>
          <div>
            <div style={{ color: '#22d3ee', fontWeight: 900, fontSize: '1.5rem', marginBottom: '1rem' }}>
              CYBERDUDEBIVASH® — Platform Error
            </div>
            <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {err.message || 'An unexpected error occurred'}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Our ErrorBoundary intercepted a fatal crash. The platform will recover on reload.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#22d3ee', color: '#000', border: 'none',
                padding: '0.5rem 1.5rem', borderRadius: '4px',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem'
              }}
            >
              Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Register service worker for PWA offline support and asset caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

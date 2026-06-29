import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CDB ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ background: '#06080a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'monospace' }}>
          <div style={{ color: '#22d3ee', maxWidth: 640, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
            <h1 style={{ color: '#f87171', fontSize: 20, marginBottom: 12 }}>CYBERDUDEBIVASH® — Platform Error</h1>
            <p style={{ color: '#94a3b8', marginBottom: 16 }}>{err.message}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#0e7490', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
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

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('[CDB] #root element not found in DOM');
}

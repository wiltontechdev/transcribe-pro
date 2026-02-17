import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './renderer/App'
import './renderer/styles/globals.css'
import './index.css'

// Global error handlers to catch unhandled errors
window.addEventListener('error', (event) => {
  // Show error in UI
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 2rem; color: #ff4444; background: #1a1a1a; font-family: monospace;">
        <h2>🚨 Application Error</h2>
        <p><strong>Message:</strong> ${event.message}</p>
        <p><strong>File:</strong> ${event.filename}</p>
        <p><strong>Line:</strong> ${event.lineno}</p>
        <pre style="background: #0a0a0a; padding: 1rem; overflow: auto; max-height: 300px;">
${event.error?.stack || 'No stack trace'}
        </pre>
        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
          Reload App
        </button>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Show error in UI
  const root = document.getElementById('root');
  if (root && event.reason) {
    root.innerHTML = `
      <div style="padding: 2rem; color: #ff4444; background: #1a1a1a; font-family: monospace;">
        <h2>🚨 Unhandled Promise Rejection</h2>
        <p><strong>Reason:</strong> ${event.reason?.message || event.reason}</p>
        <pre style="background: #0a0a0a; padding: 1rem; overflow: auto; max-height: 300px;">
${event.reason?.stack || 'No stack trace'}
        </pre>
        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
          Reload App
        </button>
      </div>
    `;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


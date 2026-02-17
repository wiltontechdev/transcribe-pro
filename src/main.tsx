import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './renderer/App'
import './renderer/styles/globals.css'
import './index.css'

// Global error handlers - use overlay div to avoid destroying React's DOM (which causes removeChild errors)
function showErrorOverlay(title: string, message: string, stack?: string) {
  if (document.getElementById('error-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;padding:2rem;color:#ff4444;background:#1a1a1a;font-family:monospace;overflow:auto;';
  overlay.innerHTML = `
    <h2>🚨 ${title}</h2>
    <p><strong>Message:</strong> ${message}</p>
    ${stack ? `<pre style="background:#0a0a0a;padding:1rem;overflow:auto;max-height:300px;">${stack}</pre>` : ''}
    <button onclick="window.location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;cursor:pointer;">Reload App</button>
  `;
  document.body.appendChild(overlay);
}

window.addEventListener('error', (event) => {
  showErrorOverlay(
    'Application Error',
    event.message,
    event.error?.stack || event.filename ? `at ${event.filename}:${event.lineno}` : undefined
  );
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason) {
    const msg = event.reason?.message || String(event.reason);
    const stack = event.reason?.stack;
    showErrorOverlay('Unhandled Promise Rejection', msg, stack);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


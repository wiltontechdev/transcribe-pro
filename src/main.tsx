import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './renderer/App'
import './renderer/styles/globals.css'
import './index.css'

const SW_RECOVERY_SESSION_KEY = 'transcribe-pro-sw-recovery'

function isElectronRuntime(): boolean {
  return !!window.electronAPI?.isElectron
}

function isSafariDesktop(): boolean {
  const userAgent = navigator.userAgent
  return /Safari/.test(userAgent) &&
    !/Chrome|CriOS|FxiOS|Android/.test(userAgent) &&
    !/iPad|iPhone|iPod/.test(userAgent)
}

async function clearRecoverableCaches(): Promise<void> {
  if (!('caches' in window)) {
    return
  }

  const cacheKeys = await caches.keys()
  const recoverableCacheKeys = cacheKeys.filter((cacheKey) =>
    cacheKey.includes('workbox') ||
    cacheKey.includes('google-fonts') ||
    cacheKey.includes('gstatic-fonts')
  )

  await Promise.all(
    recoverableCacheKeys.map(async (cacheKey) => {
      try {
        await caches.delete(cacheKey)
      } catch {
        // Ignore cache cleanup failures during SW recovery.
      }
    })
  )
}

async function recoverFromServiceWorkerFailure(): Promise<void> {
  if (!isSafariDesktop()) {
    return
  }

  if (sessionStorage.getItem(SW_RECOVERY_SESSION_KEY) === '1') {
    return
  }

  sessionStorage.setItem(SW_RECOVERY_SESSION_KEY, '1')

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.unregister()
        } catch {
          // Ignore unregister failures and continue cleanup.
        }
      })
    )
    await clearRecoverableCaches()
    window.location.reload()
  } catch (error) {
    console.error('Safari service worker recovery failed', error)
  }
}

function initializeServiceWorker(): void {
  if (!('serviceWorker' in navigator) || isElectronRuntime()) {
    return
  }

  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.error('Service worker registration failed', error)
      void recoverFromServiceWorkerFailure()
    },
  })
}

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

initializeServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

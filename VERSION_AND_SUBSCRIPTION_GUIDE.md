# Version Management, Updates & Subscription Guide

## Table of Contents
1. [Version Management Strategy](#version-management-strategy)
2. [Auto-Updates for Desktop (Electron)](#auto-updates-for-desktop-electron)
3. [Update Notifications for Web/PWA](#update-notifications-for-webpwa)
4. [Subscription System Architecture](#subscription-system-architecture)
5. [Free Database Storage Options](#free-database-storage-options)
6. [Implementation Roadmap](#implementation-roadmap)

---

## Version Management Strategy

### Version Numbering (Semantic Versioning)

Use **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

- **MAJOR** (v1 → v2): Breaking changes, major features
- **MINOR** (v1.0 → v1.1): New features, backward compatible
- **PATCH** (v1.0.0 → v1.0.1): Bug fixes, backward compatible

### Version Storage

**Option 1: package.json (Recommended)**
```json
{
  "version": "1.0.0",
  "build": {
    "appId": "com.transcribepro.app",
    "productName": "TranscribePro"
  }
}
```

**Option 2: Version File**
Create `src/version.ts`:
```typescript
export const APP_VERSION = '1.0.0';
export const APP_BUILD = '2024.01.24';
```

### Release Channels

1. **Stable** (Production): `v1.0.0`, `v2.0.0`
2. **Beta**: `v1.1.0-beta.1`
3. **Alpha**: `v2.0.0-alpha.1`

---

## Auto-Updates for Desktop (Electron)

### 1. Using electron-updater (Recommended)

**Install:**
```bash
npm install electron-updater
```

**Update main.ts:**
```typescript
import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

// Configure auto-updater
autoUpdater.setAutoDownload(false); // Let user choose when to download
autoUpdater.setAutoInstallOnAppQuit(true);

// Check for updates on app start
app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});

// Check for updates every 4 hours
setInterval(() => {
  autoUpdater.checkForUpdatesAndNotify();
}, 4 * 60 * 60 * 1000);

// Update events
autoUpdater.on('update-available', (info) => {
  // Send to renderer process
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (error) => {
  console.error('Auto-updater error:', error);
});
```

**Update package.json:**
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "shmawilton",
      "repo": "Transcribe-pro"
    },
    "win": {
      "publisherName": "Your Name"
    }
  }
}
```

**Create update UI in renderer:**
```typescript
// src/renderer/components/ui/UpdateNotification.tsx
import React, { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';

const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    ipcRenderer.on('update-available', (_, info) => {
      setUpdateInfo(info);
    });

    ipcRenderer.on('update-downloaded', (_, info) => {
      setUpdateInfo({ ...info, downloaded: true });
    });

    return () => {
      ipcRenderer.removeAllListeners('update-available');
      ipcRenderer.removeAllListeners('update-downloaded');
    };
  }, []);

  const handleDownload = () => {
    setIsDownloading(true);
    ipcRenderer.send('download-update');
  };

  const handleInstall = () => {
    ipcRenderer.send('install-update');
  };

  if (!updateInfo) return null;

  return (
    <div className="update-notification">
      <h3>Update Available: v{updateInfo.version}</h3>
      <p>{updateInfo.releaseNotes}</p>
      {!updateInfo.downloaded ? (
        <button onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Downloading...' : 'Download Update'}
        </button>
      ) : (
        <button onClick={handleInstall}>Install & Restart</button>
      )}
    </div>
  );
};
```

### 2. Update Server Options

**Option A: GitHub Releases (Free)**
- Create releases on GitHub
- electron-updater automatically checks GitHub releases
- No server needed

**Option B: Custom Update Server**
- Host update files on your server
- More control over update process
- Can track update analytics

**Option C: Electron Forge Auto Update**
- Built-in update mechanism
- Requires hosting update server

---

## Update Notifications for Web/PWA

### 1. Service Worker Update Detection

**Update vite.config.ts:**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    // Check for updates every hour
    skipWaiting: false,
    clientsClaim: false,
  },
  devOptions: {
    enabled: true,
    type: 'module',
  },
})
```

**Create Update Checker Hook:**
```typescript
// src/renderer/hooks/usePWAUpdate.ts
import { useEffect, useState } from 'react';

export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates every hour
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);

        // Listen for new service worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const updateApp = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return { updateAvailable, updateApp };
};
```

**Update Notification Component:**
```typescript
// src/renderer/components/ui/PWAUpdateNotification.tsx
import React from 'react';
import { usePWAUpdate } from '../../hooks/usePWAUpdate';

const PWAUpdateNotification: React.FC = () => {
  const { updateAvailable, updateApp } = usePWAUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="pwa-update-banner">
      <p>New version available!</p>
      <button onClick={updateApp}>Update Now</button>
    </div>
  );
};
```

### 2. Version API Endpoint

Create a simple version check endpoint:

**Backend (Node.js/Express example):**
```javascript
app.get('/api/version', (req, res) => {
  res.json({
    version: '2.0.0',
    minVersion: '1.0.0',
    updateRequired: false,
    updateUrl: 'https://your-app.com',
    changelog: 'New features in v2.0.0...'
  });
});
```

**Frontend Version Check:**
```typescript
// src/renderer/utils/versionCheck.ts
export const checkVersion = async () => {
  try {
    const response = await fetch('/api/version');
    const data = await response.json();
    const currentVersion = APP_VERSION;
    
    if (compareVersions(data.version, currentVersion) > 0) {
      // New version available
      return {
        available: true,
        version: data.version,
        changelog: data.changelog,
        updateUrl: data.updateUrl
      };
    }
    return { available: false };
  } catch (error) {
    console.error('Version check failed:', error);
    return { available: false };
  }
};
```

---

## Subscription System Architecture

### 1. Subscription Tiers

**Free Tier:**
- Basic transcription features
- Limited storage (e.g., 5 projects)
- Local storage only

**Premium Tier ($X/month):**
- All features
- Cloud backup
- Unlimited projects
- Priority support

### 2. Backend Architecture

**Option A: Firebase (Recommended for Start)**
- Authentication
- Firestore database
- Cloud Functions
- Free tier: Generous limits

**Option B: Supabase (Open Source Firebase Alternative)**
- PostgreSQL database
- Authentication
- Real-time subscriptions
- Free tier: 500MB database, 2GB bandwidth

**Option C: Custom Backend (Node.js + PostgreSQL)**
- Full control
- More setup required
- Host on Railway, Render, or Fly.io (free tiers available)

### 3. Payment Processing

**Stripe (Recommended):**
- Easy integration
- Handles subscriptions automatically
- Webhook support
- Good documentation

**Alternative:**
- PayPal
- Paddle (for desktop apps)

### 4. Implementation Steps

#### Step 1: User Authentication

**Firebase Auth Example:**
```typescript
// src/renderer/utils/auth.ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const signIn = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signUp = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};
```

#### Step 2: Subscription Management

**Store Subscription Status:**
```typescript
// src/renderer/store/subscriptionStore.ts
import { create } from 'zustand';

interface SubscriptionState {
  isSubscribed: boolean;
  tier: 'free' | 'premium';
  subscriptionId: string | null;
  setSubscription: (tier: 'free' | 'premium', id: string | null) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isSubscribed: false,
  tier: 'free',
  subscriptionId: null,
  setSubscription: (tier, id) => set({ tier, subscriptionId: id, isSubscribed: tier === 'premium' }),
}));
```

#### Step 3: Feature Gating

```typescript
// src/renderer/utils/featureGate.ts
import { useSubscriptionStore } from '../store/subscriptionStore';

export const useFeatureGate = () => {
  const { tier } = useSubscriptionStore();
  
  const canUseFeature = (feature: string) => {
    const premiumFeatures = ['cloudBackup', 'unlimitedProjects', 'exportAdvanced'];
    return tier === 'premium' || !premiumFeatures.includes(feature);
  };
  
  return { canUseFeature, tier };
};
```

---

## Free Database Storage Options

### 1. Firebase Firestore (Google)

**Free Tier:**
- 1 GB storage
- 10 GB/month network egress
- 50K reads/day, 20K writes/day

**Setup:**
```bash
npm install firebase
```

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);

// Save project
export const saveProjectToCloud = async (userId: string, projectData: any) => {
  await setDoc(doc(db, 'users', userId, 'projects', projectData.id), projectData);
};

// Load projects
export const loadProjectsFromCloud = async (userId: string) => {
  const snapshot = await getDocs(collection(db, 'users', userId, 'projects'));
  return snapshot.docs.map(doc => doc.data());
};
```

### 2. Supabase (PostgreSQL)

**Free Tier:**
- 500 MB database
- 2 GB bandwidth/month
- 50K monthly active users

**Setup:**
```bash
npm install @supabase/supabase-js
```

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('your-url', 'your-key');

// Save project
export const saveProject = async (userId: string, project: any) => {
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, ...project });
  return { data, error };
};
```

### 3. MongoDB Atlas

**Free Tier:**
- 512 MB storage
- Shared cluster

### 4. Railway / Render / Fly.io

**Free Tier:**
- PostgreSQL database
- Limited resources
- Good for development

---

## Implementation Roadmap

### Phase 1: Version Management (Week 1-2)
- [ ] Set up semantic versioning
- [ ] Create version display in UI
- [ ] Set up GitHub releases

### Phase 2: Desktop Auto-Updates (Week 2-3)
- [ ] Install electron-updater
- [ ] Configure update server (GitHub)
- [ ] Create update notification UI
- [ ] Test update flow

### Phase 3: Web/PWA Updates (Week 3-4)
- [ ] Implement service worker update detection
- [ ] Create update notification component
- [ ] Add version API endpoint
- [ ] Test PWA update flow

### Phase 4: Authentication (Week 4-5)
- [ ] Choose auth provider (Firebase/Supabase)
- [ ] Implement sign up/sign in
- [ ] Add user profile management
- [ ] Store user preferences

### Phase 5: Subscription System (Week 5-6)
- [ ] Set up Stripe account
- [ ] Create subscription plans
- [ ] Implement payment flow
- [ ] Add subscription status tracking
- [ ] Create feature gates

### Phase 6: Cloud Backup (Week 6-7)
- [ ] Choose database (Firebase/Supabase)
- [ ] Implement project sync
- [ ] Add conflict resolution
- [ ] Create backup/restore UI
- [ ] Test sync across devices

### Phase 7: Testing & Launch (Week 7-8)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Launch v2.0.0

---

## Recommended Tech Stack

### For Quick Start (Recommended)
- **Auth & Database:** Firebase (easiest setup)
- **Payments:** Stripe
- **Desktop Updates:** electron-updater + GitHub Releases
- **Web Updates:** Service Worker + VitePWA

### For More Control
- **Auth & Database:** Supabase (PostgreSQL)
- **Payments:** Stripe
- **Desktop Updates:** electron-updater + Custom Server
- **Web Updates:** Service Worker + Custom API

---

## Cost Estimates

### Free Tier (Development)
- Firebase: Free (generous limits)
- Supabase: Free (500MB)
- Stripe: Free (only pay per transaction: 2.9% + $0.30)
- GitHub: Free (for releases)

### Scaling Costs (1000 users)
- Firebase: ~$25-50/month
- Supabase: ~$25/month (Pro plan)
- Stripe: Transaction fees only
- Hosting: ~$10-20/month

---

## Security Considerations

1. **API Keys:** Never commit API keys to git
2. **Environment Variables:** Use `.env` files
3. **User Data:** Encrypt sensitive project data
4. **Authentication:** Use secure tokens (JWT)
5. **Payment:** Never handle card data directly (use Stripe)

---

## Next Steps

1. **Choose your stack** (Firebase vs Supabase)
2. **Set up authentication** first
3. **Implement version checking** for both desktop and web
4. **Add subscription system** gradually
5. **Test thoroughly** before launch

Would you like me to implement any specific part of this system?

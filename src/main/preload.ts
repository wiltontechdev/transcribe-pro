import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,
  
  // Window controls
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  
  // Audio processing - FILE PATH based (fast, no large data transfer)
  // Save original audio to temp file (only once per file load)
  saveTempAudio: async (audioData: number[], fileName: string): Promise<string> => {
    return await ipcRenderer.invoke('save-temp-audio', audioData, fileName);
  },
  
  // Apply pitch shift using file paths (fast!)
  pitchShiftFile: async (inputPath: string, semitones: number): Promise<string> => {
    return await ipcRenderer.invoke('pitch-shift-file', inputPath, semitones);
  },
  
  // Apply time-stretch using file paths (fast!)
  timeStretchFile: async (inputPath: string, speed: number): Promise<string> => {
    return await ipcRenderer.invoke('time-stretch-file', inputPath, speed);
  },
  
  // Read processed audio file back
  readAudioFile: async (filePath: string): Promise<number[]> => {
    return await ipcRenderer.invoke('read-audio-file', filePath);
  },
  
  // Cleanup temp files
  cleanupTempFile: async (filePath: string): Promise<void> => {
    return await ipcRenderer.invoke('cleanup-temp-file', filePath);
  },
  
  // Check if FFmpeg is available
  checkFFmpeg: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('check-ffmpeg');
  },
  
  // Audio Normalization - balance volume levels
  normalizeAudio: async (inputPath: string, targetLoudness?: number): Promise<string> => {
    return await ipcRenderer.invoke('normalize-audio', inputPath, targetLoudness);
  },
  
  // Apply fade in/out effects
  applyFade: async (inputPath: string, fadeInDuration: number, fadeOutDuration: number): Promise<string> => {
    return await ipcRenderer.invoke('apply-fade', inputPath, fadeInDuration, fadeOutDuration);
  },
  
  // Detect musical key
  detectKey: async (inputPath: string): Promise<{ key: string; mode: string; confidence: number; camelot: string }> => {
    return await ipcRenderer.invoke('detect-key', inputPath);
  },
  
  // File dialogs for project save/load
  saveProjectDialog: async (projectData: string): Promise<{ canceled: boolean; filePath?: string }> => {
    return await ipcRenderer.invoke('save-project-dialog', projectData);
  },
  
  saveProjectDirect: async (projectData: string, filePath: string): Promise<{ success: boolean; filePath?: string }> => {
    return await ipcRenderer.invoke('save-project-direct', projectData, filePath);
  },
  
  loadProjectDialog: async (): Promise<{ canceled: boolean; filePath?: string; projectData?: string }> => {
    return await ipcRenderer.invoke('load-project-dialog');
  },
  
  loadProjectFromPath: async (filePath: string): Promise<{ success: boolean; filePath?: string; projectData?: string }> => {
    return await ipcRenderer.invoke('load-project-from-path', filePath);
  },
  
  // ============================================
  // AUTO-UPDATE APIs
  // ============================================
  
  // Check for updates
  checkForUpdates: async (): Promise<{ checking: boolean }> => {
    return await ipcRenderer.invoke('check-for-updates');
  },
  
  // Download available update
  downloadUpdate: async (): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('download-update');
  },
  
  // Install downloaded update and restart
  installUpdate: async (): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('install-update');
  },
  
  // Get current app version
  getAppVersion: async (): Promise<{ version: string; isPackaged: boolean; platform: string }> => {
    return await ipcRenderer.invoke('get-app-version');
  },
  
  // Get current update status
  getUpdateStatus: async (): Promise<{
    updateAvailable: boolean;
    downloadedUpdate: boolean;
    updateInfo: { version: string; releaseDate?: string; releaseNotes?: string } | null;
    downloadProgress: { percent: number; bytesPerSecond: number; transferred: number; total: number } | null;
  }> => {
    return await ipcRenderer.invoke('get-update-status');
  },
  
  // Open release notes in browser
  openReleaseNotes: async (url: string): Promise<void> => {
    return await ipcRenderer.invoke('open-release-notes', url);
  },
  
  // Arrow keys from main (before-input-event) - Electron often doesn't deliver keydown for arrows
  onArrowKey: (callback: (data: { key: string }) => void) => {
    const handler = (_e: any, payload: { key: string }) => callback(payload);
    ipcRenderer.on('arrow-key', handler);
    return () => ipcRenderer.removeListener('arrow-key', handler);
  },
  setCaptureArrows: (enabled: boolean) => {
    ipcRenderer.send('set-capture-arrows', enabled);
  },

  // Listen for update status events from main process
  onUpdateStatus: (callback: (event: { status: string; data?: any }) => void) => {
    const handler = (_event: any, payload: { status: string; data?: any }) => {
      callback(payload);
    };
    ipcRenderer.on('update-status', handler);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('update-status', handler);
    };
  },

});

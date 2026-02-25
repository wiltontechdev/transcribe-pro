import { app, BrowserWindow, ipcMain, protocol, net, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

// Get FFmpeg path - works with ffmpeg-static
let ffmpegPath: string;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  ffmpegPath = 'ffmpeg';
}

let mainWindow: BrowserWindow | null = null;

// ============================================
// AUTO-UPDATER CONFIGURATION
// ============================================

// Configure auto-updater logging (no-op in production to avoid leaking info)
autoUpdater.logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Don't auto-download - let user choose
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Track update state
let updateAvailable = false;
let downloadedUpdate = false;
let updateInfo: UpdateInfo | null = null;
let downloadProgress: ProgressInfo | null = null;

// Send update events to renderer
function sendUpdateStatus(status: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, data });
  }
}

// Initialize auto-updater event handlers
function initAutoUpdater() {
  // Check for updates error
  autoUpdater.on('error', (error) => {
    sendUpdateStatus('error', { message: error.message });
  });

  // Update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateAvailable = true;
    updateInfo = info;
    sendUpdateStatus('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  // No update available
  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    sendUpdateStatus('update-not-available', { version: info.version });
  });

  // Download progress
  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    downloadProgress = progress;
    sendUpdateStatus('download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    downloadedUpdate = true;
    sendUpdateStatus('update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });
}

// Check for updates (called on app start and manually)
async function checkForUpdates(silent: boolean = false) {
  try {
    // Don't check in development mode
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      if (!silent) {
        sendUpdateStatus('dev-mode', { message: 'Updates disabled in development mode' });
      }
      return;
    }

    if (!silent) {
      sendUpdateStatus('checking');
    }
    
    await autoUpdater.checkForUpdates();
  } catch (error) {
    if (!silent) {
      sendUpdateStatus('error', { message: (error as Error).message });
    }
  }
}

// Enable audio features for Electron
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');

// Additional flags to help with audio decoding stability
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

// Increase memory limits for audio processing
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Helper function to convert key to Camelot notation
function getCamelotKey(key: string, mode: string): string {
  const camelotMap: { [key: string]: { major: string; minor: string } } = {
    'C': { major: '8B', minor: '5A' },
    'C#': { major: '3B', minor: '12A' },
    'D': { major: '10B', minor: '7A' },
    'D#': { major: '5B', minor: '2A' },
    'E': { major: '12B', minor: '9A' },
    'F': { major: '7B', minor: '4A' },
    'F#': { major: '2B', minor: '11A' },
    'G': { major: '9B', minor: '6A' },
    'G#': { major: '4B', minor: '1A' },
    'A': { major: '11B', minor: '8A' },
    'A#': { major: '6B', minor: '3A' },
    'B': { major: '1B', minor: '10A' }
  };
  return camelotMap[key]?.[mode.toLowerCase() as 'major' | 'minor'] || '?';
}

const createWindow = (): void => {
  // Get icon path - use logo.ico for Windows, logo.png for other platforms
  // Try multiple paths to find the icon
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const isWindows = process.platform === 'win32';
  const iconFile = isWindows ? 'logo.ico' : 'logo.png';
  let iconPath: string | undefined;
  
  // Try different possible paths
  const possiblePaths = isDev
    ? [
        path.join(process.cwd(), 'public', iconFile),
        path.join(__dirname, '..', '..', '..', 'public', iconFile),
      ]
    : [
        path.join(process.resourcesPath, 'public', iconFile),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'public', iconFile),
        path.join(__dirname, '..', '..', 'public', iconFile),
        path.join(app.getAppPath(), 'public', iconFile),
      ];
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      iconPath = testPath;
      break;
    }
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // Hide the native menu bar
    icon: iconPath, // Set window icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable Web Audio API and other media features
      webSecurity: true,
      allowRunningInsecureContent: false,
      // These help with audio in Electron
      backgroundThrottling: false, // Prevent audio issues when window is in background
    },
  });

  // Load the app
  if (isDev) {
    const devUrl = 'http://localhost:3000';
    setTimeout(() => {
      mainWindow?.loadURL(devUrl).catch(() => {
        setTimeout(() => {
          mainWindow?.loadURL(devUrl).catch(() => {});
        }, 1000);
      });
    }, 500);
    // Only open DevTools when requested (avoids Emulation.setEmitTouchEventsForMouse console spam)
    if (process.env.OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    const filePath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(filePath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Marker navigation keys: Electron often doesn't deliver arrow keydown to DOM.
  // When captureArrows=true, prevent default and send IPC. When false (user typing), let key through.
  let captureArrows = true;
  ipcMain.on('set-capture-arrows', (_e, enabled: boolean) => {
    captureArrows = enabled;
  });
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const rawKey = (((input as any).key || '') as string);
    const rawCode = (((input as any).code || '') as string);
    const rawKeyCode = (((input as any).keyCode || '') as string);
    const key = rawKey.toLowerCase();
    const code = rawCode.toLowerCase();
    const keyCode = rawKeyCode.toLowerCase();
    const isPrevMarkerKey =
      key === 'arrowleft' ||
      key === 'left' ||
      key === 'a' ||
      key === 'keya' ||
      code === 'keya' ||
      keyCode === 'keya';
    const isNextMarkerKey =
      key === 'arrowright' ||
      key === 'right' ||
      key === 'd' ||
      key === 'keyd' ||
      code === 'keyd' ||
      keyCode === 'keyd';
    if (isPrevMarkerKey || isNextMarkerKey) {
      if (captureArrows) {
        event.preventDefault();
        const payload = { key: isPrevMarkerKey ? 'PrevMarker' : 'NextMarker' };
        mainWindow?.webContents.send('arrow-key', payload);
      }
    }
  });

  // Application menu: View > Zoom and DevTools (so user can zoom in/out/reset and open DevTools)
  const isMac = process.platform === 'darwin';
  const zoomIn = (): void => {
    const w = BrowserWindow.getFocusedWindow();
    if (w?.webContents) {
      const level = w.webContents.getZoomLevel();
      w.webContents.setZoomLevel(Math.min(level + 1, 3));
    }
  };
  const zoomOut = (): void => {
    const w = BrowserWindow.getFocusedWindow();
    if (w?.webContents) {
      const level = w.webContents.getZoomLevel();
      w.webContents.setZoomLevel(Math.max(level - 1, -3));
    }
  };
  const zoomReset = (): void => {
    const w = BrowserWindow.getFocusedWindow();
    if (w?.webContents) w.webContents.setZoomLevel(0);
  };
  const toggleDevTools = (): void => {
    const w = BrowserWindow.getFocusedWindow();
    if (w?.webContents) {
      if (w.webContents.isDevToolsOpened()) {
        w.webContents.closeDevTools();
      } else {
        w.webContents.openDevTools();
      }
    }
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CommandOrControl+Plus', click: zoomIn },
        { label: 'Zoom Out', accelerator: 'CommandOrControl+-', click: zoomOut },
        { label: 'Reset Zoom', accelerator: 'CommandOrControl+0', click: zoomReset },
        { type: 'separator' as const },
        { label: 'Toggle Developer Tools', accelerator: 'F12', click: toggleDevTools },
        { label: 'Toggle Developer Tools', accelerator: 'CommandOrControl+Shift+I', click: toggleDevTools, visible: false },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [{ role: 'front' as const }] : [{ role: 'close' as const }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

/**
 * Apply time-stretching to audio file using native FFmpeg
 * Changes speed without changing pitch using atempo filter
 * @param inputPath - Path to the input audio file
 * @param speed - Speed multiplier (0.25 to 4.0)
 * @returns Promise<string> - Path to the time-stretched output file
 */
async function applyTimeStretchFile(inputPath: string, speed: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `speed_output_${Date.now()}_${speed.toFixed(2)}.mp3`);

    // Clamp speed to valid range
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

    // Build atempo filter chain (atempo only accepts 0.5-2.0)
    let atempoFilters: string[] = [];
    let remainingSpeed = clampedSpeed;
    
    while (remainingSpeed < 0.5 || remainingSpeed > 2.0) {
      if (remainingSpeed < 0.5) {
        atempoFilters.push('atempo=0.5');
        remainingSpeed = remainingSpeed / 0.5;
      } else if (remainingSpeed > 2.0) {
        atempoFilters.push('atempo=2.0');
        remainingSpeed = remainingSpeed / 2.0;
      }
    }
    
    // Add final atempo filter with remaining speed
    atempoFilters.push(`atempo=${remainingSpeed.toFixed(6)}`);
    
    const filterComplex = atempoFilters.join(',');


    // Run FFmpeg directly on file paths - FAST!
    const ffmpeg = spawn(ffmpegPath, [
      '-i', inputPath,
      '-af', filterComplex,
      '-ar', '44100',
      '-y',
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      try { fs.unlinkSync(outputPath); } catch (e) {}
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Apply pitch shift to audio file using native FFmpeg
 * Works directly with file paths - no buffer transfer needed!
 * @param inputPath - Path to the input audio file
 * @param semitones - Pitch shift in semitones (-2 to +2)
 * @returns Promise<string> - Path to the pitch-shifted output file
 */
async function applyPitchShiftFile(inputPath: string, semitones: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `pitch_output_${Date.now()}_${semitones}.mp3`);

    // Calculate pitch shift parameters
    const pitchFactor = Math.pow(2, semitones / 12);
    const sampleRate = 44100;
    const newRate = Math.round(sampleRate * pitchFactor);
    const tempoFactor = 1 / pitchFactor;

    // Build atempo filter chain (atempo only accepts 0.5-2.0)
    let atempoFilters: string[] = [];
    let tempo = tempoFactor;
    while (tempo < 0.5 || tempo > 2.0) {
      if (tempo < 0.5) {
        atempoFilters.push('atempo=0.5');
        tempo = tempo / 0.5;
      } else if (tempo > 2.0) {
        atempoFilters.push('atempo=2.0');
        tempo = tempo / 2.0;
      }
    }
    atempoFilters.push(`atempo=${tempo.toFixed(6)}`);

    const filterComplex = `asetrate=${newRate},${atempoFilters.join(',')},aresample=${sampleRate}`;


    // Run FFmpeg directly on file paths - FAST!
    const ffmpeg = spawn(ffmpegPath, [
      '-i', inputPath,
      '-af', filterComplex,
      '-ar', '44100',
      '-y',
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      try { fs.unlinkSync(outputPath); } catch (e) {}
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

// Register custom protocol for serving local audio files
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'audio-file', 
    privileges: { 
      standard: true, 
      secure: true, 
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    } 
  }
]);

app.whenReady().then(() => {
  // Initialize auto-updater
  initAutoUpdater();
  
  // Check for updates after a short delay (don't block startup)
  setTimeout(() => {
    checkForUpdates(true); // Silent check on startup
  }, 5000);

  // Register protocol handler for audio files
  protocol.handle('audio-file', (request) => {
    // URL format: audio-file:///C:/path/to/file.mp3 (note triple slash)
    let filePath = decodeURIComponent(request.url.replace('audio-file:///', ''));
    // Handle Windows paths
    if (process.platform === 'win32' && !filePath.includes(':')) {
      // If colon is missing, it might be parsed incorrectly
      filePath = filePath.replace(/^([a-zA-Z])\//, '$1:/');
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  // IPC handlers for window controls
  ipcMain.on('close-window', () => {
    mainWindow?.close();
  });
  
  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
  });
  
  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  // IPC handler for pitch shifting - FILE PATH based (fast, no data transfer)
  ipcMain.handle('pitch-shift-file', async (_event, inputFilePath: string, semitones: number) => {
    try {
      if (semitones === 0) {
        return inputFilePath; // No change needed
      }

      const outputPath = await applyPitchShiftFile(inputFilePath, semitones);
      return outputPath;
    } catch (error) {
      throw error;
    }
  });

  // IPC handler for time-stretching - FILE PATH based (fast, no data transfer)
  ipcMain.handle('time-stretch-file', async (_event, inputFilePath: string, speed: number) => {
    try {
      if (speed === 1.0) {
        return inputFilePath; // No change needed
      }

      const outputPath = await applyTimeStretchFile(inputFilePath, speed);
      return outputPath;
    } catch (error) {
      throw error;
    }
  });

  // IPC handler to save audio data to temp file (only called once per file load)
  ipcMain.handle('save-temp-audio', async (_event, audioData: number[], fileName: string) => {
    try {
      const tempDir = os.tmpdir();
      const ext = path.extname(fileName) || '.mp3';
      const tempPath = path.join(tempDir, `transcribe_original_${Date.now()}${ext}`);
      
      fs.writeFileSync(tempPath, Buffer.from(audioData));
      return tempPath;
    } catch (error) {
      throw error;
    }
  });

  // IPC handler to read processed file back
  ipcMain.handle('read-audio-file', async (_event, filePath: string) => {
    try {
      const data = fs.readFileSync(filePath);
      return Array.from(data);
    } catch (error) {
      throw error;
    }
  });

  // Cleanup temp files
  ipcMain.handle('cleanup-temp-file', async (_event, filePath: string) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // Check if FFmpeg is available
  ipcMain.handle('check-ffmpeg', async () => {
    return new Promise((resolve) => {
      const ffmpeg = spawn(ffmpegPath, ['-version']);
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });
      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  });

  // Audio Normalization - Balance volume levels
  ipcMain.handle('normalize-audio', async (_event, inputFilePath: string, targetLoudness: number = -14) => {
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `normalized_${Date.now()}.mp3`);


      // Use loudnorm filter for EBU R128 normalization
      const ffmpeg = spawn(ffmpegPath, [
        '-i', inputFilePath,
        '-af', `loudnorm=I=${targetLoudness}:TP=-1.5:LRA=11`,
        '-ar', '44100',
        '-y',
        outputPath
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          try { fs.unlinkSync(outputPath); } catch (e) {}
          reject(new Error(`Normalization failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        reject(err);
      });
    });
  });

  // Apply Fade In/Out to audio
  ipcMain.handle('apply-fade', async (_event, inputFilePath: string, fadeInDuration: number, fadeOutDuration: number) => {
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `faded_${Date.now()}.mp3`);


      // Build fade filter
      let filterParts: string[] = [];
      if (fadeInDuration > 0) {
        filterParts.push(`afade=t=in:st=0:d=${fadeInDuration}`);
      }
      if (fadeOutDuration > 0) {
        // We need to know the duration - get it first
        const probePath = spawn(ffmpegPath, [
          '-i', inputFilePath,
          '-hide_banner'
        ]);
        
        let probeOutput = '';
        probePath.stderr.on('data', (data) => {
          probeOutput += data.toString();
        });
        
        probePath.on('close', () => {
          // Parse duration from FFmpeg output
          const durationMatch = probeOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          let totalDuration = 0;
          if (durationMatch) {
            totalDuration = parseInt(durationMatch[1]) * 3600 + 
                           parseInt(durationMatch[2]) * 60 + 
                           parseInt(durationMatch[3]) + 
                           parseInt(durationMatch[4]) / 100;
          }

          if (fadeOutDuration > 0 && totalDuration > 0) {
            const fadeOutStart = Math.max(0, totalDuration - fadeOutDuration);
            filterParts.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}`);
          }

          const filterComplex = filterParts.length > 0 ? filterParts.join(',') : 'anull';

          const ffmpeg = spawn(ffmpegPath, [
            '-i', inputFilePath,
            '-af', filterComplex,
            '-ar', '44100',
            '-y',
            outputPath
          ]);

          ffmpeg.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
              resolve(outputPath);
            } else {
              try { fs.unlinkSync(outputPath); } catch (e) {}
              reject(new Error(`Fade failed with code ${code}`));
            }
          });

          ffmpeg.on('error', (err) => {
            try { fs.unlinkSync(outputPath); } catch (e) {}
            reject(err);
          });
        });
        return;
      }

      // If only fade in, apply directly
      const ffmpeg = spawn(ffmpegPath, [
        '-i', inputFilePath,
        '-af', filterParts.join(',') || 'anull',
        '-ar', '44100',
        '-y',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          try { fs.unlinkSync(outputPath); } catch (e) {}
          reject(new Error(`Fade failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        reject(err);
      });
    });
  });

  // Key Detection using FFmpeg's spectral analysis
  ipcMain.handle('detect-key', async (_event, inputFilePath: string) => {
    return new Promise((resolve, reject) => {

      // Use FFmpeg's ebur128 filter to get loudness and frequency info
      // This is a simplified approach - for accurate key detection, 
      // we'd need a dedicated library like Essentia
      const ffmpeg = spawn(ffmpegPath, [
        '-i', inputFilePath,
        '-af', 'aformat=channel_layouts=mono,showcqt=s=960x540:bar_g=2:sono_g=4:bar_v=9:sono_v=17:timeclamp=0.5',
        '-f', 'null',
        '-t', '30', // Analyze first 30 seconds
        '-'
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', () => {
        // For now, return a placeholder - real key detection needs ML models
        // You could integrate with Essentia.js or use a web API
        const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const modes = ['Major', 'Minor'];
        
        // Analyze the audio characteristics (simplified)
        // In production, use a proper key detection algorithm
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        
        resolve({
          key: randomKey,
          mode: randomMode,
          confidence: 0.75, // Placeholder confidence
          camelot: getCamelotKey(randomKey, randomMode)
        });
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });
  });

  // IPC handler for saving project file (with dialog)
  ipcMain.handle('save-project-dialog', async (_event, projectData: string) => {
    try {
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Project',
        defaultPath: 'project.tsproj',
        filters: [
          { name: 'Transcribe Pro Project', extensions: ['tsproj'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['createDirectory'],
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      // Ensure .tsproj extension
      let filePath = result.filePath;
      if (!filePath.endsWith('.tsproj')) {
        filePath += '.tsproj';
      }

      fs.writeFileSync(filePath, projectData, 'utf-8');
      return { canceled: false, filePath };
    } catch (error) {
      throw error;
    }
  });

  // IPC handler for saving project file directly (no dialog, for auto-save)
  ipcMain.handle('save-project-direct', async (_event, projectData: string, filePath: string) => {
    try {
      // Ensure .tsproj extension
      let finalPath = filePath;
      if (!finalPath.endsWith('.tsproj')) {
        finalPath += '.tsproj';
      }

      fs.writeFileSync(finalPath, projectData, 'utf-8');
      return { success: true, filePath: finalPath };
    } catch (error) {
      throw error;
    }
  });

  // IPC handler for loading project file
  ipcMain.handle('load-project-dialog', async () => {
    try {
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Load Project',
        filters: [
          { name: 'Transcribe Pro Project', extensions: ['tsproj'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const projectData = fs.readFileSync(filePath, 'utf-8');
      return { canceled: false, filePath, projectData };
    } catch (error) {
      throw error;
    }
  });

  // IPC handler for loading project file from path (for recent projects)
  ipcMain.handle('load-project-from-path', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Project file not found');
      }

      const projectData = fs.readFileSync(filePath, 'utf-8');
      return { success: true, filePath, projectData };
    } catch (error) {
      throw error;
    }
  });

  // ============================================
  // AUTO-UPDATE IPC HANDLERS
  // ============================================

  // Check for updates manually
  ipcMain.handle('check-for-updates', async () => {
    await checkForUpdates(false);
    return { checking: true };
  });

  // Download update
  ipcMain.handle('download-update', async () => {
    if (!updateAvailable) {
      return { success: false, error: 'No update available' };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Install update and restart
  ipcMain.handle('install-update', async () => {
    if (!downloadedUpdate) {
      return { success: false, error: 'Update not downloaded' };
    }
    // Quit and install
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });

  // Get current app version
  ipcMain.handle('get-app-version', () => {
    return {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      platform: process.platform,
    };
  });

  // Get update status
  ipcMain.handle('get-update-status', () => {
    return {
      updateAvailable,
      downloadedUpdate,
      updateInfo: updateInfo ? {
        version: updateInfo.version,
        releaseDate: updateInfo.releaseDate,
        releaseNotes: updateInfo.releaseNotes,
      } : null,
      downloadProgress,
    };
  });

  // Open release notes URL in browser
  ipcMain.handle('open-release-notes', async (_event, url: string) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

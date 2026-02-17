import { create } from 'zustand';
import { Marker, AudioState, UIState, GlobalControls, ProjectData } from '../types/types';

interface AppStore {
  // Audio State
  audio: AudioState;
  setAudioFile: (file: File | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setDuration: (duration: number) => void;
  setAudioBuffer: (buffer: AudioBuffer) => void;
  clearAudioBuffer: () => void;
  setIsLoading: (isLoading: boolean) => void;
  setAudioReadyForPlayback: () => void; // Show main UI + enable play as soon as Howler loads (waveform decodes in background)

  // Markers State
  markers: Marker[];
  addMarker: (marker: Marker) => void;
  updateMarker: (id: string, updates: Partial<Marker>) => void;
  deleteMarker: (id: string) => void;
  setMarkers: (markers: Marker[], skipHistory?: boolean) => void;

  // UI State
  ui: UIState;
  setSelectedMarkerId: (id: string | null) => void;
  setIsMarkerEditorOpen: (isOpen: boolean) => void;
  setIsSettingsModalOpen: (isOpen: boolean) => void;
  setIsHelpModalOpen: (isOpen: boolean) => void;
  setIsExportModalOpen: (isOpen: boolean, startTime?: number, endTime?: number) => void;
  setZoomLevel: (zoom: number) => void;
  setViewport: (start: number, end: number) => void;
  setRequestMarkerCreation: (request: boolean) => void;

  // Global Controls
  globalControls: GlobalControls;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleMute: () => void;

  // Project Management
  loadProject: (project: ProjectData) => void;
  resetProject: () => void;

  // Web persistence / dirty tracking
  projectLastChangeAt: number;
  lastAutoSaveAt: number;
  lastManualSaveAt: number;
  markProjectChanged: () => void;
  setLastAutoSaveAt: (ts: number) => void;
  setLastManualSaveAt: (ts: number) => void;

  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Undo/Redo
  undoHistory: Marker[][];
  redoHistory: Marker[][];
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
}

const initialAudioState: AudioState = {
  file: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  isLoaded: false,
  isLoading: false,
};

const initialUIState: UIState = {
  selectedMarkerId: null,
  isMarkerEditorOpen: false,
  isSettingsModalOpen: false,
  isHelpModalOpen: false,
  isExportModalOpen: false,
  exportStartTime: undefined,
  exportEndTime: undefined,
  zoomLevel: 1,
  viewportStart: 0,
  viewportEnd: 0,
  requestMarkerCreation: false,
};

const initialGlobalControls: GlobalControls = {
  pitch: 0,
  volume: 6, // dB: +6 is maximum, -60 to 6 range
  playbackRate: 1,
  isMuted: false,
  previousVolume: 6, // Store volume before mute
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Web persistence / dirty tracking
  projectLastChangeAt: 0,
  lastAutoSaveAt: 0,
  lastManualSaveAt: 0,
  markProjectChanged: () =>
    set(() => ({ projectLastChangeAt: Date.now() })),
  setLastAutoSaveAt: (ts) => set(() => ({ lastAutoSaveAt: ts })),
  setLastManualSaveAt: (ts) => set(() => ({ lastManualSaveAt: ts })),

  // Audio State
  audio: initialAudioState,
  setAudioFile: (file) => {
    set((state) => ({
      audio: {
        ...state.audio,
        file,
        isLoaded: false,
        isLoading: true,
        buffer: undefined,
        currentTime: 0,
      },
    }));
  },
  setCurrentTime: (time) => {
    set((state) => ({ audio: { ...state.audio, currentTime: time } }));
  },
  setIsPlaying: (isPlaying) => {
    set((state) => ({ audio: { ...state.audio, isPlaying } }));
  },
  setDuration: (duration) => {
    set((state) => ({ audio: { ...state.audio, duration } }));
  },
  setAudioBuffer: (buffer) => {
    set((state) => ({
      audio: {
        ...state.audio,
        buffer,
        sampleRate: buffer?.sampleRate,
        isLoaded: buffer != null,
        isLoading: false,
      },
    }));
  },
  setIsLoading: (isLoading) => {
    set((state) => ({ audio: { ...state.audio, isLoading } }));
  },
  setAudioReadyForPlayback: () => {
    set((state) => ({ audio: { ...state.audio, isLoaded: true, isLoading: false } }));
  },
  clearAudioBuffer: () =>
    set((state) => ({
      audio: { 
        ...state.audio, 
        buffer: undefined,
        sampleRate: undefined,
        isLoaded: false,
        isLoading: false,
      },
    })),

  // Markers State
  markers: [],
  addMarker: (marker) => {
    const state = get();
    // Save current state to history before adding
    const currentMarkers = [...state.markers];
    set({
      markers: [...state.markers, marker],
      undoHistory: [...state.undoHistory, currentMarkers],
      redoHistory: [], // Clear redo history when new action is performed
      projectLastChangeAt: Date.now(),
    });
  },
  updateMarker: (id, updates) => {
    const state = get();
    // Save current state to history before updating
    const currentMarkers = [...state.markers];
    set({
      markers: state.markers.map((m: Marker) => (m.id === id ? { ...m, ...updates } : m)),
      undoHistory: [...state.undoHistory, currentMarkers],
      redoHistory: [], // Clear redo history when new action is performed
      projectLastChangeAt: Date.now(),
    });
  },
  deleteMarker: (id) => {
    const state = get();
    // Save current state to history before deleting
    const currentMarkers = [...state.markers];
    set({
      markers: state.markers.filter((m: Marker) => m.id !== id),
      undoHistory: [...state.undoHistory, currentMarkers],
      redoHistory: [], // Clear redo history when new action is performed
      projectLastChangeAt: Date.now(),
    });
  },
  setMarkers: (markers, skipHistory = false) => {
    const state = get();
    if (skipHistory) {
      set({ markers, projectLastChangeAt: Date.now() });
    } else {
      // Save current state to history before setting
      const currentMarkers = [...state.markers];
      set({
        markers,
        undoHistory: [...state.undoHistory, currentMarkers],
        redoHistory: [], // Clear redo history when new action is performed
        projectLastChangeAt: Date.now(),
      });
    }
  },

  // UI State
  ui: initialUIState,
  setSelectedMarkerId: (id) =>
    set((state) => ({ ui: { ...state.ui, selectedMarkerId: id } })),
  setIsMarkerEditorOpen: (isOpen) =>
    set((state) => ({ ui: { ...state.ui, isMarkerEditorOpen: isOpen } })),
  setIsSettingsModalOpen: (isOpen) =>
    set((state) => ({ ui: { ...state.ui, isSettingsModalOpen: isOpen } })),
  setIsHelpModalOpen: (isOpen) =>
    set((state) => ({ ui: { ...state.ui, isHelpModalOpen: isOpen } })),
  setIsExportModalOpen: (isOpen, startTime, endTime) =>
    set((state) => ({ 
      ui: { 
        ...state.ui, 
        isExportModalOpen: isOpen,
        exportStartTime: startTime,
        exportEndTime: endTime,
      } 
    })),
  setZoomLevel: (zoom) =>
    set((state) => ({ ui: { ...state.ui, zoomLevel: zoom } })),
  setViewport: (start, end) =>
    set((state) => ({ ui: { ...state.ui, viewportStart: start, viewportEnd: end } })),
  setRequestMarkerCreation: (request: boolean) =>
    set((state) => ({ ui: { ...state.ui, requestMarkerCreation: request } })),

  // Global Controls
  globalControls: initialGlobalControls,
  setPitch: (pitch) =>
    set((state) => ({
      globalControls: { ...state.globalControls, pitch },
      projectLastChangeAt: Date.now(),
    })),
  setVolume: (volume) =>
    set((state) => ({
      globalControls: { ...state.globalControls, volume },
      projectLastChangeAt: Date.now(),
    })),
  setPlaybackRate: (rate) =>
    set((state) => ({
      globalControls: { ...state.globalControls, playbackRate: rate },
      projectLastChangeAt: Date.now(),
    })),
  toggleMute: () =>
    set((state) => {
      const { isMuted, volume, previousVolume } = state.globalControls;
      if (isMuted) {
        // Unmute: restore previous volume (or 0 if previous was -60)
        const restoreVolume = previousVolume <= -60 ? 0 : previousVolume;
        return {
          globalControls: {
            ...state.globalControls,
            isMuted: false,
            volume: restoreVolume,
          },
          projectLastChangeAt: Date.now(),
        };
      } else {
        // Mute: store current volume and set to -60 dB (effectively silent)
        // Only store if current volume is not already -60
        const volumeToStore = volume <= -60 ? 0 : volume;
        return {
          globalControls: {
            ...state.globalControls,
            isMuted: true,
            previousVolume: volumeToStore,
            volume: -60, // Mute by setting to minimum
          },
          projectLastChangeAt: Date.now(),
        };
      }
    }),

  // Project Management
  loadProject: (project) =>
    set({
      markers: project.markers,
      globalControls: project.globalControls,
      audio: { ...initialAudioState },
      undoHistory: [],
      redoHistory: [],
      projectLastChangeAt: Date.now(),
    }),
  resetProject: () =>
    set({
      audio: initialAudioState,
      markers: [],
      ui: initialUIState,
      globalControls: initialGlobalControls,
      undoHistory: [],
      redoHistory: [],
      projectLastChangeAt: 0,
      lastAutoSaveAt: 0,
      lastManualSaveAt: 0,
    }),

  // Theme
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  },
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    });
  },

  // Undo/Redo State
  undoHistory: [],
  redoHistory: [],
  canUndo: () => {
    const state = get();
    return state.undoHistory.length > 0;
  },
  canRedo: () => {
    const state = get();
    return state.redoHistory.length > 0;
  },
  pushToHistory: () => {
    const state = get();
    // Save current markers state to undo history
    const currentMarkers = [...state.markers];
    set({
      undoHistory: [...state.undoHistory, currentMarkers],
      redoHistory: [], // Clear redo history when new action is performed
    });
  },
  undo: () => {
    set((state) => {
      if (state.undoHistory.length === 0) {
        return state;
      }
      
      // Save current state to redo history
      const currentMarkers = [...state.markers];
      const previousMarkers = state.undoHistory[state.undoHistory.length - 1];
      
      // Check if active marker still exists after undo
      const activeMarkerId = state.ui.selectedMarkerId;
      const markerStillExists = activeMarkerId 
        ? previousMarkers.some(m => m.id === activeMarkerId)
        : true;
      
      return {
        markers: previousMarkers,
        undoHistory: state.undoHistory.slice(0, -1),
        redoHistory: [...state.redoHistory, currentMarkers],
        // Clear active marker if it no longer exists
        ui: markerStillExists 
          ? state.ui 
          : { ...state.ui, selectedMarkerId: null },
      };
    });
  },
  redo: () => {
    set((state) => {
      if (state.redoHistory.length === 0) {
        return state;
      }
      
      // Save current state to undo history
      const currentMarkers = [...state.markers];
      const nextMarkers = state.redoHistory[state.redoHistory.length - 1];
      
      // Check if active marker still exists after redo
      const activeMarkerId = state.ui.selectedMarkerId;
      const markerStillExists = activeMarkerId 
        ? nextMarkers.some(m => m.id === activeMarkerId)
        : true;
      
      return {
        markers: nextMarkers,
        undoHistory: [...state.undoHistory, currentMarkers],
        redoHistory: state.redoHistory.slice(0, -1),
        // Clear active marker if it no longer exists
        ui: markerStillExists 
          ? state.ui 
          : { ...state.ui, selectedMarkerId: null },
      };
    });
  },
}));

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  useAppStore.setState({ theme: savedTheme });
} else {
  document.documentElement.setAttribute('data-theme', 'dark');
}


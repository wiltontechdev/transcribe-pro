// Core types for Transcribe Pro

export interface Marker {
  id: string;
  start: number; // start time in seconds
  end: number; // end time in seconds
  name: string; // marker name/label
  color?: string;
  speed?: number; // playback rate for this section
  loop?: boolean; // should this section repeat
  createdAt?: string; // timestamp when marker was created (ISO string)
  notes?: string;
}

export interface AudioState {
  file: File | null;
  duration: number; // in seconds
  currentTime: number; // in seconds
  isPlaying: boolean;
  isLoaded: boolean;
  isLoading: boolean; // true while audio is being loaded/decoded
  sampleRate?: number;
  buffer?: AudioBuffer;
}

export interface UIState {
  selectedMarkerId: string | null;
  isMarkerEditorOpen: boolean;
  isSettingsModalOpen: boolean;
  isHelpModalOpen: boolean;
  isExportModalOpen: boolean;
  exportStartTime?: number;
  exportEndTime?: number;
  zoomLevel: number; // waveform zoom
  viewportStart: number; // waveform viewport start time
  viewportEnd: number; // waveform viewport end time
  requestMarkerCreation: boolean; // Request marker creation from MarkerPanel button
}

export interface GlobalControls {
  pitch: number; // -12 to +12 semitones
  volume: number; // 0 to 1 (or dB: -60 to 6)
  playbackRate: number; // 0.5 to 2.0
  isMuted: boolean; // mute state
  previousVolume: number; // volume before mute (to restore)
}

export interface ProjectData {
  version: string; // Project file format version
  audioFilePath?: string; // Path to the audio file (deprecated, kept for backward compatibility)
  audioFileName?: string; // Original audio file name
  audioFileData?: string; // Base64 encoded audio file data (embedded in project)
  audioFileMimeType?: string; // MIME type of the audio file (e.g., 'audio/mpeg', 'audio/wav')
  markers: Marker[];
  globalControls: GlobalControls;
  uiState?: {
    zoomLevel: number;
    viewportStart: number;
    viewportEnd: number;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string; // App version that created this project
  };
}

export interface RecentProject {
  filePath: string;
  fileName: string;
  lastOpened: string;
  audioFileName?: string;
}


















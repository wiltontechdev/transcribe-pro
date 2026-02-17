// MarkerManager.ts - Julius - Week 2
// Marker management logic

import { Marker } from '../../types/types';
import { useAppStore } from '../../store/store';

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * TASK 9: 35 Preset Colors for Markers
 * Pre-defined color options users can choose from when creating markers
 * 
 * Why limit colors:
 * - Unlimited color picker is complex and slow
 * - 35 preset colors provides excellent variety for multiple markers
 * 
 * Color selection criteria:
 * - Contrast well with both dark and light backgrounds
 * - Are distinct from each other
 * - Organized in groups for easy visual identification
 * - Include warm, cool, and neutral tones
 */
export const PRESET_COLORS = [
  // Reds & Pinks (5)
  '#FF4444', // Bright Red
  '#E91E63', // Pink
  '#FF69B4', // Hot Pink
  '#DC143C', // Crimson
  '#FF6B6B', // Coral Red
  
  // Oranges & Yellows (5)
  '#FF8C00', // Dark Orange
  '#FFA500', // Orange
  '#FFD700', // Gold
  '#FFBF00', // Amber
  '#F4A460', // Sandy Brown
  
  // Greens (6)
  '#00AA00', // Green
  '#32CD32', // Lime Green
  '#2ECC71', // Emerald
  '#20B2AA', // Light Sea Green
  '#00CED1', // Dark Turquoise
  '#228B22', // Forest Green
  
  // Blues (6)
  '#4A9EFF', // Bright Blue
  '#1E90FF', // Dodger Blue
  '#00BFFF', // Deep Sky Blue
  '#4169E1', // Royal Blue
  '#6495ED', // Cornflower Blue
  '#5F9EA0', // Cadet Blue
  
  // Purples & Violets (5)
  '#9B59B6', // Amethyst
  '#8A2BE2', // Blue Violet
  '#9370DB', // Medium Purple
  '#BA55D3', // Medium Orchid
  '#DA70D6', // Orchid
  
  // Teals & Cyans (4)
  '#008B8B', // Dark Cyan
  '#48D1CC', // Medium Turquoise
  '#40E0D0', // Turquoise
  '#7FFFD4', // Aquamarine
  
  // Earth Tones (4)
  '#D4AF37', // Gold (African theme)
  '#CD853F', // Peru
  '#8B4513', // Saddle Brown
  '#A0522D', // Sienna
] as const;

/**
 * Default color (first in array - Red)
 */
export const DEFAULT_MARKER_COLOR = PRESET_COLORS[0];

/**
 * MarkerManager - Utility class for managing markers
 * All methods are static since markers are global to the app
 */
export class MarkerManager {
  /**
   * Validates marker data according to all validation rules
   * @param markerData - Marker data to validate (can be partial for updates)
   * @param existingMarker - Existing marker data (for updates, to merge with)
   * @returns Validation result with valid flag and array of error messages
   */
  private static validateMarkerData(
    markerData: Partial<Marker>,
    existingMarker?: Marker
  ): ValidationResult {
    const errors: string[] = [];
    const store = useAppStore.getState();
    const duration = store.audio.duration || 0;

    // 7. Duration check - audio must be loaded
    if (duration <= 0) {
      errors.push('Cannot create markers: No audio file loaded. Please load an audio file first.');
      return { valid: false, errors };
    }

    // Merge with existing marker for updates
    const mergedData: Partial<Marker> = existingMarker
      ? { ...existingMarker, ...markerData }
      : markerData;

    // 1. Start time validation
    if (mergedData.start !== undefined) {
      if (typeof mergedData.start !== 'number' || isNaN(mergedData.start)) {
        errors.push('Start time must be a number');
      } else {
        if (mergedData.start < 0) {
          errors.push('Start time cannot be negative');
        }
        if (mergedData.start >= duration) {
          errors.push(`Start time (${mergedData.start}s) must be less than audio duration (${duration}s)`);
        }
        if (mergedData.end !== undefined && mergedData.start >= mergedData.end) {
          errors.push('Start time must be less than end time');
        }
      }
    }

    // 2. End time validation
    if (mergedData.end !== undefined) {
      if (typeof mergedData.end !== 'number' || isNaN(mergedData.end)) {
        errors.push('End time must be a number');
      } else {
        if (mergedData.start !== undefined && mergedData.end <= mergedData.start) {
          errors.push('End time must be greater than start time');
        }
        if (mergedData.start !== undefined && mergedData.end - mergedData.start < 0.1) {
          errors.push('Marker must be at least 0.1 seconds long');
        }
        if (mergedData.end > duration) {
          errors.push(`End time (${mergedData.end}s) cannot exceed audio duration (${duration}s)`);
        }
      }
    }

    // 3. Name validation
    if (mergedData.name !== undefined) {
      const trimmedName = typeof mergedData.name === 'string' ? mergedData.name.trim() : '';
      if (typeof mergedData.name !== 'string') {
        errors.push('Marker name must be a string');
      } else if (trimmedName.length === 0) {
        errors.push('Marker name cannot be empty');
      } else if (trimmedName.length > 50) {
        errors.push('Marker name cannot exceed 50 characters');
      }
    }

    // 4. Color validation
    // TASK 9: Check if color is one of the preset values
    if (mergedData.color !== undefined && mergedData.color !== null) {
      if (typeof mergedData.color !== 'string') {
        errors.push('Color must be a string');
      } else if (!PRESET_COLORS.includes(mergedData.color as any)) {
        errors.push(`Color must be one of the preset colors: ${PRESET_COLORS.join(', ')}`);
      }
    }

    // 5. Speed validation
    if (mergedData.speed !== undefined && mergedData.speed !== null) {
      if (typeof mergedData.speed !== 'number' || isNaN(mergedData.speed)) {
        errors.push('Speed must be a number');
      } else {
        if (mergedData.speed < 0.3) {
          errors.push('Speed must be at least 0.3 (minimum playback rate)');
        }
        if (mergedData.speed > 4.0) {
          errors.push('Speed cannot exceed 4.0 (maximum playback rate)');
        }
      }
    }

    // 6. Loop validation
    if (mergedData.loop !== undefined && mergedData.loop !== null) {
      if (typeof mergedData.loop !== 'boolean') {
        errors.push('Loop must be a boolean (true or false)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
  /**
   * TASK 4: Generate UUID for Marker IDs
   * Generates a universally unique identifier for each marker
   * Uses crypto.randomUUID() (modern browsers/Node.js) with fallback for older environments
   * 
   * Why UUIDs:
   * - Guaranteed unique (no collisions)
   * - Don't need to track "last ID" like auto-increment
   * - Safe for distributed systems
   * - Can generate client-side (no server needed)
   * 
   * @returns A unique UUID string (format: "a3f8c9d0-4b2e-4c1d-9a8b-7e6f5d4c3b2a")
   */
  private static generateId(): string {
    // Option 1: Use crypto.randomUUID() (modern browsers/Node.js/Electron)
    // This is the preferred method - returns a proper UUID v4
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Option 2: Fallback for older environments
    // Generate a UUID-like string that's still unique
    // Format: timestamp-random1-random2-random3-random4
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).substring(2, 10);
    const random2 = Math.random().toString(36).substring(2, 10);
    const random3 = Math.random().toString(36).substring(2, 10);
    const random4 = Math.random().toString(36).substring(2, 10);
    
    // Format similar to UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return `${timestamp}-${random1}-${random2}-${random3}-${random4}`;
  }

  /**
   * Gets the next color from the preset palette based on marker count
   * Cycles through colors when count exceeds palette size
   * @returns The next color in the palette
   */
  static getNextColor(): string {
    const store = useAppStore.getState();
    const markerCount = store.markers.length;
    // Cycle through colors
    const colorIndex = markerCount % PRESET_COLORS.length;
    return PRESET_COLORS[colorIndex];
  }

  /**
   * Generates an auto-incrementing marker name
   * @returns A name like "Marker 1", "Marker 2", etc.
   */
  static generateMarkerName(): string {
    const store = useAppStore.getState();
    const markerCount = store.markers.length;
    return `Marker ${markerCount + 1}`;
  }

  /**
   * Creates a quick marker with auto-generated name and next color
   * Used for rapid marker creation without popup
   * @param start - Start time in seconds
   * @param end - End time in seconds
   * @returns The created marker object
   * @throws Error if validation fails
   */
  static createQuickMarker(start: number, end: number): Marker {
    const name = MarkerManager.generateMarkerName();
    const color = MarkerManager.getNextColor();
    return MarkerManager.createMarker(name, start, end, color, 1.0, false);
  }

  /**
   * Creates a new marker with validation
   * @param name - Marker name/label
   * @param start - Start time in seconds
   * @param end - End time in seconds
   * @param color - Hex color string (e.g., "#FF0000")
   * @param speed - Playback rate for this section (optional, default: 1.0)
   * @param loop - Should this section repeat (optional, default: false)
   * @returns The created marker object
   * @throws Error if validation fails (with all error messages)
   */
  static createMarker(
    name: string,
    start: number,
    end: number,
    color: string,
    speed?: number,
    loop?: boolean
  ): Marker {
    // Step 1: Generate unique ID using UUID
    // TASK 4: Each marker gets a brand new UUID, never reused
    // IDs are permanent identifiers - even if marker is deleted and recreated
    const id = MarkerManager.generateId();

    // Step 2: Create timestamp
    const createdAt = new Date().toISOString();

    // Step 3: Prepare marker data for validation
    const markerData: Partial<Marker> = {
      name,
      start,
      end,
      color: color || DEFAULT_MARKER_COLOR, // TASK 9: Default to first preset color (Red)
      speed: speed !== undefined ? speed : 1.0, // Default speed: 1.0
      loop: loop !== undefined ? loop : false, // Default loop: false
    };

    // Step 4: Validate the data using comprehensive validation function
    const validation = MarkerManager.validateMarkerData(markerData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    // Step 5: Create marker object (with trimmed name and defaults applied)
    const marker: Marker = {
      id,
      name: (markerData.name as string).trim(),
      start: markerData.start as number,
      end: markerData.end as number,
      color: markerData.color as string,
      speed: markerData.speed as number, // Default 1.0 applied in markerData
      loop: markerData.loop as boolean, // Default false applied in markerData
      createdAt,
    };

    // Step 6: Add to store
    // TASK 5: Store Markers in Zustand
    // Using global store so all components can access markers:
    // - Waveform component (to display markers)
    // - Marker list component (to show all markers)
    // - Playback controls (to apply marker settings)
    const store = useAppStore.getState();
    store.addMarker(marker);

    // Step 7: Return the marker
    return marker;
  }

  /**
   * Updates an existing marker's properties
   * @param id - Marker ID to update
   * @param updates - Partial marker data with fields to update
   * @returns The updated marker object
   * @throws Error if marker not found or validation fails (with all error messages)
   */
  static updateMarker(id: string, updates: Partial<Marker>): Marker {
    // TASK 5: Access store to get current markers and update
    const store = useAppStore.getState();
    const markers = store.markers;

    // Step 1: Find existing marker
    const existingMarker = markers.find((m) => m.id === id);
    if (!existingMarker) {
      throw new Error(`Marker with ID "${id}" not found`);
    }

    // Step 2: Validate changes using comprehensive validation function
    // Pass existing marker so validation can check merged data
    const validation = MarkerManager.validateMarkerData(updates, existingMarker);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    // Step 3: Merge changes (trim name if provided)
    const updatedMarker: Marker = {
      ...existingMarker,
      ...updates,
      name:
        updates.name !== undefined
          ? (updates.name as string).trim()
          : existingMarker.name,
    };

    // Step 4: Update in store
    // TASK 5: Store finds marker by ID and replaces it with updated data
    store.updateMarker(id, updatedMarker);

    // Step 5: Return updated marker
    return updatedMarker;
  }

  /**
   * Deletes a marker completely
   * @param id - Marker ID to delete
   * @returns true if deletion succeeded
   * @throws Error if marker not found
   */
  static deleteMarker(id: string): boolean {
    // TASK 5: Access store to get current markers and delete
    const store = useAppStore.getState();
    const markers = store.markers;

    // Step 1: Check if marker exists
    const markerExists = markers.some((m) => m.id === id);
    if (!markerExists) {
      throw new Error(`Marker with ID "${id}" not found`);
    }

    // Step 2: Check if it's active and deactivate if needed
    // TASK 5: Handle activeMarkerId - if deleting the active marker, clear it
    const activeMarkerId = store.ui.selectedMarkerId;
    if (activeMarkerId === id) {
      store.setSelectedMarkerId(null);
    }

    // Step 3: Remove from store
    // TASK 5: Store filters out marker with that ID
    store.deleteMarker(id);

    // Step 4: Return success
    return true;
  }

  /**
   * Gets a single marker by ID
   * @param id - Marker ID to find
   * @returns The marker object or null if not found
   */
  /**
   * Gets a single marker by ID
   * TASK 5: Reads from Zustand store to find marker
   * @param id - Marker ID to find
   * @returns The marker object or null if not found
   */
  static getMarker(id: string): Marker | null {
    // TASK 5: Get current markers from store
    const store = useAppStore.getState();
    const markers = store.markers;
    return markers.find((m) => m.id === id) || null;
  }

  /**
   * Gets all markers, sorted by start time (earliest first)
   * TASK 5: Reads from Zustand store and returns sorted array
   * @returns Array of all markers, sorted by start time
   */
  static getAllMarkers(): Marker[] {
    // TASK 5: Get current markers from store
    const store = useAppStore.getState();
    const markers = store.markers;
    // Sort by start time (earliest first)
    return [...markers].sort((a, b) => a.start - b.start);
  }

  /**
   * Gets the count of markers
   * TASK 5: Reads from Zustand store to get marker count
   * @returns Number of markers in the store
   */
  static getMarkerCount(): number {
    // TASK 5: Get current markers array length from store
    const store = useAppStore.getState();
    return store.markers.length;
  }

  /**
   * TASK 6: Get Active Marker
   * Gets the currently selected marker whose settings are applied to playback
   * Only one marker can be active at a time
   * 
   * Usage:
   * - UI can call this to know which marker to highlight
   * - Audio engine can call this to know which speed to apply
   * 
   * @returns The active marker object, or null if no marker is active
   */
  static getActiveMarker(): Marker | null {
    const store = useAppStore.getState();
    
    // Get activeMarkerId from store (stored as ui.selectedMarkerId)
    const activeMarkerId = store.ui.selectedMarkerId;
    
    // If null, no marker is active
    if (activeMarkerId === null) {
      return null;
    }
    
    // Get all markers from store
    const markers = store.markers;
    
    // Find the marker object whose ID matches activeMarkerId
    const activeMarker = markers.find((m) => m.id === activeMarkerId);
    
    // If ID doesn't match any marker (data corruption), handle gracefully
    if (!activeMarker) {
      return null;
    }
    
    return activeMarker;
  }

  /**
   * TASK 7: Navigate Markers - Get Next Marker
   * Moves to the next marker in sequence (sorted by start time)
   * 
   * Behavior:
   * - If no active marker: returns first marker (earliest by start time)
   * - If active marker exists: returns next marker in sequence
   * - If at last marker: wraps to first marker (circular navigation)
   * 
   * Usage:
   * - Keyboard shortcuts (arrow keys)
   * - Next button in UI
   * - Allows quick navigation through markers sequentially
   * 
   * @returns The next marker in sequence, or null if no markers exist
   */
  static getNextMarker(): Marker | null {
    // Get all markers sorted by start time (earliest first)
    const sortedMarkers = MarkerManager.getAllMarkers();
    
    // If no markers exist, return null
    if (sortedMarkers.length === 0) {
      return null;
    }
    
    // Get current active marker
    const activeMarker = MarkerManager.getActiveMarker();
    
    // If no active marker, return first marker (earliest)
    if (activeMarker === null) {
      return sortedMarkers[0];
    }
    
    // Find active marker's index in sorted array
    const currentIndex = sortedMarkers.findIndex((m) => m.id === activeMarker.id);
    
    // If marker not found (shouldn't happen), return first marker
    if (currentIndex === -1) {
      return sortedMarkers[0];
    }
    
    // Get next marker (index + 1)
    const nextIndex = currentIndex + 1;
    
    // If past end of array, wrap to first marker (circular navigation)
    if (nextIndex >= sortedMarkers.length) {
      return sortedMarkers[0];
    }
    
    return sortedMarkers[nextIndex];
  }

  /**
   * TASK 7: Navigate Markers - Get Previous Marker
   * Moves to the previous marker in sequence (sorted by start time)
   * 
   * Behavior:
   * - If no active marker: returns last marker (latest by start time)
   * - If active marker exists: returns previous marker in sequence
   * - If at first marker: wraps to last marker (circular navigation)
   * 
   * Usage:
   * - Keyboard shortcuts (arrow keys)
   * - Previous button in UI
   * - Allows quick navigation through markers sequentially
   * 
   * @returns The previous marker in sequence, or null if no markers exist
   */
  static getPreviousMarker(): Marker | null {
    // Get all markers sorted by start time (earliest first)
    const sortedMarkers = MarkerManager.getAllMarkers();
    
    // If no markers exist, return null
    if (sortedMarkers.length === 0) {
      return null;
    }
    
    // Get current active marker
    const activeMarker = MarkerManager.getActiveMarker();
    
    // If no active marker, return last marker (latest)
    if (activeMarker === null) {
      return sortedMarkers[sortedMarkers.length - 1];
    }
    
    // Find active marker's index in sorted array
    const currentIndex = sortedMarkers.findIndex((m) => m.id === activeMarker.id);
    
    // If marker not found (shouldn't happen), return last marker
    if (currentIndex === -1) {
      return sortedMarkers[sortedMarkers.length - 1];
    }
    
    // Get previous marker (index - 1)
    const previousIndex = currentIndex - 1;
    
    // If before start of array (index would be -1), wrap to last marker (circular navigation)
    if (previousIndex < 0) {
      return sortedMarkers[sortedMarkers.length - 1];
    }
    
    return sortedMarkers[previousIndex];
  }

  /**
   * TASK 8: Apply Marker Settings When Activating
   * Sets a marker as active and applies its speed and loop settings to playback
   * 
   * When user selects a marker, automatically apply that marker's speed and loop settings
   * Each marker can have different speed (one slow for learning, one normal for performance)
   * When user clicks a marker, they expect those settings to apply immediately
   * 
   * @param markerId - ID of the marker to activate
   * @param options - Optional configuration
   * @param options.seekToMarker - If true, jump playback to marker start time (default: false)
   * @param options.audioEngine - Optional AudioEngine instance (if not provided, will try to get from global)
   * @throws Error if marker not found
   */
  static async setActiveMarker(
    markerId: string,
    options?: {
      seekToMarker?: boolean;
      audioEngine?: {
        setSpeed?: (speed: number) => void;
        seek?: (time: number) => Promise<void>;
        setLoop?: (start: number, end: number) => void;
        disableLoop?: () => void;
      };
    }
  ): Promise<void> {
    const store = useAppStore.getState();

    // Step 1: Update store - set which marker is now active
    store.setSelectedMarkerId(markerId);

    // Step 2: Get the marker data
    const marker = MarkerManager.getMarker(markerId);
    if (!marker) {
      throw new Error(`Marker with ID "${markerId}" not found`);
    }

    // Step 3: Speed is now handled by useMarkerSpeedControl hook
    // The hook monitors playback position and applies marker speed only when within marker range
    // We don't apply speed here anymore - let the hook handle it dynamically
    const markerSpeed = marker.speed !== undefined ? marker.speed : 1.0;

    // Step 4: Apply marker's loop settings
    if (marker.loop) {
      // If loop is true, call AudioEngine's setLoop() method with marker's start and end times
      if (options?.audioEngine?.setLoop) {
        options.audioEngine.setLoop(marker.start, marker.end);
      }
    } else {
      // If false, disable looping
      if (options?.audioEngine?.disableLoop) {
        options.audioEngine.disableLoop();
      }
    }

    // Step 5: Optional - Seek to marker start
    // Decide if activating marker should jump playback to marker start
    if (options?.seekToMarker) {
      if (options?.audioEngine?.seek) {
        await options.audioEngine.seek(marker.start);
      } else {
      }
    }
  }
}

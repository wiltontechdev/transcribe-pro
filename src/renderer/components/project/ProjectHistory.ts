// ProjectHistory.ts - Project history with restore points
import { ProjectData } from '../../types/types';

const PROJECT_HISTORY_KEY = 'transcribe-pro-project-history';
const MAX_HISTORY_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  timestamp: string;
  projectData: ProjectData;
  description?: string;
}

export class ProjectHistory {
  /**
   * Save current project state to history
   */
  static saveSnapshot(projectData: ProjectData, description?: string): string {
    try {
      const history = this.getHistory();
      const entry: HistoryEntry = {
        id: `snapshot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        projectData,
        description,
      };

      const updated = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
      localStorage.setItem(PROJECT_HISTORY_KEY, JSON.stringify(updated));
      
      return entry.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all history entries
   */
  static getHistory(): HistoryEntry[] {
    try {
      const data = localStorage.getItem(PROJECT_HISTORY_KEY);
      if (!data) return [];
      return JSON.parse(data) as HistoryEntry[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get a specific history entry
   */
  static getEntry(entryId: string): HistoryEntry | null {
    const history = this.getHistory();
    return history.find(e => e.id === entryId) || null;
  }

  /**
   * Delete a history entry
   */
  static deleteEntry(entryId: string): boolean {
    try {
      const history = this.getHistory();
      const updated = history.filter(e => e.id !== entryId);
      localStorage.setItem(PROJECT_HISTORY_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all history
   */
  static clearHistory(): boolean {
    try {
      localStorage.removeItem(PROJECT_HISTORY_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }
}

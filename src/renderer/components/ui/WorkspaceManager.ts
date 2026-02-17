// WorkspaceManager.ts - Save and restore workspace layouts
import { useAppStore } from '../../store/store';

export interface WorkspaceLayout {
  id: string;
  name: string;
  panels: {
    playback: { visible: boolean; order: number };
    markers: { visible: boolean; order: number };
  };
  zoomLevel: number;
  viewport: {
    start: number;
    end: number;
  };
  createdAt: string;
}

const WORKSPACE_LAYOUTS_KEY = 'transcribe-pro-workspace-layouts';
const MAX_LAYOUTS = 10;

export class WorkspaceManager {
  /**
   * Save current workspace layout
   */
  static saveLayout(name: string): string {
    const store = useAppStore.getState();
    const layouts = this.getLayouts();
    
    const layout: WorkspaceLayout = {
      id: `layout-${Date.now()}`,
      name,
      panels: {
        playback: { visible: true, order: 0 },
        markers: { visible: true, order: 1 },
      },
      zoomLevel: store.ui.zoomLevel,
      viewport: {
        start: store.ui.viewportStart,
        end: store.ui.viewportEnd,
      },
      createdAt: new Date().toISOString(),
    };

    const updated = [layout, ...layouts.filter(l => l.id !== layout.id)].slice(0, MAX_LAYOUTS);
    localStorage.setItem(WORKSPACE_LAYOUTS_KEY, JSON.stringify(updated));
    
    return layout.id;
  }

  /**
   * Get all saved layouts
   */
  static getLayouts(): WorkspaceLayout[] {
    try {
      const data = localStorage.getItem(WORKSPACE_LAYOUTS_KEY);
      if (!data) return [];
      return JSON.parse(data) as WorkspaceLayout[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Load a workspace layout
   */
  static loadLayout(layoutId: string): boolean {
    try {
      const layouts = this.getLayouts();
      const layout = layouts.find(l => l.id === layoutId);
      if (!layout) return false;

      const store = useAppStore.getState();
      store.setZoomLevel(layout.zoomLevel);
      store.setViewport(layout.viewport.start, layout.viewport.end);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a workspace layout
   */
  static deleteLayout(layoutId: string): boolean {
    try {
      const layouts = this.getLayouts();
      const updated = layouts.filter(l => l.id !== layoutId);
      localStorage.setItem(WORKSPACE_LAYOUTS_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      return false;
    }
  }
}

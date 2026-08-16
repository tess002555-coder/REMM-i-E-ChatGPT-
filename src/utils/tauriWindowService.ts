import { CharacterConfig, SnapEdge } from '../types';

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export async function getOrSpawnWindow(
  label: 'mascot' | 'panel' | 'modal',
  options?: { width?: number; height?: number; url?: string; title?: string }
) {
  if (!isTauriEnvironment()) return null;
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    let win = await WebviewWindow.getByLabel(label);
    if (!win) {
      const defaultConfigs = {
        mascot: {
          url: 'index.html?window=mascot',
          title: 'Remember ME Mascot',
          width: 180,
          height: 180,
          visible: true,
        },
        panel: {
          url: 'index.html?window=panel',
          title: 'Remember ME Panel',
          width: 420,
          height: 620,
          visible: false,
        },
        modal: {
          url: 'index.html?window=modal',
          title: 'Remember ME Modal',
          width: 500,
          height: 600,
          visible: false,
        },
      };

      const cfg = defaultConfigs[label];
      win = new WebviewWindow(label, {
        url: options?.url || cfg.url,
        title: options?.title || cfg.title,
        width: options?.width || cfg.width,
        height: options?.height || cfg.height,
        resizable: false,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        shadow: false,
        skipTaskbar: true,
        visible: cfg.visible,
        dragDropEnabled: false,
      });
    }
    return win;
  } catch (err) {
    console.warn(`Error getting or spawning window "${label}":`, err);
    return null;
  }
}

/**
 * Calculates and sets the position of the 'panel' window directly adjacent to the 'mascot' window.
 */
export async function positionPanelRelativeToMascot(): Promise<{ panelX: number; panelY: number } | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const { WebviewWindow, getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const { currentMonitor } = await import('@tauri-apps/api/window');
    const { LogicalPosition } = await import('@tauri-apps/api/dpi');

    let mascotWin = await WebviewWindow.getByLabel('mascot');
    if (!mascotWin) {
      mascotWin = getCurrentWebviewWindow();
    }

    const panelWin = await getOrSpawnWindow('panel');
    if (!panelWin || !mascotWin) return null;

    const monitor = await currentMonitor();
    const mascotPos = await mascotWin.outerPosition();

    if (monitor) {
      const scale = monitor.scaleFactor || 1;
      const monWidth = monitor.size.width / scale;
      const monHeight = monitor.size.height / scale;
      const monX = monitor.position.x / scale;
      const monY = monitor.position.y / scale;

      const mascotX = (mascotPos.x / scale) - monX;
      const mascotY = (mascotPos.y / scale) - monY;

      const panelWidth = 420;
      const panelHeight = 620;

      // Mascot center relative to monitor
      const placeLeft = (mascotX + 90) > (monWidth / 2);
      let panelX = placeLeft ? (mascotX - panelWidth - 10) : (mascotX + 180 + 10);

      // Boundary clamp
      panelX = Math.max(10, Math.min(monWidth - panelWidth - 10, panelX));
      const panelY = Math.max(10, Math.min(monHeight - panelHeight - 10, mascotY - 20));

      await panelWin.setPosition(new LogicalPosition(monX + panelX, monY + panelY));
      return { panelX, panelY };
    }
  } catch (err) {
    console.warn('Error positioning panel relative to mascot:', err);
  }
  return null;
}

/**
 * Calculates and sets the position of the 'modal' window adjacent to the 'panel' or 'mascot' window.
 */
export async function positionModalRelativeToPanel(): Promise<{ modalX: number; modalY: number } | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const { WebviewWindow, getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const { currentMonitor } = await import('@tauri-apps/api/window');
    const { LogicalPosition } = await import('@tauri-apps/api/dpi');

    let refWin = await WebviewWindow.getByLabel('panel');
    if (!refWin || !(await refWin.isVisible())) {
      refWin = await WebviewWindow.getByLabel('mascot');
    }
    if (!refWin) {
      refWin = getCurrentWebviewWindow();
    }

    const modalWin = await getOrSpawnWindow('modal');
    if (!modalWin || !refWin) return null;

    const monitor = await currentMonitor();
    const refPos = await refWin.outerPosition();

    if (monitor) {
      const scale = monitor.scaleFactor || 1;
      const monWidth = monitor.size.width / scale;
      const monHeight = monitor.size.height / scale;
      const monX = monitor.position.x / scale;
      const monY = monitor.position.y / scale;

      const refX = (refPos.x / scale) - monX;
      const refY = (refPos.y / scale) - monY;

      const modalWidth = 500;
      const modalHeight = 600;

      const placeLeft = (refX + 210) > (monWidth / 2);
      let modalX = placeLeft ? (refX - modalWidth - 10) : (refX + 420 + 10);
      modalX = Math.max(10, Math.min(monWidth - modalWidth - 10, modalX));
      const modalY = Math.max(10, Math.min(monHeight - modalHeight - 10, refY));

      await modalWin.setPosition(new LogicalPosition(monX + modalX, monY + modalY));
      return { modalX, modalY };
    }
  } catch (err) {
    console.warn('Error positioning modal relative to panel:', err);
  }
  return null;
}

/**
 * Broadcast an event to all Tauri windows.
 */
export async function broadcastTauriEvent(eventName: string, payload: any = {}): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { emit } = await import('@tauri-apps/api/event');
    await emit(eventName, payload);
  } catch (err) {
    console.warn(`Error broadcasting event "${eventName}":`, err);
  }
}

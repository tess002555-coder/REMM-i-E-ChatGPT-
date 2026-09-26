import { useCallback, useEffect, useRef } from 'react';
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalPosition } from '@tauri-apps/api/dpi';

const MASCOT = 180;
const PANEL_W = 520;
const PANEL_H = 720;
const PEEK = 45; // 75% of the mascot remains visible.
const SNAP_DELAY = 180; // idle period after the last native move event
const DRAG_THRESHOLD = 5;

type Edge = 'left' | 'right' | 'top' | 'bottom';
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

const EDGE_KEY = 'rememberme-widget-edge';

export function useMascotWindow() {
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  const winRef = useRef<any>(null);

  if (isTauri && !winRef.current) {
    try {
      winRef.current = getCurrentWindow();
    } catch {
      winRef.current = null;
    }
  }

  const win = winRef.current;
  const bounds = useRef<Bounds>({ x: 0, y: 0, width: 1920, height: 1080, scale: 1 });
  const lastPosition = useRef({ x: 300, y: 300 });
  const dragStart = useRef({ x: 300, y: 300 });
  const dragging = useRef(false);
  const movedDuringDrag = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readBounds = useCallback(async () => {
    if (!isTauri) return false;
    try {
      const monitor = await currentMonitor();
      if (!monitor) return false;

      const scale = monitor.scaleFactor || 1;
      const work = monitor.workArea;
      bounds.current = {
        x: work.position.x / scale,
        y: work.position.y / scale,
        width: work.size.width / scale,
        height: work.size.height / scale,
        scale,
      };
      return true;
    } catch {
      return false;
    }
  }, [isTauri]);

  const move = useCallback(async (x: number, y: number) => {
    if (!win) return;
    try {
      lastPosition.current = { x, y };
      await win.setPosition(new LogicalPosition(x, y));
    } catch (err) {
      console.warn('Failed to move window:', err);
    }
  }, [win]);

  const getEdge = useCallback((): Edge => {
    const saved = localStorage.getItem(EDGE_KEY);
    if (saved === 'left' || saved === 'right' || saved === 'top' || saved === 'bottom') {
      return saved;
    }
    return 'right';
  }, []);

  const setEdge = useCallback((edge: Edge) => {
    localStorage.setItem(EDGE_KEY, edge);
  }, []);

  const snapToPeek = useCallback(async (edge: Edge) => {
    const b = bounds.current;
    const maxX = b.x + b.width - MASCOT;
    const maxY = b.y + b.height - MASCOT;

    let x = Math.max(b.x, Math.min(lastPosition.current.x, maxX));
    let y = Math.max(b.y, Math.min(lastPosition.current.y, maxY));

    if (edge === 'left') x = b.x - PEEK;
    if (edge === 'right') x = b.x + b.width - MASCOT + PEEK;
    if (edge === 'top') y = b.y - PEEK;
    if (edge === 'bottom') y = b.y + b.height - MASCOT + PEEK;

    await move(x, y);
    setEdge(edge);
  }, [move, setEdge]);

  const snapAfterDrag = useCallback(async () => {
    if (!win || !dragging.current) return;

    dragging.current = false;
    movedDuringDrag.current = true;

    try {
      await readBounds();
      const position = await win.outerPosition();
      const scale = (await win.scaleFactor()) || 1;
      const currentX = position.x / scale;
      const currentY = position.y / scale;
      const b = bounds.current;
      const maxX = b.x + Math.max(0, b.width - MASCOT);
      const maxY = b.y + Math.max(0, b.height - MASCOT);
      const x = Math.max(b.x, Math.min(currentX, maxX));
      const y = Math.max(b.y, Math.min(currentY, maxY));

      const distances: Record<Edge, number> = {
        left: x - b.x,
        right: maxX - x,
        top: y - b.y,
        bottom: maxY - y,
      };

      const nearest = (Object.keys(distances) as Edge[]).reduce(
        (best, edge) => distances[edge] < distances[best] ? edge : best,
        'left',
      );

      lastPosition.current = { x, y };
      await snapToPeek(nearest);
    } catch (error) {
      console.warn('Mascot snap failed:', error);
    }
  }, [readBounds, snapToPeek, win]);

  const beginDrag = useCallback(async () => {
    if (!win) return;
    movedDuringDrag.current = false;
    dragging.current = true;

    try {
      const position = await win.outerPosition();
      const scale = (await win.scaleFactor()) || 1;
      dragStart.current = {
        x: position.x / scale,
        y: position.y / scale,
      };

      await win.startDragging();
    } catch (err) {
      console.warn('Begin drag error:', err);
    }
  }, [win]);

  const openPanel = useCallback(async () => {
    if (!win) return;
    if (movedDuringDrag.current) {
      movedDuringDrag.current = false;
      return;
    }

    try {
      const current = await win.outerPosition();
      const scale = (await win.scaleFactor()) || 1;
      const currentX = current.x / scale;
      const currentY = current.y / scale;
      const moved = Math.hypot(currentX - dragStart.current.x, currentY - dragStart.current.y) > DRAG_THRESHOLD;
      if (moved) return;

      await readBounds();
      const b = bounds.current;
      const edge = getEdge();
      const mascotX = currentX;
      const mascotY = currentY;
      lastPosition.current = { x: mascotX, y: mascotY };

      const maxX = b.x + Math.max(0, b.width - PANEL_W);
      const maxY = b.y + Math.max(0, b.height - PANEL_H);
      let x = Math.max(b.x, Math.min(mascotX, maxX));
      let y = Math.max(b.y, Math.min(mascotY, maxY));

      if (edge === 'right') x = maxX;
      if (edge === 'left') x = b.x;
      if (edge === 'top') y = b.y;
      if (edge === 'bottom') y = maxY;

      if (edge === 'left' || edge === 'right') {
        y = Math.max(b.y, Math.min(mascotY + MASCOT / 2 - PANEL_H / 2, maxY));
      } else {
        x = Math.max(b.x, Math.min(mascotX + MASCOT / 2 - PANEL_W / 2, maxX));
      }

      const existing = await WebviewWindow.getByLabel('task-panel');
      if (existing) {
        await existing.setPosition(new LogicalPosition(x, y));
        await existing.show();
        await existing.setFocus();
        return;
      }

      const panel = new WebviewWindow('task-panel', {
        url: 'index.html?window=panel',
        title: 'Remember ME - Tasks',
        x,
        y,
        width: PANEL_W,
        height: PANEL_H,
        minWidth: PANEL_W,
        minHeight: PANEL_H,
        maxWidth: PANEL_W,
        maxHeight: PANEL_H,
        resizable: false,
        fullscreen: false,
        transparent: false,
        decorations: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        shadow: true,
        visible: true,
        focus: true,
      });

      panel.once('tauri://error', (event) => {
        console.error('Task panel creation failed:', event);
      });
    } catch (err) {
      console.warn('Open panel error:', err);
    }
  }, [getEdge, readBounds, win]);

  useEffect(() => {
    if (!win) return;
    let active = true;

    void (async () => {
      try {
        const hasMonitor = await readBounds();
        if (!active) return;

        const b = bounds.current;
        const edge = getEdge();
        const startX = b.x + Math.max(20, b.width - MASCOT - 20);
        const startY = b.y + Math.max(20, (b.height - MASCOT) / 2);

        // Always establish a valid on-screen location before peeking.
        lastPosition.current = { x: startX, y: startY };
        await move(startX, startY);
        await win.show();
        await win.setFocus();

        if (hasMonitor) {
          await snapToPeek(edge);
        }
      } catch (error) {
        console.warn('Mascot initialization failed:', error);
        try {
          await move(300, 300);
          await win.show();
          await win.setFocus();
        } catch (fallbackError) {
          console.error('Mascot fallback initialization failed:', fallbackError);
        }
      }
    })();

    let unlisten: (() => void) | undefined;
    void win.onMoved(() => {
      if (!dragging.current) return;
      movedDuringDrag.current = true;

      if (snapTimer.current) clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => {
        void snapAfterDrag();
      }, SNAP_DELAY);
    }).then((fn: any) => {
      unlisten = fn;
    });

    return () => {
      active = false;
      if (snapTimer.current) clearTimeout(snapTimer.current);
      unlisten?.();
    };
  }, [getEdge, move, readBounds, snapAfterDrag, snapToPeek, win]);

  return { beginDrag, openPanel };
}

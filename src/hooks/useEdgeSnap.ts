import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { SnapEdge, WindowState } from '../types';

interface EdgeSnapOptions {
  autoHideSeconds: number;
  hoverDelayMs?: number;
  closeDelayMs?: number;
  containerBounds?: { width: number; height: number };
  widgetSize?: { width: number; height: number };
  onPeekChange?: (isPeeking: boolean) => void;
}

const CLOSED_SIZE = { width: 180, height: 180 };
const EDGE_PEEK = 45; // 75% of the 180px mascot remains visible.
const EDGE_SNAP_DISTANCE = 140;

export function useEdgeSnap(options: EdgeSnapOptions) {
  const { autoHideSeconds = 0, closeDelayMs = 0 } = options;
  const [windowState, setWindowState] = useState<WindowState>(() => ({
    x: 0,
    y: 0,
    isSnapped: true,
    snappedEdge: 'right',
    isPeeking: true,
    isPanelOpen: false,
    isPinned: false,
    alwaysOnTop: false,
    displayMode: 'mascot',
  }));

  const nativeWindowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  const screenRef = useRef({ width: 1920, height: 1080 });
  const positionRef = useRef({ x: 0, y: 120 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  const getNativeWindow = useCallback(() => {
    const w = nativeWindowRef.current ?? getCurrentWindow();
    nativeWindowRef.current = w;
    return w;
  }, []);

  const syncNativePosition = useCallback(async (x: number, y: number) => {
    positionRef.current = { x, y };
    if (!isTauri) return;
    try {
      await getNativeWindow().setPosition(new LogicalPosition(x, y));
    } catch (e) {
      console.warn('Failed to move widget window:', e);
    }
  }, [getNativeWindow, isTauri]);

  const resizeNativeWindow = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      await getNativeWindow().setSize(new LogicalSize(width, height));
    } catch (e) {
      console.warn('Failed to resize widget window:', e);
    }
  }, [getNativeWindow, isTauri]);

  const refreshMonitorBounds = useCallback(async () => {
    if (!isTauri) return;
    try {
      const monitor = await getNativeWindow().primaryMonitor();
      if (!monitor) return;
      const scale = monitor.scaleFactor || 1;
      screenRef.current = {
        width: monitor.workArea.size.width / scale,
        height: monitor.workArea.size.height / scale,
      };
    } catch (e) {
      console.warn('Failed to read monitor bounds:', e);
    }
  }, [getNativeWindow, isTauri]);

  const snapToEdge = useCallback((currX: number, currY: number) => {
    const { width: bw, height: bh } = screenRef.current;
    const maxX = Math.max(0, bw - CLOSED_SIZE.width);
    const maxY = Math.max(0, bh - CLOSED_SIZE.height);
    const x = Math.max(0, Math.min(currX, maxX));
    const y = Math.max(0, Math.min(currY, maxY));
    const centerX = x + CLOSED_SIZE.width / 2;
    // Snap is intentionally restricted to LEFT/RIGHT.
    const edge: SnapEdge = centerX <= bw / 2 ? 'left' : 'right';
    return { x, y, edge };
  }, []);

  const getPeekPosition = useCallback((edge: SnapEdge) => {
    const { width: bw, height: bh } = screenRef.current;
    const maxY = Math.max(0, bh - CLOSED_SIZE.height);
    const y = Math.max(0, Math.min(positionRef.current.y, maxY));
    if (edge === 'left') return { x: -EDGE_PEEK, y };
    return { x: bw - CLOSED_SIZE.width + EDGE_PEEK, y };
  }, []);

  const placePeekWidget = useCallback(async (edge: SnapEdge, preferredY: number) => {
    const { height: bh } = screenRef.current;
    const y = Math.max(0, Math.min(preferredY, Math.max(0, bh - CLOSED_SIZE.height)));
    const x = edge === 'left' ? -EDGE_PEEK : screenRef.current.width - CLOSED_SIZE.width + EDGE_PEEK;
    await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
    await syncNativePosition(x, y);
    setWindowState(p => ({
      ...p,
      x: 0,
      y: 0,
      snappedEdge: edge,
      isSnapped: true,
      isPeeking: true,
      isPanelOpen: false,
      isPinned: false,
    }));
  }, [resizeNativeWindow, syncNativePosition]);

  const openMainPanel = useCallback(async () => {
    if (!isTauri) return;
    try {
      const existing = await WebviewWindow.getByLabel('main-panel');
      if (existing) {
        await existing.show();
        await existing.setFocus();
        setWindowState(p => ({ ...p, isPanelOpen: true, isPinned: true, isPeeking: false }));
        return;
      }

      const panel = new WebviewWindow('main-panel', {
        url: 'index.html?window=panel',
        title: 'REMM(i) - Main Panel',
        width: 520,
        height: 720,
        minWidth: 520,
        minHeight: 720,
        resizable: false,
        fullscreen: false,
        decorations: false,
        transparent: false,
        alwaysOnTop: false,
        skipTaskbar: false,
        visible: false,
        focus: true,
      });

      panel.once('tauri://created', async () => {
        await panel.show();
        await panel.setFocus();
      });
      panel.once('tauri://error', event => {
        console.error('[REMM] Failed to create main-panel:', event);
        setWindowState(p => ({ ...p, isPanelOpen: false, isPinned: false, isPeeking: true }));
      });
      setWindowState(p => ({ ...p, isPanelOpen: true, isPinned: true, isPeeking: false }));
    } catch (e) {
      console.error('[REMM] Failed to open main-panel:', e);
      setWindowState(p => ({ ...p, isPanelOpen: false, isPinned: false, isPeeking: true }));
    }
  }, [isTauri]);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    void listen('main-panel-closed', () => {
      setWindowState(p => ({ ...p, isPanelOpen: false, isPinned: false, isPeeking: true }));
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [isTauri]);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    (async () => {
      try {
        const w = getNativeWindow();
        await refreshMonitorBounds();
        if (cancelled) return;
        const monitor = await w.primaryMonitor();
        const scale = monitor?.scaleFactor ?? 1;
        const pos = await w.outerPosition();
        positionRef.current = { x: pos.x / scale, y: pos.y / scale };
        await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
        const edge = snapToEdge(positionRef.current.x, positionRef.current.y).edge;
        const peek = getPeekPosition(edge);
        await syncNativePosition(peek.x, peek.y);
        setWindowState(p => ({ ...p, snappedEdge: edge, isSnapped: true, isPeeking: true }));
      } catch (e) {
        console.warn('Failed to initialize widget window:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [getNativeWindow, getPeekPosition, isTauri, refreshMonitorBounds, resizeNativeWindow, snapToEdge, syncNativePosition]);

  const handleDragStart = useCallback(async () => {
    if (!isTauri || windowState.isPanelOpen) return;
    try {
      const w = getNativeWindow();
      const monitor = await w.primaryMonitor();
      const scale = monitor?.scaleFactor ?? 1;
      const pos = await w.outerPosition();
      dragStartRef.current = { x: pos.x / scale, y: pos.y / scale };
      await w.startDragging();
    } catch (e) {
      dragStartRef.current = null;
      console.warn('Failed to start native mascot drag:', e);
    }
  }, [getNativeWindow, isTauri, windowState.isPanelOpen]);

  const handleDragEnd = useCallback(async () => {
    if (!isTauri) return;
    try {
      const w = getNativeWindow();
      const monitor = await w.primaryMonitor();
      const scale = monitor?.scaleFactor ?? 1;
      const pos = await w.outerPosition();
      const current = { x: pos.x / scale, y: pos.y / scale };
      const start = dragStartRef.current;
      dragStartRef.current = null;

      const moved = start ? Math.hypot(current.x - start.x, current.y - start.y) > 6 : true;
      const snapped = snapToEdge(current.x, current.y);
      await placePeekWidget(snapped.edge, snapped.y);

      // A press/release with almost no movement is a click, not a drag.
      if (!moved) await openMainPanel();
    } catch (e) {
      console.warn('Failed to position widget after native drag:', e);
    }
  }, [getNativeWindow, isTauri, openMainPanel, placePeekWidget, snapToEdge]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (windowState.isPanelOpen) return;
    if (autoHideSeconds > 0) {
      idleTimerRef.current = setTimeout(() => {
        setWindowState(p => ({ ...p, isPeeking: true }));
      }, autoHideSeconds * 1000);
    }
  }, [autoHideSeconds, windowState.isPanelOpen]);

  const handleMouseEnter = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setWindowState(p => p.isPanelOpen ? p : ({ ...p, isPeeking: false }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const peek = () => setWindowState(p => p.isPinned || p.isPanelOpen ? p : { ...p, isPeeking: true });
    if (closeDelayMs === 0) peek();
    else closeTimerRef.current = setTimeout(peek, closeDelayMs);
    resetIdleTimer();
  }, [closeDelayMs, resetIdleTimer]);

  const closePanel = useCallback(async () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (!isTauri) return;
    try {
      const panel = await WebviewWindow.getByLabel('main-panel');
      if (panel) await panel.close();
    } catch (e) {
      console.warn('Failed to close main panel:', e);
    }
    setWindowState(p => ({ ...p, isPanelOpen: false, isPinned: false, isPeeking: true }));
  }, [isTauri]);

  const togglePanel = useCallback(async () => {
    const existing = isTauri ? await WebviewWindow.getByLabel('main-panel') : null;
    if (existing) {
      await existing.show();
      await existing.setFocus();
      setWindowState(p => ({ ...p, isPanelOpen: true, isPinned: true, isPeeking: false }));
    } else {
      await openMainPanel();
    }
  }, [isTauri, openMainPanel]);

  const toggleDisplayMode = useCallback(() => {
    setWindowState(p => ({ ...p, displayMode: p.displayMode === 'mascot' ? 'bar' : 'mascot' }));
  }, []);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return {
    windowState,
    setWindowState,
    handleDragStart,
    handleDragEnd,
    handleMouseEnter,
    handleMouseLeave,
    resetIdleTimer,
    togglePanel,
    openMainPanel,
    closePanel,
    toggleDisplayMode,
  };
}

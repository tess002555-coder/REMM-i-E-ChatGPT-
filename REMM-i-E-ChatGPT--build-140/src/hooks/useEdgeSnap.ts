import { useState, useEffect, useCallback, useRef } from 'react';
import { SnapEdge, WindowState } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';

interface EdgeSnapOptions { autoHideSeconds: number; hoverDelayMs?: number; closeDelayMs?: number; containerBounds?: { width: number; height: number }; widgetSize?: { width: number; height: number }; onPeekChange?: (isPeeking: boolean) => void; }

const CLOSED_SIZE = { width: 180, height: 180 };
const OPEN_SIZE = { width: 520, height: 720 };
const EDGE_PEEK = 90;
const EDGE_SNAP_DISTANCE = 140;

export function useEdgeSnap(options: EdgeSnapOptions) {
  const { autoHideSeconds = 0, closeDelayMs = 0 } = options;
  const [windowState, setWindowState] = useState<WindowState>(() => ({ x: 0, y: 0, isSnapped: true, snappedEdge: 'right', isPeeking: false, isPanelOpen: false, isPinned: false, alwaysOnTop: true, displayMode: 'mascot' }));
  const nativeWindowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  const screenRef = useRef({ width: 1920, height: 1080 });
  const positionRef = useRef({ x: 0, y: 120 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  const getNativeWindow = useCallback(() => { const w = nativeWindowRef.current ?? getCurrentWindow(); nativeWindowRef.current = w; return w; }, []);

  const syncNativePosition = useCallback(async (x: number, y: number) => {
    positionRef.current = { x, y };
    if (!isTauri) return;
    try { await getNativeWindow().setPosition(new LogicalPosition(x, y)); } catch (e) { console.warn('Failed to move widget window:', e); }
  }, [getNativeWindow, isTauri]);

  const resizeNativeWindow = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      const w = getNativeWindow();
      await w.setSize(new LogicalSize(width, height));
      const actual = await w.innerSize();
      const scale = (await w.scaleFactor()) || 1;
      if (Math.abs(actual.width / scale - width) > 2 || Math.abs(actual.height / scale - height) > 2) await w.setSize(new LogicalSize(width, height));
    } catch (e) { console.warn('Failed to resize widget window:', e); }
  }, [getNativeWindow, isTauri]);

  const refreshMonitorBounds = useCallback(async () => {
    if (!isTauri) return;
    const monitor = await getNativeWindow().primaryMonitor();
    if (!monitor) return;
    const scale = monitor.scaleFactor;
    screenRef.current = { width: monitor.workArea.size.width / scale, height: monitor.workArea.size.height / scale };
  }, [getNativeWindow, isTauri]);

  const snapToEdge = useCallback((currX: number, currY: number, width = CLOSED_SIZE.width, height = CLOSED_SIZE.height) => {
    const { width: bw, height: bh } = screenRef.current;
    const maxX = Math.max(0, bw - width), maxY = Math.max(0, bh - height);
    const x = Math.max(0, Math.min(currX, maxX)), y = Math.max(0, Math.min(currY, maxY));
    const cx = x + width / 2, cy = y + height / 2;
    const d = { left: cx, right: bw - cx, top: cy, bottom: bh - cy } as const;
    const edge = (Object.keys(d) as SnapEdge[]).reduce((a, b) => d[a] < d[b] ? a : b);
    return { x, y, edge };
  }, []);

  const getPeekPosition = useCallback((edge: SnapEdge) => {
    const { width: bw, height: bh } = screenRef.current;
    const maxX = Math.max(0, bw - CLOSED_SIZE.width), maxY = Math.max(0, bh - CLOSED_SIZE.height);
    if (edge === 'left') return { x: -EDGE_PEEK, y: Math.max(0, Math.min(positionRef.current.y, maxY)) };
    if (edge === 'right') return { x: bw - CLOSED_SIZE.width + EDGE_PEEK, y: Math.max(0, Math.min(positionRef.current.y, maxY)) };
    if (edge === 'top') return { x: Math.max(0, Math.min(positionRef.current.x, maxX)), y: -EDGE_PEEK };
    return { x: Math.max(0, Math.min(positionRef.current.x, maxX)), y: bh - CLOSED_SIZE.height + EDGE_PEEK };
  }, []);

  const getOpenPosition = useCallback((edge: SnapEdge, preferredX: number, preferredY: number) => {
    const { width: bw, height: bh } = screenRef.current;
    const maxX = Math.max(0, bw - OPEN_SIZE.width), maxY = Math.max(0, bh - OPEN_SIZE.height);
    return { x: edge === 'left' ? 0 : edge === 'right' ? maxX : Math.max(0, Math.min(preferredX, maxX)), y: edge === 'top' ? 0 : edge === 'bottom' ? maxY : Math.max(0, Math.min(preferredY, maxY)) };
  }, []);

  const setOpenWindowPosition = useCallback(async (edge: SnapEdge, preferredX: number, preferredY: number) => {
    const target = getOpenPosition(edge, preferredX, preferredY);
    const w = getNativeWindow();
    await w.setPosition(new LogicalPosition(target.x, target.y));
    positionRef.current = target;
    await resizeNativeWindow(OPEN_SIZE.width, OPEN_SIZE.height);
    await w.setPosition(new LogicalPosition(target.x, target.y));
    positionRef.current = target;
    return target;
  }, [getNativeWindow, getOpenPosition, resizeNativeWindow]);

  const placePeekWidget = useCallback(async (edge: SnapEdge, preferredX: number, preferredY: number) => {
    const { width: bw, height: bh } = screenRef.current;
    const maxX = Math.max(0, bw - CLOSED_SIZE.width), maxY = Math.max(0, bh - CLOSED_SIZE.height);
    let x = Math.max(0, Math.min(preferredX, maxX)), y = Math.max(0, Math.min(preferredY, maxY));
    if (edge === 'left') x = -EDGE_PEEK;
    if (edge === 'right') x = bw - CLOSED_SIZE.width + EDGE_PEEK;
    if (edge === 'top') y = -EDGE_PEEK;
    if (edge === 'bottom') y = bh - CLOSED_SIZE.height + EDGE_PEEK;
    await syncNativePosition(x, y);
    setWindowState(p => ({ ...p, x: 0, y: 0, snappedEdge: edge, isSnapped: true, isPeeking: true }));
  }, [syncNativePosition]);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    (async () => {
      try {
        const w = getNativeWindow();
        await refreshMonitorBounds();
        if (cancelled) return;
        const monitor = await w.primaryMonitor(), scale = monitor?.scaleFactor ?? 1;
        const pos = await w.outerPosition();
        positionRef.current = { x: pos.x / scale, y: pos.y / scale };
        await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
        const snapped = snapToEdge(positionRef.current.x, positionRef.current.y);
        const peek = getPeekPosition(snapped.edge);
        await syncNativePosition(peek.x, peek.y);
        setWindowState(p => ({ ...p, x: 0, y: 0, snappedEdge: snapped.edge, isSnapped: true, isPeeking: true }));
      } catch (e) { console.warn('Failed to initialize widget window:', e); }
    })();
    return () => { cancelled = true; };
  }, [getNativeWindow, getPeekPosition, isTauri, refreshMonitorBounds, resizeNativeWindow, snapToEdge, syncNativePosition]);

  const handleDragEnd = useCallback(async () => {
    if (!isTauri) return;
    try {
      const w = getNativeWindow(), monitor = await w.primaryMonitor(), scale = monitor?.scaleFactor ?? 1, pos = await w.outerPosition();
      const current = { x: pos.x / scale, y: pos.y / scale };
      positionRef.current = current;
      const { width: bw, height: bh } = screenRef.current;
      const maxX = Math.max(0, bw - CLOSED_SIZE.width), maxY = Math.max(0, bh - CLOSED_SIZE.height);
      const x = Math.max(0, Math.min(current.x, maxX)), y = Math.max(0, Math.min(current.y, maxY));
      const snapped = snapToEdge(x, y);
      const distance = Math.min(x, bw - (x + CLOSED_SIZE.width), y, bh - (y + CLOSED_SIZE.height));
      if (distance <= EDGE_SNAP_DISTANCE) await placePeekWidget(snapped.edge, snapped.x, snapped.y);
      else { await syncNativePosition(x, y); setWindowState(p => ({ ...p, x: 0, y: 0, snappedEdge: snapped.edge, isSnapped: false, isPeeking: false })); }
    } catch (e) { console.warn('Failed to position widget after native drag:', e); }
  }, [getNativeWindow, isTauri, placePeekWidget, snapToEdge, syncNativePosition]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (windowState.isPanelOpen) { setWindowState(p => p.isPeeking ? { ...p, isPeeking: false } : p); return; }
    if (autoHideSeconds > 0) idleTimerRef.current = setTimeout(() => setWindowState(p => ({ ...p, isPeeking: true })), autoHideSeconds * 1000);
  }, [autoHideSeconds, windowState.isPanelOpen]);
  useEffect(() => { resetIdleTimer(); }, [resetIdleTimer]);

  const handleMouseEnter = useCallback(() => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); if (closeTimerRef.current) clearTimeout(closeTimerRef.current); setWindowState(p => ({ ...p, isPeeking: false })); }, []);
  const handleMouseLeave = useCallback(() => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); const peek = () => setWindowState(p => p.isPinned || p.isPanelOpen ? p : { ...p, isPeeking: true }); if (closeDelayMs === 0) peek(); else closeTimerRef.current = setTimeout(peek, closeDelayMs); resetIdleTimer(); }, [closeDelayMs, resetIdleTimer]);

  const togglePanel = useCallback(async () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const opening = !windowState.isPanelOpen, edge = windowState.snappedEdge, current = positionRef.current;
    if (opening) {
      await refreshMonitorBounds();
      if (windowState.isSnapped) {
        await setOpenWindowPosition(edge, current.x, current.y);
        setWindowState(p => ({ ...p, x: 0, y: 0, snappedEdge: edge, isSnapped: true, isPeeking: false }));
      } else {
        const target = getOpenPosition(edge, current.x, current.y);
        await setOpenWindowPosition(edge, target.x, target.y);
        setWindowState(p => ({ ...p, x: 0, y: 0, isSnapped: false, isPeeking: false }));
      }
    } else {
      await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
      const peek = getPeekPosition(edge);
      await syncNativePosition(peek.x, peek.y);
      setWindowState(p => ({ ...p, x: 0, y: 0, snappedEdge: edge, isSnapped: true, isPeeking: true }));
    }
    setWindowState(p => ({ ...p, isPanelOpen: opening, isPinned: opening, isPeeking: false }));
  }, [getOpenPosition, getPeekPosition, refreshMonitorBounds, resizeNativeWindow, setOpenWindowPosition, syncNativePosition, windowState.isPanelOpen, windowState.isSnapped, windowState.snappedEdge]);

  const closePanel = useCallback(async () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const edge = windowState.snappedEdge;
    await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
    const peek = getPeekPosition(edge);
    await syncNativePosition(peek.x, peek.y);
    setWindowState(p => ({ ...p, isPanelOpen: false, isPinned: false, isPeeking: true, x: 0, y: 0, isSnapped: true }));
  }, [getPeekPosition, resizeNativeWindow, syncNativePosition, windowState.snappedEdge]);

  const toggleDisplayMode = useCallback(() => setWindowState(p => ({ ...p, displayMode: p.displayMode === 'mascot' ? 'bar' : 'mascot' })), []);

  useEffect(() => {
    const handleResize = async () => {
      if (!isTauri) return;
      try {
        await refreshMonitorBounds();
        const edge = windowState.snappedEdge;
        if (windowState.isPanelOpen && windowState.isSnapped) {
          await setOpenWindowPosition(edge, positionRef.current.x, positionRef.current.y);
        } else if (!windowState.isPanelOpen && windowState.isSnapped) {
          const peek = getPeekPosition(edge);
          await syncNativePosition(peek.x, peek.y);
        } else if (!windowState.isPanelOpen) {
          const maxX = Math.max(0, screenRef.current.width - CLOSED_SIZE.width), maxY = Math.max(0, screenRef.current.height - CLOSED_SIZE.height);
          await syncNativePosition(Math.max(0, Math.min(positionRef.current.x, maxX)), Math.max(0, Math.min(positionRef.current.y, maxY)));
        }
      } catch (e) { console.warn('Failed to handle widget resize:', e); }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getPeekPosition, isTauri, refreshMonitorBounds, setOpenWindowPosition, syncNativePosition, windowState.isPanelOpen, windowState.isSnapped, windowState.snappedEdge]);

  useEffect(() => () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  return { windowState, setWindowState, handleDragEnd, handleMouseEnter, handleMouseLeave, resetIdleTimer, togglePanel, closePanel, toggleDisplayMode };
}
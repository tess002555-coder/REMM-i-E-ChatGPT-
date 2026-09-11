import { useState, useEffect, useCallback, useRef } from 'react';
import { SnapEdge, WindowState } from '../types';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';

interface EdgeSnapOptions {
  autoHideSeconds: number;
  hoverDelayMs?: number;
  closeDelayMs?: number;
  containerBounds?: { width: number; height: number };
  widgetSize?: { width: number; height: number };
  onPeekChange?: (isPeeking: boolean) => void;
}

const CLOSED_SIZE = { width: 180, height: 180 };
const OPEN_SIZE = { width: 520, height: 720 };
const MARGIN = 8;

export function useEdgeSnap(options: EdgeSnapOptions) {
  const { autoHideSeconds = 0, closeDelayMs = 0 } = options;

  const [windowState, setWindowState] = useState<WindowState>(() => ({
    x: 0, y: 0, isSnapped: true, snappedEdge: 'right', isPeeking: false,
    isPanelOpen: false, isPinned: false, alwaysOnTop: true, displayMode: 'bar',
  }));

  const nativeWindowRef = useRef<ReturnType<typeof getCurrentWebviewWindow> | null>(null);
  const screenRef = useRef({ width: 1920, height: 1080 });
  const positionRef = useRef({ x: 0, y: 120 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  const syncNativePosition = useCallback(async (x: number, y: number) => {
    positionRef.current = { x, y };
    if (!isTauri) return;
    try {
      const nativeWindow = nativeWindowRef.current ?? getCurrentWebviewWindow();
      nativeWindowRef.current = nativeWindow;
      await nativeWindow.setPosition(new LogicalPosition(x, y));
    } catch (error) {
      console.warn('Failed to move widget window:', error);
    }
  }, [isTauri]);

  const resizeNativeWindow = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      const nativeWindow = nativeWindowRef.current ?? getCurrentWebviewWindow();
      nativeWindowRef.current = nativeWindow;
      await nativeWindow.setSize(new LogicalSize(width, height));
    } catch (error) {
      console.warn('Failed to resize widget window:', error);
    }
  }, [isTauri]);

  const snapToEdge = useCallback((currX: number, currY: number, width = CLOSED_SIZE.width, height = CLOSED_SIZE.height) => {
    const { width: boundsW, height: boundsH } = screenRef.current;
    const maxX = Math.max(MARGIN, boundsW - width - MARGIN);
    const maxY = Math.max(MARGIN, boundsH - height - MARGIN);
    const x = Math.max(MARGIN, Math.min(currX, maxX));
    const y = Math.max(MARGIN, Math.min(currY, maxY));
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const distances = { left: centerX, right: boundsW - centerX, top: centerY, bottom: boundsH - centerY } as const;
    const edge = (Object.keys(distances) as SnapEdge[]).reduce((a, b) => distances[a] < distances[b] ? a : b);
    if (edge === 'left') return { x: MARGIN, y, edge };
    if (edge === 'right') return { x: maxX, y, edge };
    if (edge === 'top') return { x, y: MARGIN, edge };
    return { x, y: maxY, edge };
  }, []);

  const applyNativeAnchor = useCallback(async (edge: SnapEdge, preferredX: number, preferredY: number, width: number, height: number) => {
    const { width: boundsW, height: boundsH } = screenRef.current;
    const maxX = Math.max(MARGIN, boundsW - width - MARGIN);
    const maxY = Math.max(MARGIN, boundsH - height - MARGIN);
    const x = edge === 'left' ? MARGIN : edge === 'right' ? maxX : Math.max(MARGIN, Math.min(preferredX, maxX));
    const y = edge === 'top' ? MARGIN : edge === 'bottom' ? maxY : Math.max(MARGIN, Math.min(preferredY, maxY));
    await syncNativePosition(x, y);
    const localX = edge === 'right' ? Math.max(0, width - CLOSED_SIZE.width) : (width > CLOSED_SIZE.width ? 50 : 0);
    const localY = edge === 'bottom' ? Math.max(0, height - CLOSED_SIZE.height) : 0;
    setWindowState(prev => ({ ...prev, x: localX, y: localY, snappedEdge: edge, isSnapped: true }));
  }, [syncNativePosition]);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    const setup = async () => {
      try {
        const nativeWindow = getCurrentWebviewWindow();
        nativeWindowRef.current = nativeWindow;
        const monitor = await nativeWindow.primaryMonitor();
        if (monitor && !cancelled) {
          const scale = monitor.scaleFactor;
          screenRef.current = { width: monitor.size.width / scale, height: monitor.size.height / scale };
        }
        const pos = await nativeWindow.outerPosition();
        const scale = monitor?.scaleFactor ?? 1;
        positionRef.current = { x: pos.x / scale, y: pos.y / scale };
        await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
        const snapped = snapToEdge(positionRef.current.x, positionRef.current.y);
        await syncNativePosition(snapped.x, snapped.y);
        setWindowState(prev => ({ ...prev, x: 0, y: 0, snappedEdge: snapped.edge }));
      } catch (error) {
        console.warn('Failed to initialize widget window:', error);
      }
    };
    setup();
    return () => { cancelled = true; };
  }, [isTauri, resizeNativeWindow, snapToEdge, syncNativePosition]);

  const handleDragEnd = useCallback(async () => {
    if (!isTauri) return;
    try {
      const nativeWindow = nativeWindowRef.current ?? getCurrentWebviewWindow();
      nativeWindowRef.current = nativeWindow;
      const monitor = await nativeWindow.primaryMonitor();
      const scale = monitor?.scaleFactor ?? 1;
      const pos = await nativeWindow.outerPosition();
      const current = { x: pos.x / scale, y: pos.y / scale };
      positionRef.current = current;
      const snapped = snapToEdge(current.x, current.y, CLOSED_SIZE.width, CLOSED_SIZE.height);
      await syncNativePosition(snapped.x, snapped.y);
      setWindowState(prev => ({ ...prev, x: 0, y: 0, isSnapped: true, snappedEdge: snapped.edge, isPeeking: false }));
    } catch (error) {
      console.warn('Failed to snap widget after native drag:', error);
    }
  }, [isTauri, snapToEdge, syncNativePosition]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (windowState.isPanelOpen) {
      setWindowState(prev => prev.isPeeking ? { ...prev, isPeeking: false } : prev);
      return;
    }
    if (autoHideSeconds > 0) idleTimerRef.current = setTimeout(() => setWindowState(prev => ({ ...prev, isPeeking: true })), autoHideSeconds * 1000);
  }, [autoHideSeconds, windowState.isPanelOpen]);

  useEffect(() => { resetIdleTimer(); }, [resetIdleTimer]);

  const handleMouseEnter = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setWindowState(prev => ({ ...prev, isPeeking: false }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const setPeek = () => setWindowState(prev => prev.isPinned || prev.isPanelOpen ? prev : { ...prev, isPeeking: true });
    if (closeDelayMs === 0) setPeek();
    else closeTimerRef.current = setTimeout(setPeek, closeDelayMs);
    resetIdleTimer();
  }, [closeDelayMs, resetIdleTimer]);

  const togglePanel = useCallback(async () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const opening = !windowState.isPanelOpen;
    const current = positionRef.current;
    const edge = windowState.snappedEdge;
    if (opening) {
      await resizeNativeWindow(OPEN_SIZE.width, OPEN_SIZE.height);
      await applyNativeAnchor(edge, current.x, current.y, OPEN_SIZE.width, OPEN_SIZE.height);
    } else {
      await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
      await applyNativeAnchor(edge, current.x, current.y, CLOSED_SIZE.width, CLOSED_SIZE.height);
    }
    setWindowState(prev => ({ ...prev, isPanelOpen: opening, isPinned: opening, isPeeking: false }));
  }, [applyNativeAnchor, resizeNativeWindow, windowState.isPanelOpen, windowState.snappedEdge]);

  const closePanel = useCallback(async () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const edge = windowState.snappedEdge;
    await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
    await applyNativeAnchor(edge, positionRef.current.x, positionRef.current.y, CLOSED_SIZE.width, CLOSED_SIZE.height);
    setWindowState(prev => ({ ...prev, isPanelOpen: false, isPinned: false, isPeeking: true }));
  }, [applyNativeAnchor, resizeNativeWindow, windowState.snappedEdge]);

  const toggleDisplayMode = useCallback(() => {
    setWindowState(prev => ({ ...prev, displayMode: (prev.displayMode === 'bar' || prev.displayMode === 'sidebar') ? 'mascot' : 'bar' }));
  }, []);

  useEffect(() => {
    const handleResize = async () => {
      if (!isTauri) return;
      try {
        const nativeWindow = nativeWindowRef.current ?? getCurrentWebviewWindow();
        nativeWindowRef.current = nativeWindow;
        const monitor = await nativeWindow.primaryMonitor();
        if (!monitor) return;
        const scale = monitor.scaleFactor;
        screenRef.current = { width: monitor.size.width / scale, height: monitor.size.height / scale };
        const size = windowState.isPanelOpen ? OPEN_SIZE : CLOSED_SIZE;
        const snapped = snapToEdge(positionRef.current.x, positionRef.current.y, size.width, size.height);
        await syncNativePosition(snapped.x, snapped.y);
        setWindowState(s => ({ ...s, x: snapped.edge === 'right' ? Math.max(0, size.width - CLOSED_SIZE.width) : (size.width > CLOSED_SIZE.width ? 50 : 0), y: snapped.edge === 'bottom' ? Math.max(0, size.height - CLOSED_SIZE.height) : 0, snappedEdge: snapped.edge }));
      } catch (error) {
        console.warn('Failed to handle widget resize:', error);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isTauri, snapToEdge, syncNativePosition, windowState.isPanelOpen]);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return { windowState, setWindowState, handleDragEnd, handleMouseEnter, handleMouseLeave, resetIdleTimer, togglePanel, closePanel, toggleDisplayMode };
}

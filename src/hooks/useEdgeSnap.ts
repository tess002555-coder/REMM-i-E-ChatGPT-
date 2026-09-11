import { useState, useEffect, useCallback, useRef } from 'react';
import { SnapEdge, WindowState } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';
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
const EDGE_PEEK = 90;
const EDGE_SNAP_DISTANCE = 140;
const MARGIN = 0;

export function useEdgeSnap(options: EdgeSnapOptions) {
  const { autoHideSeconds = 0, closeDelayMs = 0 } = options;

  const [windowState, setWindowState] = useState<WindowState>(() => ({
    x: 0, y: 0, isSnapped: true, snappedEdge: 'right', isPeeking: false,
    isPanelOpen: false, isPinned: false, alwaysOnTop: true, displayMode: 'mascot',
  }));

  const nativeWindowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  const screenRef = useRef({ width: 1920, height: 1080 });
  const positionRef = useRef({ x: 0, y: 120 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  const syncNativePosition = useCallback(async (x: number, y: number) => {
    positionRef.current = { x, y };
    if (!isTauri) return;
    try {
      const nativeWindow = nativeWindowRef.current ?? getCurrentWindow();
      nativeWindowRef.current = nativeWindow;
      await nativeWindow.setPosition(new LogicalPosition(x, y));
    } catch (error) {
      console.warn('Failed to move widget window:', error);
    }
  }, [isTauri]);

  const resizeNativeWindow = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      const nativeWindow = nativeWindowRef.current ?? getCurrentWindow();
      nativeWindowRef.current = nativeWindow;
      await nativeWindow.setSize(new LogicalSize(width, height));
    } catch (error) {
      console.warn('Failed to resize widget window:', error);
    }
  }, [isTauri]);

  const snapToEdge = useCallback((currX: number, currY: number, width = CLOSED_SIZE.width, height = CLOSED_SIZE.height) => {
    const { width: boundsW, height: boundsH } = screenRef.current;
    const maxX = Math.max(0, boundsW - width);
    const maxY = Math.max(0, boundsH - height);
    const x = Math.max(0, Math.min(currX, maxX));
    const y = Math.max(0, Math.min(currY, maxY));
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const distances = { left: centerX, right: boundsW - centerX, top: centerY, bottom: boundsH - centerY } as const;
    const edge = (Object.keys(distances) as SnapEdge[]).reduce((a, b) => distances[a] < distances[b] ? a : b);
    return { x, y, edge };
  }, []);

  const getPeekPosition = useCallback((edge: SnapEdge, width = CLOSED_SIZE.width, height = CLOSED_SIZE.height) => {
    const { width: boundsW, height: boundsH } = screenRef.current;
    const maxX = Math.max(0, boundsW - width);
    const maxY = Math.max(0, boundsH - height);

    if (edge === 'left') return { x: -EDGE_PEEK, y: Math.max(0, Math.min(positionRef.current.y, maxY)) };
    if (edge === 'right') return { x: boundsW - width + EDGE_PEEK, y: Math.max(0, Math.min(positionRef.current.y, maxY)) };
    if (edge === 'top') return { x: Math.max(0, Math.min(positionRef.current.x, maxX)), y: -EDGE_PEEK };
    return { x: Math.max(0, Math.min(positionRef.current.x, maxX)), y: boundsH - height + EDGE_PEEK };
  }, []);

  const applyNativeAnchor = useCallback(async (edge: SnapEdge, preferredX: number, preferredY: number, width: number, height: number) => {
    const { width: boundsW, height: boundsH } = screenRef.current;
    const maxX = Math.max(0, boundsW - width);
    const maxY = Math.max(0, boundsH - height);
    const x = edge === 'left' ? 0 : edge === 'right' ? maxX : Math.max(0, Math.min(preferredX, maxX));
    const y = edge === 'top' ? 0 : edge === 'bottom' ? maxY : Math.max(0, Math.min(preferredY, maxY));
    await syncNativePosition(x, y);

    const localX = edge === 'right' ? Math.max(0, width - CLOSED_SIZE.width) : (width > CLOSED_SIZE.width ? 50 : 0);
    const localY = edge === 'bottom' ? Math.max(0, height - CLOSED_SIZE.height) : 0;
    setWindowState(prev => ({ ...prev, x: localX, y: localY, snappedEdge: edge, isSnapped: true }));
  }, [syncNativePosition]);

  const placePeekWidget = useCallback(async (edge: SnapEdge, preferredX: number, preferredY: number) => {
    const { width: boundsW, height: boundsH } = screenRef.current;
    const maxX = Math.max(0, boundsW - CLOSED_SIZE.width);
    const maxY = Math.max(0, boundsH - CLOSED_SIZE.height);
    let x = Math.max(0, Math.min(preferredX, maxX));
    let y = Math.max(0, Math.min(preferredY, maxY));

    if (edge === 'left') x = -EDGE_PEEK;
    if (edge === 'right') x = boundsW - CLOSED_SIZE.width + EDGE_PEEK;
    if (edge === 'top') y = -EDGE_PEEK;
    if (edge === 'bottom') y = boundsH - CLOSED_SIZE.height + EDGE_PEEK;

    await syncNativePosition(x, y);
    setWindowState(prev => ({ ...prev, x: 0, y: 0, snappedEdge: edge, isSnapped: true, isPeeking: true }));
  }, [syncNativePosition]);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    const setup = async () => {
      try {
        const nativeWindow = getCurrentWindow();
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

        const currentX = positionRef.current.x;
        const currentY = positionRef.current.y;
        const snapped = snapToEdge(currentX, currentY);
        const peek = getPeekPosition(snapped.edge);
        await syncNativePosition(peek.x, peek.y);
        setWindowState(prev => ({ ...prev, x: 0, y: 0, snappedEdge: snapped.edge, isSnapped: true, isPeeking: true }));
      } catch (error) {
        console.warn('Failed to initialize widget window:', error);
      }
    };
    setup();
    return () => { cancelled = true; };
  }, [isTauri, getPeekPosition, resizeNativeWindow, snapToEdge, syncNativePosition]);

  const handleDragEnd = useCallback(async () => {
    if (!isTauri) return;
    try {
      const nativeWindow = nativeWindowRef.current ?? getCurrentWindow();
      nativeWindowRef.current = nativeWindow;
      const monitor = await nativeWindow.primaryMonitor();
      const scale = monitor?.scaleFactor ?? 1;
      const pos = await nativeWindow.outerPosition();
      const current = { x: pos.x / scale, y: pos.y / scale };
      positionRef.current = current;

      const { width: boundsW, height: boundsH } = screenRef.current;
      const maxX = Math.max(0, boundsW - CLOSED_SIZE.width);
      const maxY = Math.max(0, boundsH - CLOSED_SIZE.height);
      const clampedX = Math.max(0, Math.min(current.x, maxX));
      const clampedY = Math.max(0, Math.min(current.y, maxY));
      const snapped = snapToEdge(clampedX, clampedY, CLOSED_SIZE.width, CLOSED_SIZE.height);

      // The widget may be dragged freely around the desktop. It only peeks
      // outside the screen when the user releases it close enough to an edge.
      const distanceToEdge = Math.min(
        clampedX,
        boundsW - (clampedX + CLOSED_SIZE.width),
        clampedY,
        boundsH - (clampedY + CLOSED_SIZE.height),
      );

      if (distanceToEdge <= EDGE_SNAP_DISTANCE) {
        await placePeekWidget(snapped.edge, snapped.x, snapped.y);
      } else {
        // Never leave the widget clipped when it is placed in the middle of the screen.
        await syncNativePosition(clampedX, clampedY);
        setWindowState(prev => ({
          ...prev,
          x: 0,
          y: 0,
          snappedEdge: snapped.edge,
          isSnapped: false,
          isPeeking: false,
        }));
      }
    } catch (error) {
      console.warn('Failed to position widget after native drag:', error);
    }
  }, [isTauri, placePeekWidget, snapToEdge, syncNativePosition]);

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
      if (windowState.isSnapped) {
        await applyNativeAnchor(edge, current.x, current.y, OPEN_SIZE.width, OPEN_SIZE.height);
      } else {
        const { width: boundsW, height: boundsH } = screenRef.current;
        const x = Math.max(0, Math.min(current.x, boundsW - OPEN_SIZE.width));
        const y = Math.max(0, Math.min(current.y, boundsH - OPEN_SIZE.height));
        await syncNativePosition(x, y);
        setWindowState(prev => ({ ...prev, x: 0, y: 0 }));
      }
    } else {
      await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
      const peek = getPeekPosition(edge);
      await syncNativePosition(peek.x, peek.y);
      setWindowState(prev => ({ ...prev, x: 0, y: 0, snappedEdge: edge, isSnapped: true, isPeeking: true }));
    }

    setWindowState(prev => ({ ...prev, isPanelOpen: opening, isPinned: opening, isPeeking: false }));
  }, [applyNativeAnchor, getPeekPosition, resizeNativeWindow, syncNativePosition, windowState.isPanelOpen, windowState.isSnapped, windowState.snappedEdge]);

  const closePanel = useCallback(async () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const edge = windowState.snappedEdge;
    await resizeNativeWindow(CLOSED_SIZE.width, CLOSED_SIZE.height);
    const peek = getPeekPosition(edge);
    await syncNativePosition(peek.x, peek.y);
    setWindowState(prev => ({ ...prev, isPanelOpen: false, isPinned: false, isPeeking: true, x: 0, y: 0, isSnapped: true }));
  }, [getPeekPosition, resizeNativeWindow, syncNativePosition, windowState.snappedEdge]);

  const toggleDisplayMode = useCallback(() => {
    setWindowState(prev => ({ ...prev, displayMode: prev.displayMode === 'mascot' ? 'bar' : 'mascot' }));
  }, []);

  useEffect(() => {
    const handleResize = async () => {
      if (!isTauri) return;
      try {
        const nativeWindow = nativeWindowRef.current ?? getCurrentWindow();
        nativeWindowRef.current = nativeWindow;
        const monitor = await nativeWindow.primaryMonitor();
        if (!monitor) return;
        const scale = monitor.scaleFactor;
        screenRef.current = { width: monitor.size.width / scale, height: monitor.size.height / scale };
        const size = windowState.isPanelOpen ? OPEN_SIZE : CLOSED_SIZE;
        const edge = windowState.snappedEdge;

        if (windowState.isPanelOpen) {
          if (windowState.isSnapped) {
            await applyNativeAnchor(edge, positionRef.current.x, positionRef.current.y, size.width, size.height);
          }
        } else if (windowState.isSnapped) {
          const peek = getPeekPosition(edge);
          await syncNativePosition(peek.x, peek.y);
        } else {
          const maxX = Math.max(0, screenRef.current.width - CLOSED_SIZE.width);
          const maxY = Math.max(0, screenRef.current.height - CLOSED_SIZE.height);
          await syncNativePosition(
            Math.max(0, Math.min(positionRef.current.x, maxX)),
            Math.max(0, Math.min(positionRef.current.y, maxY)),
          );
        }
      } catch (error) {
        console.warn('Failed to handle widget resize:', error);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [applyNativeAnchor, getPeekPosition, isTauri, syncNativePosition, windowState.isPanelOpen, windowState.isSnapped, windowState.snappedEdge]);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return { windowState, setWindowState, handleDragEnd, handleMouseEnter, handleMouseLeave, resetIdleTimer, togglePanel, closePanel, toggleDisplayMode };
}

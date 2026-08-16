import { useState, useEffect, useCallback, useRef } from 'react';
import { SnapEdge, WindowState } from '../types';

interface EdgeSnapOptions {
  autoHideSeconds: number;
  hoverDelayMs?: number;
  closeDelayMs?: number;
  containerBounds?: { width: number; height: number };
  widgetSize?: { width: number; height: number };
  onPeekChange?: (isPeeking: boolean) => void;
}

export function useEdgeSnap(options: EdgeSnapOptions) {
  const {
    autoHideSeconds = 0,
    hoverDelayMs = 0,
    closeDelayMs = 0,
    containerBounds,
    widgetSize = { width: 140, height: 160 },
  } = options;

  const [windowState, setWindowState] = useState<WindowState>(() => {
    const initialW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return {
      x: initialW - 160,
      y: 120,
      isSnapped: true,
      snappedEdge: 'right',
      isPeeking: false,
      isPanelOpen: false,
      isPinned: false,
      alwaysOnTop: true,
      displayMode: 'bar',
    };
  });

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getBounds = useCallback(() => {
    return {
      width: containerBounds?.width || (typeof window !== 'undefined' ? window.innerWidth : 1200),
      height: containerBounds?.height || (typeof window !== 'undefined' ? window.innerHeight : 800),
    };
  }, [containerBounds]);

  // Snap to nearest edge logic
  const snapToEdge = useCallback((currX: number, currY: number): { x: number; y: number; edge: SnapEdge } => {
    const { width: boundsW, height: boundsH } = getBounds();
    const wW = widgetSize.width;
    const wH = widgetSize.height;

    // Clamp input coordinates within screen boundaries
    const clampedX = Math.max(0, Math.min(currX, boundsW - wW));
    const clampedY = Math.max(0, Math.min(currY, boundsH - wH));

    // Use center of widget for distance calculation to all 4 screen edges
    const centerX = clampedX + wW / 2;
    const centerY = clampedY + wH / 2;

    const distLeft = centerX;
    const distRight = boundsW - centerX;
    const distTop = centerY;
    const distBottom = boundsH - centerY;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft) {
      return { x: 0, y: clampedY, edge: 'left' };
    } else if (minDist === distRight) {
      return { x: boundsW - wW, y: clampedY, edge: 'right' };
    } else if (minDist === distTop) {
      return { x: clampedX, y: 0, edge: 'top' };
    } else {
      return { x: clampedX, y: boundsH - wH, edge: 'bottom' };
    }
  }, [getBounds, widgetSize]);

  // Handle Drag end
  const handleDragEnd = useCallback((newX: number, newY: number) => {
    const snapped = snapToEdge(newX, newY);
    setWindowState(prev => ({
      ...prev,
      x: snapped.x,
      y: snapped.y,
      isSnapped: true,
      snappedEdge: snapped.edge,
      isPeeking: false,
    }));
  }, [snapToEdge]);

  // Reset idle timer for peek mode
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (windowState.isPanelOpen) {
      setWindowState(prev => (prev.isPeeking ? { ...prev, isPeeking: false } : prev));
      return;
    }

    if (autoHideSeconds > 0) {
      idleTimerRef.current = setTimeout(() => {
        setWindowState(prev => ({ ...prev, isPeeking: true }));
      }, autoHideSeconds * 1000);
    }
  }, [autoHideSeconds, windowState.isPanelOpen]);

  // Start idle timer on mount / configuration change
  useEffect(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Handle Mouse enter / touch hover start on widget
  const handleMouseEnter = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    // Change to ready (idle) pose by disabling peek. Do not open panel on hover.
    setWindowState(prev => ({
      ...prev,
      isPeeking: false,
    }));
  }, []);

  // Handle Mouse leave / touch hover end on widget (Pointing -> Peek transition delay)
  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    
    if (closeDelayMs === 0) {
      setWindowState(prev => {
        if (prev.isPinned || prev.isPanelOpen) return prev;
        return { ...prev, isPeeking: true };
      });
    } else {
      closeTimerRef.current = setTimeout(() => {
        setWindowState(prev => {
          if (prev.isPinned || prev.isPanelOpen) return prev;
          return { ...prev, isPeeking: true };
        });
      }, closeDelayMs);
    }
    
    resetIdleTimer();
  }, [closeDelayMs, resetIdleTimer]);

  // Handle Click / Tap (Pin Open / Toggle)
  const togglePanel = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    setWindowState(prev => {
      const nextPinned = !prev.isPinned;
      return {
        ...prev,
        isPanelOpen: nextPinned,
        isPinned: nextPinned,
        isPeeking: false,
      };
    });
  }, []);

  const closePanel = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    setWindowState(prev => ({
      ...prev,
      isPanelOpen: false,
      isPinned: false,
      isPeeking: true,
    }));
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setWindowState(prev => {
      const current = prev.displayMode;
      const nextMode = (current === 'bar' || current === 'sidebar') ? 'mascot' : 'bar';
      return {
        ...prev,
        displayMode: nextMode,
      };
    });
  }, []);

  // Window resize handler adjustment
  useEffect(() => {
    const handleResize = () => {
      setWindowState(prev => {
        const snapped = snapToEdge(prev.x, prev.y);
        return { ...prev, x: snapped.x, y: snapped.y, snappedEdge: snapped.edge };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snapToEdge]);

  // Clean timer
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return {
    windowState,
    setWindowState,
    handleDragEnd,
    handleMouseEnter,
    handleMouseLeave,
    resetIdleTimer,
    togglePanel,
    closePanel,
    toggleDisplayMode,
  };
}

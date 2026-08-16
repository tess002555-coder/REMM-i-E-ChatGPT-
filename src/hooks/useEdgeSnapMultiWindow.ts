import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SnapEdge, CharacterConfig } from '../types';
import { LocalDataService } from '../utils/db';

interface UseEdgeSnapMultiWindowOptions {
  config?: CharacterConfig;
  onPanelToggle?: (isOpen: boolean) => void;
}

export function useEdgeSnapMultiWindow(options: UseEdgeSnapMultiWindowOptions = {}) {
  const { config } = options;
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  const [snappedEdge, setSnappedEdge] = useState<SnapEdge>('right');
  const [isPeeking, setIsPeeking] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'mascot' | 'bar' | 'sidebar'>(() => config?.displayMode || 'bar');

  // Fallback coordinate state for browser preview mode
  const [browserPos, setBrowserPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 180 : 800,
    y: 120,
  }));

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset idle peek timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const autoHideSec = config?.autoHideSeconds ?? 5;
    if (autoHideSec > 0 && !isPanelOpen) {
      idleTimerRef.current = setTimeout(() => {
        setIsPeeking(true);
      }, autoHideSec * 1000);
    }
  }, [config?.autoHideSeconds, isPanelOpen]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Start OS native window drag for Tauri
  const startDragging = useCallback(async (e?: React.MouseEvent | React.PointerEvent) => {
    if (isTauri) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const win = getCurrentWebviewWindow();
        await win.startDragging();
      } catch (err) {
        console.warn('Native dragging not available:', err);
      }
    }
  }, [isTauri]);

  // Snap to edge calculation on drag release
  const snapToEdge = useCallback(async () => {
    if (isTauri) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { currentMonitor } = await import('@tauri-apps/api/window');
        const { LogicalPosition } = await import('@tauri-apps/api/dpi');
        const win = getCurrentWebviewWindow();
        
        const monitor = await currentMonitor();
        const outerPos = await win.outerPosition();
        
        if (monitor) {
          const scale = monitor.scaleFactor || 1;
          const monWidth = monitor.size.width / scale;
          const monHeight = monitor.size.height / scale;
          const monX = monitor.position.x / scale;
          const monY = monitor.position.y / scale;

          const currentX = (outerPos.x / scale) - monX;
          const currentY = (outerPos.y / scale) - monY;

          const widgetWidth = 220;
          const widgetHeight = 220;

          // Determine whether closer to left or right edge
          const isRight = (currentX + widgetWidth / 2) > (monWidth / 2);
          const edge: SnapEdge = isRight ? 'right' : 'left';
          
          const targetX = isRight ? Math.max(0, monWidth - widgetWidth - 10) : 10;
          const targetY = Math.max(10, Math.min(monHeight - widgetHeight - 10, currentY));

          await win.setPosition(new LogicalPosition(monX + targetX, monY + targetY));
          setSnappedEdge(edge);
          setIsPeeking(false);
        }
      } catch (err) {
        console.warn('Tauri edge snap error:', err);
      }
    } else {
      // Browser preview snap
      const screenW = window.innerWidth;
      const isRight = browserPos.x > screenW / 2;
      const edge: SnapEdge = isRight ? 'right' : 'left';
      const targetX = isRight ? screenW - 180 : 10;
      setBrowserPos(prev => ({ ...prev, x: targetX }));
      setSnappedEdge(edge);
      setIsPeeking(false);
    }
  }, [isTauri, browserPos.x]);

  // Toggle Panel Window (Multi-window coordinator)
  const togglePanel = useCallback(async () => {
    if (isTauri) {
      try {
        const { WebviewWindow, getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { currentMonitor } = await import('@tauri-apps/api/window');
        const { LogicalPosition } = await import('@tauri-apps/api/dpi');
        
        const panelWin = await WebviewWindow.getByLabel('panel');
        if (!panelWin) {
          console.warn('Panel window not found');
          return;
        }

        const isVisible = await panelWin.isVisible();
        if (isVisible) {
          await panelWin.hide();
          setIsPanelOpen(false);
        } else {
          // Position panel directly adjacent to mascot
          const mascotWin = getCurrentWebviewWindow();
          const mascotPos = await mascotWin.outerPosition();
          const monitor = await currentMonitor();
          
          if (monitor) {
            const scale = monitor.scaleFactor || 1;
            const monWidth = monitor.size.width / scale;
            const monHeight = monitor.size.height / scale;
            const monX = monitor.position.x / scale;
            const monY = monitor.position.y / scale;

            const mascotX = (mascotPos.x / scale) - monX;
            const mascotY = (mascotPos.y / scale) - monY;

            const panelWidth = 400;
            const panelHeight = 600;

            // Position to the left if mascot is near right edge, or to the right if mascot is near left edge
            const placeLeft = (mascotX + 110) > (monWidth / 2);
            let panelX = placeLeft ? (mascotX - panelWidth - 10) : (mascotX + 220 + 10);
            
            // Boundary checks
            panelX = Math.max(10, Math.min(monWidth - panelWidth - 10, panelX));
            const panelY = Math.max(10, Math.min(monHeight - panelHeight - 10, mascotY - 20));

            await panelWin.setPosition(new LogicalPosition(monX + panelX, monY + panelY));
            await panelWin.show();
            await panelWin.setFocus();
            setIsPanelOpen(true);
          }
        }
      } catch (err) {
        console.warn('Toggle panel error:', err);
      }
    } else {
      setIsPanelOpen(prev => !prev);
    }
  }, [isTauri]);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode(prev => {
      const next = prev === 'bar' ? 'mascot' : prev === 'mascot' ? 'sidebar' : 'bar';
      LocalDataService.saveCharacterConfig({
        ...LocalDataService.getCharacterConfig(),
        displayMode: next,
      });
      return next;
    });
  }, []);

  return {
    snappedEdge,
    isPeeking,
    isPanelOpen,
    displayMode,
    browserPos,
    setBrowserPos,
    setIsPeeking,
    startDragging,
    snapToEdge,
    togglePanel,
    toggleDisplayMode,
    resetIdleTimer,
  };
}


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

  // Apply OS window movement for Peek state
  const applyPeekState = useCallback(async (peeking: boolean, edge?: SnapEdge) => {
    if (!isTauri) return;
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const { currentMonitor } = await import('@tauri-apps/api/window');
      const { LogicalPosition } = await import('@tauri-apps/api/dpi');
      const win = getCurrentWebviewWindow();
      const monitor = await currentMonitor();

      if (monitor) {
        const scale = monitor.scaleFactor || 1;
        const monWidth = monitor.size.width / scale;
        const monHeight = monitor.size.height / scale;
        const monX = monitor.position.x / scale;
        const monY = monitor.position.y / scale;

        const outerPos = await win.outerPosition();
        const currentY = Math.max(10, Math.min(monHeight - 180 - 10, (outerPos.y / scale) - monY));
        const currentX = (outerPos.x / scale) - monX;

        const currentEdge = edge || (currentX + 90 > monWidth / 2 ? 'right' : 'left');

        const mascotWidth = 180;
        const peekVisibleWidth = 60; // Leaves 60px of the mascot peek visible

        if (peeking) {
          if (currentEdge === 'right') {
            // Screen Right Peek: Window starts at monWidth - 60 (leaving 60px on screen)
            const targetX = monWidth - peekVisibleWidth;
            await win.setPosition(new LogicalPosition(monX + targetX, monY + currentY));
          } else {
            // Screen Left Peek: Window starts at -120 (leaving 60px on screen)
            const targetX = -(mascotWidth - peekVisibleWidth);
            await win.setPosition(new LogicalPosition(monX + targetX, monY + currentY));
          }
        } else {
          // Un-peek (full visible)
          if (currentEdge === 'right') {
            const targetX = monWidth - mascotWidth - 10;
            await win.setPosition(new LogicalPosition(monX + targetX, monY + currentY));
          } else {
            const targetX = 10;
            await win.setPosition(new LogicalPosition(monX + targetX, monY + currentY));
          }
        }
      }
    } catch (err) {
      console.warn('Apply peek error:', err);
    }
  }, [isTauri]);

  // Un-peek handler (onMouseEnter or click)
  const unPeek = useCallback(() => {
    setIsPeeking(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    applyPeekState(false, snappedEdge);
  }, [applyPeekState, snappedEdge]);

  // Reset idle peek timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const autoHideSec = config?.autoHideSeconds ?? 5;
    if (autoHideSec > 0 && !isPanelOpen) {
      idleTimerRef.current = setTimeout(() => {
        setIsPeeking(true);
        applyPeekState(true, snappedEdge);
      }, autoHideSec * 1000);
    }
  }, [config?.autoHideSeconds, isPanelOpen, applyPeekState, snappedEdge]);

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

          const widgetWidth = 180;
          const widgetHeight = 180;

          // Determine whether closer to left or right edge
          const isRight = (currentX + widgetWidth / 2) > (monWidth / 2);
          const edge: SnapEdge = isRight ? 'right' : 'left';
          
          const targetX = isRight ? Math.max(10, monWidth - widgetWidth - 10) : 10;
          const targetY = Math.max(10, Math.min(monHeight - widgetHeight - 10, currentY));

          await win.setPosition(new LogicalPosition(monX + targetX, monY + targetY));
          setSnappedEdge(edge);
          setIsPeeking(false);
          resetIdleTimer();
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
      resetIdleTimer();
    }
  }, [isTauri, browserPos.x, resetIdleTimer]);

  // Toggle Panel Window (Multi-window coordinator)
  const togglePanel = useCallback(async () => {
    if (isTauri) {
      try {
        const { WebviewWindow, getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { currentMonitor } = await import('@tauri-apps/api/window');
        const { LogicalPosition } = await import('@tauri-apps/api/dpi');
        const { emit } = await import('@tauri-apps/api/event');
        
        let panelWin = await WebviewWindow.getByLabel('panel');
        if (!panelWin) {
          panelWin = new WebviewWindow('panel', {
            url: 'index.html?window=panel',
            title: 'Remember ME Panel',
            width: 420,
            height: 620,
            resizable: false,
            decorations: false,
            transparent: true,
            alwaysOnTop: true,
            shadow: false,
            skipTaskbar: true,
            visible: false,
            dragDropEnabled: false,
          });
        }

        const isVisible = await panelWin.isVisible();
        if (isVisible) {
          await panelWin.hide();
          setIsPanelOpen(false);
          await emit('panel-state-changed', { isOpen: false });
          resetIdleTimer();
        } else {
          // Unpeek mascot before opening panel
          unPeek();

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

            const panelWidth = 420;
            const panelHeight = 620;

            // Position to the left if mascot is near right edge, or to the right if mascot is near left edge
            const placeLeft = (mascotX + 90) > (monWidth / 2);
            let panelX = placeLeft ? (mascotX - panelWidth - 10) : (mascotX + 180 + 10);
            
            // Boundary checks
            panelX = Math.max(10, Math.min(monWidth - panelWidth - 10, panelX));
            const panelY = Math.max(10, Math.min(monHeight - panelHeight - 10, mascotY - 20));

            await panelWin.setPosition(new LogicalPosition(monX + panelX, monY + panelY));
            await panelWin.show();
            await panelWin.setFocus();
            setIsPanelOpen(true);
            await emit('panel-state-changed', { isOpen: true });
          }
        }
      } catch (err) {
        console.warn('Toggle panel error:', err);
      }
    } else {
      setIsPanelOpen(prev => !prev);
    }
  }, [isTauri, unPeek, resetIdleTimer]);

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
    unPeek,
    startDragging,
    snapToEdge,
    togglePanel,
    toggleDisplayMode,
    resetIdleTimer,
  };
}


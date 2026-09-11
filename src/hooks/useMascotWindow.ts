import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';

const MASCOT = 180;
const PANEL_W = 520;
const PANEL_H = 720;
const PEEK = 90;
const SNAP = 140;

type Edge = 'left' | 'right' | 'top' | 'bottom';
type WindowMode = 'mascot' | 'panel';
interface Bounds { x: number; y: number; width: number; height: number; scale: number; }

export function useMascotWindow() {
  const win = getCurrentWindow();
  const [mode, setMode] = useState<WindowMode>('mascot');
  const [edge, setEdge] = useState<Edge>('right');
  const bounds = useRef<Bounds>({ x: 0, y: 0, width: 1920, height: 1080, scale: 1 });
  const lastPosition = useRef({ x: 0, y: 200 });
  const dragging = useRef(false);
  const movedDuringDrag = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readBounds = useCallback(async () => {
    const monitor = await win.currentMonitor();
    if (!monitor) return;
    const scale = monitor.scaleFactor || 1;
    bounds.current = {
      x: monitor.workArea.position.x / scale,
      y: monitor.workArea.position.y / scale,
      width: monitor.workArea.size.width / scale,
      height: monitor.workArea.size.height / scale,
      scale,
    };
  }, [win]);

  const move = useCallback(async (x: number, y: number) => {
    lastPosition.current = { x, y };
    await win.setPosition(new LogicalPosition(x, y));
  }, [win]);

  const resize = useCallback(async (width: number, height: number) => {
    await win.setSize(new LogicalSize(width, height));
  }, [win]);

  const peekPosition = useCallback((e: Edge) => {
    const b = bounds.current;
    const maxX = Math.max(b.x, b.x + b.width - MASCOT);
    const maxY = Math.max(b.y, b.y + b.height - MASCOT);
    const y = Math.max(b.y, Math.min(lastPosition.current.y, maxY));
    const x = Math.max(b.x, Math.min(lastPosition.current.x, maxX));
    if (e === 'left') return { x: b.x - PEEK, y };
    if (e === 'right') return { x: b.x + b.width - MASCOT + PEEK, y };
    if (e === 'top') return { x, y: b.y - PEEK };
    return { x, y: b.y + b.height - MASCOT + PEEK };
  }, []);

  const applyPeek = useCallback(async (e: Edge) => {
    const p = peekPosition(e);
    await resize(MASCOT, MASCOT);
    await move(p.x, p.y);
    setEdge(e);
    setMode('mascot');
  }, [move, peekPosition, resize]);

  const openPanel = useCallback(async () => {
    if (movedDuringDrag.current) {
      movedDuringDrag.current = false;
      return;
    }
    await readBounds();
    const b = bounds.current;
    const maxX = b.x + Math.max(0, b.width - PANEL_W);
    const maxY = b.y + Math.max(0, b.height - PANEL_H);
    let x = lastPosition.current.x;
    let y = lastPosition.current.y;
    if (edge === 'left') x = b.x;
    if (edge === 'right') x = maxX;
    if (edge === 'top') y = b.y;
    if (edge === 'bottom') y = maxY;
    x = Math.max(b.x, Math.min(x, maxX));
    y = Math.max(b.y, Math.min(y, maxY));
    await move(x, y);
    await resize(PANEL_W, PANEL_H);
    await move(x, y);
    lastPosition.current = { x, y };
    setMode('panel');
  }, [edge, move, readBounds, resize]);

  const closePanel = useCallback(async () => {
    await readBounds();
    await resize(MASCOT, MASCOT);
    const p = peekPosition(edge);
    await move(p.x, p.y);
    setMode('mascot');
  }, [edge, move, peekPosition, readBounds, resize]);

  const beginDrag = useCallback(async () => {
    if (mode !== 'mascot') return;
    movedDuringDrag.current = false;
    dragging.current = true;
    await win.startDragging();
  }, [mode, win]);

  const snapAfterDrag = useCallback(async () => {
    if (!dragging.current || mode !== 'mascot') return;
    dragging.current = false;
    await readBounds();
    const b = bounds.current;
    const p = await win.outerPosition();
    const scale = (await win.scaleFactor()) || 1;
    const current = { x: p.x / scale, y: p.y / scale };
    const maxX = b.x + Math.max(0, b.width - MASCOT);
    const maxY = b.y + Math.max(0, b.height - MASCOT);
    const x = Math.max(b.x, Math.min(current.x, maxX));
    const y = Math.max(b.y, Math.min(current.y, maxY));
    const distances = { left: x - b.x, right: maxX - x, top: y - b.y, bottom: maxY - y } as Record<Edge, number>;
    const nearest = (Object.keys(distances) as Edge[]).reduce((a, e) => distances[e] < distances[a] ? e : a, 'left');
    lastPosition.current = { x, y };
    if (distances[nearest] <= SNAP) await applyPeek(nearest);
    else await move(x, y);
  }, [applyPeek, mode, move, readBounds, win]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await readBounds();
        if (!active) return;
        await resize(MASCOT, MASCOT);
        const b = bounds.current;
        const start = { x: b.x + b.width - MASCOT + PEEK, y: b.y + b.height / 2 - MASCOT / 2 };
        lastPosition.current = start;
        await move(start.x, start.y);
      } catch (error) {
        console.warn('Mascot initialization failed:', error);
      }
    })();

    let unlisten: (() => void) | undefined;
    void win.onMoved(() => {
      if (!dragging.current || mode !== 'mascot') return;
      movedDuringDrag.current = true;
      if (snapTimer.current) clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => { void snapAfterDrag(); }, 180);
    }).then((fn) => { unlisten = fn; });

    return () => {
      active = false;
      if (snapTimer.current) clearTimeout(snapTimer.current);
      unlisten?.();
    };
  }, [mode, move, readBounds, resize, snapAfterDrag, win]);

  return { mode, edge, beginDrag, openPanel, closePanel };
}

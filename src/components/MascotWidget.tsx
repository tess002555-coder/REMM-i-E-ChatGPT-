import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CharacterState, SnapEdge, CharacterConfig, TaskItem } from '../types';
import { MessageSquare } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface MascotWidgetProps {
  state: CharacterState;
  snappedEdge: SnapEdge;
  isPeeking: boolean;
  isPanelOpen: boolean;
  displayMode?: 'sidebar' | 'mascot' | 'bar';
  config: CharacterConfig;
  pendingDeadlines: TaskItem[];
  position: { x: number; y: number };
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragEnd: (x: number, y: number) => void;
  onToggleDisplayMode?: () => void;
  onSpeakSpeech?: (text: string) => void;
  screenWidth?: number;
}

export const MascotWidget: React.FC<MascotWidgetProps> = ({
  state,
  snappedEdge,
  isPeeking,
  isPanelOpen,
  config,
  pendingDeadlines,
  position,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragEnd,
  onSpeakSpeech,
}) => {
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const lastQuoteRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  // Transparent mascot image asset from public
  const imageSrc = config.customImageUrls?.avatar || '/mascot.png';

  useEffect(() => {
    if (!config.speechEnabled) {
      setSpeechText(null);
      lastQuoteRef.current = null;
      return;
    }

    let quote = '';
    if (pendingDeadlines.length > 0 || state === 'alert') {
      const topTask = pendingDeadlines[0];
      quote = topTask
        ? `⚠️ Pengingat H-Jam: "${topTask.title}" mendekati batas waktu!`
        : '⚠️ Ada tugas atau jadwal yang perlu segera diselesaikan!';
    } else if (state === 'pointing' || isPanelOpen) {
      quote = '👉 Denia menunjuk tabel jadwal & tugasmu di samping!';
    } else if (state === 'idle') {
      quote = '✨ Denia siap membantu! Klik aku ya~';
    } else {
      quote = '👀 Denia selalu siap mendampingi aktivitas harianmu~';
    }

    setSpeechText(quote);
    if (onSpeakSpeech && quote && lastQuoteRef.current !== quote) {
      lastQuoteRef.current = quote;
      onSpeakSpeech(quote);
    }
  }, [state, isPanelOpen, pendingDeadlines, config.speechEnabled, onSpeakSpeech]);

  // Native Tauri drag handler
  const handleTauriMouseDown = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isTauri || event.button !== 0 || isPanelOpen) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (error) {
      console.warn('Failed to start native mascot drag:', error);
    }
  };

  return (
    <motion.div
      drag={!isTauri}
      dragMomentum={false}
      dragElastic={0.06}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={(_e, info) => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 120);
        onDragEnd(info.point.x, info.point.y);
      }}
      animate={{
        x: !isTauri && isPeeking && !isHovered && !isPanelOpen
          ? (snappedEdge === 'right' ? 85 : -85)
          : 0,
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      style={
        !isTauri
          ? {
              position: 'fixed',
              left: position?.x ?? 800,
              top: position?.y ?? 100,
            }
          : undefined
      }
      className={`z-50 w-[180px] h-[180px] m-0 p-0 bg-transparent select-none ${
        isTauri ? 'fixed left-0 top-0' : 'cursor-grab active:cursor-grabbing'
      }`}
      data-tauri-drag-region
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave();
      }}
      onMouseDown={handleTauriMouseDown}
      onClick={() => {
        if (isDraggingRef.current) return;
        onClick();
      }}
    >
      {/* Mascot Speech Bubble */}
      {config.speechEnabled && speechText && (isHovered || pendingDeadlines.length > 0) && !isPanelOpen && (
        <div
          className={`absolute bottom-full mb-2 max-w-[200px] w-max min-w-[140px] p-2.5 rounded-2xl bg-slate-950/95 border border-cyan-400/50 shadow-2xl text-xs text-slate-100 pointer-events-none z-30 transition-all ${
            snappedEdge === 'right' ? 'right-2' : 'left-2'
          }`}
        >
          <div className="flex items-start gap-1.5">
            <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-snug text-[11.5px]">{speechText}</p>
          </div>
        </div>
      )}

      {/* Mascot Image & Alert Badge */}
      <div
        className="relative w-[180px] h-[180px] flex items-center justify-center bg-transparent"
        data-tauri-drag-region
      >
        <img
          src={imageSrc}
          alt="Mascot Character"
          className="w-[180px] h-[180px] object-contain select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
          draggable={false}
        />

        {(state === 'alert' || pendingDeadlines.length > 0) && (
          <div
            className="absolute top-4 right-4 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900 animate-pulse pointer-events-none shadow-lg shadow-amber-400/50"
            title="Ada tugas mendekati deadline!"
          />
        )}
      </div>
    </motion.div>
  );
};

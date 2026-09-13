import React, { useState, useEffect, useRef } from 'react';
import { CharacterState, SnapEdge, CharacterConfig, TaskItem } from '../types';
import { MessageSquare } from 'lucide-react';

interface MascotWidgetProps {
  state: CharacterState;
  snappedEdge: SnapEdge;
  isPeeking: boolean;
  isPanelOpen: boolean;
  displayMode?: 'sidebar' | 'mascot' | 'bar';
  config: CharacterConfig;
  pendingDeadlines: TaskItem[];
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragStart?: () => void;
  onDragEnd: (x: number, y: number) => void;
  onToggleDisplayMode?: () => void;
  onSpeakSpeech?: (text: string) => void;
  position: { x: number; y: number };
  screenWidth?: number;
}

export const MascotWidget: React.FC<MascotWidgetProps> = ({
  state,
  snappedEdge,
  isPeeking,
  isPanelOpen,
  config,
  pendingDeadlines,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
  onSpeakSpeech,
}) => {
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const lastQuoteRef = useRef<string | null>(null);
  const dragActiveRef = useRef(false);

  const imageSrc = '/mascot.png';

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

  const finishDrag = () => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    onDragEnd(0, 0);
  };

  const handleMouseDown = () => {
    if (isPanelOpen) return;
    dragActiveRef.current = true;
    onDragStart?.();
  };

  useEffect(() => {
    window.addEventListener('mouseup', finishDrag);
    return () => window.removeEventListener('mouseup', finishDrag);
  });

  return (
    <div
      className="interactive-widget fixed left-0 top-0 z-50 w-[180px] h-[180px] m-0 p-0 bg-transparent select-none"
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave();
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={finishDrag}
      onClick={onClick}
    >
      {config.speechEnabled && speechText && (isHovered || pendingDeadlines.length > 0) && !isPanelOpen && (
        <div
          className={`absolute bottom-full mb-2 max-w-[180px] w-max min-w-[140px] p-2.5 rounded-2xl bg-slate-950/95 border border-cyan-400/50 shadow-xl text-xs text-slate-100 pointer-events-none z-30 ${
            snappedEdge === 'right' ? 'right-2' : 'left-2'
          }`}
        >
          <div className="flex items-start gap-1.5">
            <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-snug text-[11.5px]">{speechText}</p>
          </div>
        </div>
      )}

      <div className="relative w-[180px] h-[180px] flex items-center justify-center bg-transparent cursor-grab active:cursor-grabbing">
        <img
          src={imageSrc}
          alt="Mascot Character"
          className="w-[180px] h-[180px] object-contain select-none pointer-events-none"
          draggable={false}
        />
        {(state === 'alert' || pendingDeadlines.length > 0) && (
          <div className="absolute top-3 right-3 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
};

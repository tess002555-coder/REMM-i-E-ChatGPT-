import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterState, SnapEdge, CharacterConfig, TaskItem } from '../types';
import { ImageIcon, MessageSquare, SlidersHorizontal, Sparkles } from 'lucide-react';

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
  onDragEnd: (x: number, y: number) => void;
  onToggleDisplayMode?: () => void;
  onSpeakSpeech?: (text: string) => void;
  position: { x: number; y: number };
  screenWidth?: number;
}

export const MascotWidget: React.FC<MascotWidgetProps> = ({
  state, snappedEdge, isPeeking, isPanelOpen, displayMode = 'bar', config,
  pendingDeadlines, onClick, onMouseEnter, onMouseLeave, onDragEnd,
  onToggleDisplayMode, onSpeakSpeech, position, screenWidth,
}) => {
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const lastQuoteRef = useRef<string | null>(null);
  const currentScreenWidth = screenWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isRightEdge = snappedEdge === 'right' || (position.x + 70 > currentScreenWidth / 2);

  const getImageForState = (): string => {
    if (config?.customImageUrls?.[state]) return config.customImageUrls[state]!;
    if (config?.avatarUrl) return config.avatarUrl;
    return '/mascot.png';
  };
  const imageSrc = getImageForState();

  useEffect(() => {
    if (!config.speechEnabled) {
      setSpeechText(null);
      lastQuoteRef.current = null;
      return;
    }
    let quote = '';
    if (pendingDeadlines.length > 0 || state === 'alert') {
      const topTask = pendingDeadlines[0];
      quote = topTask ? `⚠️ Pengingat H-Jam: "${topTask.title}" mendekati batas waktu!` : '⚠️ Ada tugas atau jadwal perkuliahan yang perlu segera diselesaikan!';
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

  const handleNativeDragEnd = () => {
    onDragEnd(0, 0);
  };

  if (displayMode === 'sidebar' || displayMode === 'bar') {
    return (
      <motion.div
        animate={{ x: position.x, y: position.y, scale: isHovered ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="interactive-widget fixed z-50 inline-block bg-transparent p-0 m-0 cursor-grab active:cursor-grabbing select-none interactive-element"
        style={{ left: 0, top: 0 }}
        data-tauri-drag-region
        onMouseEnter={() => { setIsHovered(true); onMouseEnter(); }}
        onMouseLeave={() => { setIsHovered(false); onMouseLeave(); }}
        onMouseUp={handleNativeDragEnd}
        onClick={onClick}
      >
        <div className="relative flex flex-col items-center justify-between w-10 py-3 px-1.5 rounded-full bg-slate-950/95 border border-cyan-500/50 shadow-xl transition-all gap-2" data-tauri-drag-region>
          <div className="w-2 h-10 rounded-full bg-gradient-to-b from-white via-cyan-300 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
          <div className="relative w-7 h-7 rounded-full overflow-hidden bg-cyan-950/40 flex items-center justify-center border border-cyan-400/60">
            {imageSrc ? <img src={imageSrc} alt="Mascot" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} /> : <Sparkles className="w-3.5 h-3.5 text-cyan-300" />}
            {pendingDeadlines.length > 0 && <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </div>
          <div className="flex flex-col gap-1 opacity-70 my-0.5 pointer-events-none"><div className="w-1 h-1 rounded-full bg-cyan-200/80" /><div className="w-1 h-1 rounded-full bg-cyan-200/80" /><div className="w-1 h-1 rounded-full bg-cyan-200/80" /></div>
          {onToggleDisplayMode && <button type="button" onClick={(e) => { e.stopPropagation(); onToggleDisplayMode(); }} title="Ganti Tampilan Widget" className="p-1 rounded-full text-cyan-300/80 hover:text-cyan-200 cursor-pointer"><SlidersHorizontal className="w-3.5 h-3.5" /></button>}
          <AnimatePresence>
            {isHovered && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute ${isRightEdge ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 border border-cyan-400/40 text-cyan-300 text-xs shadow-xl pointer-events-none z-50`}>Bilah Sisi • Klik Buka Tasks</motion.div>}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={{ x: position.x, y: position.y, scale: isHovered ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="interactive-widget fixed z-50 inline-flex flex-col items-center select-none interactive-element"
      style={{ left: 0, top: 0 }}
      data-tauri-drag-region
      onMouseEnter={() => { setIsHovered(true); onMouseEnter(); }}
      onMouseLeave={() => { setIsHovered(false); onMouseLeave(); }}
      onMouseUp={handleNativeDragEnd}
      onClick={onClick}
    >
      <AnimatePresence>
        {speechText && (isHovered || pendingDeadlines.length > 0) && <motion.div initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.9 }} className={`absolute bottom-full mb-2 max-w-[180px] w-max min-w-[140px] p-2.5 rounded-2xl bg-slate-950/95 border border-cyan-400/50 shadow-xl text-xs text-slate-100 pointer-events-none z-30 ${isRightEdge ? 'right-2' : 'left-2'}`}><div className="flex items-start gap-1.5"><MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /><p className="leading-snug text-[11.5px]">{speechText}</p></div></motion.div>}
      </AnimatePresence>

      <div className="clickable relative w-36 h-36 flex items-center justify-center bg-transparent p-0 m-0" data-tauri-drag-region>
        {imageSrc ? <img src={imageSrc} alt="Mascot Character" className="w-32 h-32 object-contain select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]" draggable={false} /> : <div className="w-32 h-32 flex flex-col items-center justify-center gap-1 text-cyan-300 text-center"><div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center"><ImageIcon className="w-6 h-6" /></div><span className="text-[11px] font-bold text-white">Belum Ada Gambar</span></div>}
        {(state === 'alert' || pendingDeadlines.length > 0) && <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 animate-pulse pointer-events-none" />}
        {onToggleDisplayMode && <button type="button" onClick={(e) => { e.stopPropagation(); onToggleDisplayMode(); }} title="Kembali ke Mode Bar" className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-950/90 text-cyan-400 border border-cyan-500/50 shadow-lg cursor-pointer z-20"><SlidersHorizontal className="w-3.5 h-3.5" /></button>}
      </div>
    </motion.div>
  );
};

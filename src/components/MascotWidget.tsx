import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterState, SnapEdge, CharacterConfig, TaskItem } from '../types';
import { Sparkles, BellRing, MessageSquare, ShieldCheck, ImageIcon, Eye } from 'lucide-react';

interface MascotWidgetProps {
  state: CharacterState;
  snappedEdge: SnapEdge;
  isPeeking: boolean;
  isPanelOpen: boolean;
  displayMode?: 'sidebar' | 'mascot';
  config: CharacterConfig;
  pendingDeadlines: TaskItem[];
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragEnd: (x: number, y: number) => void;
  onToggleDisplayMode?: () => void;
  onSpeakSpeech?: (text: string) => void;
  position: { x: number; y: number };
}

export const MascotWidget: React.FC<MascotWidgetProps> = ({
  state,
  snappedEdge,
  isPeeking,
  isPanelOpen,
  displayMode = 'mascot',
  config,
  pendingDeadlines,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragEnd,
  onToggleDisplayMode,
  onSpeakSpeech,
  position,
}) => {
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const lastQuoteRef = useRef<string | null>(null);

  // Manual Tauri window dragging handler
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      try {
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().startDragging();
        }
      } catch (err) {
        console.warn('Tauri startDragging error:', err);
      }
    }
  };

  // Determine actual image source based on user config (returns null if no image imported)
  const getImageForState = (): string | null => {
    if (config?.customImageUrls?.[state]) {
      return config.customImageUrls[state]!;
    }
    if (config?.avatarUrl) {
      return config.avatarUrl;
    }
    return null;
  };

  const imageSrc = getImageForState();

  // Denia Speech Quotes based on 3 distinct states & deadlines
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
        : '⚠️ Ada tugas atau jadwal perkuliahan yang perlu segera diselesaikan!';
    } else if (state === 'pointing' || isPanelOpen) {
      quote = '👉 Denia menunjuk tabel jadwal & tugasmu di samping!';
    } else if (state === 'idle') {
      quote = '✨ Denia siap membantu! Klik aku ya~';
    } else {
      // state === 'peek' (Mengintip)
      const quotes = [
        '👀 Denia mengintip dari tepi layar... Sentuh icon untuk buka tabel!',
        '👀 Denia selalu siap mendampingi aktivitas harianmu~',
        '👀 Ada tugas kampus atau rutinitas baru yang ingin dicatat?',
        '👀 Jangan lupa istirahat & minum air putih ya~',
      ];
      quote = quotes[Math.floor(Math.random() * quotes.length)];
    }

    setSpeechText(quote);

    if (config.speechEnabled && onSpeakSpeech && quote && lastQuoteRef.current !== quote) {
      lastQuoteRef.current = quote;
      onSpeakSpeech(quote);
    }
  }, [state, isPanelOpen, pendingDeadlines, config.speechEnabled, onSpeakSpeech]);

  // ----------------------------------------------------
  // MODE 1: BILAH SISI (SIDEBAR HANDLE) - SLEEK MINIMAL
  // ----------------------------------------------------
  if (displayMode === 'sidebar') {
    return (
      <div
        className="inline-block bg-transparent p-0 m-0 cursor-grab active:cursor-grabbing relative select-none"
        data-tauri-drag-region
        onMouseDown={handleMouseDown}
        onMouseEnter={() => {
          setIsHovered(true);
          onMouseEnter();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onMouseLeave();
        }}
        onClick={onClick}
      >
        {/* Sleek Edge Handle Container */}
        <div
          className="relative flex flex-col items-center justify-between w-10 py-3 px-1.5 rounded-full bg-slate-950/90 border border-cyan-500/50 shadow-xl transition-all gap-2"
          data-tauri-drag-region
        >
          {/* Glowing White/Cyan Vertical Handle Bar */}
          <div className="w-2 h-10 rounded-full bg-gradient-to-b from-white via-cyan-300 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />

          {/* Mascot Avatar Circle */}
          <div className="relative w-7 h-7 rounded-full overflow-hidden select-none bg-cyan-950/40 flex items-center justify-center border border-cyan-400/60 shadow-sm">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Mascot"
                className="w-full h-full object-cover pointer-events-none select-none"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            )}
            {pendingDeadlines.length > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
            )}
          </div>

          {/* Grip dots */}
          <div className="flex flex-col gap-1 opacity-70 my-0.5 pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-cyan-200/80" />
            <div className="w-1 h-1 rounded-full bg-cyan-200/80" />
            <div className="w-1 h-1 rounded-full bg-cyan-200/80" />
          </div>

          {/* Quick Toggle Button */}
          {onToggleDisplayMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDisplayMode();
              }}
              title="Ganti Tampilan Widget"
              className="p-1 rounded-full text-cyan-300/80 hover:text-cyan-200 hover:scale-110 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Tooltip on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-full ml-2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 border border-cyan-400/40 text-cyan-300 text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-none z-50"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Bilah Sisi &bull; Klik Buka Tasks</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MODE 2: PURE TRANSPARENT MASCOT VIEW (NO FRAME / NO BOX)
  // ----------------------------------------------------
  // Calculate peek offset when in peek mode: Denia shows ~55% of her body (hides ~45% behind the edge)
  const getPeekOffset = () => {
    if (!isPeeking || isPanelOpen || isHovered) {
      return { x: 0, y: 0 };
    }
    // Total mascot widget width is 144px (w-36).
    // Hiding 65px (45%) leaves ~79px (55%) visible on screen.
    const hideOffset = 65;
    switch (snappedEdge) {
      case 'left':
        return { x: -hideOffset, y: 0 };
      case 'right':
        return { x: hideOffset, y: 0 };
      case 'top':
        return { x: 0, y: -hideOffset };
      case 'bottom':
        return { x: 0, y: hideOffset };
      default:
        return { x: hideOffset, y: 0 };
    }
  };

  const peekOffset = getPeekOffset();

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        onDragEnd(position.x + info.offset.x, position.y + info.offset.y);
      }}
      animate={{
        x: position.x + peekOffset.x,
        y: position.y + peekOffset.y,
        scale: isHovered ? 1.05 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
      className="interactive-widget fixed z-50 inline-flex flex-col items-center select-none"
      style={{ left: 0, top: 0 }}
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave();
      }}
      onClick={onClick}
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {speechText && (isHovered || pendingDeadlines.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-2xl bg-slate-950/95 border border-cyan-400/50 shadow-xl backdrop-blur-md text-xs text-slate-100 font-sans pointer-events-none z-30"
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{speechText}</p>
            </div>
            {/* Bubble Tail */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Element Container - 100% Transparent, No Backgrounds, No Borders */}
      <div
        className="clickable relative w-36 h-36 flex items-center justify-center bg-transparent p-0 m-0 transition-transform duration-200"
        data-tauri-drag-region
      >
        {/* Render Mascot Image or Fallback */}
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Mascot Character"
            className="w-32 h-32 object-contain select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
            referrerPolicy="no-referrer"
            draggable={false}
            data-tauri-drag-region
            onDragStart={(e) => e.preventDefault()}
          />
        ) : (
          <div
            className="w-32 h-32 flex flex-col items-center justify-center gap-1 text-cyan-300 text-center select-none"
            data-tauri-drag-region
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shadow-lg">
              <ImageIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-[11px] font-bold text-white tracking-tight drop-shadow-md">Belum Ada Gambar</span>
            <span className="text-[9px] text-cyan-400 font-medium drop-shadow">Klik & Pengaturan &rarr; Impor</span>
          </div>
        )}

        {/* Subtle Alert Notification Glow Dot (Only when there is an active alert) */}
        {(state === 'alert' || pendingDeadlines.length > 0) && (
          <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(251,191,36,1)] animate-pulse pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
};

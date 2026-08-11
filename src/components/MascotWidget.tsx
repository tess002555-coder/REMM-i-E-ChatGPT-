import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterState, SnapEdge, CharacterConfig, TaskItem } from '../types';
import { Sparkles, BellRing, MessageSquare, ShieldCheck, ImageIcon } from 'lucide-react';

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

  const winW = typeof window !== 'undefined' ? window.screen.availWidth : 1200;
  const winH = typeof window !== 'undefined' ? window.screen.availHeight : 800;

  // ----------------------------------------------------
  // MODE 1: BILAH SISI (SIDEBAR HANDLE) - MIUI/HYPEROS STYLE
  // ----------------------------------------------------
  if (displayMode === 'sidebar') {
    const barX = snappedEdge === 'left' ? 12 : winW - 38;

    return (
      <motion.div
        className="fixed z-50 select-none cursor-grab active:cursor-grabbing group"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          left: barX,
          top: position.y,
          x: 0,
          y: 0,
          scale: isHovered ? 1.05 : 1,
          opacity: 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        drag="y"
        dragConstraints={{
          top: -position.y + 64,
          bottom: winH - position.y - 140 - 40,
        }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          onDragEnd(position.x, position.y + info.offset.y);
        }}
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
        {/* Sleek Edge Handle Container (Pill Style) */}
        <div className="relative flex flex-col items-center justify-between w-10 py-3 px-1.5 rounded-full bg-[#0B0E17]/95 backdrop-blur-2xl border border-cyan-500/50 shadow-[0_8px_32px_rgba(0,0,0,0.85)] group-hover:border-cyan-400 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.5)] transition-all gap-2">
          {/* Glowing White/Cyan Vertical Handle Bar */}
          <div className="w-2 h-10 rounded-full bg-gradient-to-b from-white via-cyan-300 to-cyan-500 shadow-[0_0_14px_rgba(34,211,238,0.9)] group-hover:h-11 transition-all duration-300" />

          {/* Mascot Avatar Circle or Sparkle Ring Indicator */}
          <div className="relative w-7 h-7 rounded-full overflow-hidden shadow-md pointer-events-none select-none bg-cyan-950/40 flex items-center justify-center border border-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
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

          {/* Vertical Grip Indicator Dots (...) */}
          <div className="flex flex-col gap-1 opacity-70 group-hover:opacity-100 transition-opacity my-0.5">
            <div className="w-1 h-1 rounded-full bg-cyan-200/80" />
            <div className="w-1 h-1 rounded-full bg-cyan-200/80" />
            <div className="w-1 h-1 rounded-full bg-cyan-200/80" />
          </div>

          {/* Quick Toggle / Sparkle Button */}
          {onToggleDisplayMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDisplayMode();
              }}
              title="Ganti Tampilan Widget"
              className="p-1 rounded-full text-cyan-300/80 hover:text-cyan-200 hover:scale-110 hover:bg-cyan-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Hover Floating Tooltip */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: snappedEdge === 'right' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: snappedEdge === 'right' ? -10 : 10 }}
                className={`absolute top-1/2 -translate-y-1/2 ${
                  snappedEdge === 'right' ? 'right-full mr-3' : 'left-full ml-3'
                } whitespace-nowrap px-3 py-1.5 rounded-xl bg-[#121216]/95 border border-cyan-400/40 text-cyan-300 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none z-50`}
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Bilah Sisi (Kotak Alat) &bull; Klik Buka Tasks</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Peek Mode style for unclicked state (Menempel pada sisi layar sampai setengah nya / 50% hidden offscreen)
  const getPeekOffset = () => {
    if (!isPeeking || isPanelOpen || isHovered) return { x: 0, y: 0 };

    const widgetW = 144; // w-36 (144px)
    const widgetH = 144; // h-36 (144px)
    const halfW = widgetW / 2; // 72px (setengah nya)
    const halfH = widgetH / 2; // 72px (setengah nya)

    switch (snappedEdge) {
      case 'right':
        return { x: (winW - halfW) - position.x, y: 0 };
      case 'left':
        return { x: -halfW - position.x, y: 0 };
      case 'top':
        return { x: 0, y: -halfH - position.y };
      case 'bottom':
        return { x: 0, y: (winH - halfH) - position.y };
      default:
        return { x: (winW - halfW) - position.x, y: 0 };
    }
  };

  const peekOffset = getPeekOffset();

  // ----------------------------------------------------
  // MODE 2: MASCOT AVATAR VIEW (STATIC, NO IDLE ANIMATIONS)
  // ----------------------------------------------------
  return (
    <motion.div
      className="fixed z-50 select-none cursor-grab active:cursor-grabbing group"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        left: position.x,
        top: position.y,
        x: peekOffset.x,
        y: peekOffset.y,
        scale: isHovered ? 1.05 : isPanelOpen ? 1 : 0.95,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      drag
      dragConstraints={{
        left: -position.x + 10,
        right: winW - position.x - 150,
        top: -position.y + 10,
        bottom: winH - position.y - 150,
      }}
      dragElastic={0.05}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        onDragEnd(position.x + info.offset.x, position.y + info.offset.y);
      }}
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
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 p-2.5 rounded-2xl bg-[#18181C]/95 border border-cyan-400/50 shadow-[0_10px_25px_rgba(0,0,0,0.6)] backdrop-blur-md text-xs text-slate-100 font-sans pointer-events-none z-30"
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{speechText}</p>
            </div>
            {/* Bubble Tail */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#18181C]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Mascot Container (Static, No Idle Animations) */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Glow Effects */}
        <div
          className={`absolute inset-1 rounded-full blur-xl transition-all duration-300 ${
            state === 'alert' || pendingDeadlines.length > 0
              ? 'bg-amber-500/50 scale-110'
              : 'bg-cyan-500/20 scale-105'
          }`}
        />

        {/* Character Image Wrapper / Placeholder */}
        <div
          className={`relative w-32 h-32 rounded-3xl overflow-hidden shadow-2xl transition-all pointer-events-none select-none bg-[#121216] border border-cyan-500/40 flex flex-col items-center justify-center text-center p-2.5 ${
            state === 'alert' || pendingDeadlines.length > 0
              ? 'shadow-amber-500/30 border-amber-500/50'
              : isHovered || isPanelOpen
              ? 'shadow-cyan-500/30 border-cyan-400/80'
              : ''
          }`}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Mascot Character"
              className="w-full h-full object-cover pointer-events-none select-none"
              referrerPolicy="no-referrer"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-cyan-300 pointer-events-none">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-md">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[11px] font-bold text-white tracking-tight">Belum Ada Gambar</span>
              <span className="text-[9px] text-cyan-400/90 font-medium">Klik & Pengaturan &rarr; Impor</span>
            </div>
          )}

          {/* Status Badge Tag */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/70 text-[10px] text-cyan-300 backdrop-blur-sm border border-cyan-500/30">
            {state === 'alert' || pendingDeadlines.length > 0 ? (
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <BellRing className="w-2.5 h-2.5" /> Alert!
              </span>
            ) : isPeeking ? (
              <span className="text-slate-400">Peek</span>
            ) : (
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> Denia
              </span>
            )}
          </div>

          {/* Bottom Edge Marker for docked view */}
          {isPeeking && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-400 to-cyan-400" />
          )}
        </div>

        {/* Toggle to Sidebar Mode Button on Hover */}
        {isHovered && onToggleDisplayMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDisplayMode();
            }}
            title="Ganti ke Tampilan Bilah Sisi (Garis Tipis Edge)"
            className="absolute -top-1 -right-1 p-1.5 rounded-full bg-[#121216] border border-cyan-400/80 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 shadow-xl transition-all z-20"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

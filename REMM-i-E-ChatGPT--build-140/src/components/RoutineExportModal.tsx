import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { RoutineItem, CharacterConfig } from '../types';
import {
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  Calendar,
  Trophy,
  Flame,
  X,
  Palette,
  Award,
  Zap,
  Quote,
  ImageIcon
} from 'lucide-react';

interface RoutineExportModalProps {
  routine: RoutineItem;
  config?: CharacterConfig;
  onClose: () => void;
}

type CardTheme = 'cyberpunk' | 'sakura' | 'emerald' | 'sunset' | 'minimal';

const CARD_THEMES: Record<CardTheme, {
  id: CardTheme;
  name: string;
  bgClass: string;
  cardStyle: React.CSSProperties;
  titleColor: string;
  subTextColor: string;
  accentBadge: string;
  gridDotActive: string;
  gridDotInactive: string;
  footerTag: string;
}> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    bgClass: 'bg-[#0B0F19]',
    cardStyle: {
      background: 'radial-gradient(circle at 10% 20%, rgba(6, 182, 212, 0.25) 0%, rgba(15, 23, 42, 0.98) 80%)',
      borderColor: '#06B6D4',
    },
    titleColor: 'text-cyan-300',
    subTextColor: 'text-slate-300',
    accentBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
    gridDotActive: 'bg-cyan-400 border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.9)] text-slate-950',
    gridDotInactive: 'bg-slate-800/80 text-slate-500 border-slate-700/50',
    footerTag: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/40',
  },
  sakura: {
    id: 'sakura',
    name: 'Soft Sakura',
    bgClass: 'bg-[#FFF0F5]',
    cardStyle: {
      background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4E1 50%, #FFD1DC 100%)',
      borderColor: '#FFB6C1',
    },
    titleColor: 'text-rose-900',
    subTextColor: 'text-rose-700',
    accentBadge: 'bg-rose-100 text-rose-800 border-rose-300',
    gridDotActive: 'bg-rose-500 border-rose-200 shadow-[0_0_8px_rgba(244,63,94,0.6)] text-white',
    gridDotInactive: 'bg-white/80 text-rose-300 border-rose-200',
    footerTag: 'border-rose-300 text-rose-800 bg-rose-50/80',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Gold',
    bgClass: 'bg-[#062C1E]',
    cardStyle: {
      background: 'radial-gradient(circle at 90% 10%, rgba(16, 185, 129, 0.3) 0%, rgba(4, 44, 30, 0.98) 80%)',
      borderColor: '#10B981',
    },
    titleColor: 'text-emerald-300',
    subTextColor: 'text-emerald-100/80',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    gridDotActive: 'bg-emerald-400 border-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.9)] text-slate-950',
    gridDotInactive: 'bg-emerald-950/80 text-emerald-700 border-emerald-800/50',
    footerTag: 'border-emerald-500/30 text-emerald-300 bg-emerald-950/60',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    bgClass: 'bg-[#2A0826]',
    cardStyle: {
      background: 'linear-gradient(135deg, #2A0826 0%, #4A1235 50%, #631B37 100%)',
      borderColor: '#F43F5E',
    },
    titleColor: 'text-amber-200',
    subTextColor: 'text-rose-200/80',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    gridDotActive: 'bg-amber-400 border-amber-100 shadow-[0_0_8px_rgba(251,191,36,0.9)] text-slate-950',
    gridDotInactive: 'bg-rose-950/60 text-rose-800 border-rose-900/40',
    footerTag: 'border-amber-500/30 text-amber-300 bg-purple-950/60',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Dark',
    bgClass: 'bg-[#121214]',
    cardStyle: {
      background: '#16161A',
      borderColor: '#3F3F46',
    },
    titleColor: 'text-white',
    subTextColor: 'text-gray-300',
    accentBadge: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    gridDotActive: 'bg-white border-zinc-300 text-slate-950 font-bold',
    gridDotInactive: 'bg-zinc-900 text-zinc-600 border-zinc-800',
    footerTag: 'border-zinc-700 text-zinc-400 bg-zinc-900',
  },
};

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const RoutineExportModal: React.FC<RoutineExportModalProps> = ({
  routine,
  config,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('cyberpunk');
  const [customQuote, setCustomQuote] = useState('Konsisten setiap hari membawa perubahan nyata! 🚀');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  // Routine Stats Calculations
  const logs = routine.dailyLogs || {};
  const loggedDates = Object.keys(logs).filter(k => logs[k] && logs[k].trim().length > 0);
  const totalLogs = loggedDates.length;

  // Calculate current month's completion
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const currentMonthLogs = loggedDates.filter(d => d.startsWith(currentMonthPrefix));
  const currentMonthDaysPassed = Math.min(now.getDate(), daysInCurrentMonth);
  const monthConsistencyPercent = currentMonthDaysPassed > 0
    ? Math.round((currentMonthLogs.length / currentMonthDaysPassed) * 100)
    : 0;

  // Level Badge based on logged dates
  let levelBadge = '🌱 Novice Habit Builder';
  let levelColor = 'text-emerald-400';
  if (totalLogs >= 30) {
    levelBadge = '👑 Habit Legend';
    levelColor = 'text-amber-400';
  } else if (totalLogs >= 15) {
    levelBadge = '🔥 Consistency Master';
    levelColor = 'text-cyan-400';
  } else if (totalLogs >= 5) {
    levelBadge = '⚡ Steady Achiever';
    levelColor = 'text-purple-400';
  }

  const activeTheme = CARD_THEMES[selectedTheme];

  // Download image handler
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `Rutinitas_${routine.title.replace(/\s+/g, '_')}_REMMiE.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Image to Clipboard or Share
  const handleShareOrCopy = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `Rutinitas_${routine.title}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Pencapaian Rutinitas: ${routine.title}`,
          text: `Saya sudah konsisten menjalankan rutinitas ${routine.title} sebanyak ${totalLogs} hari! 🚀 #HabitTracker #REMMiE`,
          files: [file],
        });
      } else if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        // Fallback: download
        handleDownloadImage();
      }
    } catch (err) {
      console.error('Failed share:', err);
      handleDownloadImage();
    } finally {
      setIsExporting(false);
    }
  };

  // Copy caption text
  const handleCopyCaption = () => {
    const caption = `🔥 Pencapaian Rutinitas Saya: "${routine.title}"\n\n` +
      `📅 Total Hari Tercatat: ${totalLogs} Hari\n` +
      `⚡ Konsistensi Bulan Ini: ${monthConsistencyPercent}%\n` +
      `🏆 Level: ${levelBadge}\n` +
      `💬 "${customQuote}"\n\n` +
      `Lacak & bangun kebiasaanmu bersama REMM(i)E! 🚀 #HabitTracker #Consistency #REMMiE`;

    navigator.clipboard.writeText(caption);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const avatarSrc = config?.avatarUrl || config?.customImageUrls?.avatar || null;
  const userName = config?.name || 'Maskot Denia';
  const projectName = config?.projectName || 'REMM(i)E';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="relative w-full max-w-xl rounded-3xl bg-[#16161A] border border-[#2A2A2E] p-4 sm:p-6 text-white shadow-2xl space-y-4 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E]">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-cyan-300">Ekspor Kartu Pencapaian Medsos</h3>
                <p className="text-[11px] text-gray-400">Bagikan bukti konsistensimu di Instagram, WhatsApp, X, & Story!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#2A2A2E] text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pilih Tema Desain Kartu</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {Object.values(CARD_THEMES).map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTheme(t.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all text-center ${
                    selectedTheme === t.id
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold shadow-md'
                      : 'border-[#2A2A2E] bg-[#0F0F12] text-gray-400 hover:text-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Quote Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kutipan / Motto Personal</span>
            </label>
            <input
              type="text"
              value={customQuote}
              onChange={e => setCustomQuote(e.target.value)}
              placeholder="Tulis pesan atau mottomu..."
              className="w-full bg-[#0F0F12] border border-[#2A2A2E] rounded-xl px-3 py-1.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* PREVIEW CARD CONTAINER TO BE DOWNLOADED */}
          <div className="flex justify-center py-2 overflow-x-auto">
            <div
              ref={cardRef}
              style={activeTheme.cardStyle}
              className={`w-[360px] sm:w-[400px] rounded-3xl p-5 border-2 shadow-2xl relative space-y-4 shrink-0 transition-all font-sans`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full border-2 border-white/60 shadow-md overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Mascot Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-white/80" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold tracking-wider uppercase text-white/90">
                      {projectName}
                    </h4>
                    <p className={`text-[10px] font-medium ${activeTheme.subTextColor}`}>
                      {userName}
                    </p>
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${activeTheme.accentBadge}`}>
                  <Sparkles className="w-3 h-3" />
                  <span>CONSISTENCY PROOF</span>
                </div>
              </div>

              {/* Routine Title & Description */}
              <div className="space-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${activeTheme.subTextColor}`}>
                  RUTINITAS
                </span>
                <h2 className={`text-xl font-black leading-tight ${activeTheme.titleColor}`}>
                  {routine.title}
                </h2>
                {routine.description && (
                  <p className={`text-xs italic line-clamp-2 ${activeTheme.subTextColor}`}>
                    "{routine.description}"
                  </p>
                )}
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="p-2.5 rounded-2xl bg-black/20 border border-white/10 text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-1 text-red-400">
                    <Flame className="w-3.5 h-3.5 fill-red-400" />
                    <span className="text-[10px] font-bold uppercase">LOGS</span>
                  </div>
                  <div className="text-lg font-black text-white">{totalLogs} Hari</div>
                  <div className="text-[9px] text-white/60">Tercatat</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-black/20 border border-white/10 text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-1 text-cyan-400">
                    <Zap className="w-3.5 h-3.5 fill-cyan-400" />
                    <span className="text-[10px] font-bold uppercase">BULAN INI</span>
                  </div>
                  <div className="text-lg font-black text-cyan-300">{monthConsistencyPercent}%</div>
                  <div className="text-[9px] text-white/60">Konsistensi</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-black/20 border border-white/10 text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-1 text-amber-400">
                    <Award className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="text-[10px] font-bold uppercase">LEVEL</span>
                  </div>
                  <div className={`text-xs font-bold truncate mt-1 ${levelColor}`}>
                    {levelBadge.replace(/^[^\s]+\s*/, '')}
                  </div>
                  <div className="text-[9px] text-white/60">Habit Rating</div>
                </div>
              </div>

              {/* Monthly Heatmap Dot Grid */}
              <div className="p-3 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-white/90">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Aktivitas {MONTH_NAMES_ID[currentMonth]} {currentYear}</span>
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">
                    {currentMonthLogs.length}/{daysInCurrentMonth} Hari
                  </span>
                </div>

                {/* 7-column calendar grid */}
                <div className="grid grid-cols-7 gap-1 pt-1">
                  {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dayStr = String(dayNum).padStart(2, '0');
                    const monthStr = String(currentMonth + 1).padStart(2, '0');
                    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
                    const hasLog = Boolean(logs[dateKey] && logs[dateKey].trim().length > 0);

                    return (
                      <div
                        key={dateKey}
                        className={`h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                          hasLog ? activeTheme.gridDotActive : activeTheme.gridDotInactive
                        }`}
                        title={hasLog ? `Hari ${dayNum}: ${logs[dateKey]}` : `Hari ${dayNum}`}
                      >
                        {dayNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Personal Quote */}
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs italic font-medium text-white/90">
                  "{customQuote}"
                </p>
              </div>

              {/* Footer Watermark */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                <div className={`px-2 py-0.5 rounded-lg border font-mono font-bold ${activeTheme.footerTag}`}>
                  @{projectName}
                </div>
                <span className="text-white/60 font-medium">
                  Habit Tracker & Productivity Companion
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#2A2A2E]">
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="py-2.5 px-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Memproses...' : 'Unduh Gambar (PNG)'}</span>
            </button>

            <button
              onClick={handleShareOrCopy}
              disabled={isExporting}
              className="py-2.5 px-3 rounded-2xl bg-[#2A2A2E] hover:bg-[#323238] text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{copiedImage ? 'Gambar Disalin!' : 'Bagikan / Salin Gambar'}</span>
            </button>

            <button
              onClick={handleCopyCaption}
              className="py-2.5 px-3 rounded-2xl bg-[#2A2A2E] hover:bg-[#323238] text-white font-bold text-xs border border-[#3A3A40] transition-all flex items-center justify-center gap-2"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? 'Teks Disalin!' : 'Salin Caption Teks'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

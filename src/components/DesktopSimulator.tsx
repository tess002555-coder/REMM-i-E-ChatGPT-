import React, { useState, useEffect } from 'react';
import { Terminal, Sliders, Server, Monitor, Maximize2, Minimize2, Sparkles, Clock, Volume2, ShieldAlert, Download } from 'lucide-react';

interface DesktopSimulatorProps {
  children: React.ReactNode;
  onOpenTauriConfig: () => void;
  onOpenSettings: () => void;
  onOpenSync: () => void;
  onOpenInstallModal?: () => void;
  pendingDeadlinesCount: number;
  snappedEdge: string;
  isPeeking: boolean;
}

export const DesktopSimulator: React.FC<DesktopSimulatorProps> = ({
  children,
  onOpenTauriConfig,
  onOpenSettings,
  onOpenSync,
  onOpenInstallModal,
  pendingDeadlinesCount,
  snappedEdge,
  isPeeking,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wallpaper, setWallpaper] = useState<'android' | 'transparent' | 'cyber'>('android');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getWallpaperClass = () => {
    switch (wallpaper) {
      case 'transparent':
        return 'bg-slate-950/20';
      case 'cyber':
        return 'bg-gradient-to-br from-slate-950 via-cyan-950/40 to-slate-900';
      case 'android':
      default:
        return 'bg-gradient-to-b from-slate-900 via-indigo-950/80 to-slate-950';
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${getWallpaperClass()} text-slate-100 select-none flex flex-col font-sans`}>
      {/* Background Grid Pattern & Ambient Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#2A2A2E15_1px,transparent_1px),linear-gradient(to_bottom,#2A2A2E15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Floating Control Bar */}
      <header className="relative z-30 p-3 flex items-center justify-between bg-[#0A0A0B]/80 backdrop-blur-md border-b border-[#2A2A2E]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>REMEMBER ME</span>
            <span className="text-[10px] font-mono font-normal text-gray-500">v1.0 (TAURI + REACT)</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
            <span className="px-2 py-0.5 rounded bg-[#121214] border border-[#2A2A2E]">EDGE: {snappedEdge.toUpperCase()}</span>
            {isPeeking && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">PEEKING</span>}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {pendingDeadlinesCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/40 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{pendingDeadlinesCount} Deadline H-1!</span>
            </div>
          )}

          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-cyan-500/30 to-purple-500/20 hover:from-cyan-500/30 border border-cyan-400/60 text-xs text-cyan-300 transition-all font-bold shadow-sm"
              title="Pasang sebagai Aplikasi (PWA / Android / iOS / Desktop)"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pasang App</span>
            </button>
          )}

          <button
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#2A2A2E] text-xs text-gray-200 transition-all font-medium"
            title="Integrasi API Google Calendar & Notion"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Sync API</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#2A2A2E] text-xs text-gray-200 transition-all font-medium"
            title="Pengaturan Suara & Maskot"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Settings</span>
          </button>

          <button
            onClick={onOpenTauriConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
            title="Lihat Kode & Konfigurasi Tauri"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Kode Tauri</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Workspace for Floating Widget */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Screen Edge Snap Guides */}
        <div className="absolute inset-2 border-2 border-dashed border-cyan-500/10 rounded-3xl pointer-events-none flex items-center justify-center">
          <p className="text-slate-600/40 text-xs font-medium tracking-widest uppercase">
            Windows Desktop Canvas • Seret Denia ke tepi mana saja untuk Snap-to-Edge
          </p>
        </div>

        {/* Children (Mascot & Task Panel) */}
        {children}
      </main>

      {/* Bottom Windows Taskbar Simulation */}
      <footer className="relative z-30 h-10 px-4 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold cursor-default">
            <Monitor className="w-4 h-4" />
            <span>Android Floating Overlay Mode</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1 text-[11px]">
            <span>Latar Layar:</span>
            {(['android', 'transparent', 'cyber'] as const).map(wp => (
              <button
                key={wp}
                onClick={() => setWallpaper(wp)}
                className={`px-1.5 py-0.5 rounded capitalize ${
                  wallpaper === wp ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {wp}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>
              {currentTime.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

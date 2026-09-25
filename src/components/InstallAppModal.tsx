import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Smartphone,
  Laptop,
  Apple,
  Chrome,
  Share,
  PlusSquare,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Globe,
  Monitor,
  ImageIcon
} from 'lucide-react';

interface InstallAppModalProps {
  onClose: () => void;
  onOpenTauriModal?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  onClose,
  onOpenTauriModal,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'exe' | 'pwa' | 'ios' | 'desktop'>('exe');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed as PWA)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone ||
      document.referrer.includes('android-app://')
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Error installing PWA:', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl rounded-3xl bg-[#16161A] border border-[#2A2A2E] p-5 sm:p-7 text-white shadow-2xl space-y-5 my-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#2A2A2E] text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Banner */}
          <div className="flex items-center gap-4 border-b border-[#2A2A2E] pb-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border-2 border-cyan-400 shadow-lg flex items-center justify-center shrink-0">
              <Download className="w-7 h-7 text-cyan-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>PWA & DESKTOP INSTALLER</span>
              </div>
              <h3 className="text-lg font-black text-white">Pasang REMM(i)E Sebagai Aplikasi</h3>
              <p className="text-xs text-gray-400">
                Akses cepat dari HP & Laptop tanpa perlu buka browser setiap kali!
              </p>
            </div>
          </div>

          {/* Direct 1-Click Install Button if PWA Prompt Ready */}
          {deferredPrompt && !isInstalled && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-cyan-500/30 to-purple-500/20 border border-cyan-400 shadow-xl space-y-2 text-center"
            >
              <p className="text-xs font-bold text-cyan-200 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Browser Anda mendukung Pemasangan Langsung 1-Klik!</span>
              </p>
              <button
                onClick={handleInstallPWA}
                className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <Download className="w-5 h-5" />
                <span>Pasang Aplikasi REMM(i)E Sekarang</span>
              </button>
            </motion.div>
          )}

          {/* Status if already installed */}
          {isInstalled && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Aplikasi REMM(i)E sudah terpasang dan berjalan dalam mode aplikasi mandiri (Standalone App)!</span>
            </div>
          )}

          {/* Tabs for Different Devices */}
          <div className="space-y-3">
            <div className="flex border-b border-[#2A2A2E] text-xs font-bold gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => setActiveTab('exe')}
                className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'exe'
                    ? 'border-purple-400 text-purple-300 font-black'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4 text-purple-400" />
                <span>Windows EXE (.exe)</span>
              </button>
              <button
                onClick={() => setActiveTab('pwa')}
                className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'pwa'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Android & Chrome</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'ios'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Apple className="w-4 h-4 text-rose-400" />
                <span>iOS (iPhone/iPad)</span>
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'desktop'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span>Browser PWA</span>
              </button>
            </div>

            {/* TAB 0: WINDOWS EXE */}
            {activeTab === 'exe' && (
              <div className="p-4 rounded-2xl bg-[#0F0F12] border border-purple-500/40 space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-purple-300">
                  <span className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-purple-400" />
                    <span>Cara Membuat / Download File Executable (.exe):</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/40">
                    Tauri + Rust
                  </span>
                </div>

                <div className="space-y-2.5 text-gray-300 leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] space-y-1.5">
                    <p className="font-bold text-purple-200">⚡ Opsi 1: Build Otomatis via GitHub Actions (Sangat Mudah)</p>
                    <p className="text-gray-400">
                      Workflow GitHub Actions sudah siap di repository (<code className="text-purple-300">.github/workflows/build-exe.yml</code>). Cukup Export/Push proyek ke GitHub Anda, maka GitHub akan otomatis mengompilasi dan menyediakan file installer <code className="text-purple-300">.exe</code> di halaman <strong className="text-white">Releases</strong> dan tab <strong className="text-white">Actions &rarr; Artifacts</strong>!
                    </p>
                    <p className="text-[10px] text-emerald-300/90 bg-emerald-950/30 p-1.5 rounded border border-emerald-800/40">
                      ✅ <strong>Header Icon Windows Resource Compiler:</strong> File <code className="text-emerald-300">icon.ico</code> kini telah dikonversi ke format <em>Uncompressed DIB (Device-Independent Bitmap)</em> 32-bit standar Microsoft Win32, sehingga 100% kompatibel tanpa error RC2176.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1.5">
                    <p className="font-bold text-cyan-300">💻 Opsi 2: Build Manual di Komputer Windows Anda</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300 pl-1">
                      <li>Download ZIP proyek ini dari AI Studio.</li>
                      <li>Buka Command Prompt / PowerShell di folder proyek.</li>
                      <li>
                        Ketik command berikut:
                        <div className="mt-1 p-2 rounded-lg bg-[#0A0A0C] border border-[#2A2A2E] font-mono text-[11px] text-cyan-300 select-all">
                          npm install && npx tauri build
                        </div>
                      </li>
                      <li>
                        File installer <code className="text-emerald-400">rememberme.exe</code> & <code className="text-emerald-400">RememberME_x64-setup.exe</code> akan otomatis berada di folder <code className="text-gray-400">src-tauri/target/release/bundle/msi/</code>!
                      </li>
                    </ol>
                  </div>
                </div>

                {onOpenTauriModal && (
                  <div className="pt-2 border-t border-[#2A2A2E] flex items-center justify-between">
                    <span className="text-gray-400 text-[11px]">Lihat seluruh file konfigurasi <code className="text-purple-300">tauri.conf.json</code>, <code className="text-purple-300">Cargo.toml</code> & <code className="text-purple-300">main.rs</code>:</span>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenTauriModal();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold transition-all shrink-0"
                    >
                      Buka Konfigurasi Tauri
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: ANDROID / CHROME */}
            {activeTab === 'pwa' && (
              <div className="p-4 rounded-2xl bg-[#0F0F12] border border-[#2A2A2E] space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-cyan-300">
                  <Chrome className="w-4 h-4 text-cyan-400" />
                  <span>Cara Pasang di HP Android / Google Chrome:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 leading-relaxed pl-1">
                  <li>
                    Tekan tombol menu <span className="font-bold text-white">Titik Tiga (⋮)</span> di pojok kanan atas browser Chrome.
                  </li>
                  <li>
                    Pilih menu <span className="font-bold text-cyan-300">"Tambahkan ke Layar Utama"</span> atau <span className="font-bold text-cyan-300">"Instal Aplikasi"</span> (Add to Home Screen).
                  </li>
                  <li>
                    Tekan <span className="font-bold text-white">"Instal"</span>. Ikon Maskot Denia REMM(i)E akan muncul langsung di layar utama HP Anda!
                  </li>
                </ol>
              </div>
            )}

            {/* TAB 2: IOS / SAFARI */}
            {activeTab === 'ios' && (
              <div className="p-4 rounded-2xl bg-[#0F0F12] border border-[#2A2A2E] space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <Apple className="w-4 h-4 text-rose-400" />
                  <span>Cara Pasang di iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 leading-relaxed pl-1">
                  <li>
                    Buka situs web ini di browser <span className="font-bold text-white">Safari</span>.
                  </li>
                  <li>
                    Tekan tombol <span className="font-bold text-rose-300 inline-flex items-center gap-1"><Share className="w-3.5 h-3.5" /> Bagikan (Share)</span> di bagian bawah layar.
                  </li>
                  <li>
                    Gulir ke bawah dan pilih <span className="font-bold text-rose-300 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5" /> "Tambahkan ke Layar Utama"</span> (Add to Home Screen).
                  </li>
                  <li>
                    Tekan <span className="font-bold text-white">"Tambah"</span> di pojok kanan atas. Aplikasi siap digunakan kapan saja!
                  </li>
                </ol>
              </div>
            )}

            {/* TAB 3: DESKTOP / PC */}
            {activeTab === 'desktop' && (
              <div className="p-4 rounded-2xl bg-[#0F0F12] border border-[#2A2A2E] space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <Monitor className="w-4 h-4 text-purple-400" />
                  <span>Cara Pasang di Laptop / Komputer (Chrome/Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 leading-relaxed pl-1">
                  <li>
                    Perhatikan bilah alamat (URL Bar) di bagian kanan atas browser.
                  </li>
                  <li>
                    Klik ikon <span className="font-bold text-purple-300">"Instal REMM(i)E"</span> (Ikon Komputer/Monitor dengan panah bawah).
                  </li>
                  <li>
                    Atau klik menu titik tiga di kanan atas browser &gt; <span className="font-bold text-purple-300">"Simpan & Bagikan" &gt; "Instal Halaman Sebagai Aplikasi"</span>.
                  </li>
                </ol>

                {onOpenTauriModal && (
                  <div className="pt-2 border-t border-[#2A2A2E] flex items-center justify-between">
                    <span className="text-gray-400 text-[11px]">Ingin versi Native Executable (.exe / Desktop Widget)?</span>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenTauriModal();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold transition-all"
                    >
                      Konfigurasi Tauri
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Aplikasi terhubung langsung dengan sistem local storage HP & Komputer Anda.</span>
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 transition-all"
            >
              Mengerti
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

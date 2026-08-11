import React, { useState } from 'react';
import { AudioConfig, CharacterConfig, SyncConfig } from '../types';
import { LocalDataService } from '../utils/db';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Sliders,
  Music,
  Image as ImageIcon,
  Server,
  Calendar,
  GraduationCap,
  RefreshCw,
  CheckCircle,
  Download,
  Upload,
  Database,
  Clock,
  Bell,
  SlidersHorizontal,
  User,
  Palette,
  Megaphone,
  MessageSquare,
} from 'lucide-react';

interface SoundSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  audioConfig: AudioConfig;
  characterConfig: CharacterConfig;
  syncConfig: SyncConfig;
  onSaveAudio: (config: AudioConfig) => void;
  onSaveCharacter: (config: CharacterConfig) => void;
  onSaveSync: (config: SyncConfig) => void;
  onTestSound: (type: 'chime' | 'alert' | 'complete' | 'routine' | 'peek' | 'pointing') => void;
  onRefreshData: () => void;
  initialTab?: 'character' | 'api' | 'audio';
}

export const SoundSettings: React.FC<SoundSettingsProps> = ({
  isOpen,
  onClose,
  audioConfig,
  characterConfig,
  syncConfig,
  onSaveAudio,
  onSaveCharacter,
  onSaveSync,
  onTestSound,
  onRefreshData,
  initialTab = 'character',
}) => {
  const [audio, setAudio] = useState<AudioConfig>(audioConfig);
  const [character, setCharacter] = useState<CharacterConfig>(characterConfig);
  const [sync, setSync] = useState<SyncConfig>(syncConfig);
  const [activeTab, setActiveTab] = useState<'character' | 'api' | 'audio'>(initialTab);
  const [characterSubTab, setCharacterSubTab] = useState<'theme' | 'interaction' | 'images'>('theme');

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncingEdlink, setSyncingEdlink] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  // SQLite query sandbox state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM tasks');
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveAudio(audio);
    onSaveCharacter(character);
    onSaveSync(sync);
    onClose();
  };

  const handleSyncEdlink = () => {
    setSyncingEdlink(true);
    setSyncStatus('Menghubungkan ke API EDLINK Kampus...');
    setTimeout(() => {
      setSyncingEdlink(false);
      // Fetch simulated course schedule & assignment from EDLINK
      LocalDataService.addTask({
        title: '[EDLINK] Tugas Besar Pemrograman Web Lanjut',
        completed: false,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        dueTime: '23:59',
        isDeadline: true,
        priority: 'high',
        notes: 'Dikumpulkan via portal EDLINK sebelum H-2',
        source: 'edlink',
      });
      LocalDataService.addSchedule({
        title: '[EDLINK] Kuliah Praktikum Pemrograman Mobile',
        datetime: new Date(Date.now() + 3600000 * 5).toISOString(),
        completed: false,
        location: 'Lab Komputer 3',
        remindMinutesBefore: 15,
        courseName: 'Pemrograman Mobile Android',
        source: 'edlink',
      });
      onRefreshData();
      setSyncStatus('✅ Berhasil sinkronisasi jadwal kuliah & tugas EDLINK!');
      setTimeout(() => setSyncStatus(null), 3500);
    }, 1200);
  };

  const handleSyncGoogle = () => {
    setSyncingGoogle(true);
    setSyncStatus('Menghubungkan ke Google Calendar API...');
    setTimeout(() => {
      setSyncingGoogle(false);
      LocalDataService.addSchedule({
        title: '[Google Calendar] Bimbingan Skripsi & Project',
        datetime: new Date(Date.now() + 3600000 * 24).toISOString(),
        completed: false,
        location: 'Ruang Dosen 201',
        remindMinutesBefore: 30,
        source: 'google_calendar',
      });
      onRefreshData();
      setSyncStatus('✅ Berhasil sinkronisasi Google Calendar!');
      setTimeout(() => setSyncStatus(null), 3500);
    }, 1200);
  };

  const handleExportJson = () => {
    const dataStr = LocalDataService.exportFullBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MaskotDenia_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content && LocalDataService.importFullBackup(content)) {
        onRefreshData();
        setSyncStatus('✅ Data JSON berhasil diimpor!');
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        setSyncStatus('❌ Gagal mengimpor file JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleRunSql = () => {
    const res = LocalDataService.executeSqlMock(sqlQuery);
    setSqlResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/90 backdrop-blur-md">
      <div className="w-full max-w-xl bg-[#121214] border border-[#2A2A2E] rounded-3xl p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#2A2A2E]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold tracking-wide">Pengaturan Terpusat</h2>
              <span className="text-[11px] text-gray-400">Konfigurasi Maskot, API, & Suara Notifikasi</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-semibold px-2">
            ✕
          </button>
        </div>

        {syncStatus && (
          <div className="mt-3 p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Centralized Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-4 bg-[#0A0A0B] p-1.5 rounded-2xl border border-[#2A2A2E]">
          <button
            onClick={() => setActiveTab('character')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'character' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Maskot & Tampilan
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'audio' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            Notifikasi & Suara
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'api' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Integrasi & Data
          </button>
        </div>

        {/* TAB 1: MASKOT DENIA & TAMPILAN */}
        {activeTab === 'character' && (
          <div className="space-y-4 mt-4">
            {/* Sub-Tabs Navigation for Maskot & Tampilan */}
            <div className="flex items-center gap-1.5 bg-[#0F0F12] p-1.5 rounded-2xl border border-[#26262B]">
              <button
                type="button"
                onClick={() => setCharacterSubTab('theme')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  characterSubTab === 'theme'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Warna & Tema</span>
              </button>
              <button
                type="button"
                onClick={() => setCharacterSubTab('interaction')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  characterSubTab === 'interaction'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interaksi</span>
              </button>
              <button
                type="button"
                onClick={() => setCharacterSubTab('images')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  characterSubTab === 'images'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Gambar Pose</span>
              </button>
            </div>

            {/* SUB-TAB 1: WARNA & TEMA */}
            {characterSubTab === 'theme' && (
              <div className="space-y-3.5">
                {/* Identitas Header */}
                <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 pb-2 border-b border-[#2A2A2E]">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>Identitas Header Floating Panel</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#0F0F12] border border-[#26262B] space-y-1">
                      <label className="block text-gray-200 font-semibold text-[11px]">
                        Nama Project / Judul Panel
                      </label>
                      <input
                        type="text"
                        value={character.projectName ?? 'REMM(i)E'}
                        onChange={e => setCharacter({ ...character, projectName: e.target.value })}
                        placeholder="REMM(i)E"
                        className="w-full bg-[#16161A] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0F0F12] border border-[#26262B] space-y-1">
                      <label className="block text-gray-200 font-semibold text-[11px]">
                        Nama Pengguna / Sub-Judul
                      </label>
                      <input
                        type="text"
                        value={character.name ?? 'Maskot Denia'}
                        onChange={e => setCharacter({ ...character, name: e.target.value })}
                        placeholder="Maskot Denia"
                        className="w-full bg-[#16161A] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Tema 1-Klik */}
                <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2E]">
                    <label className="text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-cyan-400" />
                      <span>Preset Tema 1-Klik (Theme Presets)</span>
                    </label>
                    <span className="text-[10px] text-gray-400">Instan Ubah Seluruh Warna</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: '#0F0F12', border: '#00F0FF', opacity: 0.95 },
                      { id: 'sakura', name: 'Soft Sakura Pink', bg: '#FFE4EC', border: '#FFB6C1', opacity: 0.95 },
                      { id: 'milk', name: 'Clean Milk White', bg: '#FFFFFF', border: '#CBD5E1', opacity: 0.98 },
                      { id: 'obsidian', name: 'Minimal Obsidian', bg: '#121216', border: '#27272A', opacity: 0.95 },
                      { id: 'emerald', name: 'Emerald Forest', bg: '#0D281E', border: '#10B981', opacity: 0.95 },
                    ].map(preset => {
                      const isActive =
                        (character.panelBgColor || '').toLowerCase() === preset.bg.toLowerCase() &&
                        (character.panelBorderColor || '').toLowerCase() === preset.border.toLowerCase();

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setCharacter({
                              ...character,
                              panelBgColor: preset.bg,
                              panelBorderColor: preset.border,
                              panelOpacity: preset.opacity,
                            })
                          }
                          className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden ${
                            isActive
                              ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg'
                              : 'border-[#2A2A2E] hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: preset.bg }}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={preset.bg === '#FFFFFF' || preset.bg === '#FFE4EC' ? 'text-slate-900' : 'text-white'}>
                              {preset.name}
                            </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                              style={{ backgroundColor: preset.border }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kustomisasi Warna & Transparansi */}
                <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 pb-2 border-b border-[#2A2A2E]">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Transparansi & Warna Kustom</span>
                  </div>

                  {/* Transparansi Slider */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#0F0F12] border border-[#26262B]">
                    <div className="flex justify-between text-xs text-gray-200">
                      <span className="font-semibold">Transparansi / Opacity Panel</span>
                      <span className="text-cyan-300 font-bold font-mono">
                        {Math.round((character.panelOpacity ?? 0.95) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={character.panelOpacity ?? 0.95}
                      onChange={e => setCharacter({ ...character, panelOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 bg-[#2A2A2E] h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Warna Latar */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0F0F12] border border-[#26262B]">
                    <label className="block text-xs text-gray-200 font-semibold">Warna Latar Tabel / Panel</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { label: 'Obsidian', hex: '#1A1A1E' },
                        { label: 'Navy', hex: '#0F172A' },
                        { label: 'Emerald', hex: '#064E3B' },
                        { label: 'Purple', hex: '#311227' },
                        { label: 'Crimson', hex: '#450A0A' },
                        { label: 'Cyan Dark', hex: '#082F49' },
                      ].map(item => (
                        <button
                          key={item.hex}
                          type="button"
                          onClick={() => setCharacter({ ...character, panelBgColor: item.hex })}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                            (character.panelBgColor ?? '#1A1A1E').toLowerCase() === item.hex.toLowerCase()
                              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                              : 'border-[#2A2A2E] text-gray-400 hover:text-white bg-[#1A1A1E]'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: item.hex }} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-[#1E1E24]">
                      <span className="text-[11px] text-gray-400">Kode HEX:</span>
                      <input
                        type="color"
                        value={character.panelBgColor || '#1A1A1E'}
                        onChange={e => setCharacter({ ...character, panelBgColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border border-[#2A2A2E]"
                      />
                      <input
                        type="text"
                        value={character.panelBgColor || '#1A1A1E'}
                        onChange={e => setCharacter({ ...character, panelBgColor: e.target.value })}
                        className="w-24 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-2 py-0.5 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                  </div>

                  {/* Warna Border */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0F0F12] border border-[#26262B]">
                    <label className="block text-xs text-gray-200 font-semibold">Warna Bingkai / Border Panel</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { label: 'Slate', hex: '#3A3A40' },
                        { label: 'Cyan Accent', hex: '#38BDF8' },
                        { label: 'Emerald', hex: '#34D399' },
                        { label: 'Purple', hex: '#A855F7' },
                        { label: 'Rose', hex: '#FB7185' },
                        { label: 'Gold', hex: '#FBBF24' },
                      ].map(item => (
                        <button
                          key={item.hex}
                          type="button"
                          onClick={() => setCharacter({ ...character, panelBorderColor: item.hex })}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                            (character.panelBorderColor ?? '#3A3A40').toLowerCase() === item.hex.toLowerCase()
                              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                              : 'border-[#2A2A2E] text-gray-400 hover:text-white bg-[#1A1A1E]'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: item.hex }} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-[#1E1E24]">
                      <span className="text-[11px] text-gray-400">Kode HEX:</span>
                      <input
                        type="color"
                        value={character.panelBorderColor || '#3A3A40'}
                        onChange={e => setCharacter({ ...character, panelBorderColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border border-[#2A2A2E]"
                      />
                      <input
                        type="text"
                        value={character.panelBorderColor || '#3A3A40'}
                        onChange={e => setCharacter({ ...character, panelBorderColor: e.target.value })}
                        className="w-24 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-2 py-0.5 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: INTERAKSI */}
            {characterSubTab === 'interaction' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 pb-2 border-b border-[#2A2A2E]">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Perilaku & Interaksi Maskot Denia</span>
                  </div>

                  {/* Auto-Hide Idle Timer */}
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#26262B] space-y-2">
                    <div className="flex justify-between text-xs text-gray-300">
                      <span className="font-semibold text-white">Mode Mengintip Otomatis (Peek Mode)</span>
                      <span className="text-cyan-400 font-bold font-mono">
                        {character.autoHideSeconds === 0 ? 'Selalu Tampak (Nonaktif)' : `${character.autoHideSeconds} detik`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={character.autoHideSeconds}
                      onChange={e => setCharacter({ ...character, autoHideSeconds: parseInt(e.target.value) })}
                      className="w-full accent-cyan-400 bg-[#2A2A2E] h-2 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-400">
                      Set ke 0 agar Denia selalu tampak mengambang utuh tanpa mengintip/sembunyi otomatis.
                    </p>
                  </div>

                  {/* Speech Bubbles Toggle */}
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#26262B] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold block text-white flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                          Gelembung Teks & Efek Suara Pop
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Tampilkan balon percakapan & bunyi gelembung (pop) interaktif saat quotes muncul
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={character.speechEnabled}
                          onChange={e => setCharacter({ ...character, speechEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#2A2A2E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#1E1E24]">
                      <span className="text-[10px] text-gray-400">Uji bunyi pop gelembung:</span>
                      <button
                        type="button"
                        onClick={() => onTestSound('peek')}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold border border-cyan-500/40 flex items-center gap-1 transition-all"
                      >
                        <Volume2 className="w-3 h-3" />
                        Uji Suara Gelembung
                      </button>
                    </div>
                  </div>

                  {/* Notifikasi Push Browser Native */}
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#26262B] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold block text-white flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-400" />
                          Notifikasi Push Desktop
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Peringatan popup desktop ketika tugas mendekati deadline H-Jam
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={character.pushNotificationsEnabled !== false}
                          onChange={e => setCharacter({ ...character, pushNotificationsEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#2A2A2E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#1E1E24]">
                      <span className="text-[10px] text-gray-400">
                        Status: {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? (
                          <span className="text-emerald-400 font-bold">✅ Izin Diberikan</span>
                        ) : (
                          <span className="text-amber-400 font-bold">⚠️ Perlu Izin Browser</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (typeof window !== 'undefined' && 'Notification' in window) {
                            const perm = await Notification.requestPermission();
                            if (perm === 'granted') {
                              new Notification('⚠️ Peringatan H-Jam (REMMiE)', {
                                body: 'Notifikasi push browser native berhasil diaktifkan!',
                                tag: 'test-push',
                              });
                            }
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-500/40 flex items-center gap-1 transition-all"
                      >
                        <Bell className="w-3 h-3" />
                        Minta Izin & Uji
                      </button>
                    </div>
                  </div>

                  {/* Delay & Timing Inputs */}
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#26262B] space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Timing Transisi Respon (Instan = 0 ms)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-[#16161A] border border-[#26262B]">
                        <label className="block text-gray-200 font-semibold mb-1 text-[10px]">Hover Open (ms)</label>
                        <input
                          type="number"
                          min="0"
                          max="2000"
                          step="50"
                          value={character.hoverDelayMs ?? 0}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setCharacter({ ...character, hoverDelayMs: isNaN(val) ? 0 : Math.max(0, val) });
                          }}
                          className="w-full bg-[#0F0F12] border border-[#2A2A2E] rounded-lg px-2 py-0.5 text-cyan-300 font-mono font-bold text-xs"
                        />
                      </div>

                      <div className="p-2 rounded-lg bg-[#16161A] border border-[#26262B]">
                        <label className="block text-gray-200 font-semibold mb-1 text-[10px]">Close Transisi (ms)</label>
                        <input
                          type="number"
                          min="0"
                          max="3000"
                          step="50"
                          value={character.closeDelayMs ?? 0}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setCharacter({ ...character, closeDelayMs: isNaN(val) ? 0 : Math.max(0, val) });
                          }}
                          className="w-full bg-[#0F0F12] border border-[#2A2A2E] rounded-lg px-2 py-0.5 text-cyan-300 font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: GAMBAR POSE */}
            {characterSubTab === 'images' && (
              <div className="space-y-3.5">
                {/* Avatar Header */}
                <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2E]">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span>Foto Avatar Header Panel</span>
                    </div>
                    {(character.avatarUrl || character.customImageUrls?.avatar) && (
                      <button
                        type="button"
                        onClick={() =>
                          setCharacter({
                            ...character,
                            avatarUrl: undefined,
                            customImageUrls: { ...(character.customImageUrls || {}), avatar: undefined },
                          })
                        }
                        className="text-[10px] text-red-400 hover:underline font-semibold"
                      >
                        Reset Default
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-md shrink-0 bg-[#0F0F12] flex items-center justify-center">
                      {(character.avatarUrl || character.customImageUrls?.avatar) ? (
                        <img
                          src={character.avatarUrl || character.customImageUrls?.avatar}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="cursor-pointer block">
                        <div className="px-3 py-1.5 rounded-lg bg-[#0F0F12] hover:bg-[#1E1E24] border border-cyan-500/40 text-xs text-cyan-300 font-semibold flex items-center justify-center gap-1.5 transition-all">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Upload Foto Avatar...</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = ev => {
                                const dataUrl = ev.target?.result as string;
                                if (dataUrl) {
                                  setCharacter({
                                    ...character,
                                    avatarUrl: dataUrl,
                                    customImageUrls: { ...(character.customImageUrls || {}), avatar: dataUrl },
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Custom 3-Pose Character Assets */}
                <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 pb-2 border-b border-[#2A2A2E]">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Foto 3 Gerakan / Pose Maskot (.png, .jpg, .gif)</span>
                  </div>

                  {(
                    [
                      { key: 'peek', label: 'Gerakan 1: Mengintip (Peek)', desc: 'Tampil saat hover / mengintip dari tepi' },
                      { key: 'pointing', label: 'Gerakan 2: Menunjuk (Pointing)', desc: 'Tampil saat tabel/panel terbuka' },
                      { key: 'alert', label: 'Gerakan 3: Peringatan (Alert)', desc: 'Tampil saat mendekati deadline H-Jam' },
                    ] as const
                  ).map(({ key: st, label, desc }) => {
                    const customUrls = character.customImageUrls || {};
                    return (
                      <div key={st} className="p-3 rounded-xl bg-[#0F0F12] border border-[#26262B] space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-xs text-cyan-300 font-bold block">{label}</label>
                            <span className="text-[10px] text-gray-400">{desc}</span>
                          </div>
                          {customUrls[st] && (
                            <button
                              type="button"
                              onClick={() =>
                                setCharacter({
                                  ...character,
                                  customImageUrls: { ...customUrls, [st]: undefined },
                                })
                              }
                              className="text-[10px] text-red-400 hover:underline font-semibold"
                            >
                              Reset Default
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex-1 cursor-pointer">
                            <div className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-cyan-500/40 text-xs text-cyan-300 font-semibold flex items-center justify-center gap-1.5 transition-all">
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Pilih Gambar Pose...</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = ev => {
                                    const dataUrl = ev.target?.result as string;
                                    if (dataUrl) {
                                      setCharacter({
                                        ...character,
                                        customImageUrls: { ...customUrls, [st]: dataUrl },
                                      });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {customUrls[st] ? (
                            <img
                              src={customUrls[st]}
                              alt={`Preview ${st}`}
                              className="w-10 h-10 rounded-lg object-cover border border-cyan-400/50 shadow-md shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#16161A] border border-[#26262B] flex items-center justify-center shrink-0 text-gray-500">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="Atau tempel URL gambar kustom..."
                            value={customUrls[st] || ''}
                            onChange={e =>
                              setCharacter({
                                ...character,
                                customImageUrls: { ...customUrls, [st]: e.target.value },
                              })
                            }
                            className="flex-1 bg-[#16161A] border border-[#26262B] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 text-slate-200"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTEGRASI & DATA */}
        {activeTab === 'api' && (
          <div className="space-y-4 mt-4">
            {/* EDLINK API INTEGRATION FOR UNIVERSITY STUDENTS */}
            <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2E]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <span>Integrasi EDLINK Kampus</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sync.edlink?.enabled || false}
                    onChange={e =>
                      setSync({
                        ...sync,
                        edlink: { ...sync.edlink, enabled: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#2A2A2E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-gray-400">
                Otomatis tarik jadwal perkuliahan, kuis, dan deadline tugas kuliah langsung dari sistem akademik EDLINK.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">URL Portal Akademik / SIAKAD</label>
                  <input
                    type="text"
                    value={sync.edlink?.campusUrl || 'https://siakad.univ.ac.id'}
                    onChange={e =>
                      setSync({
                        ...sync,
                        edlink: { ...sync.edlink, campusUrl: e.target.value },
                      })
                    }
                    placeholder="https://siakad.univ.ac.id"
                    className="w-full bg-[#0F0F12] border border-[#2A2A2E] rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">User Token / Access Key EDLINK</label>
                  <input
                    type="password"
                    value={sync.edlink?.userToken || ''}
                    onChange={e =>
                      setSync({
                        ...sync,
                        edlink: { ...sync.edlink, userToken: e.target.value },
                      })
                    }
                    placeholder="edlink_tk_..."
                    className="w-full bg-[#0F0F12] border border-[#2A2A2E] rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSyncEdlink}
                  disabled={syncingEdlink}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingEdlink ? 'animate-spin' : ''}`} />
                  Uji Sinkronisasi EDLINK
                </button>
              </div>
            </div>

            {/* GOOGLE CALENDAR API */}
            <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2E]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>Google Calendar API</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sync.googleCalendar.enabled}
                    onChange={e =>
                      setSync({
                        ...sync,
                        googleCalendar: { ...sync.googleCalendar, enabled: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#2A2A2E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">API Key Google</label>
                  <input
                    type="password"
                    value={sync.googleCalendar.apiKey}
                    onChange={e =>
                      setSync({
                        ...sync,
                        googleCalendar: { ...sync.googleCalendar, apiKey: e.target.value },
                      })
                    }
                    placeholder="AIzaSy..."
                    className="w-full bg-[#0F0F12] border border-[#2A2A2E] rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Calendar ID</label>
                  <input
                    type="text"
                    value={sync.googleCalendar.calendarId}
                    onChange={e =>
                      setSync({
                        ...sync,
                        googleCalendar: { ...sync.googleCalendar, calendarId: e.target.value },
                      })
                    }
                    placeholder="primary"
                    className="w-full bg-[#0F0F12] border border-[#2A2A2E] rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSyncGoogle}
                  disabled={syncingGoogle}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGoogle ? 'animate-spin' : ''}`} />
                  Uji Sinkronisasi Calendar
                </button>
              </div>
            </div>

            {/* BACKUP & RESTORE DATA (JSON) */}
            <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white pb-2 border-b border-[#2A2A2E]">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Cadangan & Pemulihan Data (Backup JSON)</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Ekspor seluruh data tugas, rutinitas, jadwal kalender, dan preferensi Anda ke file JSON, atau pulihkan data dari file cadangan.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const data = {
                      tasks: LocalDataService.getTasks(),
                      routines: LocalDataService.getRoutines(),
                      schedules: LocalDataService.getSchedules(),
                      audio: LocalDataService.getAudioConfig(),
                      character: LocalDataService.getCharacterConfig(),
                      sync: LocalDataService.getSyncConfig(),
                      exportDate: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `denia-mascot-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2A2A2E] border border-[#3A3A40] hover:border-cyan-400/60 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Data (Backup)</span>
                </button>

                <label className="px-3.5 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2A2A2E] border border-[#3A3A40] hover:border-cyan-400/60 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Impor Data (Restore)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = evt => {
                        try {
                          const json = JSON.parse(evt.target?.result as string);
                          if (json.tasks) LocalDataService.saveTasks(json.tasks);
                          if (json.routines) LocalDataService.saveRoutines(json.routines);
                          if (json.schedules) LocalDataService.saveSchedules(json.schedules);
                          if (json.audio) LocalDataService.saveAudioConfig(json.audio);
                          if (json.character) LocalDataService.saveCharacterConfig(json.character);
                          if (json.sync) LocalDataService.saveSyncConfig(json.sync);
                          alert('Data berhasil dipulihkan! Halaman akan dimuat ulang.');
                          window.location.reload();
                        } catch (err) {
                          alert('Format file JSON tidak valid.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* MOCK SQL SIMULATOR */}
            <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white pb-2 border-b border-[#2A2A2E]">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>SQLite Query Simulator</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  className="flex-1 bg-[#0F0F12] border border-[#2A2A2E] rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono"
                />
                <button
                  onClick={handleRunSql}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all"
                >
                  Run SQL
                </button>
              </div>
              {sqlResult && (
                <div className="p-2.5 bg-[#0F0F12] rounded-xl overflow-x-auto text-[10px] font-mono border border-[#2A2A2E] max-h-32 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#2A2A2E] text-cyan-400">
                        {sqlResult.columns.map((col, cIdx) => (
                          <th key={`col-${col}-${cIdx}`} className="p-1">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.rows.map((row, rIdx) => (
                        <tr key={`row-${rIdx}`} className="border-b border-[#1E1E24]">
                          {sqlResult.columns.map((col, cIdx) => (
                            <td key={`cell-${rIdx}-${col}-${cIdx}`} className="p-1 text-gray-300">
                              {String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFIKASI & SUARA */}
        {activeTab === 'audio' && (
          <div className="space-y-4 mt-4">
            {/* Master Mute & Volume */}
            <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2E]">
                <div className="flex items-center gap-2.5">
                  {audio.enabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                  <div>
                    <span className="text-xs font-semibold block text-white">Sakelar Mute / Toggle Suara</span>
                    <span className="text-[11px] text-gray-400">Aktifkan atau matikan seluruh efek suara aplikasi</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audio.enabled}
                    onChange={e => setAudio({ ...audio, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#2A2A2E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-300">
                  <span className="font-semibold">Master Volume</span>
                  <span className="text-cyan-400 font-bold font-mono">{Math.round(audio.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.volume}
                  onChange={e => setAudio({ ...audio, volume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 bg-[#2A2A2E] h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* H-Jam Deadline Threshold Input */}
            <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span>Parameter Notifikasi Deadline H-Jam</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Atur berapa jam sebelum deadline Denia memicu suara Peringatan (Alert) & kutipan perhatian.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={character.notificationHoursBeforeDeadline || 3}
                  onChange={e =>
                    setCharacter({
                      ...character,
                      notificationHoursBeforeDeadline: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-24 bg-[#0F0F12] border border-[#2A2A2E] rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-200 font-semibold">Jam Sebelum Batas Waktu</span>
              </div>
            </div>

            {/* Sound Engine Selector */}
            <div className="p-4 rounded-2xl bg-[#16161A] border border-[#2A2A2E] space-y-3">
              <label className="block text-xs font-semibold text-gray-300">Tipe Audio Notifikasi</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAudio({ ...audio, soundType: 'synth' })}
                  className={`p-3 rounded-xl text-xs font-medium border text-left transition-all ${
                    audio.soundType === 'synth'
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200'
                      : 'bg-[#0F0F12] border-[#2A2A2E] text-gray-400'
                  }`}
                >
                  <span className="font-bold block text-slate-100">Synth Chimes (Web Audio)</span>
                  <span className="text-[10px] text-gray-400">Efek nada anime bawaan tanpa perlu upload file</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudio({ ...audio, soundType: 'custom' })}
                  className={`p-3 rounded-xl text-xs font-medium border text-left transition-all ${
                    audio.soundType === 'custom'
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200'
                      : 'bg-[#0F0F12] border-[#2A2A2E] text-gray-400'
                  }`}
                >
                  <span className="font-bold block text-slate-100">Custom Audio File / URL</span>
                  <span className="text-[10px] text-gray-400">Upload / tautkan file .mp3 / .wav milikmu</span>
                </button>
              </div>
            </div>

            {/* Per-Function & Per-State Custom Sound File Uploads */}
            {audio.soundType === 'custom' && (
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-gray-300">File Suara Per Fungsi & Gerakan:</label>
                {(
                  [
                    { key: 'schedule', label: '📅 Suara Fungsi Acara / Jadwal Kalender' },
                    { key: 'routine', label: '🔄 Suara Fungsi Rutinitas' },
                    { key: 'task', label: '✅ Suara Fungsi Tugas' },
                    { key: 'complete', label: '🎉 Suara Tugas Selesai' },
                    { key: 'peek', label: '👀 Suara Gerakan Peek (Mengintip)' },
                    { key: 'pointing', label: '👉 Suara Gerakan Pointing (Buka Tabel)' },
                    { key: 'alert', label: '⚠️ Suara Alert Deadline H-Jam' },
                  ] as const
                ).map(({ key: stKey, label }) => {
                  const stateSounds = audio.stateSounds || {};
                  return (
                    <div key={stKey} className="p-3 rounded-xl bg-[#0A0A0B] border border-[#2A2A2E] space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-cyan-300">{label}</span>
                        {stateSounds[stKey] && (
                          <button
                            onClick={() => setAudio({ ...audio, stateSounds: { ...stateSounds, [stKey]: undefined } })}
                            className="text-[10px] text-red-400 hover:underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="https://example.com/sound.mp3 atau upload file..."
                          value={stateSounds[stKey] || ''}
                          onChange={e =>
                            setAudio({
                              ...audio,
                              stateSounds: { ...stateSounds, [stKey]: e.target.value },
                            })
                          }
                          className="flex-1 bg-[#121214] border border-[#2A2A2E] rounded-xl px-3 py-1 text-xs text-slate-200"
                        />
                        <label className="cursor-pointer px-2.5 py-1 rounded-xl bg-[#1D1D21] hover:bg-[#2A2A2E] border border-[#3A3A40] text-[11px] text-cyan-300">
                          Upload
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = ev => {
                                  const url = ev.target?.result as string;
                                  if (url) {
                                    setAudio({
                                      ...audio,
                                      stateSounds: { ...stateSounds, [stKey]: url },
                                    });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#2A2A2E] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1D1D21] hover:bg-[#2A2A2E] text-gray-300 text-xs font-semibold"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};

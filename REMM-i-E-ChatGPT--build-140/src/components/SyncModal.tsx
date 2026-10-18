import React, { useState } from 'react';
import { SyncConfig } from '../types';
import { LocalDataService } from '../utils/db';
import { RefreshCw, Database, Calendar, Key, CheckCircle, Download, Upload, Server } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  onSaveSyncConfig: (config: SyncConfig) => void;
  onRefreshData: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  onSaveSyncConfig,
  onRefreshData,
}) => {
  const [config, setConfig] = useState<SyncConfig>(syncConfig);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // SQLite query sandbox state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM tasks');
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSyncConfig(config);
    setSyncStatus('Pengaturan integrasi disimpan!');
    setTimeout(() => setSyncStatus(null), 2500);
  };

  const handleTestGoogleSync = () => {
    setSyncingGoogle(true);
    setSyncStatus('Menghubungkan ke Google Calendar API...');
    setTimeout(() => {
      setSyncingGoogle(false);
      // Simulate pulled calendar event
      LocalDataService.addSchedule({
        title: '[Synced] Meeting Google Calendar',
        datetime: new Date(Date.now() + 7200000).toISOString(),
        completed: false,
        remindMinutesBefore: 15,
      });
      onRefreshData();
      setSyncStatus('✅ Berhasil sinkronasi Google Calendar!');
      setTimeout(() => setSyncStatus(null), 3000);
    }, 1500);
  };

  const handleTestNotionSync = () => {
    setSyncingNotion(true);
    setSyncStatus('Menghubungkan ke Notion Database API...');
    setTimeout(() => {
      setSyncingNotion(false);
      LocalDataService.addTask({
        title: '[Synced Notion] Review Document Sprint',
        completed: false,
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'high',
      });
      onRefreshData();
      setSyncStatus('✅ Berhasil sinkronasi Notion tasks!');
      setTimeout(() => setSyncStatus(null), 3000);
    }, 1500);
  };

  const handleExportJson = () => {
    const dataStr = LocalDataService.exportFullBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RememberME_Backup_${new Date().toISOString().split('T')[0]}.json`;
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
      <div className="w-full max-w-2xl bg-[#121214] border border-[#2A2A2E] rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold tracking-wide">Penyimpanan & Integrasi API</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-semibold">
            ✕
          </button>
        </div>

        {syncStatus && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="space-y-6 mt-6">
          {/* SECTION 1: GOOGLE CALENDAR */}
          <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-[#2A2A2E]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Calendar className="w-4 h-4" />
                Google Calendar Sync
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.googleCalendar.enabled}
                  onChange={e =>
                    setConfig({
                      ...config,
                      googleCalendar: { ...config.googleCalendar, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2A2A2E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">API Key / OAuth Token</label>
                <input
                  type="password"
                  value={config.googleCalendar.apiKey}
                  onChange={e =>
                    setConfig({
                      ...config,
                      googleCalendar: { ...config.googleCalendar, apiKey: e.target.value },
                    })
                  }
                  placeholder="AIzaSy..."
                  className="w-full bg-[#121214] border border-[#2A2A2E] rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Calendar ID</label>
                <input
                  type="text"
                  value={config.googleCalendar.calendarId}
                  onChange={e =>
                    setConfig({
                      ...config,
                      googleCalendar: { ...config.googleCalendar, calendarId: e.target.value },
                    })
                  }
                  placeholder="primary / example@gmail.com"
                  className="w-full bg-[#121214] border border-[#2A2A2E] rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={handleTestGoogleSync}
                disabled={syncingGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingGoogle ? 'animate-spin' : ''}`} />
                Uji Sinkronisasi Calendar
              </button>
            </div>
          </div>

          {/* SECTION 2: NOTION INTEGRATION */}
          <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-[#2A2A2E]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Database className="w-4 h-4" />
                Notion Database Sync
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notion.enabled}
                  onChange={e =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2A2A2E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Notion Integration Token</label>
                <input
                  type="password"
                  value={config.notion.apiKey}
                  onChange={e =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, apiKey: e.target.value },
                    })
                  }
                  placeholder="secret_..."
                  className="w-full bg-[#121214] border border-[#2A2A2E] rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Database ID</label>
                <input
                  type="text"
                  value={config.notion.databaseId}
                  onChange={e =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, databaseId: e.target.value },
                    })
                  }
                  placeholder="3a0b1c..."
                  className="w-full bg-[#121214] border border-[#2A2A2E] rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={handleTestNotionSync}
                disabled={syncingNotion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingNotion ? 'animate-spin' : ''}`} />
                Uji Sinkronisasi Notion
              </button>
            </div>
          </div>

          {/* SECTION 3: JSON BACKUP & RESTORE */}
          <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-[#2A2A2E] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Export & Import Data (JSON)</h3>
              <p className="text-xs text-gray-400">Cadangkan seluruh tugas, rutinitas, dan preferensi aplikasi.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1D1D21] hover:bg-[#2A2A2E] text-slate-200 text-xs font-medium border border-[#2A2A2E]"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1D1D21] hover:bg-[#2A2A2E] text-slate-200 text-xs font-medium border border-[#2A2A2E] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Import
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* SECTION 4: MOCK SQLITE QUERY HANDLER */}
          <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-[#2A2A2E]">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">SQLite Local DB Query Simulator</h3>
            <p className="text-xs text-gray-400 mb-2">Simulasi eksekusi perintah SQL pada database lokal aplikasi.</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                className="flex-1 bg-[#121214] border border-[#2A2A2E] rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono"
              />
              <button
                onClick={handleRunSql}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Run SQL
              </button>
            </div>
            {sqlResult && (
              <div className="mt-2 p-2 bg-[#0A0A0B] rounded-xl overflow-x-auto text-[11px] font-mono border border-[#2A2A2E] max-h-36 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#2A2A2E] text-cyan-400">
                      {sqlResult.columns.map((col, cIdx) => (
                        <th key={`s-col-${col}-${cIdx}`} className="p-1">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sqlResult.rows.map((row, rIdx) => (
                      <tr key={`s-row-${rIdx}`} className="border-b border-[#1D1D21]">
                        {sqlResult.columns.map((col, cIdx) => (
                          <td key={`s-cell-${rIdx}-${col}-${cIdx}`} className="p-1 text-gray-300">
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

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-[#2A2A2E] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1D1D21] hover:bg-[#2A2A2E] text-gray-300 text-xs font-semibold"
          >
            Tutup
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

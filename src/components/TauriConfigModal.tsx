import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode, Layers } from 'lucide-react';

interface TauriConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAURI_CONF_JSON = `{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "RememberME",
  "version": "1.0.0",
  "identifier": "com.rememberme.widget",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Remember ME",
        "width": 140,
        "height": 160,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "shadow": false,
        "skipTaskbar": true,
        "visible": true,
        "dragDropEnabled": false
      }
    ]
  },
  "bundle": {
    "active": true,
    "category": "Productivity",
    "copyright": "Copyright 2026 Remember ME",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "shortDescription": "Floating Anime Mascot Reminder Widget featuring Denia",
    "targets": ["nsis"]
  }
}`;

const CARGO_TOML = `[package]
name = "rememberme-tauri"
version = "1.0.0"
description = "Remember ME Floating Desktop Widget featuring Denia"
authors = ["Remember ME Team"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;

const MAIN_RS = `// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let _window = app.get_webview_window("main");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`;

export const TauriConfigModal: React.FC<TauriConfigModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tauri' | 'cargo' | 'mainrs'>('tauri');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getContent = () => {
    switch (activeTab) {
      case 'cargo':
        return CARGO_TOML;
      case 'mainrs':
        return MAIN_RS;
      case 'tauri':
      default:
        return TAURI_CONF_JSON;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/90 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#121214] border border-[#2A2A2E] rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold tracking-wide">Struktur Direktori & Konfigurasi Tauri</h2>
              <p className="text-xs text-gray-400">File konfigurasi native Windows Desktop (frameless, transparent, alwaysOnTop)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-semibold">
            ✕
          </button>
        </div>

        {/* Directory Structure Overview */}
        <div className="mt-4 p-3 rounded-2xl bg-[#0A0A0B] border border-[#2A2A2E] text-xs text-gray-300 font-mono overflow-x-auto">
          <div className="font-semibold text-cyan-400 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Struktur Direktori Proyek Tauri + React:
          </div>
          <pre className="text-[11px] leading-relaxed text-gray-400">
{`remember-me/
├── src-tauri/
│   ├── Cargo.toml               # Dependensi Rust & Tauri
│   ├── tauri.conf.json          # Window transparent, frameless, alwaysOnTop
│   └── src/
│       └── main.rs              # Rust Entry Point
├── src/
│   ├── assets/
│   │   └── images/              # Maskot Denia (idle, peek, hover, alert)
│   ├── components/
│   │   ├── MascotWidget.tsx     # Widget Karakter Denia & Interaksi
│   │   ├── TaskPanel.tsx        # Minimalist Task Panel (Clean Checkbox)
│   │   ├── SyncModal.tsx        # Integrasi Google Calendar / Notion
│   │   ├── SoundSettings.tsx    # Audio & Voice Settings
│   │   └── TauriConfigModal.tsx # Exporter & Config Viewer
│   ├── hooks/
│   │   ├── useAudio.ts          # Synthesizer Audio Notification
│   │   └── useEdgeSnap.ts       # Snap-to-Edge & Peek Mode Logic
│   ├── utils/
│   │   └── db.ts                # Local Data Storage & SQLite Handler
│   ├── types.ts                 # Type Definitions
│   └── App.tsx                  # Windows Desktop Simulator Main Container
└── package.json`}
          </pre>
        </div>

        {/* File Tabs */}
        <div className="flex items-center justify-between mt-4 mb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tauri')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'tauri'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-[#1D1D21] border border-[#2A2A2E] text-gray-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              tauri.conf.json
            </button>
            <button
              onClick={() => setActiveTab('cargo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'cargo'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-[#1D1D21] border border-[#2A2A2E] text-gray-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Cargo.toml
            </button>
            <button
              onClick={() => setActiveTab('mainrs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'mainrs'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-[#1D1D21] border border-[#2A2A2E] text-gray-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              main.rs
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D1D21] border border-[#2A2A2E] hover:bg-[#2A2A2E] text-cyan-400 text-xs font-semibold transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin!' : 'Salin Kode'}
          </button>
        </div>

        {/* Code View */}
        <div className="flex-1 bg-[#0A0A0B] p-4 rounded-2xl overflow-y-auto font-mono text-xs text-gray-300 border border-[#2A2A2E] custom-scrollbar">
          <pre>{getContent()}</pre>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

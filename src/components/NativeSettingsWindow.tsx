import React, { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AudioConfig, CharacterConfig, SyncConfig } from '../types';
import { LocalDataService } from '../utils/db';
import { SoundSettings } from './SoundSettings';
import { useAudio } from '../hooks/useAudio';

export const NativeSettingsWindow: React.FC = () => {
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => LocalDataService.getSyncConfig());
  const { playNotification } = useAudio(audioConfig);

  const closeWindow = useCallback(async () => {
    await getCurrentWindow().close();
  }, []);

  useEffect(() => {
    void getCurrentWindow().setTitle('REMM(i) - Pengaturan');
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-950 p-3 text-slate-100 overflow-auto">
      <SoundSettings
        isOpen
        onClose={closeWindow}
        audioConfig={audioConfig}
        characterConfig={characterConfig}
        syncConfig={syncConfig}
        onSaveAudio={(config) => { setAudioConfig(config); LocalDataService.saveAudioConfig(config); }}
        onSaveCharacter={(config) => { setCharacterConfig(config); LocalDataService.saveCharacterConfig(config); }}
        onSaveSync={(config) => { setSyncConfig(config); LocalDataService.saveSyncConfig(config); }}
        onTestSound={playNotification}
        onRefreshData={() => {
          setCharacterConfig(LocalDataService.getCharacterConfig());
          setAudioConfig(LocalDataService.getAudioConfig());
          setSyncConfig(LocalDataService.getSyncConfig());
        }}
      />
    </div>
  );
};

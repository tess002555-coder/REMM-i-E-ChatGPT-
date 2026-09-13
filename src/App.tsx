import React, { useEffect, useMemo, useState } from 'react';
import { CharacterState, CharacterConfig, AudioConfig, TaskItem } from './types';
import { LocalDataService } from './utils/db';
import { initCursorEvents, addInteraction, removeInteraction } from './utils/cursorEvents';
import { useAudio } from './hooks/useAudio';
import { useEdgeSnap } from './hooks/useEdgeSnap';
import { MascotWidget } from './components/MascotWidget';
import { NativeMainPanel } from './components/NativeMainPanel';
import { NativeSettingsWindow } from './components/NativeSettingsWindow';

const nativeWindowMode = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('window')
  : null;

export default function App() {
  if (nativeWindowMode === 'panel') return <NativeMainPanel />;
  if (nativeWindowMode === 'settings') return <NativeSettingsWindow />;

  const [characterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [tasks, setTasks] = useState<TaskItem[]>(() => LocalDataService.getTasks());
  const [characterState, setCharacterState] = useState<CharacterState>('peek');

  const { playNotification, speakText, sendPushNotification } = useAudio(audioConfig);
  const { windowState, handleDragStart, handleDragEnd, handleMouseEnter, handleMouseLeave } = useEdgeSnap({
    autoHideSeconds: characterConfig.autoHideSeconds,
    hoverDelayMs: characterConfig.hoverDelayMs ?? 0,
    closeDelayMs: characterConfig.closeDelayMs ?? 0,
  });

  useEffect(() => { initCursorEvents(); }, []);

  const pendingDeadlines = useMemo(() => {
    return LocalDataService.getPendingDeadlinesWithinHours(
      characterConfig.notificationHoursBeforeDeadline || 3
    );
  }, [tasks, characterConfig.notificationHoursBeforeDeadline]);

  useEffect(() => {
    if (pendingDeadlines.length > 0) {
      setCharacterState('alert');
      playNotification('alert');
      if (characterConfig.pushNotificationsEnabled !== false) {
        const topTask = pendingDeadlines[0];
        void sendPushNotification(
          `⚠️ Peringatan H-Jam (${characterConfig.projectName || 'REMM(i)E'})`,
          `Deadline "${topTask?.title || 'Tugas'}" mendekati batas waktu! Segera periksa.`,
          'remmie-deadline'
        );
      }
    } else if (windowState.isPanelOpen) {
      setCharacterState('pointing');
    } else if (!windowState.isPeeking) {
      setCharacterState('idle');
    } else {
      setCharacterState('peek');
    }
  }, [
    pendingDeadlines.length,
    windowState.isPanelOpen,
    windowState.isPeeking,
    playNotification,
    sendPushNotification,
    characterConfig.pushNotificationsEnabled,
    characterConfig.projectName,
  ]);

  useEffect(() => {
    const refresh = () => setTasks(LocalDataService.getTasks());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  return (
    <div
      className="widget-wrapper relative w-full h-full text-slate-100 font-sans"
      onMouseEnter={addInteraction}
      onMouseLeave={removeInteraction}
    >
      <MascotWidget
        state={characterState}
        snappedEdge={windowState.snappedEdge}
        isPeeking={windowState.isPeeking}
        isPanelOpen={windowState.isPanelOpen}
        displayMode={windowState.displayMode}
        config={characterConfig}
        pendingDeadlines={pendingDeadlines}
        position={{ x: 0, y: 0 }}
        screenWidth={typeof window !== 'undefined' ? window.innerWidth : 1200}
        onClick={() => undefined}
        onDragStart={handleDragStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragEnd={() => { removeInteraction(); void handleDragEnd(); }}
        onSpeakSpeech={speakText}
      />
    </div>
  );
}

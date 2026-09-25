import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CharacterState, CharacterConfig, AudioConfig, PriorityLevel } from './types';
import { LocalDataService } from './utils/db';
import { useAudio } from './hooks/useAudio';
import { useEdgeSnapMultiWindow } from './hooks/useEdgeSnapMultiWindow';
import { MascotWidget } from './components/MascotWidget';

export default function AppMascot() {
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [characterState, setCharacterState] = useState<CharacterState>('peek');

  const { playNotification, speakText, sendPushNotification } = useAudio(audioConfig);

  const {
    snappedEdge,
    isPeeking,
    isPanelOpen,
    displayMode,
    startDragging,
    snapToEdge,
    togglePanel,
    toggleDisplayMode,
    resetIdleTimer,
    unPeek,
  } = useEdgeSnapMultiWindow({ config: characterConfig });

  // Real-time pending deadlines for alert pose & push notifications
  const [tasks, setTasks] = useState(() => LocalDataService.getTasks());

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setTasks(LocalDataService.getTasks());
      setCharacterConfig(LocalDataService.getCharacterConfig());
    }, 2000);
    return () => clearInterval(refreshInterval);
  }, []);

  const pendingDeadlines = useMemo(() => {
    return LocalDataService.getPendingDeadlinesWithinHours(characterConfig.notificationHoursBeforeDeadline || 3);
  }, [tasks, characterConfig.notificationHoursBeforeDeadline]);

  // Character pose management
  useEffect(() => {
    if (pendingDeadlines.length > 0) {
      setCharacterState('alert');
      playNotification('alert');

      if (characterConfig.pushNotificationsEnabled !== false) {
        const topTask = pendingDeadlines[0];
        const taskTitle = topTask ? topTask.title : 'Tugas Mendekati Batas Waktu';
        sendPushNotification(
          `⚠️ Peringatan H-Jam (${characterConfig.projectName || 'REMM(i)E'})`,
          `Deadline "${taskTitle}" mendekati batas waktu! Segera periksa.`,
          'remmie-deadline'
        );
      }
    } else if (isPanelOpen) {
      setCharacterState('pointing');
    } else if (!isPeeking) {
      setCharacterState('idle');
    } else {
      setCharacterState('peek');
    }
  }, [pendingDeadlines.length, isPanelOpen, isPeeking, playNotification, sendPushNotification, characterConfig.pushNotificationsEnabled, characterConfig.projectName]);

  // Emit state updates to panel and modal windows when characterState changes
  useEffect(() => {
    const broadcastMascotState = async () => {
      const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
      if (isTauri) {
        try {
          const { emit } = await import('@tauri-apps/api/event');
          await emit('mascot-state-changed', {
            state: characterState,
            snappedEdge,
            isPeeking,
            isPanelOpen,
          });
        } catch (err) {
          console.warn('Failed to emit mascot-state-changed:', err);
        }
      }
    };
    broadcastMascotState();
  }, [characterState, snappedEdge, isPeeking, isPanelOpen]);

  // Listen to Tauri events from panel and modal windows
  useEffect(() => {
    let unlistenPanelClose: (() => void) | undefined;
    let unlistenPanelState: (() => void) | undefined;
    let unlistenDataUpdate: (() => void) | undefined;
    let unlistenTogglePanel: (() => void) | undefined;

    const setupListeners = async () => {
      const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
      if (isTauri) {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          
          unlistenPanelClose = await listen('panel-closed', () => {
            setCharacterState('idle');
          });

          unlistenPanelState = await listen<{ isOpen: boolean }>('panel-state-changed', (event) => {
            if (!event.payload.isOpen) {
              setCharacterState('idle');
            }
          });

          unlistenDataUpdate = await listen('data-updated', () => {
            setTasks(LocalDataService.getTasks());
            setCharacterConfig(LocalDataService.getCharacterConfig());
          });

          unlistenTogglePanel = await listen('toggle-panel', () => {
            togglePanel();
          });
        } catch (err) {
          console.warn('Tauri event listen error in Mascot window:', err);
        }
      }
    };

    setupListeners();
    return () => {
      if (unlistenPanelClose) unlistenPanelClose();
      if (unlistenPanelState) unlistenPanelState();
      if (unlistenDataUpdate) unlistenDataUpdate();
      if (unlistenTogglePanel) unlistenTogglePanel();
    };
  }, [togglePanel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left mouse click initiates window dragging
    if (e.button === 0) {
      startDragging(e);
    }
  };

  const handleMouseUp = () => {
    snapToEdge();
  };

  return (
    <div
      className="w-full h-full select-none overflow-visible flex items-center justify-center p-2 text-slate-100 font-sans"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      data-tauri-drag-region
    >
      <MascotWidget
        state={characterState}
        snappedEdge={snappedEdge}
        isPeeking={isPeeking}
        isPanelOpen={isPanelOpen}
        displayMode={displayMode}
        config={characterConfig}
        pendingDeadlines={pendingDeadlines}
        position={{ x: 0, y: 0 }}
        onClick={togglePanel}
        onToggleDisplayMode={toggleDisplayMode}
        onMouseEnter={() => {
          unPeek();
        }}
        onMouseLeave={resetIdleTimer}
        onDragEnd={() => snapToEdge()}
        onSpeakSpeech={speakText}
      />
    </div>
  );
}

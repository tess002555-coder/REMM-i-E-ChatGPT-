import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { CharacterState, TaskItem, RoutineItem, ScheduleItem, CharacterConfig, AudioConfig, SyncConfig, PriorityLevel } from './types';
import { LocalDataService } from './utils/db';
import { useAudio } from './hooks/useAudio';
import { useEdgeSnap } from './hooks/useEdgeSnap';

import { MascotWidget } from './components/MascotWidget';
import { TaskPanel } from './components/TaskPanel';
import { DetailModal, DetailModalType } from './components/DetailModal';
import { SoundSettings } from './components/SoundSettings';
import { SyncModal } from './components/SyncModal';
import { TauriConfigModal } from './components/TauriConfigModal';
import { InstallAppModal } from './components/InstallAppModal';

export default function App() {
  // State from Local Data Storage
  const [tasks, setTasks] = useState<TaskItem[]>(() => LocalDataService.getTasks());
  const [routines, setRoutines] = useState<RoutineItem[]>(() => LocalDataService.getRoutines());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => LocalDataService.getSchedules());

  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => LocalDataService.getSyncConfig());

  // Mascot State
  const [characterState, setCharacterState] = useState<CharacterState>('peek');

  // Modals state
  const [activeModal, setActiveModal] = useState<DetailModalType | null>(null);
  const [isTauriModalOpen, setIsTauriModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Hooks
  const { playNotification, speakText, sendPushNotification } = useAudio(audioConfig);

  const {
    windowState,
    setWindowState,
    handleDragEnd,
    handleMouseEnter,
    handleMouseLeave,
    togglePanel,
    closePanel,
    toggleDisplayMode,
  } = useEdgeSnap({
    autoHideSeconds: characterConfig.autoHideSeconds,
    hoverDelayMs: characterConfig.hoverDelayMs ?? 0,
    closeDelayMs: characterConfig.closeDelayMs ?? 0,
  });

  // Check pending deadlines within H-Jam threshold
  const pendingDeadlines = useMemo(() => {
    return LocalDataService.getPendingDeadlinesWithinHours(characterConfig.notificationHoursBeforeDeadline || 3);
  }, [tasks, characterConfig.notificationHoursBeforeDeadline]);

  // Update character states & trigger push notifications
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
    } else if (windowState.isPanelOpen) {
      setCharacterState('pointing');
    } else if (!windowState.isPeeking) {
      setCharacterState('idle');
    } else {
      setCharacterState('peek');
    }
  }, [pendingDeadlines.length, windowState.isPanelOpen, windowState.isPeeking, playNotification, sendPushNotification, characterConfig.pushNotificationsEnabled, characterConfig.projectName]);

  // Handlers for Tasks
  const handleToggleTask = useCallback((id: string) => {
    const updated = LocalDataService.toggleTask(id);
    setTasks(updated);

    const toggled = updated.find(t => t.id === id);
    if (toggled && toggled.completed) {
      playNotification('complete');
      setCharacterState('peek');
    }
  }, [playNotification]);

  const handleAddTask = useCallback((title: string, dueDate?: string, isDeadline?: boolean, priority?: PriorityLevel) => {
    LocalDataService.addTask({
      title,
      completed: false,
      dueDate,
      isDeadline,
      priority: priority || (isDeadline ? 'high' : 'medium'),
    });
    setTasks(LocalDataService.getTasks());
    playNotification('task');
  }, [playNotification]);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks(LocalDataService.deleteTask(id));
  }, []);

  // Handlers for Routines
  const handleToggleRoutine = useCallback((id: string) => {
    setRoutines(LocalDataService.toggleRoutine(id));
  }, []);

  const handleAddRoutine = useCallback((title: string, description: string) => {
    const updated = LocalDataService.addRoutine(title, description, 0);
    setRoutines(updated);
    playNotification('routine');
  }, [playNotification]);

  const handleDeleteRoutine = useCallback((id: string) => {
    const updated = LocalDataService.deleteRoutine(id);
    setRoutines(updated);
  }, []);

  // Handlers for Schedules
  const handleAddSchedule = useCallback((title: string, datetime: string) => {
    LocalDataService.addSchedule({
      title,
      datetime,
      completed: false,
      remindMinutesBefore: 15,
    });
    setSchedules(LocalDataService.getSchedules());
    playNotification('schedule');
  }, [playNotification]);

  const handleToggleSchedule = useCallback((id: string) => {
    setSchedules(LocalDataService.toggleSchedule(id));
  }, []);

  const handleDeleteSchedule = useCallback((id: string) => {
    setSchedules(LocalDataService.deleteSchedule(id));
  }, []);

  // Handlers for Routine Daily Logs
  const handleSaveRoutineLog = useCallback((id: string, dateStr: string, content: string) => {
    const updated = LocalDataService.updateRoutineDailyLog(id, dateStr, content);
    setRoutines(updated);
    setActiveModal(prev => {
      if (prev?.kind === 'routine' && prev.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { kind: 'routine', item: updatedItem } : prev;
      }
      return prev;
    });
  }, []);

  const handleDeleteRoutineLog = useCallback((id: string, dateStr: string) => {
    const updated = LocalDataService.deleteRoutineDailyLog(id, dateStr);
    setRoutines(updated);
    setActiveModal(prev => {
      if (prev?.kind === 'routine' && prev.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { kind: 'routine', item: updatedItem } : prev;
      }
      return prev;
    });
  }, []);

  // Settings Save Handlers
  const handleSaveAudio = useCallback((config: AudioConfig) => {
    setAudioConfig(config);
    LocalDataService.saveAudioConfig(config);
  }, []);

  const handleSaveCharacter = useCallback((config: CharacterConfig) => {
    setCharacterConfig(config);
    LocalDataService.saveCharacterConfig(config);
    if (config.displayMode) {
      setWindowState(prev => ({
        ...prev,
        displayMode: config.displayMode,
      }));
    }
  }, [setWindowState]);

  const handleSaveSync = useCallback((config: SyncConfig) => {
    setSyncConfig(config);
    LocalDataService.saveSyncConfig(config);
  }, []);

  const handleRefreshData = useCallback(() => {
    setTasks(LocalDataService.getTasks());
    setRoutines(LocalDataService.getRoutines());
    setSchedules(LocalDataService.getSchedules());
  }, []);






  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  // Dynamically resize Tauri window so it fits strictly the mascot or panel without full screen canvas overlay
  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow, LogicalSize }) => {
        const appWindow = getCurrentWindow();
        if (activeModal !== null) {
          appWindow.setSize(new LogicalSize(920, 720));
        } else if (windowState.isPanelOpen) {
          appWindow.setSize(new LogicalSize(560, 680));
        } else if (windowState.displayMode === 'bar' || windowState.displayMode === 'sidebar') {
          appWindow.setSize(new LogicalSize(90, 220));
        } else {
          // Ukuran cukup lega (260x260) dengan padding margin agar dialog & maskot leluasa
          appWindow.setSize(new LogicalSize(260, 260));
        }
      }).catch(err => console.warn("Tauri setSize error:", err));
    }
  }, [isTauri, windowState.isPanelOpen, windowState.displayMode, activeModal]);

  const mascotPos = isTauri
    ? (windowState.displayMode === 'bar' || windowState.displayMode === 'sidebar'
        ? { x: 20, y: 20 }
        : { x: 58, y: 92 })
    : { x: windowState.x, y: windowState.y };

  return (
    <div className="widget-wrapper relative w-full h-full text-slate-100 font-sans" data-tauri-drag-region>
      {/* Floating Mascot Widget */}
      <MascotWidget
        state={characterState}
        snappedEdge={windowState.snappedEdge}
        isPeeking={windowState.isPeeking || (!windowState.isPanelOpen && characterState === 'peek')}
        isPanelOpen={windowState.isPanelOpen}
        displayMode={windowState.displayMode}
        config={characterConfig}
        pendingDeadlines={pendingDeadlines}
        position={mascotPos}
        screenWidth={typeof window !== 'undefined' ? window.innerWidth : 1200}
        onClick={() => {
          togglePanel();
          if (windowState.isPanelOpen) {
            setActiveModal(null);
          }
        }}
        onToggleDisplayMode={toggleDisplayMode}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragEnd={handleDragEnd}
        onSpeakSpeech={speakText}
      />

      {/* TaskPanel Flyout - STRICTLY rendered ONLY when isPanelOpen is true */}
      <AnimatePresence>
        {windowState.isPanelOpen && (
          <div 
            className="fixed z-40 pointer-events-auto" 
            style={
              isTauri
                ? { left: 160, top: 10 }
                : {
                    left: windowState.snappedEdge === 'left' 
                      ? Math.min(window.innerWidth - 360, windowState.x + 150)
                      : Math.max(16, windowState.x - 340),
                    top: Math.max(16, Math.min(window.innerHeight - 520, windowState.y)),
                  }
            }
          >
            <TaskPanel
              isOpen={windowState.isPanelOpen}
              snappedEdge={windowState.snappedEdge}
              tasks={tasks}
              routines={routines}
              schedules={schedules}
              config={characterConfig}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onToggleRoutine={handleToggleRoutine}
              onDeleteSchedule={handleDeleteSchedule}
              onOpenModal={modal => setActiveModal(modal)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onClose={() => {
                setActiveModal(null);
                closePanel();
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Detail Pop-Up Modal (Floats to the left/right of Main Panel as depicted in wireframe) */}
      <AnimatePresence>
        {windowState.isPanelOpen && activeModal && (
          <div 
            className="fixed z-50 pointer-events-auto" 
            style={isTauri ? { left: 520, top: 10 } : { left: 490, top: 10 }}
          >
            <DetailModal
              modalState={activeModal}
              onClose={() => setActiveModal(null)}
              config={characterConfig}
              schedules={schedules}
              routines={routines}
              tasks={tasks}
              onAddSchedule={handleAddSchedule}
              onToggleSchedule={handleToggleSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onAddRoutine={handleAddRoutine}
              onSaveRoutineLog={handleSaveRoutineLog}
              onDeleteRoutineLog={handleDeleteRoutineLog}
              onDeleteRoutine={handleDeleteRoutine}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onOpenAddScheduleModal={() => setActiveModal({ kind: 'add-schedule' })}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto">
        {/* System Modals */}
        <TauriConfigModal isOpen={isTauriModalOpen} onClose={() => setIsTauriModalOpen(false)} />

        {isInstallModalOpen && (
          <InstallAppModal
            onClose={() => setIsInstallModalOpen(false)}
            onOpenTauriModal={() => setIsTauriModalOpen(true)}
          />
        )}

        <SoundSettings
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          audioConfig={audioConfig}
          characterConfig={characterConfig}
          syncConfig={syncConfig}
          onSaveAudio={handleSaveAudio}
          onSaveCharacter={handleSaveCharacter}
          onSaveSync={handleSaveSync}
          onTestSound={playNotification}
          onRefreshData={handleRefreshData}
        />

        <SyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          syncConfig={syncConfig}
          onSaveSyncConfig={handleSaveSync}
          onRefreshData={handleRefreshData}
        />
      </div>
    </div>
  );
}

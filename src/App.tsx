import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { CharacterState, TaskItem, RoutineItem, ScheduleItem, CharacterConfig, AudioConfig, SyncConfig, PriorityLevel } from './types';
import { LocalDataService } from './utils/db';
import { addInteraction, removeInteraction, initCursorEvents } from './utils/cursorEvents';
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
  const [tasks, setTasks] = useState<TaskItem[]>(() => LocalDataService.getTasks());
  const [routines, setRoutines] = useState<RoutineItem[]>(() => LocalDataService.getRoutines());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => LocalDataService.getSchedules());

  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => LocalDataService.getSyncConfig());

  const [characterState, setCharacterState] = useState<CharacterState>('peek');

  const [activeModal, setActiveModal] = useState<DetailModalType | null>(null);
  const [isTauriModalOpen, setIsTauriModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

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

  useEffect(() => {
    initCursorEvents();
  }, []);

  const pendingDeadlines = useMemo(() => {
    return LocalDataService.getPendingDeadlinesWithinHours(characterConfig.notificationHoursBeforeDeadline || 3);
  }, [tasks, characterConfig.notificationHoursBeforeDeadline]);

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

  useEffect(() => {
    if (activeModal || isTauriModalOpen || isSettingsModalOpen || isSyncModalOpen || isInstallModalOpen) {
      addInteraction();
      return () => { removeInteraction(); };
    }
  }, [activeModal, isTauriModalOpen, isSettingsModalOpen, isSyncModalOpen, isInstallModalOpen]);

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
    setCharacterConfig(LocalDataService.getCharacterConfig());
    setAudioConfig(LocalDataService.getAudioConfig());
    setSyncConfig(LocalDataService.getSyncConfig());
  }, []);

  const mascotPos = { x: windowState.x, y: windowState.y };

  const panelPosRef = useRef<{ left: number; top: number } | null>(null);
  const panelMeasureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!windowState.isPanelOpen) {
      panelPosRef.current = null;
      return;
    }

    const updatePanelPosition = () => {
      const panel = panelMeasureRef.current;
      const panelWidth = panel?.getBoundingClientRect().width ?? 320;
      const panelHeight = panel?.getBoundingClientRect().height ?? Math.min(window.innerHeight * 0.88, 700);
      const gap = 16;
      const maxLeft = Math.max(gap, window.innerWidth - panelWidth - gap);
      const maxTop = Math.max(gap, window.innerHeight - panelHeight - gap);

      const preferredLeft = windowState.snappedEdge === 'left'
        ? windowState.x + 150
        : windowState.x - panelWidth - 20;
      const preferredTop = windowState.y;

      panelPosRef.current = {
        left: Math.max(gap, Math.min(maxLeft, preferredLeft)),
        top: Math.max(gap, Math.min(maxTop, preferredTop)),
      };
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);

    return () => window.removeEventListener('resize', updatePanelPosition);
  }, [windowState.isPanelOpen, windowState.snappedEdge, windowState.x, windowState.y, tasks, routines, schedules]);

  const modalPosRef = useRef<{ left: number; top: number } | null>(null);
  if (!activeModal) {
    modalPosRef.current = null;
  } else if (!modalPosRef.current) {
    modalPosRef.current = {
      left: windowState.snappedEdge === 'left'
        ? Math.min(window.innerWidth - 420, windowState.x + 150 + 360)
        : Math.max(16, windowState.x - 340 - 520),
      top: Math.max(16, Math.min(window.innerHeight - 620, windowState.y)),
    };
  }

  return (
    <div className="widget-wrapper relative w-full h-full text-slate-100 font-sans" data-tauri-drag-region>
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
        onMouseEnter={() => { handleMouseEnter(); addInteraction(); }}
        onMouseLeave={() => { handleMouseLeave(); removeInteraction(); }}
        onDragEnd={() => { removeInteraction(); handleDragEnd(); }}
        onSpeakSpeech={speakText}
      />

      <AnimatePresence>
        {windowState.isPanelOpen && (
          <div
            ref={panelMeasureRef}
            className="fixed z-40 interactive-element pointer-events-auto"
            style={panelPosRef.current || { left: 16, top: 16 }}
            onMouseEnter={addInteraction}
            onMouseLeave={removeInteraction}
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
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              onClose={() => {
                setActiveModal(null);
                closePanel();
              }}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {windowState.isPanelOpen && activeModal && (
          <div
            className="fixed z-50 interactive-element pointer-events-auto"
            style={modalPosRef.current || {}}
            onMouseEnter={addInteraction}
            onMouseLeave={removeInteraction}
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
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onOpenAddScheduleModal={() => setActiveModal({ kind: 'add-schedule' })}
            />
          </div>
        )}
      </AnimatePresence>

      {(isTauriModalOpen || isInstallModalOpen || isSettingsModalOpen || isSyncModalOpen) && (
        <div
          className="interactive-element pointer-events-auto fixed inset-0 z-50"
          onMouseEnter={addInteraction}
          onMouseLeave={removeInteraction}
        >
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
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import AppPanel from './AppPanel';
import AppMascot from './AppMascot';
import AppModal from './AppModal';
import { DesktopSimulator } from './components/DesktopSimulator';
import { MascotWidget } from './components/MascotWidget';
import { TaskPanel } from './components/TaskPanel';
import { DetailModal, DetailModalType } from './components/DetailModal';
import { SoundSettings } from './components/SoundSettings';
import { SyncModal } from './components/SyncModal';
import { TauriConfigModal } from './components/TauriConfigModal';
import { InstallAppModal } from './components/InstallAppModal';
import { CharacterState, TaskItem, RoutineItem, ScheduleItem, CharacterConfig, AudioConfig, SyncConfig, PriorityLevel } from './types';
import { LocalDataService } from './utils/db';
import { useAudio } from './hooks/useAudio';
import { useEdgeSnap } from './hooks/useEdgeSnap';

export default function App() {
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const windowParam = urlParams?.get('window');

  // Handle multi-window routing (Tauri or manual query param)
  if (windowParam === 'panel') {
    return <AppPanel />;
  }
  if (windowParam === 'modal') {
    return <AppModal />;
  }
  if (windowParam === 'mascot' || (isTauri && !windowParam)) {
    return <AppMascot />;
  }

  // --- WEB PREVIEW / AI STUDIO SIMULATOR ENVIRONMENT ---
  return <WebCompanionApp />;
}

function WebCompanionApp() {
  const [viewMode, setViewMode] = useState<'simulator' | 'panel' | 'mascot'>('simulator');
  
  // Data state
  const [tasks, setTasks] = useState<TaskItem[]>(() => LocalDataService.getTasks());
  const [routines, setRoutines] = useState<RoutineItem[]>(() => LocalDataService.getRoutines());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => LocalDataService.getSchedules());
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => LocalDataService.getSyncConfig());

  // Mascot & modal states
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
    autoHideSeconds: characterConfig.autoHideSeconds || 0,
    hoverDelayMs: characterConfig.hoverDelayMs ?? 0,
    closeDelayMs: characterConfig.closeDelayMs ?? 0,
  });

  const pendingDeadlines = useMemo(() => {
    return LocalDataService.getPendingDeadlinesWithinHours(characterConfig.notificationHoursBeforeDeadline || 3);
  }, [tasks, characterConfig.notificationHoursBeforeDeadline]);

  // Alert and pose manager
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
  }, [
    pendingDeadlines.length,
    windowState.isPanelOpen,
    windowState.isPeeking,
    playNotification,
    sendPushNotification,
    characterConfig.pushNotificationsEnabled,
    characterConfig.projectName,
  ]);

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
    setRoutines(LocalDataService.deleteRoutine(id));
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
      const mode = config.displayMode;
      setWindowState(prev => ({ ...prev, displayMode: mode }));
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

  if (viewMode === 'panel') {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-start p-4">
        <div className="w-full max-w-[420px] flex justify-between items-center mb-3 text-xs text-gray-400">
          <span>Mode: Panel Saja</span>
          <button
            onClick={() => setViewMode('simulator')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium"
          >
            ← Kembali ke Simulator Desktop
          </button>
        </div>
        <div className="w-full max-w-[420px] h-[calc(100vh-60px)]">
          <AppPanel />
        </div>
      </div>
    );
  }

  if (viewMode === 'mascot') {
    return (
      <div className="w-screen h-screen bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-4">
        <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-xs bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-gray-300">
          <span>Mode: Maskot Floating Standalone (180x180)</span>
          <button
            onClick={() => setViewMode('simulator')}
            className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
          >
            Kembali ke Simulator
          </button>
        </div>
        <div className="w-[180px] h-[180px]">
          <AppMascot />
        </div>
      </div>
    );
  }

  return (
    <DesktopSimulator
      onOpenTauriConfig={() => setIsTauriModalOpen(true)}
      onOpenSettings={() => setIsSettingsModalOpen(true)}
      onOpenSync={() => setIsSyncModalOpen(true)}
      onOpenInstallModal={() => setIsInstallModalOpen(true)}
      pendingDeadlinesCount={pendingDeadlines.length}
      snappedEdge={windowState.snappedEdge}
      isPeeking={windowState.isPeeking}
    >
      {/* Floating Mascot Widget */}
      <div className="relative w-full h-full pointer-events-none">
        <div className="pointer-events-auto">
          <MascotWidget
            state={characterState}
            snappedEdge={windowState.snappedEdge}
            isPeeking={windowState.isPeeking || (!windowState.isPanelOpen && characterState === 'peek')}
            isPanelOpen={windowState.isPanelOpen}
            displayMode={windowState.displayMode}
            config={characterConfig}
            pendingDeadlines={pendingDeadlines}
            position={{ x: windowState.x, y: windowState.y }}
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
        </div>

        {/* Floating Task Panel */}
        <AnimatePresence>
          {windowState.isPanelOpen && (
            <div
              className={`fixed z-40 pointer-events-auto ${
                windowState.snappedEdge === 'left'
                  ? 'left-[190px]'
                  : 'right-[190px]'
              }`}
              style={{
                top: Math.max(65, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - 700, windowState.y)),
              }}
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

        {/* Detail Modal */}
        <AnimatePresence>
          {activeModal && (
            <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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

        {/* Global Settings & Utilities Modals */}
        <div className="pointer-events-auto">
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
    </DesktopSimulator>
  );
}

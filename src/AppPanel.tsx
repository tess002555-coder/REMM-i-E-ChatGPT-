import React, { useState, useEffect, useCallback } from 'react';
import { TaskItem, RoutineItem, ScheduleItem, CharacterConfig, AudioConfig, SyncConfig, PriorityLevel } from './types';
import { LocalDataService } from './utils/db';
import { useAudio } from './hooks/useAudio';

import { TaskPanel } from './components/TaskPanel';
import { DetailModal, DetailModalType } from './components/DetailModal';
import { SoundSettings } from './components/SoundSettings';
import { SyncModal } from './components/SyncModal';
import { TauriConfigModal } from './components/TauriConfigModal';
import { InstallAppModal } from './components/InstallAppModal';

export default function AppPanel() {
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  // State from Local Data Storage
  const [tasks, setTasks] = useState<TaskItem[]>(() => LocalDataService.getTasks());
  const [routines, setRoutines] = useState<RoutineItem[]>(() => LocalDataService.getRoutines());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => LocalDataService.getSchedules());

  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => LocalDataService.getSyncConfig());

  // Modals state
  const [activeModal, setActiveModal] = useState<DetailModalType | null>(null);
  const [isTauriModalOpen, setIsTauriModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Audio Hook
  const { playNotification } = useAudio(audioConfig);

  // Broadcast data update to other windows (Mascot)
  const broadcastUpdate = useCallback(async () => {
    if (isTauri) {
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('data-updated', {});
      } catch (err) {
        console.warn('Failed to emit data-updated event:', err);
      }
    }
  }, [isTauri]);

  // Close panel window handler
  const handleClosePanel = useCallback(async () => {
    setActiveModal(null);
    if (isTauri) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { emit } = await import('@tauri-apps/api/event');
        const win = getCurrentWebviewWindow();
        await win.hide();
        await emit('panel-closed', {});
      } catch (err) {
        console.warn('Failed to hide panel window:', err);
      }
    }
  }, [isTauri]);

  // Handlers for Tasks
  const handleToggleTask = useCallback((id: string) => {
    const updated = LocalDataService.toggleTask(id);
    setTasks(updated);
    broadcastUpdate();

    const toggled = updated.find(t => t.id === id);
    if (toggled && toggled.completed) {
      playNotification('complete');
    }
  }, [playNotification, broadcastUpdate]);

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
    broadcastUpdate();
  }, [playNotification, broadcastUpdate]);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks(LocalDataService.deleteTask(id));
    broadcastUpdate();
  }, [broadcastUpdate]);

  // Handlers for Routines
  const handleToggleRoutine = useCallback((id: string) => {
    setRoutines(LocalDataService.toggleRoutine(id));
    broadcastUpdate();
  }, [broadcastUpdate]);

  const handleAddRoutine = useCallback((title: string, description: string) => {
    const updated = LocalDataService.addRoutine(title, description, 0);
    setRoutines(updated);
    playNotification('routine');
    broadcastUpdate();
  }, [playNotification, broadcastUpdate]);

  const handleDeleteRoutine = useCallback((id: string) => {
    const updated = LocalDataService.deleteRoutine(id);
    setRoutines(updated);
    broadcastUpdate();
  }, [broadcastUpdate]);

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
    broadcastUpdate();
  }, [playNotification, broadcastUpdate]);

  const handleToggleSchedule = useCallback((id: string) => {
    setSchedules(LocalDataService.toggleSchedule(id));
    broadcastUpdate();
  }, [broadcastUpdate]);

  const handleDeleteSchedule = useCallback((id: string) => {
    setSchedules(LocalDataService.deleteSchedule(id));
    broadcastUpdate();
  }, [broadcastUpdate]);

  // Handlers for Routine Daily Logs
  const handleSaveRoutineLog = useCallback((id: string, dateStr: string, content: string) => {
    const updated = LocalDataService.updateRoutineDailyLog(id, dateStr, content);
    setRoutines(updated);
    broadcastUpdate();
    setActiveModal(prev => {
      if (prev?.kind === 'routine' && prev.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { kind: 'routine', item: updatedItem } : prev;
      }
      return prev;
    });
  }, [broadcastUpdate]);

  const handleDeleteRoutineLog = useCallback((id: string, dateStr: string) => {
    const updated = LocalDataService.deleteRoutineDailyLog(id, dateStr);
    setRoutines(updated);
    broadcastUpdate();
    setActiveModal(prev => {
      if (prev?.kind === 'routine' && prev.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { kind: 'routine', item: updatedItem } : prev;
      }
      return prev;
    });
  }, [broadcastUpdate]);

  // Settings Save Handlers
  const handleSaveAudio = useCallback((config: AudioConfig) => {
    setAudioConfig(config);
    LocalDataService.saveAudioConfig(config);
    broadcastUpdate();
  }, [broadcastUpdate]);

  const handleSaveCharacter = useCallback((config: CharacterConfig) => {
    setCharacterConfig(config);
    LocalDataService.saveCharacterConfig(config);
    broadcastUpdate();
  }, [broadcastUpdate]);

  const handleSaveSync = useCallback((config: SyncConfig) => {
    setSyncConfig(config);
    LocalDataService.saveSyncConfig(config);
    broadcastUpdate();
  }, [broadcastUpdate]);

  const handleRefreshData = useCallback(() => {
    setTasks(LocalDataService.getTasks());
    setRoutines(LocalDataService.getRoutines());
    setSchedules(LocalDataService.getSchedules());
    broadcastUpdate();
  }, [broadcastUpdate]);

  return (
    <div className="w-full h-full p-2 flex flex-col justify-start items-center text-slate-100 font-sans select-none overflow-hidden bg-transparent">
      {/* Main Task / Schedule / Routine Panel */}
      <div className="w-full max-w-[380px] h-full flex flex-col">
        <TaskPanel
          isOpen={true}
          snappedEdge="right"
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
          onClose={handleClosePanel}
        />
      </div>

      {/* Detail Pop-Up Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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

      {/* Settings & System Modals */}
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
  );
}

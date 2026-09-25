import React, { useState, useEffect, useCallback } from 'react';
import { ScheduleItem, RoutineItem, TaskItem, CharacterConfig, AudioConfig, SyncConfig, PriorityLevel } from './types';
import { LocalDataService } from './utils/db';
import { DetailModal, DetailModalType } from './components/DetailModal';
import { SoundSettings } from './components/SoundSettings';
import { SyncModal } from './components/SyncModal';
import { TauriConfigModal } from './components/TauriConfigModal';
import { InstallAppModal } from './components/InstallAppModal';
import { useAudio } from './hooks/useAudio';

export type ModalViewType =
  | { type: 'detail'; payload: DetailModalType }
  | { type: 'settings' }
  | { type: 'sync' }
  | { type: 'tauri' }
  | { type: 'install' }
  | null;

export default function AppModal() {
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  const [activeView, setActiveView] = useState<ModalViewType>(null);

  // Local storage state
  const [tasks, setTasks] = useState<TaskItem[]>(() => LocalDataService.getTasks());
  const [routines, setRoutines] = useState<RoutineItem[]>(() => LocalDataService.getRoutines());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => LocalDataService.getSchedules());

  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => LocalDataService.getSyncConfig());

  const { playNotification } = useAudio(audioConfig);

  // Broadcast data changes to other windows (Mascot & Panel)
  const broadcastUpdate = useCallback(async () => {
    if (isTauri) {
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('data-updated', {});
      } catch (err) {
        console.warn('Failed to emit data-updated from modal:', err);
      }
    }
  }, [isTauri]);

  // Close this modal window
  const handleClose = useCallback(async () => {
    setActiveView(null);
    if (isTauri) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { emit } = await import('@tauri-apps/api/event');
        const win = getCurrentWebviewWindow();
        await win.hide();
        await emit('modal-closed', {});
      } catch (err) {
        console.warn('Failed to hide modal window:', err);
      }
    }
  }, [isTauri]);

  // Listen for open-modal event from Panel
  useEffect(() => {
    let unlistenOpen: (() => void) | undefined;
    let unlistenDataUpdate: (() => void) | undefined;

    const setupListeners = async () => {
      if (isTauri) {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          unlistenOpen = await listen<{ type: string; payload?: any }>('open-modal-view', (event) => {
            const { type, payload } = event.payload;
            if (type === 'detail') {
              setActiveView({ type: 'detail', payload });
            } else if (type === 'settings') {
              setActiveView({ type: 'settings' });
            } else if (type === 'sync') {
              setActiveView({ type: 'sync' });
            } else if (type === 'tauri') {
              setActiveView({ type: 'tauri' });
            } else if (type === 'install') {
              setActiveView({ type: 'install' });
            }
            // Refresh data from storage
            setTasks(LocalDataService.getTasks());
            setRoutines(LocalDataService.getRoutines());
            setSchedules(LocalDataService.getSchedules());
            setCharacterConfig(LocalDataService.getCharacterConfig());
            setAudioConfig(LocalDataService.getAudioConfig());
            setSyncConfig(LocalDataService.getSyncConfig());
          });

          unlistenDataUpdate = await listen('data-updated', () => {
            setTasks(LocalDataService.getTasks());
            setRoutines(LocalDataService.getRoutines());
            setSchedules(LocalDataService.getSchedules());
            setCharacterConfig(LocalDataService.getCharacterConfig());
            setAudioConfig(LocalDataService.getAudioConfig());
            setSyncConfig(LocalDataService.getSyncConfig());
          });
        } catch (err) {
          console.warn('Tauri event error in Modal window:', err);
        }
      }
    };

    setupListeners();
    return () => {
      if (unlistenOpen) unlistenOpen();
      if (unlistenDataUpdate) unlistenDataUpdate();
    };
  }, [isTauri]);

  // Data manipulation handlers
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

  const handleAddRoutine = useCallback((title: string, description: string) => {
    const updated = LocalDataService.addRoutine(title, description, 0);
    setRoutines(updated);
    playNotification('routine');
    broadcastUpdate();
  }, [playNotification, broadcastUpdate]);

  const handleSaveRoutineLog = useCallback((id: string, dateStr: string, content: string) => {
    const updated = LocalDataService.updateRoutineDailyLog(id, dateStr, content);
    setRoutines(updated);
    broadcastUpdate();
    setActiveView(prev => {
      if (prev?.type === 'detail' && prev.payload.kind === 'routine' && prev.payload.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { type: 'detail', payload: { kind: 'routine', item: updatedItem } } : prev;
      }
      return prev;
    });
  }, [broadcastUpdate]);

  const handleDeleteRoutineLog = useCallback((id: string, dateStr: string) => {
    const updated = LocalDataService.deleteRoutineDailyLog(id, dateStr);
    setRoutines(updated);
    broadcastUpdate();
    setActiveView(prev => {
      if (prev?.type === 'detail' && prev.payload.kind === 'routine' && prev.payload.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { type: 'detail', payload: { kind: 'routine', item: updatedItem } } : prev;
      }
      return prev;
    });
  }, [broadcastUpdate]);

  const handleDeleteRoutine = useCallback((id: string) => {
    const updated = LocalDataService.deleteRoutine(id);
    setRoutines(updated);
    broadcastUpdate();
    handleClose();
  }, [broadcastUpdate, handleClose]);

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
    handleClose();
  }, [playNotification, broadcastUpdate, handleClose]);

  const handleToggleTask = useCallback((id: string) => {
    setTasks(LocalDataService.toggleTask(id));
    broadcastUpdate();
  }, [broadcastUpdate]);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks(LocalDataService.deleteTask(id));
    broadcastUpdate();
  }, [broadcastUpdate]);

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
    setCharacterConfig(LocalDataService.getCharacterConfig());
    setAudioConfig(LocalDataService.getAudioConfig());
    setSyncConfig(LocalDataService.getSyncConfig());
    broadcastUpdate();
  }, [broadcastUpdate]);

  return (
    <div className="w-full h-full p-2 flex items-center justify-center text-slate-100 font-sans select-none overflow-hidden bg-transparent">
      {activeView?.type === 'detail' && (
        <DetailModal
          modalState={activeView.payload}
          onClose={handleClose}
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
          onOpenAddScheduleModal={() => setActiveView({ type: 'detail', payload: { kind: 'add-schedule' } })}
        />
      )}

      {activeView?.type === 'settings' && (
        <SoundSettings
          isOpen={true}
          onClose={handleClose}
          audioConfig={audioConfig}
          characterConfig={characterConfig}
          syncConfig={syncConfig}
          onSaveAudio={handleSaveAudio}
          onSaveCharacter={handleSaveCharacter}
          onSaveSync={handleSaveSync}
          onTestSound={playNotification}
          onRefreshData={handleRefreshData}
        />
      )}

      {activeView?.type === 'sync' && (
        <SyncModal
          isOpen={true}
          onClose={handleClose}
          syncConfig={syncConfig}
          onSaveSyncConfig={handleSaveSync}
          onRefreshData={handleRefreshData}
        />
      )}

      {activeView?.type === 'tauri' && (
        <TauriConfigModal
          isOpen={true}
          onClose={handleClose}
        />
      )}

      {activeView?.type === 'install' && (
        <InstallAppModal
          onClose={handleClose}
          onOpenTauriModal={() => setActiveView({ type: 'tauri' })}
        />
      )}
    </div>
  );
}

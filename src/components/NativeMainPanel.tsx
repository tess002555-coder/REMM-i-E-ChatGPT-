import React, { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';
import { LocalDataService } from '../utils/db';
import { AudioConfig, CharacterConfig, PriorityLevel, RoutineItem, ScheduleItem, SyncConfig, TaskItem } from '../types';
import { TaskPanel } from './TaskPanel';
import { DetailModal, DetailModalType } from './DetailModal';
import { SyncModal } from './SyncModal';
import { TauriConfigModal } from './TauriConfigModal';
import { InstallAppModal } from './InstallAppModal';
import { useAudio } from '../hooks/useAudio';

export const NativeMainPanel: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>(() => LocalDataService.getTasks());
  const [routines, setRoutines] = useState<RoutineItem[]>(() => LocalDataService.getRoutines());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => LocalDataService.getSchedules());
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(() => LocalDataService.getCharacterConfig());
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => LocalDataService.getAudioConfig());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => LocalDataService.getSyncConfig());
  const [activeModal, setActiveModal] = useState<DetailModalType | null>(null);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isTauriOpen, setIsTauriOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  const { playNotification } = useAudio(audioConfig);

  const closeWindow = useCallback(async () => {
    await emit('main-panel-closed');
    await getCurrentWindow().close();
  }, []);

  const openSettingsWindow = useCallback(async () => {
    try {
      const existing = await WebviewWindow.getByLabel('settings');
      if (existing) {
        await existing.show();
        await existing.setFocus();
        return;
      }
      const settings = new WebviewWindow('settings', {
        url: 'index.html?window=settings',
        title: 'REMM(i) - Pengaturan',
        width: 760,
        height: 720,
        minWidth: 680,
        minHeight: 620,
        resizable: true,
        fullscreen: false,
        decorations: false,
        transparent: false,
        alwaysOnTop: false,
        skipTaskbar: false,
        visible: false,
        focus: true,
      });
      settings.once('tauri://created', async () => {
        await settings.show();
        await settings.setFocus();
      });
    } catch (e) {
      console.error('[REMM] Failed to open settings:', e);
    }
  }, []);

  useEffect(() => {
    const w = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void w.onCloseRequested(async () => {
      await emit('main-panel-closed');
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  const refreshData = useCallback(() => {
    setTasks(LocalDataService.getTasks());
    setRoutines(LocalDataService.getRoutines());
    setSchedules(LocalDataService.getSchedules());
    setCharacterConfig(LocalDataService.getCharacterConfig());
    setAudioConfig(LocalDataService.getAudioConfig());
    setSyncConfig(LocalDataService.getSyncConfig());
  }, []);

  const handleAddTask = useCallback((title: string, dueDate?: string, isDeadline?: boolean, priority?: PriorityLevel) => {
    LocalDataService.addTask({ title, completed: false, dueDate, isDeadline, priority: priority || (isDeadline ? 'high' : 'medium') });
    setTasks(LocalDataService.getTasks());
    playNotification('task');
  }, [playNotification]);

  const handleToggleTask = useCallback((id: string) => setTasks(LocalDataService.toggleTask(id)), []);
  const handleDeleteTask = useCallback((id: string) => setTasks(LocalDataService.deleteTask(id)), []);
  const handleToggleRoutine = useCallback((id: string) => setRoutines(LocalDataService.toggleRoutine(id)), []);
  const handleDeleteRoutine = useCallback((id: string) => setRoutines(LocalDataService.deleteRoutine(id)), []);
  const handleAddRoutine = useCallback((title: string, description: string) => {
    setRoutines(LocalDataService.addRoutine(title, description, 0));
    playNotification('routine');
  }, [playNotification]);
  const handleAddSchedule = useCallback((title: string, datetime: string) => {
    LocalDataService.addSchedule({ title, datetime, completed: false, remindMinutesBefore: 15 });
    setSchedules(LocalDataService.getSchedules());
    playNotification('schedule');
  }, [playNotification]);
  const handleToggleSchedule = useCallback((id: string) => setSchedules(LocalDataService.toggleSchedule(id)), []);
  const handleDeleteSchedule = useCallback((id: string) => setSchedules(LocalDataService.deleteSchedule(id)), []);

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 p-3 overflow-hidden">
      <TaskPanel
        nativeWindow
        isOpen
        snappedEdge="right"
        tasks={tasks}
        routines={routines}
        schedules={schedules}
        config={characterConfig}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onToggleRoutine={handleToggleRoutine}
        onDeleteSchedule={handleDeleteSchedule}
        onOpenModal={setActiveModal}
        onOpenSettings={openSettingsWindow}
        onOpenInstallModal={() => setIsInstallOpen(true)}
        onClose={closeWindow}
      />

      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-2 overflow-auto">
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
            onSaveRoutineLog={(id, dateStr, content) => setRoutines(LocalDataService.updateRoutineDailyLog(id, dateStr, content))}
            onDeleteRoutineLog={(id, dateStr) => setRoutines(LocalDataService.deleteRoutineDailyLog(id, dateStr))}
            onDeleteRoutine={handleDeleteRoutine}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onOpenAddScheduleModal={() => setActiveModal({ kind: 'add-schedule' })}
          />
        </div>
      )}

      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        syncConfig={syncConfig}
        onSaveSyncConfig={(config) => { setSyncConfig(config); LocalDataService.saveSyncConfig(config); }}
        onRefreshData={refreshData}
      />
      {isTauriOpen && <TauriConfigModal isOpen onClose={() => setIsTauriOpen(false)} />}
      {isInstallOpen && <InstallAppModal onClose={() => setIsInstallOpen(false)} onOpenTauriModal={() => setIsTauriOpen(true)} />}
    </div>
  );
};

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

  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  // Broadcast state changes across all windows
  const broadcastDataUpdate = useCallback(async () => {
    if (isTauri) {
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('data-updated', {});
      } catch (err) {
        console.warn('Failed to broadcast data-updated from App.tsx:', err);
      }
    }
  }, [isTauri]);

  // Handlers for Tasks
  const handleToggleTask = useCallback((id: string) => {
    const updated = LocalDataService.toggleTask(id);
    setTasks(updated);

    const toggled = updated.find(t => t.id === id);
    if (toggled && toggled.completed) {
      playNotification('complete');
      setCharacterState('peek');
    }
    broadcastDataUpdate();
  }, [playNotification, broadcastDataUpdate]);

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
    broadcastDataUpdate();
  }, [playNotification, broadcastDataUpdate]);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks(LocalDataService.deleteTask(id));
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);

  // Handlers for Routines
  const handleToggleRoutine = useCallback((id: string) => {
    setRoutines(LocalDataService.toggleRoutine(id));
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);

  const handleAddRoutine = useCallback((title: string, description: string) => {
    const updated = LocalDataService.addRoutine(title, description, 0);
    setRoutines(updated);
    playNotification('routine');
    broadcastDataUpdate();
  }, [playNotification, broadcastDataUpdate]);

  const handleDeleteRoutine = useCallback((id: string) => {
    const updated = LocalDataService.deleteRoutine(id);
    setRoutines(updated);
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);

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
    broadcastDataUpdate();
  }, [playNotification, broadcastDataUpdate]);

  const handleToggleSchedule = useCallback((id: string) => {
    setSchedules(LocalDataService.toggleSchedule(id));
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);

  const handleDeleteSchedule = useCallback((id: string) => {
    setSchedules(LocalDataService.deleteSchedule(id));
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);

  // Handlers for Routine Daily Logs
  const handleSaveRoutineLog = useCallback((id: string, dateStr: string, content: string) => {
    const updated = LocalDataService.updateRoutineDailyLog(id, dateStr, content);
    setRoutines(updated);
    broadcastDataUpdate();
    setActiveModal(prev => {
      if (prev?.kind === 'routine' && prev.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { kind: 'routine', item: updatedItem } : prev;
      }
      return prev;
    });
  }, [broadcastDataUpdate]);

  const handleDeleteRoutineLog = useCallback((id: string, dateStr: string) => {
    const updated = LocalDataService.deleteRoutineDailyLog(id, dateStr);
    setRoutines(updated);
    broadcastDataUpdate();
    setActiveModal(prev => {
      if (prev?.kind === 'routine' && prev.item.id === id) {
        const updatedItem = updated.find(r => r.id === id);
        return updatedItem ? { kind: 'routine', item: updatedItem } : prev;
      }
      return prev;
    });
  }, [broadcastDataUpdate]);

  // Settings Save Handlers
  const handleSaveAudio = useCallback((config: AudioConfig) => {
    setAudioConfig(config);
    LocalDataService.saveAudioConfig(config);
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);

  const handleSaveCharacter = useCallback((config: CharacterConfig) => {
    setCharacterConfig(config);
    LocalDataService.saveCharacterConfig(config);
    if (config.displayMode) {
      setWindowState(prev => ({
        ...prev,
        displayMode: config.displayMode,
      }));
    }
    broadcastDataUpdate();
  }, [setWindowState, broadcastDataUpdate]);

  const handleSaveSync = useCallback((config: SyncConfig) => {
    setSyncConfig(config);
    LocalDataService.saveSyncConfig(config);
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);

  const handleRefreshData = useCallback(() => {
    setTasks(LocalDataService.getTasks());
    setRoutines(LocalDataService.getRoutines());
    setSchedules(LocalDataService.getSchedules());
    setCharacterConfig(LocalDataService.getCharacterConfig());
    setAudioConfig(LocalDataService.getAudioConfig());
    setSyncConfig(LocalDataService.getSyncConfig());
    broadcastDataUpdate();
  }, [broadcastDataUpdate]);






  // WebviewWindow coordinator: spawn & position panel relative to mascot
  const handleOpenPanelWindow = useCallback(async () => {
    if (isTauri) {
      try {
        const { WebviewWindow, getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { currentMonitor } = await import('@tauri-apps/api/window');
        const { LogicalPosition } = await import('@tauri-apps/api/dpi');
        const { emit } = await import('@tauri-apps/api/event');

        let panelWin = await WebviewWindow.getByLabel('panel');
        if (!panelWin) {
          panelWin = new WebviewWindow('panel', {
            url: 'index.html?window=panel',
            title: 'Remember ME Panel',
            width: 420,
            height: 620,
            resizable: false,
            decorations: false,
            transparent: true,
            alwaysOnTop: true,
            shadow: false,
            skipTaskbar: true,
            visible: false,
            dragDropEnabled: false,
          });
        }

        const isVisible = await panelWin.isVisible();
        if (isVisible) {
          await panelWin.hide();
          await emit('panel-state-changed', { isOpen: false });
        } else {
          const mascotWin = await WebviewWindow.getByLabel('mascot') || getCurrentWebviewWindow();
          const mascotPos = await mascotWin.outerPosition();
          const monitor = await currentMonitor();

          if (monitor) {
            const scale = monitor.scaleFactor || 1;
            const monWidth = monitor.size.width / scale;
            const monHeight = monitor.size.height / scale;
            const monX = monitor.position.x / scale;
            const monY = monitor.position.y / scale;

            const mascotX = (mascotPos.x / scale) - monX;
            const mascotY = (mascotPos.y / scale) - monY;

            const panelWidth = 420;
            const panelHeight = 620;

            const placeLeft = (mascotX + 90) > (monWidth / 2);
            let panelX = placeLeft ? (mascotX - panelWidth - 10) : (mascotX + 180 + 10);
            panelX = Math.max(10, Math.min(monWidth - panelWidth - 10, panelX));
            const panelY = Math.max(10, Math.min(monHeight - panelHeight - 10, mascotY - 20));

            await panelWin.setPosition(new LogicalPosition(monX + panelX, monY + panelY));
            await panelWin.show();
            await panelWin.setFocus();
            await emit('panel-state-changed', { isOpen: true });
          }
        }
      } catch (err) {
        console.warn('Error toggling panel window in App.tsx:', err);
      }
    }
  }, [isTauri]);

  // WebviewWindow coordinator: spawn & position modal relative to panel
  const handleOpenModalWindow = useCallback(async (type: 'detail' | 'settings' | 'sync' | 'tauri' | 'install', payload?: any) => {
    if (isTauri) {
      try {
        const { WebviewWindow, getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { currentMonitor } = await import('@tauri-apps/api/window');
        const { LogicalPosition } = await import('@tauri-apps/api/dpi');
        const { emit } = await import('@tauri-apps/api/event');

        let modalWin = await WebviewWindow.getByLabel('modal');
        if (!modalWin) {
          modalWin = new WebviewWindow('modal', {
            url: 'index.html?window=modal',
            title: 'Remember ME Modal',
            width: 500,
            height: 600,
            resizable: false,
            decorations: false,
            transparent: true,
            alwaysOnTop: true,
            shadow: false,
            skipTaskbar: true,
            visible: false,
            dragDropEnabled: false,
          });
        }

        let refWin = await WebviewWindow.getByLabel('panel');
        if (!refWin || !(await refWin.isVisible())) {
          refWin = await WebviewWindow.getByLabel('mascot') || getCurrentWebviewWindow();
        }

        const monitor = await currentMonitor();
        const refPos = await refWin.outerPosition();

        if (monitor) {
          const scale = monitor.scaleFactor || 1;
          const monWidth = monitor.size.width / scale;
          const monHeight = monitor.size.height / scale;
          const monX = monitor.position.x / scale;
          const monY = monitor.position.y / scale;

          const refX = (refPos.x / scale) - monX;
          const refY = (refPos.y / scale) - monY;

          const modalWidth = 500;
          const modalHeight = 600;

          const placeLeft = (refX + 210) > (monWidth / 2);
          let modalX = placeLeft ? (refX - modalWidth - 10) : (refX + 420 + 10);
          modalX = Math.max(10, Math.min(monWidth - modalWidth - 10, modalX));
          const modalY = Math.max(10, Math.min(monHeight - modalHeight - 10, refY));

          await modalWin.setPosition(new LogicalPosition(monX + modalX, monY + modalY));
          await modalWin.show();
          await modalWin.setFocus();
          await emit('open-modal-view', { type, payload });
          return;
        }
      } catch (err) {
        console.warn('Error opening modal window in App.tsx:', err);
      }
    }

    // Fallback for browser preview
    if (type === 'detail') setActiveModal(payload);
    else if (type === 'settings') setIsSettingsModalOpen(true);
    else if (type === 'sync') setIsSyncModalOpen(true);
    else if (type === 'tauri') setIsTauriModalOpen(true);
    else if (type === 'install') setIsInstallModalOpen(true);
  }, [isTauri]);

  // Synchronize state across windows via Tauri event listeners
  useEffect(() => {
    let unlistenData: (() => void) | undefined;
    let unlistenMascot: (() => void) | undefined;
    let unlistenPanelState: (() => void) | undefined;

    const setupListeners = async () => {
      if (isTauri) {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          unlistenData = await listen('data-updated', () => {
            setTasks(LocalDataService.getTasks());
            setRoutines(LocalDataService.getRoutines());
            setSchedules(LocalDataService.getSchedules());
            setCharacterConfig(LocalDataService.getCharacterConfig());
            setAudioConfig(LocalDataService.getAudioConfig());
            setSyncConfig(LocalDataService.getSyncConfig());
          });

          unlistenMascot = await listen<{ state: CharacterState }>('mascot-state-changed', (event) => {
            if (event.payload?.state) {
              setCharacterState(event.payload.state);
            }
          });

          unlistenPanelState = await listen<{ isOpen: boolean }>('panel-state-changed', (event) => {
            setWindowState(prev => ({ ...prev, isPanelOpen: event.payload.isOpen }));
          });
        } catch (err) {
          console.warn('Tauri listen error in App.tsx:', err);
        }
      }
    };

    setupListeners();
    return () => {
      if (unlistenData) unlistenData();
      if (unlistenMascot) unlistenMascot();
      if (unlistenPanelState) unlistenPanelState();
    };
  }, [isTauri, setWindowState]);

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
          if (isTauri) {
            handleOpenPanelWindow();
          } else {
            togglePanel();
            if (windowState.isPanelOpen) {
              setActiveModal(null);
            }
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
              onOpenModal={modal => {
                if (isTauri) {
                  handleOpenModalWindow('detail', modal);
                } else {
                  setActiveModal(modal);
                }
              }}
              onOpenSettings={() => {
                if (isTauri) {
                  handleOpenModalWindow('settings');
                } else {
                  setIsSettingsModalOpen(true);
                }
              }}
              onOpenInstallModal={() => {
                if (isTauri) {
                  handleOpenModalWindow('install');
                } else {
                  setIsInstallModalOpen(true);
                }
              }}
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

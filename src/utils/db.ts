import { TaskItem, RoutineItem, ScheduleItem, SyncConfig, CharacterConfig, AudioConfig } from '../types';

const STORAGE_KEYS = {
  TASKS: 'rememberme_tasks_v1',
  ROUTINES: 'rememberme_routines_v1',
  SCHEDULES: 'rememberme_schedules_v1',
  CHARACTER: 'rememberme_character_v1',
  AUDIO: 'rememberme_audio_v1',
  SYNC: 'rememberme_sync_v1',
};

// Initial default seed data
const DEFAULT_TASKS: TaskItem[] = [];

const DEFAULT_ROUTINES: RoutineItem[] = [
  {
    id: 'r-1',
    title: 'REMMIE Project',
    description: 'Project development & daily routine tracker',
    intervalMinutes: 60,
    enabled: true,
    soundType: 'water',
  },
];

const DEFAULT_SCHEDULES: ScheduleItem[] = [
  {
    id: 's-1',
    title: 'Weekly Standup Meeting',
    datetime: '2026-07-31T10:00:00.000Z',
    completed: false,
    location: 'Google Meet',
    remindMinutesBefore: 15,
  },
  {
    id: 's-2',
    title: 'Daily Farming & Daily Routine',
    datetime: '2026-07-31T18:00:00.000Z',
    completed: false,
    remindMinutesBefore: 10,
  },
];

export function isLightColor(hexColor?: string): boolean {
  if (!hexColor) return false;
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150;
}

export const DEFAULT_CHARACTER: CharacterConfig = {
  name: 'Maskot Denia',
  projectName: 'REMM(i)E',
  customImageUrls: {},
  speechEnabled: true,
  ttsEnabled: false,
  pushNotificationsEnabled: true,
  voiceVolume: 0.8,
  autoHideSeconds: 0, // Default 0 (always visible on desktop/mobile, no auto-hiding offscreen)
  displayMode: 'mascot',
  hoverDelayMs: 0, // 0 ms delay = instant transition
  closeDelayMs: 0, // 0 ms delay = instant transition
  notificationHoursBeforeDeadline: 3, // Default 3 Jam Sebelum Deadline
  panelOpacity: 0.95,
  panelBgColor: '#1A1A1E',
  panelBorderColor: '#3A3A40',
};

export const DEFAULT_AUDIO: AudioConfig = {
  enabled: true,
  volume: 0.7,
  soundType: 'synth',
  stateSounds: {},
};

export const DEFAULT_SYNC: SyncConfig = {
  googleCalendar: {
    enabled: false,
    apiKey: '',
    calendarId: 'primary',
  },
  edlink: {
    enabled: false,
    campusUrl: 'https://siakad.univ.ac.id',
    userToken: '',
    studentId: '',
    autoSync: true,
  },
  notion: {
    enabled: false,
    apiKey: '',
    databaseId: '',
  },
};

// SQLite-like Mock API Handler Interface
export class LocalDataService {
  // Tasks API
  static getTasks(): TaskItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  }

  static saveTasks(tasks: TaskItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Failed to save tasks to localStorage:', e);
    }
  }

  static addTask(task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>): TaskItem {
    const tasks = this.getTasks();
    const newTask: TaskItem = {
      ...task,
      id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  static toggleTask(id: string): TaskItem[] {
    const tasks = this.getTasks();
    const updated = tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t
    );
    this.saveTasks(updated);
    return updated;
  }

  static deleteTask(id: string): TaskItem[] {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.saveTasks(tasks);
    return tasks;
  }

  // Check H-Jam Deadlines (within specified hours threshold from now and not completed)
  static getPendingDeadlinesWithinHours(hoursNum: number = 24): TaskItem[] {
    const tasks = this.getTasks();
    const now = new Date();
    const targetTime = new Date(now.getTime() + (hoursNum || 24) * 60 * 60 * 1000);

    return tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const due = new Date(t.dueDate + (t.dueTime ? `T${t.dueTime}` : 'T23:59:59'));
      return due >= now && due <= targetTime;
    });
  }

  static getPendingDeadlinesWithin24h(): TaskItem[] {
    return this.getPendingDeadlinesWithinHours(24);
  }

  // Routines API
  static getRoutines(): RoutineItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROUTINES);
      return data ? JSON.parse(data) : DEFAULT_ROUTINES;
    } catch {
      return DEFAULT_ROUTINES;
    }
  }

  static saveRoutines(routines: RoutineItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
    } catch (e) {
      console.warn('Failed to save routines to localStorage:', e);
    }
  }

  static toggleRoutine(id: string): RoutineItem[] {
    const routines = this.getRoutines();
    const updated = routines.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    this.saveRoutines(updated);
    return updated;
  }

  static addRoutine(title: string, description: string, intervalMinutes: number): RoutineItem[] {
    const routines = this.getRoutines();
    const newRoutine: RoutineItem = {
      id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      description,
      intervalMinutes,
      enabled: true,
      soundType: 'chime',
    };
    routines.unshift(newRoutine);
    this.saveRoutines(routines);
    return routines;
  }

  static updateRoutineDailyLog(id: string, dateStr: string, logContent: string): RoutineItem[] {
    const routines = this.getRoutines();
    const updated = routines.map(r => {
      if (r.id === id) {
        const logs = { ...(r.dailyLogs || {}) };
        if (!logContent.trim()) {
          delete logs[dateStr];
        } else {
          logs[dateStr] = logContent.trim();
        }
        return { ...r, dailyLogs: logs };
      }
      return r;
    });
    this.saveRoutines(updated);
    return updated;
  }

  static deleteRoutineDailyLog(id: string, dateStr: string): RoutineItem[] {
    return this.updateRoutineDailyLog(id, dateStr, '');
  }

  static deleteRoutine(id: string): RoutineItem[] {
    const routines = this.getRoutines().filter(r => r.id !== id);
    this.saveRoutines(routines);
    return routines;
  }

  // Schedules API
  static getSchedules(): ScheduleItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      return data ? JSON.parse(data) : DEFAULT_SCHEDULES;
    } catch {
      return DEFAULT_SCHEDULES;
    }
  }

  static saveSchedules(schedules: ScheduleItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    } catch (e) {
      console.warn('Failed to save schedules to localStorage:', e);
    }
  }

  static addSchedule(sch: Omit<ScheduleItem, 'id'>): ScheduleItem {
    const list = this.getSchedules();
    const newItem: ScheduleItem = {
      ...sch,
      id: `s-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    };
    list.push(newItem);
    this.saveSchedules(list);
    return newItem;
  }

  static deleteSchedule(id: string): ScheduleItem[] {
    const list = this.getSchedules().filter(s => s.id !== id);
    this.saveSchedules(list);
    return list;
  }

  static toggleSchedule(id: string): ScheduleItem[] {
    const list = this.getSchedules();
    const updated = list.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    this.saveSchedules(updated);
    return updated;
  }

  // Settings Configs
  static getCharacterConfig(): CharacterConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHARACTER);
      return data ? { ...DEFAULT_CHARACTER, ...JSON.parse(data) } : DEFAULT_CHARACTER;
    } catch {
      return DEFAULT_CHARACTER;
    }
  }

  static saveCharacterConfig(config: CharacterConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHARACTER, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save character config to localStorage:', e);
    }
  }

  static getAudioConfig(): AudioConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIO);
      return data ? { ...DEFAULT_AUDIO, ...JSON.parse(data) } : DEFAULT_AUDIO;
    } catch {
      return DEFAULT_AUDIO;
    }
  }

  static saveAudioConfig(config: AudioConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save audio config to localStorage:', e);
    }
  }

  static getSyncConfig(): SyncConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC);
      return data ? { ...DEFAULT_SYNC, ...JSON.parse(data) } : DEFAULT_SYNC;
    } catch {
      return DEFAULT_SYNC;
    }
  }

  static saveSyncConfig(config: SyncConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save sync config to localStorage:', e);
    }
  }

  // Export / Import JSON Data
  static exportFullBackup(): string {
    const backup = {
      tasks: this.getTasks(),
      routines: this.getRoutines(),
      schedules: this.getSchedules(),
      character: this.getCharacterConfig(),
      audio: this.getAudioConfig(),
      sync: this.getSyncConfig(),
      exportedAt: new Date().toISOString(),
      app: 'Remember ME v1.0',
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.tasks) this.saveTasks(parsed.tasks);
      if (parsed.routines) this.saveRoutines(parsed.routines);
      if (parsed.schedules) this.saveSchedules(parsed.schedules);
      if (parsed.character) this.saveCharacterConfig(parsed.character);
      if (parsed.audio) this.saveAudioConfig(parsed.audio);
      if (parsed.sync) this.saveSyncConfig(parsed.sync);
      return true;
    } catch {
      return false;
    }
  }

  // SQLite Mock Engine Handler Query Simulator
  static executeSqlMock(query: string): { columns: string[]; rows: Record<string, unknown>[] } {
    const q = query.toLowerCase();
    if (q.includes('select * from tasks')) {
      return {
        columns: ['id', 'title', 'completed', 'dueDate', 'priority'],
        rows: this.getTasks() as unknown as Record<string, unknown>[],
      };
    }
    if (q.includes('select * from routines')) {
      return {
        columns: ['id', 'title', 'intervalMinutes', 'enabled'],
        rows: this.getRoutines() as unknown as Record<string, unknown>[],
      };
    }
    return {
      columns: ['status', 'message'],
      rows: [{ status: 'OK', message: 'SQLite mock statement executed successfully' }],
    };
  }
}

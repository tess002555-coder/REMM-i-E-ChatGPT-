export type CharacterState = 'peek' | 'pointing' | 'alert' | 'idle';

export type SnapEdge = 'left' | 'right' | 'top' | 'bottom' | 'none';

export type TaskCategory = 'todo' | 'routine' | 'schedule';

export type PriorityLevel = 'low' | 'medium' | 'high';

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  isDeadline?: boolean;
  priority?: PriorityLevel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  source?: 'local' | 'google_calendar' | 'edlink';
}

export interface RoutineItem {
  id: string;
  title: string;
  description?: string; // Keterangan/deskripsi awal
  dailyLogs?: Record<string, string>; // YYYY-MM-DD -> Catatan pekerjaan hari tersebut
  intervalMinutes: number; // e.g., every 60 mins
  enabled: boolean;
  lastTriggered?: string;
  nextTriggerTime?: string;
  soundType?: 'water' | 'stretch' | 'rest' | 'chime';
}

export interface ScheduleItem {
  id: string;
  title: string;
  datetime: string; // ISO string
  completed: boolean;
  location?: string;
  remindMinutesBefore: number;
  source?: 'local' | 'google_calendar' | 'edlink';
  courseName?: string;
}

export interface CharacterConfig {
  name: string;
  projectName?: string;
  avatarUrl?: string;
  customImageUrls: {
    avatar?: string;
    peek?: string;
    pointing?: string;
    alert?: string;
    idle?: string;
  };
  speechEnabled: boolean;
  ttsEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
  voiceVolume: number;
  autoHideSeconds: number;
  displayMode?: 'sidebar' | 'mascot' | 'bar';
  hoverDelayMs: number; // ms delay before hover peek opens
  closeDelayMs: number; // ms delay before hover peek closes
  notificationHoursBeforeDeadline: number; // H-Jam deadline threshold (e.g. 1, 3, 12, 24)
  panelOpacity?: number; // 0.2 - 1.0 (Opacity Kustom Tabel/Panel)
  panelBgColor?: string; // Warna Latar Belakang Tabel/Panel
  panelBorderColor?: string; // Warna Bingkai/Border Tabel/Panel
}

export interface StateSounds {
  peek?: string;
  pointing?: string;
  alert?: string;
  routine?: string;
  task?: string;
  schedule?: string;
  complete?: string;
}

export interface AudioConfig {
  enabled: boolean;
  volume: number; // 0 - 1
  soundType: 'synth' | 'custom';
  stateSounds: StateSounds;
}

export interface EdlinkConfig {
  enabled: boolean;
  campusUrl: string; // e.g. https://siakad.univ.ac.id / edlink
  userToken: string;
  studentId: string;
  autoSync: boolean;
  lastSynced?: string;
}

export interface SyncConfig {
  googleCalendar: {
    enabled: boolean;
    apiKey: string;
    calendarId: string;
    lastSynced?: string;
  };
  edlink: EdlinkConfig;
  notion: {
    enabled: boolean;
    apiKey: string;
    databaseId: string;
    lastSynced?: string;
  };
}

export interface WindowState {
  x: number;
  y: number;
  isSnapped: boolean;
  snappedEdge: SnapEdge;
  isPeeking: boolean;
  isPanelOpen: boolean;
  isPinned: boolean; // Pinned open on click
  alwaysOnTop: boolean;
  displayMode: 'sidebar' | 'mascot' | 'bar';
}

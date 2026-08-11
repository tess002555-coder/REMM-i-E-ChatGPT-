import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduleItem, RoutineItem, TaskItem, CharacterConfig, PriorityLevel } from '../types';
import { Calendar, Clock, Plus, X, Check, Trash2, Save, RotateCcw, Search, ChevronRight, ChevronLeft, FileText, Filter, Share2, Trophy } from 'lucide-react';
import { isLightColor } from '../utils/db';
import { RoutineExportModal } from './RoutineExportModal';

export type DetailModalType =
  | { kind: 'calendar' }
  | { kind: 'routine'; item: RoutineItem }
  | { kind: 'add-routine' }
  | { kind: 'add-task' }
  | { kind: 'add-schedule' };

interface DetailModalProps {
  modalState: DetailModalType | null;
  onClose: () => void;
  config?: CharacterConfig;
  schedules: ScheduleItem[];
  routines: RoutineItem[];
  tasks: TaskItem[];
  onAddSchedule: (title: string, datetime: string) => void;
  onToggleSchedule?: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onAddRoutine: (title: string, description: string) => void;
  onSaveRoutineLog?: (id: string, dateStr: string, content: string) => void;
  onDeleteRoutineLog?: (id: string, dateStr: string) => void;
  onDeleteRoutine: (id: string) => void;
  onAddTask: (title: string, dueDate?: string, isDeadline?: boolean, priority?: PriorityLevel) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onOpenAddScheduleModal?: () => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES_SHORT = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];

export const DetailModal: React.FC<DetailModalProps> = ({
  modalState,
  onClose,
  config,
  schedules,
  routines,
  tasks,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onAddRoutine,
  onSaveRoutineLog,
  onDeleteRoutineLog,
  onDeleteRoutine,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onOpenAddScheduleModal,
}) => {
  // Form states
  const [schTitle, setSchTitle] = useState('');
  const [schTime, setSchTime] = useState('');

  const [routineTitle, setRoutineTitle] = useState('');
  const [routineDesc, setRoutineDesc] = useState('');
  const [routineInterval, setRoutineInterval] = useState('60');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskIsDeadline, setTaskIsDeadline] = useState(false);
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');

  // Calendar search & Month Grid state
  const [calSearch, setCalSearch] = useState('');
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Routine Daily Log state & Routine Calendar state
  const todayKey = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [routineSelectedDateKey, setRoutineSelectedDateKey] = useState<string>(todayKey);
  const [routineDateNote, setRoutineDateNote] = useState('');
  const [routineCalMonth, setRoutineCalMonth] = useState(() => new Date().getMonth());
  const [routineCalYear, setRoutineCalYear] = useState(() => new Date().getFullYear());
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [exportRoutineItem, setExportRoutineItem] = useState<RoutineItem | null>(null);

  // Synchronize daily note when routine modal opens or selected date changes
  useEffect(() => {
    if (modalState?.kind === 'routine') {
      const existing = modalState.item.dailyLogs?.[routineSelectedDateKey] || '';
      setRoutineDateNote(existing);
      setIsSavedNotice(false);
    }
  }, [modalState, routineSelectedDateKey]);

  // Reset selected date to today when opening a different routine
  useEffect(() => {
    if (modalState?.kind === 'routine') {
      setRoutineSelectedDateKey(todayKey);
    }
  }, [modalState?.kind === 'routine' ? modalState.item.id : null, todayKey]);

  if (!modalState) return null;

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schTitle.trim() || !schTime) return;
    onAddSchedule(schTitle.trim(), schTime);
    setSchTitle('');
    setSchTime('');
    onClose();
  };

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim()) return;
    onAddRoutine(
      routineTitle.trim(),
      routineDesc.trim() || ''
    );
    setRoutineTitle('');
    setRoutineDesc('');
    onClose();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onAddTask(taskTitle.trim(), taskDueDate || undefined, taskIsDeadline, taskPriority);
    setTaskTitle('');
    setTaskDueDate('');
    setTaskIsDeadline(false);
    setTaskPriority('medium');
    onClose();
  };

  const handleSaveDailyNote = () => {
    if (modalState.kind === 'routine' && onSaveRoutineLog) {
      onSaveRoutineLog(modalState.item.id, routineSelectedDateKey, routineDateNote);
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 2500);
    }
  };

  const handleClearDailyNote = () => {
    if (modalState.kind === 'routine' && onDeleteRoutineLog) {
      onDeleteRoutineLog(modalState.item.id, routineSelectedDateKey);
      setRoutineDateNote('');
    }
  };

  // Build event map for dates with events
  const eventDatesMap: Record<string, number> = {};
  schedules.forEach(s => {
    try {
      const d = new Date(s.datetime);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;
        eventDatesMap[dateKey] = (eventDatesMap[dateKey] || 0) + 1;
      }
    } catch {
      // ignore invalid dates
    }
  });

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  // Days calculations for current month
  const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(calYear, calMonth, 1).getDay();

  // Filter schedules list
  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(calSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedDateStr) {
      try {
        const d = new Date(s.datetime);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;
        return dateKey === selectedDateStr;
      } catch {
        return false;
      }
    }
    return true;
  });

  const panelBgColor = config?.panelBgColor || '#1A1A1E';
  const panelBorderColor = config?.panelBorderColor || '#3A3A40';
  const panelOpacity = config?.panelOpacity ?? 0.95;
  const isLight = isLightColor(panelBgColor);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        style={{
          backgroundColor: panelBgColor,
          borderColor: panelBorderColor,
          opacity: panelOpacity,
        }}
        className={`w-84 border rounded-3xl shadow-2xl overflow-hidden text-sm p-4 font-sans backdrop-blur-xl ${
          isLight ? 'text-slate-900' : 'text-slate-100'
        }`}
      >
        {/* Header Bar */}
        <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? 'border-slate-300' : 'border-[#3A3A40]'}`}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
              {modalState.kind === 'calendar' && 'Calender - Acara & Tanggal'}
              {modalState.kind === 'routine' && 'Detail Rutinitas'}
              {modalState.kind === 'add-routine' && 'Tambah Rutinitas Baru'}
              {modalState.kind === 'add-task' && 'Tambah Tugas Baru'}
              {modalState.kind === 'add-schedule' && 'Tambah Acara Kalender'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition-all ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-[#323238]'
            }`}
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. CALENDAR DETAIL POP-UP (With Color-Coded Events Calendar Grid) */}
        {modalState.kind === 'calendar' && (
          <div className="space-y-3">
            {/* Header Actions & Quick Add */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Tabel Acara ({schedules.length})</span>
              {onOpenAddScheduleModal && (
                <button
                  onClick={onOpenAddScheduleModal}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Tambah Acara</span>
                </button>
              )}
            </div>

            {/* MONTH-VIEW CALENDAR GRID WITH COLOR CODED EVENTS */}
            <div className={`p-3 rounded-2xl border space-y-2.5 ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-[#1A1A1E] border-[#3A3A40]'}`}>
              {/* Month Header Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevMonth}
                  className={`p-1 rounded-lg transition-all ${isLight ? 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200' : 'text-gray-400 hover:text-cyan-300 hover:bg-[#2A2A2E]'}`}
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className={`flex items-center gap-1.5 font-bold text-xs ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                  <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{MONTH_NAMES_ID[calMonth]} {calYear}</span>
                </div>
                <button
                  onClick={handleNextMonth}
                  className={`p-1 rounded-lg transition-all ${isLight ? 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200' : 'text-gray-400 hover:text-cyan-300 hover:bg-[#2A2A2E]'}`}
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_NAMES_SHORT.map((dayName, idx) => (
                  <span
                    key={`day-hdr-${dayName}-${idx}`}
                    className={`text-[10px] font-bold py-0.5 ${
                      idx === 0 ? 'text-red-500' : isLight ? 'text-slate-500' : 'text-gray-400'
                    }`}
                  >
                    {dayName}
                  </span>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty lead cells */}
                {Array.from({ length: firstDayWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-7" />
                ))}

                {/* Day Cells */}
                {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const monthStr = String(calMonth + 1).padStart(2, '0');
                  const dayStr = String(dayNum).padStart(2, '0');
                  const dateKey = `${calYear}-${monthStr}-${dayStr}`;

                  const eventCount = eventDatesMap[dateKey] || 0;
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateStr;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => {
                        if (selectedDateStr === dateKey) {
                          setSelectedDateStr(null);
                        } else {
                          setSelectedDateStr(dateKey);
                        }
                      }}
                      className={`relative h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                        eventCount > 0
                          ? isSelected
                            ? 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-white'
                            : 'bg-cyan-500 text-slate-950 font-bold border border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.5)] hover:bg-cyan-400'
                          : isSelected
                          ? isLight ? 'bg-cyan-100 border border-cyan-500 text-cyan-800 font-bold' : 'bg-[#3A3A42] border border-cyan-400 text-cyan-300 font-bold'
                          : isToday
                          ? isLight ? 'border-2 border-cyan-500 text-cyan-700 font-bold bg-cyan-50' : 'border-2 border-cyan-400 text-cyan-300 font-bold bg-[#2A2A2E]'
                          : isLight ? 'bg-slate-200/80 text-slate-800 hover:bg-slate-300 hover:text-slate-950' : 'bg-[#222226] text-gray-300 hover:bg-[#2A2A2E] hover:text-white'
                      }`}
                      title={
                        eventCount > 0
                          ? `${dayNum} ${MONTH_NAMES_ID[calMonth]}: ${eventCount} Acara`
                          : `${dayNum} ${MONTH_NAMES_ID[calMonth]}`
                      }
                    >
                      <span>{dayNum}</span>

                      {/* Small Event Badge Pill / Dot */}
                      {eventCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 text-cyan-300 font-mono text-[8px] font-bold border border-cyan-400 flex items-center justify-center">
                          {eventCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend & Selected Filter Tag */}
              <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${isLight ? 'border-slate-300' : 'border-[#2A2A2E]'}`}>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 font-medium ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] inline-block" />
                    Ada Acara
                  </span>
                  <span className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                    <span className="w-2.5 h-2.5 rounded border border-cyan-400 inline-block" />
                    Hari Ini
                  </span>
                </div>

                {selectedDateStr && (
                  <button
                    onClick={() => setSelectedDateStr(null)}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Filter indication label if date selected */}
            {selectedDateStr && (
              <div className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                isLight ? 'bg-cyan-50 border-cyan-300 text-cyan-800' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              }`}>
                <span className="font-semibold">
                  Acara tanggal: {selectedDateStr}
                </span>
                <button
                  onClick={() => setSelectedDateStr(null)}
                  className="p-0.5 text-gray-400 hover:text-slate-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Search filter input */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Cari kata kunci acara..."
                value={calSearch}
                onChange={e => setCalSearch(e.target.value)}
                className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-[#1A1A1E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                }`}
              />
            </div>

            {/* Event List */}
            <div className={`p-2.5 rounded-2xl border ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-[#1A1A1E] border-[#3A3A40]'}`}>
              {filteredSchedules.length === 0 ? (
                <div className={`py-6 text-center text-xs italic ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                  {selectedDateStr
                    ? `Tidak ada acara pada tanggal ${selectedDateStr}.`
                    : calSearch
                    ? 'Tidak ada acara yang cocok dengan pencarian.'
                    : 'Belum ada acara di kalender.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredSchedules.map((item, idx) => (
                    <div
                      key={item.id ? `${item.id}-${idx}` : `sch-${idx}`}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 group transition-all ${
                        isLight
                          ? item.completed
                            ? 'bg-slate-200/60 border-slate-300 opacity-60'
                            : 'bg-white border-slate-300 hover:border-cyan-500'
                          : item.completed
                          ? 'bg-[#222226]/50 border-[#323238] opacity-60'
                          : 'bg-[#2A2A2E] border-[#3A3A40] hover:border-cyan-400/50'
                      }`}
                    >
                      {onToggleSchedule && (
                        <button
                          onClick={() => onToggleSchedule(item.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            item.completed
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-600 dark:text-cyan-300'
                              : isLight ? 'border-slate-400 hover:border-cyan-500 bg-white' : 'border-gray-500 hover:border-cyan-400 bg-[#1A1A1E]'
                          }`}
                          title={item.completed ? 'Selesai' : 'Tandai Selesai'}
                        >
                          {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      )}

                      <div className="min-w-0 flex-1">
                        <span className={`block font-semibold text-xs truncate ${
                          item.completed ? 'line-through text-slate-400' : isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          {item.title}
                        </span>
                        <div className={`flex items-center gap-1.5 text-[10px] font-mono mt-0.5 ${isLight ? 'text-cyan-700 font-bold' : 'text-cyan-300'}`}>
                          <Calendar className="w-3 h-3 text-cyan-500" />
                          <span>
                            {new Date(item.datetime).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className={isLight ? 'text-slate-400' : 'text-gray-500'}>•</span>
                          <span>
                            {new Date(item.datetime).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteSchedule(item.id)}
                        className={`p-1 opacity-60 group-hover:opacity-100 transition-opacity ${isLight ? 'text-slate-400 hover:text-red-600' : 'text-gray-500 hover:text-red-400'}`}
                        title="Hapus Acara"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ROUTINE DETAIL POP-UP WITH CALENDAR GRID & RED DOT MARKINGS */}
        {modalState.kind === 'routine' && (() => {
          const routineLogs = modalState.item.dailyLogs || {};
          const routineTotalDaysInMonth = new Date(routineCalYear, routineCalMonth + 1, 0).getDate();
          const routineFirstDayWeekday = new Date(routineCalYear, routineCalMonth, 1).getDay();

          const handleRoutinePrevMonth = () => {
            if (routineCalMonth === 0) {
              setRoutineCalMonth(11);
              setRoutineCalYear(prev => prev - 1);
            } else {
              setRoutineCalMonth(prev => prev - 1);
            }
          };

          const handleRoutineNextMonth = () => {
            if (routineCalMonth === 11) {
              setRoutineCalMonth(0);
              setRoutineCalYear(prev => prev + 1);
            } else {
              setRoutineCalMonth(prev => prev + 1);
            }
          };

          const isRoutineDateMarked = (dateKey: string) => {
            return Boolean(routineLogs[dateKey] && routineLogs[dateKey].trim().length > 0);
          };

          return (
            <div className="space-y-3">
              {/* Header Box: Nama Rutinitas */}
              <div className={`p-3 rounded-2xl border text-center ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-[#1A1A1E] border-[#3A3A40]'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Nama Rutinitas
                </span>
                <h4 className={`text-base font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>{modalState.item.title}</h4>
              </div>

              {/* Ekspor Kartu Pencapaian Medsos Button */}
              <button
                type="button"
                onClick={() => setExportRoutineItem(modalState.item)}
                className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-cyan-500/30 to-amber-500/20 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all group hover:scale-[1.01]"
              >
                <Share2 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Ekspor Kartu Pencapaian (Medsos)</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              </button>

              {/* ROUTINE CALENDAR GRID WITH RED DOT MARKINGS */}
              <div className={`p-3 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-[#1A1A1E] border-[#3A3A40]'}`}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleRoutinePrevMonth}
                    className={`p-1 rounded-lg transition-all ${isLight ? 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200' : 'text-gray-400 hover:text-cyan-300 hover:bg-[#2A2A2E]'}`}
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className={`flex items-center gap-1.5 font-bold text-xs ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{MONTH_NAMES_ID[routineCalMonth]} {routineCalYear}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRoutineNextMonth}
                    className={`p-1 rounded-lg transition-all ${isLight ? 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200' : 'text-gray-400 hover:text-cyan-300 hover:bg-[#2A2A2E]'}`}
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Short Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {DAY_NAMES_SHORT.map((dayName, idx) => (
                    <span
                      key={`r-day-hdr-${dayName}-${idx}`}
                      className={`text-[10px] font-bold py-0.5 ${
                        idx === 0 ? 'text-red-500' : isLight ? 'text-slate-500' : 'text-gray-400'
                      }`}
                    >
                      {dayName}
                    </span>
                  ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: routineFirstDayWeekday }).map((_, i) => (
                    <div key={`r-empty-${i}`} className="h-7" />
                  ))}

                  {Array.from({ length: routineTotalDaysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const monthStr = String(routineCalMonth + 1).padStart(2, '0');
                    const dayStr = String(dayNum).padStart(2, '0');
                    const dateKey = `${routineCalYear}-${monthStr}-${dayStr}`;

                    const hasLog = isRoutineDateMarked(dateKey);
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === routineSelectedDateKey;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setRoutineSelectedDateKey(dateKey)}
                        className={`relative h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                          hasLog
                            ? isSelected
                              ? 'bg-red-500 text-white font-black border-2 border-white shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                              : 'bg-red-500/25 text-red-600 dark:text-red-200 font-bold border border-red-500/80 hover:bg-red-500/40'
                            : isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-300'
                            : isToday
                            ? isLight ? 'border-2 border-cyan-500 text-cyan-700 font-bold bg-cyan-50' : 'border-2 border-cyan-400 text-cyan-300 font-bold bg-[#2A2A2E]'
                            : isLight ? 'bg-slate-200/80 text-slate-800 hover:bg-slate-300 hover:text-slate-950' : 'bg-[#222226] text-gray-300 hover:bg-[#2A2A2E] hover:text-white'
                        }`}
                        title={
                          hasLog
                            ? `Ada catatan pada ${dayNum} ${MONTH_NAMES_ID[routineCalMonth]}`
                            : `${dayNum} ${MONTH_NAMES_ID[routineCalMonth]}`
                        }
                      >
                        <span>{dayNum}</span>

                        {/* Red Dot Marking for Date with Note */}
                        {hasLog && (
                          <span
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-950 shadow-[0_0_6px_rgba(239,68,68,1)] animate-pulse"
                            title="Ditandai dengan Titik Merah"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${isLight ? 'border-slate-300' : 'border-[#2A2A2E]'}`}>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                      Titik Merah (Ada Catatan)
                    </span>
                    <span className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-cyan-300'}`}>
                      <span className="w-2.5 h-2.5 rounded border border-cyan-400 inline-block" />
                      Hari Ini
                    </span>
                  </div>

                  {routineSelectedDateKey !== todayKey && (
                    <button
                      type="button"
                      onClick={() => setRoutineSelectedDateKey(todayKey)}
                      className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold"
                    >
                      Ke Hari Ini
                    </button>
                  )}
                </div>
              </div>

              {/* Input Box: Keterangan Tanggal Terpilih */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-[#1A1A1E] border-[#3A3A40]'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-widest block ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
                    Catatan Tanggal:
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    isLight ? 'bg-white text-cyan-700 border-slate-300' : 'bg-[#2A2A2E] text-cyan-400 border-[#3A3A40]'
                  }`}>
                    {routineSelectedDateKey}
                  </span>
                </div>

                {isRoutineDateMarked(routineSelectedDateKey) && (
                  <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-semibold bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                    <span>Ditandai dengan Titik Merah pada Kalender Rutinitas</span>
                  </div>
                )}

                <textarea
                  value={routineDateNote}
                  onChange={e => setRoutineDateNote(e.target.value)}
                  placeholder={`Tulis keterangan atau progres rutinitas pada tanggal ${routineSelectedDateKey}...`}
                  rows={3}
                  className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none resize-none leading-relaxed ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                      : 'bg-[#2A2A2E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                  }`}
                />

                {isSavedNotice && (
                  <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 animate-pulse">
                    <Check className="w-3 h-3" /> Catatan tanggal berhasil disimpan & ditandai!
                  </p>
                )}

                {/* Action buttons for Daily Log */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveDailyNote}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Catatan Tanggal</span>
                  </button>

                  {routineDateNote && (
                    <button
                      type="button"
                      onClick={handleClearDailyNote}
                      className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1 ${
                        isLight
                          ? 'bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-600 border-slate-300 hover:border-red-300'
                          : 'bg-gray-700/60 hover:bg-red-500/20 text-gray-300 hover:text-red-300 border-gray-600 hover:border-red-500/40'
                      }`}
                      title="Hapus Catatan Tanggal Ini"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kosongkan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hapus Rutinitas Button */}
              <button
                onClick={() => {
                  onDeleteRoutine(modalState.item.id);
                  onClose();
                }}
                className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Rutinitas Ini
              </button>
            </div>
          );
        })()}

        {/* 3. ADD ROUTINE FORM */}
        {modalState.kind === 'add-routine' && (
          <form onSubmit={handleCreateRoutine} className="space-y-3">
            <div>
              <label className={`text-xs font-medium block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Nama Rutinitas</label>
              <input
                type="text"
                placeholder="Contoh: Minum Air Putih, Olahraga..."
                value={routineTitle}
                onChange={e => setRoutineTitle(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-[#1A1A1E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                }`}
                autoFocus
              />
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Keterangan/Deskripsi Awal (Opsional)</label>
              <textarea
                placeholder="Instruksi atau panduan singkat rutinitas..."
                value={routineDesc}
                onChange={e => setRoutineDesc(e.target.value)}
                rows={2}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none resize-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-[#1A1A1E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={!routineTitle.trim()}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Simpan Rutinitas
            </button>
          </form>
        )}

        {/* 4. ADD TASK FORM */}
        {modalState.kind === 'add-task' && (
          <form onSubmit={handleCreateTask} className="space-y-3">
            <div>
              <label className={`text-xs font-medium block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Nama Tugas</label>
              <input
                type="text"
                placeholder="Contoh: Selesaikan laporan proyek..."
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-[#1A1A1E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                }`}
                autoFocus
              />
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Batas Waktu Tugas (Deadline)</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={e => setTaskDueDate(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-[#1A1A1E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Tingkat Prioritas</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTaskPriority('high')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                    taskPriority === 'high'
                      ? 'bg-red-500 text-white border-red-400 shadow-md'
                      : isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      : 'bg-[#1A1A1E] border-[#3A3A40] text-gray-300 hover:bg-[#2A2A2E]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  <span>Tinggi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskPriority('medium')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                    taskPriority === 'medium'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      : 'bg-[#1A1A1E] border-[#3A3A40] text-gray-300 hover:bg-[#2A2A2E]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span>Sedang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskPriority('low')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                    taskPriority === 'low'
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                      : isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      : 'bg-[#1A1A1E] border-[#3A3A40] text-gray-300 hover:bg-[#2A2A2E]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Rendah</span>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={taskIsDeadline}
                onChange={e => setTaskIsDeadline(e.target.checked)}
                className={`rounded border text-amber-500 focus:ring-0 ${isLight ? 'border-slate-300 bg-white' : 'border-[#3A3A40] bg-[#1A1A1E]'}`}
              />
              <span className={`text-xs font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Peringatan H-1 Pengingat Kritis</span>
            </label>

            <button
              type="submit"
              disabled={!taskTitle.trim()}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Simpan Tugas
            </button>
          </form>
        )}

        {/* 5. ADD SCHEDULE FORM */}
        {modalState.kind === 'add-schedule' && (
          <form onSubmit={handleCreateSchedule} className="space-y-3">
            <div>
              <label className={`text-xs font-medium block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Nama Acara Kalender</label>
              <input
                type="text"
                placeholder="Contoh: Rapat Tim, Seminar Online..."
                value={schTitle}
                onChange={e => setSchTitle(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-[#1A1A1E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                }`}
                autoFocus
              />
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Tanggal & Waktu Acara</label>
              <input
                type="datetime-local"
                value={schTime}
                onChange={e => setSchTime(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-mono ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-[#1A1A1E] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={!schTitle.trim() || !schTime}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Simpan Acara Kalender
            </button>
          </form>
        )}
      </motion.div>

      {/* Routine Social Media Share Export Modal */}
      {exportRoutineItem && (
        <RoutineExportModal
          routine={exportRoutineItem}
          config={config}
          onClose={() => setExportRoutineItem(null)}
        />
      )}
    </AnimatePresence>
  );
};

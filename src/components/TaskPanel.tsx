import React, { useState } from 'react';
import { motion, useDragControls } from 'motion/react';
import { TaskItem, RoutineItem, ScheduleItem, SnapEdge, CharacterConfig } from '../types';
import { Plus, Calendar, Clock, Check, Trash2, ChevronRight, Sparkles, X, Settings, Search, ListTodo, Trophy, Flame, Zap, Filter, GripHorizontal, Share2, Download, ImageIcon } from 'lucide-react';
import { DetailModalType } from './DetailModal';
import { isLightColor } from '../utils/db';

interface TaskPanelProps {
  isOpen: boolean;
  snappedEdge: SnapEdge;
  tasks: TaskItem[];
  routines: RoutineItem[];
  schedules: ScheduleItem[];
  config?: CharacterConfig;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleRoutine: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onOpenModal: (modal: DetailModalType) => void;
  onOpenSettings?: () => void;
  onOpenInstallModal?: () => void;
  onClose: () => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  isOpen,
  snappedEdge,
  tasks,
  routines,
  schedules,
  config,
  onToggleTask,
  onDeleteTask,
  onToggleRoutine,
  onDeleteSchedule,
  onOpenModal,
  onOpenSettings,
  onOpenInstallModal,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const dragControls = useDragControls();

  if (!isOpen) return null;

  // Panel Customization Styles
  const panelBgColor = config?.panelBgColor || '#1A1A1E';
  const panelBorderColor = config?.panelBorderColor || '#3A3A40';
  const panelOpacity = config?.panelOpacity ?? 0.95;
  const isLight = isLightColor(panelBgColor);

  const projectName = config?.projectName || 'REMM(i)E';
  const userName = config?.name || 'Maskot Denia';
  const avatarImage = config?.avatarUrl || config?.customImageUrls?.avatar || null;

  // Gamified Stat Calculations
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const xpPoints = completedTasksCount * 50 + routines.filter(r => r.dailyLogs && Object.keys(r.dailyLogs).length > 0).length * 30;
  const userLevel = Math.floor(xpPoints / 100) + 1;
  const levelTitle = userLevel >= 5 ? 'Productivity Legend' : userLevel >= 3 ? 'Task Master' : userLevel >= 2 ? 'Apprentice' : 'Novice Companion';
  const currentLevelXp = xpPoints % 100;

  // Filter items by search query & priority
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (priorityFilter === 'all') return true;
    const taskPriority = t.priority || (t.isDeadline ? 'high' : 'medium');
    return taskPriority === priorityFilter;
  });

  const filteredRoutines = routines.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Slide-in Animation Variants based on docked edge
  const getSlideAnimation = () => {
    switch (snappedEdge) {
      case 'left':
        return { initial: { x: -320, opacity: 0 }, animate: { x: 0, opacity: panelOpacity }, exit: { x: -320, opacity: 0 } };
      case 'right':
        return { initial: { x: 320, opacity: 0 }, animate: { x: 0, opacity: panelOpacity }, exit: { x: 320, opacity: 0 } };
      case 'top':
        return { initial: { y: -320, opacity: 0 }, animate: { y: 0, opacity: panelOpacity }, exit: { y: -320, opacity: 0 } };
      case 'bottom':
        return { initial: { y: 320, opacity: 0 }, animate: { y: 0, opacity: panelOpacity }, exit: { y: -320, opacity: 0 } };
      default:
        return { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: panelOpacity, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };
    }
  };

  const slideAnim = getSlideAnimation();

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.05}
      initial={slideAnim.initial}
      animate={slideAnim.animate}
      exit={slideAnim.exit}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        backgroundColor: panelBgColor,
        borderColor: panelBorderColor,
        opacity: panelOpacity,
      }}
      className={`w-[360px] sm:w-[380px] max-h-[88vh] flex flex-col border rounded-[28px] shadow-2xl overflow-hidden z-40 text-sm font-sans backdrop-blur-xl p-3.5 space-y-2.5 custom-scrollbar overflow-y-auto ${
        isLight ? 'text-slate-900' : 'text-slate-100'
      }`}
    >
      {/* Small Header Handle for independent panel repositioning */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="w-full flex items-center justify-center py-1 -mt-1 cursor-grab active:cursor-grabbing group/handle touch-none select-none"
        title="Tarik untuk memindahkan posisi panel tugas"
      >
        <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full transition-all ${
          isLight
            ? 'bg-slate-200/80 group-hover/handle:bg-cyan-100 text-slate-500 group-hover/handle:text-cyan-700'
            : 'bg-slate-800/80 group-hover/handle:bg-cyan-950/80 text-slate-400 group-hover/handle:text-cyan-400 border border-slate-700/50'
        }`}>
          <GripHorizontal className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold tracking-tight">Pindah Panel</span>
        </div>
      </div>

      {/* Top Header Controls with Custom Avatar, Project Name & Profile Name */}
      <div 
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input, a, select')) return;
          dragControls.start(e);
        }}
        className={`flex items-center justify-between pb-2 border-b cursor-grab active:cursor-grabbing select-none ${isLight ? 'border-slate-300/80' : 'border-[#2A2A2E]'}`}
      >
        <div className="flex items-center gap-2">
          {/* Custom Avatar Icon or Fallback */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-cyan-400/80 shadow-md shrink-0 bg-[#16161A] flex items-center justify-center">
            {avatarImage ? (
              <img src={avatarImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-4 h-4 text-cyan-400" />
            )}
            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-900 animate-pulse" />
          </div>
          <div>
            <span className={`text-xs font-bold tracking-wide block ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {projectName}
            </span>
            <span className={`text-[10px] font-mono block ${isLight ? 'text-cyan-700 font-semibold' : 'text-cyan-300'}`}>
              {userName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={`p-1.5 rounded-xl border transition-all ${
                isLight
                  ? 'bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-slate-200 border-slate-300'
                  : 'bg-[#26262B] text-gray-300 hover:text-cyan-300 hover:bg-[#323238] border-[#3A3A40]'
              }`}
              title="Pengaturan Terpusat & Integrasi API"
            >
              <Settings className="w-4 h-4 text-cyan-500" />
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition-all ${
              isLight
                ? 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-300'
                : 'bg-[#26262B] text-gray-400 hover:text-white hover:bg-[#323238] border-[#3A3A40]'
            }`}
            title="Tutup / Minimize Floating Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Search Input */}
      <div className="relative">
        <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari tugas / rutinitas..."
          className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none transition-all ${
            isLight
              ? 'bg-white/90 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
              : 'bg-[#222226] border-[#3A3A40] text-white placeholder-gray-500 focus:border-cyan-400'
          }`}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
          >
            ×
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: CALENDER                                       */}
      {/* ========================================================= */}
      <div className={`border rounded-2xl p-3 shadow-md group transition-all ${
        isLight
          ? 'bg-white/80 border-slate-300/90 hover:border-cyan-500/60'
          : 'bg-[#26262B] border-[#3A3A40] hover:border-cyan-500/40'
      }`}>
        {/* Calender Header */}
        <div
          className={`flex items-center justify-between mb-2.5 py-2 px-3 rounded-xl border ${
            isLight
              ? 'bg-slate-100/90 border-slate-200'
              : 'bg-[#323238] border-[#44444C]'
          }`}
        >
          <div
            onClick={() => onOpenModal({ kind: 'calendar' })}
            className="flex items-center gap-2 cursor-pointer hover:text-cyan-500 transition-colors"
          >
            <Calendar className="w-4 h-4 text-cyan-500" />
            <h2 className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Calender</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenModal({ kind: 'add-schedule' });
              }}
              className="p-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all"
              title="Tambah Acara Baru"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              onClick={() => onOpenModal({ kind: 'calendar' })}
              className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
            >
              <span>Detail</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calender Summary Box (Klik untuk buka detail) */}
        <div
          onClick={() => onOpenModal({ kind: 'calendar' })}
          className={`border rounded-xl p-3 min-h-[75px] cursor-pointer transition-all flex flex-col justify-center ${
            isLight
              ? 'bg-slate-50/90 border-slate-200 hover:border-cyan-500'
              : 'bg-[#1C1C20] border-[#34343A] hover:border-cyan-400/50'
          }`}
        >
          {schedules.length === 0 ? (
            <div className={`text-center text-xs italic py-2 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
              Tidak ada jadwal terdekat. Klik untuk buka tabel.
            </div>
          ) : (
            <div className="space-y-1.5">
              {schedules.slice(0, 2).map((sch, idx) => (
                <div key={sch.id ? `${sch.id}-${idx}` : `sch-${idx}`} className="flex items-center justify-between text-xs">
                  <span className={`font-medium truncate max-w-[150px] ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{sch.title}</span>
                  <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                    {new Date(sch.datetime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
              {schedules.length > 2 && (
                <p className={`text-[10px] text-center pt-1 font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                  + {schedules.length - 2} acara lainnya (Klik untuk tabel)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: RUTINITAS                                      */}
      {/* ========================================================= */}
      <div className={`border rounded-2xl p-3 shadow-md space-y-2 ${
        isLight
          ? 'bg-white/80 border-slate-300/90'
          : 'bg-[#26262B] border-[#3A3A40]'
      }`}>
        {/* Rutinitas Header with + Button */}
        <div className={`flex items-center justify-between py-2 px-3 rounded-xl border ${
          isLight
            ? 'bg-slate-100/90 border-slate-200'
            : 'bg-[#323238] border-[#44444C]'
        }`}>
          <h2 className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Rutinitas</h2>
          <button
            onClick={() => onOpenModal({ kind: 'add-routine' })}
            className="p-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all"
            title="Tambah Rutinitas Baru"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* List Items: Nama Rutinitas Pills */}
        <div className="space-y-2 pt-1">
          {filteredRoutines.length === 0 ? (
            <div className={`text-center text-xs italic py-2 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
              {searchQuery ? 'Tidak ada rutinitas yang cocok.' : 'Belum ada rutinitas ditambahkan.'}
            </div>
          ) : (
            filteredRoutines.map((item, idx) => {
              const hasLogs = item.dailyLogs && Object.keys(item.dailyLogs).length > 0;
              return (
                <div
                  key={item.id ? `${item.id}-${idx}` : `rt-${idx}`}
                  onClick={() => onOpenModal({ kind: 'routine', item })}
                  className={`w-full border transition-all rounded-xl py-2 px-3 flex items-center justify-between cursor-pointer group ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 hover:border-cyan-500'
                      : 'bg-[#323238] hover:bg-[#3B3B42] active:bg-[#44444C] border-[#44444C] hover:border-cyan-400/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className={`text-xs font-semibold transition-colors truncate ${
                      isLight
                        ? 'text-slate-800 group-hover:text-cyan-700'
                        : 'text-gray-200 group-hover:text-cyan-300'
                    }`}>
                      {item.title}
                    </span>
                    {hasLogs && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Ada catatan tanggal terdaftar" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenModal({ kind: 'routine', item });
                      }}
                      className={`p-1 rounded-lg transition-all ${
                        isLight ? 'text-slate-400 hover:text-cyan-700 hover:bg-slate-300' : 'text-gray-400 hover:text-cyan-300 hover:bg-[#44444C]'
                      }`}
                      title="Ekspor Kartu Pencapaian Medsos"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-4 h-4 transition-colors ${
                      isLight ? 'text-slate-400 group-hover:text-cyan-600' : 'text-gray-500 group-hover:text-cyan-400'
                    }`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 3: TUGAS                                         */}
      {/* ========================================================= */}
      <div className={`border rounded-2xl p-3 shadow-md space-y-2 ${
        isLight
          ? 'bg-white/80 border-slate-300/90'
          : 'bg-[#26262B] border-[#3A3A40]'
      }`}>
        {/* Tugas Header with + Button */}
        <div className={`flex items-center justify-between py-2 px-3 rounded-xl border ${
          isLight
            ? 'bg-slate-100/90 border-slate-200'
            : 'bg-[#323238] border-[#44444C]'
        }`}>
          <div className="flex items-center gap-1.5">
            <h2 className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Tugas</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-500 font-bold">
              {filteredTasks.length}
            </span>
          </div>
          <button
            onClick={() => onOpenModal({ kind: 'add-task' })}
            className="p-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all"
            title="Tambah Tugas Baru"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Priority Filter Chips (Fitur Rekomendasi 2) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] custom-scrollbar">
          <button
            onClick={() => setPriorityFilter('all')}
            className={`px-2 py-0.5 rounded-lg border font-semibold shrink-0 transition-all ${
              priorityFilter === 'all'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                : isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-[#1C1C20] border-[#3A3A40] text-gray-400 hover:text-white'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setPriorityFilter('high')}
            className={`px-2 py-0.5 rounded-lg border font-semibold shrink-0 transition-all flex items-center gap-1 ${
              priorityFilter === 'high'
                ? 'bg-red-500 text-white border-red-400 font-bold'
                : isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-[#1C1C20] border-[#3A3A40] text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Tinggi
          </button>
          <button
            onClick={() => setPriorityFilter('medium')}
            className={`px-2 py-0.5 rounded-lg border font-semibold shrink-0 transition-all flex items-center gap-1 ${
              priorityFilter === 'medium'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-[#1C1C20] border-[#3A3A40] text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Sedang
          </button>
          <button
            onClick={() => setPriorityFilter('low')}
            className={`px-2 py-0.5 rounded-lg border font-semibold shrink-0 transition-all flex items-center gap-1 ${
              priorityFilter === 'low'
                ? 'bg-emerald-500 text-white border-emerald-400 font-bold'
                : isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-[#1C1C20] border-[#3A3A40] text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Rendah
          </button>
        </div>

        {/* List Items: Cards with Nama Tugas & Batas Waktu Tugas */}
        <div className="space-y-2 pt-1 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className={`text-center text-xs italic py-2 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
              {searchQuery || priorityFilter !== 'all' ? 'Tidak ada tugas yang cocok.' : 'Tidak ada tugas terdaftar.'}
            </div>
          ) : (
            filteredTasks.map((task, idx) => {
              const priority = task.priority || (task.isDeadline ? 'high' : 'medium');
              return (
                <div
                  key={task.id ? `${task.id}-${idx}` : `tk-${idx}`}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 group ${
                    isLight
                      ? task.completed
                        ? 'bg-slate-100/70 border-slate-200 text-slate-400'
                        : task.isDeadline
                        ? 'bg-red-50 border-red-300 text-slate-900 font-medium'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-cyan-500'
                      : task.completed
                      ? 'bg-[#1C1C20]/60 border-[#323238] text-gray-500'
                      : task.isDeadline
                      ? 'bg-red-500/10 border-red-500/40 text-white'
                      : 'bg-[#323238] border-[#44444C] text-gray-200 hover:border-cyan-400/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      task.completed
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300'
                        : isLight
                        ? 'border-slate-400 hover:border-cyan-500 bg-white'
                        : 'border-[#55555C] hover:border-cyan-400 bg-[#1C1C20]'
                    }`}
                  >
                    {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`block text-xs font-semibold truncate ${
                          task.completed
                            ? 'line-through text-slate-400'
                            : isLight
                            ? 'text-slate-900'
                            : 'text-gray-100'
                        }`}
                      >
                        {task.title}
                      </span>
                      {priority === 'high' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Prioritas Tinggi" />
                      )}
                      {priority === 'medium' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Prioritas Sedang" />
                      )}
                      {priority === 'low' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Prioritas Rendah" />
                      )}
                    </div>
                    <span
                      className={`block text-[10px] font-mono mt-0.5 ${
                        task.isDeadline
                          ? isLight
                            ? 'text-red-700 font-bold'
                            : 'text-amber-300 font-bold'
                          : isLight
                          ? 'text-slate-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {task.dueDate ? `Batas waktu: ${task.dueDate}` : 'Batas waktu: Tanpa deadline'}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className={`opacity-0 group-hover:opacity-100 p-1 transition-opacity ${
                      isLight ? 'text-slate-400 hover:text-red-600' : 'text-gray-400 hover:text-red-400'
                    }`}
                    title="Hapus Tugas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

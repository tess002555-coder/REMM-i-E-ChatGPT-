(() => {
  'use strict';

  const query = new URLSearchParams(location.search);
  const mode = query.get('window') === 'mascot' ? 'mascot' : 'panel';
  document.body.dataset.window = mode;

  const pageContent = document.getElementById('page-content');
  const modalRoot = document.getElementById('modal-root');
  const toastRegion = document.getElementById('toast-region');
  const bridge = window.chrome && window.chrome.webview;
  let snapshot = null;
  let currentPage = 'dashboard';
  let taskFilter = 'Semua';
  let searchText = '';
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDay = new Date();
  let mascotStart = null;
  let panelDragStart = null;
  let searchTimer = 0;
  const themePalette = {
    'Soft Sakura Pink': { accent: '#ef9fb8', strong: '#f4bad0', ink: '#27171e', green: '#60d6b0' },
    'Cyberpunk Neon': { accent: '#e879f9', strong: '#f0abfc', ink: '#27142d', green: '#57e3d0' },
    'Clean Milk White': { accent: '#f4b5c8', strong: '#ffd1df', ink: '#321923', green: '#65d3a9' },
    'Minimal Obsidian': { accent: '#a8b4c0', strong: '#d1dae1', ink: '#171c21', green: '#77c9ac' },
    'Emerald Forest': { accent: '#6ee7b7', strong: '#a7f3d0', ink: '#10271f', green: '#6ee7b7' }
  };

  const post = (type, payload = {}) => {
    if (bridge) bridge.postMessage({ type, ...payload });
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const fmtDate = value => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanpa tenggat';
  const fmtTime = value => value ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  const isoDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const title = s => s?.ProjectName || 'REMM(i)E';
  const data = () => snapshot || { Tasks: [], Routines: [], Schedules: [], Settings: {}, ProjectName: 'REMM(i)E', DisplayName: '' };
  const settings = () => data().Settings || {};
  const normalizedPriority = value => ({ 'Tinggi': 'high', 'Sedang': 'medium', 'Rendah': 'low' }[value] || 'medium');
  const allTasks = () => data().Tasks || [];
  const allSchedules = () => data().Schedules || [];
  const allRoutines = () => data().Routines || [];

  function notify(message, kind = '') {
    const item = document.createElement('div');
    item.className = `toast ${kind}`;
    item.textContent = message;
    toastRegion.append(item);
    setTimeout(() => item.remove(), 3600);
  }

  function sendSearch(queryText) {
    searchText = (queryText || '').trim().toLocaleLowerCase('id-ID');
    if (mode === 'panel') {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => post('search.update', {
        query: searchText,
        priority: currentPage === 'tasks' ? taskFilter : 'Semua'
      }), 100);
    }
  }

  function tasksFiltered() {
    return data().FilteredTasks || allTasks().filter(task => {
      const matchesPriority = taskFilter === 'Semua' || task.Priority === taskFilter;
      const haystack = `${task.Title} ${task.Notes || ''}`.toLocaleLowerCase('id-ID');
      return matchesPriority && (!searchText || haystack.includes(searchText));
    });
  }

  function routinesFiltered() {
    if (Array.isArray(data().FilteredRoutines)) return data().FilteredRoutines;
    return allRoutines().filter(item => !searchText || `${item.Title} ${item.Notes || ''}`.toLocaleLowerCase('id-ID').includes(searchText));
  }

  function schedulesFiltered() {
    if (Array.isArray(data().FilteredSchedules)) return data().FilteredSchedules;
    return allSchedules().filter(item => !searchText || item.Title.toLocaleLowerCase('id-ID').includes(searchText));
  }

  function listEmpty(text) { return `<div class="empty-inline">${esc(text)}</div>`; }

  function taskRow(task, compact = false) {
    const due = task.Deadline ? `<span class="date-tag">${esc(fmtDate(task.Deadline))}</span>` : '';
    return `<article class="list-row ${task.Completed ? 'task-done' : ''}">
      <input class="task-check" type="checkbox" data-action="task.toggle" data-id="${esc(task.Id)}" ${task.Completed ? 'checked' : ''} aria-label="Tandai tugas selesai">
      <div class="row-main" data-action="task.edit" data-id="${esc(task.Id)}" role="button" tabindex="0"><div class="row-title">${esc(task.Title)}</div><div class="row-subtitle">${esc(task.Notes || (task.Completed ? 'Selesai' : 'Belum selesai'))}</div></div>
      <span class="priority-tag ${normalizedPriority(task.Priority)}">${esc(task.Priority || 'Sedang')}</span>${due}
      ${compact ? '' : `<div class="row-buttons"><button class="icon-action" data-action="task.edit" data-id="${esc(task.Id)}" aria-label="Edit tugas">✎</button><button class="icon-action delete" data-action="task.delete" data-id="${esc(task.Id)}" aria-label="Hapus tugas">×</button></div>`}
    </article>`;
  }

  function scheduleRow(item, compact = false) {
    const date = new Date(item.DateTime);
    const endTime = item.EndDateTime ? ` – ${esc(fmtTime(item.EndDateTime))}` : '';
    return `<article class="${compact ? 'list-row' : 'schedule-card'}">
      <div class="schedule-time">${esc(fmtTime(item.DateTime))}${endTime}<div class="schedule-date">${esc(fmtDate(item.DateTime))}</div></div>
      <div class="row-main"><div class="row-title">${esc(item.Title)}</div><div class="row-subtitle">${esc(item.Notes || date.toLocaleDateString('id-ID', { weekday: 'long' }))}</div></div>
      ${compact ? '' : `<div class="row-buttons"><button class="icon-action" data-action="schedule.edit" data-id="${esc(item.Id)}" aria-label="Edit jadwal">✎</button><button class="icon-action delete" data-action="schedule.delete" data-id="${esc(item.Id)}" aria-label="Hapus jadwal">×</button></div>`}
    </article>`;
  }

  function routineRow(item) {
    const status = item.IsActive === false ? 'Jeda' : 'Aktif';
    return `<article class="list-row"><span class="routine-symbol" aria-hidden="true">↻</span><div class="row-main"><div class="row-title">${esc(item.Title)}</div><div class="row-subtitle">${esc(item.Schedule || 'Jadwal belum diatur')} · Dibuat ${esc(fmtDate(item.CreatedDate))}${item.Notes ? ` · ${esc(item.Notes)}` : ''}</div></div><span class="routine-status ${item.IsActive === false ? 'paused' : ''}">${status}</span><div class="row-buttons"><button class="icon-action" data-action="routine.edit" data-id="${esc(item.Id)}" aria-label="Edit rutinitas">✎</button><button class="icon-action delete" data-action="routine.delete" data-id="${esc(item.Id)}" aria-label="Hapus rutinitas">×</button></div></article>`;
  }

  function pageHeader(kicker, heading, subtitle, action = '') {
    return `<div class="page-heading"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(heading)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
  }

  function renderDashboard() {
    const pending = allTasks().filter(task => !task.Completed);
    const completed = allTasks().filter(task => task.Completed);
    const upcoming = allSchedules().filter(event => new Date(event.DateTime) >= new Date()).sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));
    const taskPreview = tasksFiltered().slice(0, 5);
    const events = schedulesFiltered().filter(item => new Date(item.DateTime) >= new Date()).sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime)).slice(0, 4);
    return `${pageHeader('RINGKASAN', 'Hai, siap mulai?', 'Satu langkah kecil hari ini tetap berarti.', '<button class="primary-button" data-action="task.new">＋ Tambah tugas</button>')}
      <div class="stats-grid"><article class="stat-card accent"><div class="stat-card-label">Tugas aktif</div><div class="stat-card-value">${pending.length}</div><div class="stat-card-sub">${completed.length} tugas selesai</div></article><article class="stat-card green"><div class="stat-card-label">Rutinitas</div><div class="stat-card-value">${allRoutines().length}</div><div class="stat-card-sub">Kebiasaan yang kamu catat</div></article><article class="stat-card"><div class="stat-card-label">Jadwal mendatang</div><div class="stat-card-value">${upcoming.length}</div><div class="stat-card-sub">Agenda yang akan datang</div></article></div>
      <div class="dashboard-grid"><section class="content-card"><div class="card-heading"><h2>Yang perlu dikerjakan</h2><button class="text-button" data-page="tasks">Lihat semua →</button></div><div class="list-stack">${taskPreview.length ? taskPreview.map(item => taskRow(item, true)).join('') : listEmpty(searchText ? 'Tidak ada tugas yang cocok.' : 'Belum ada tugas. Tambahkan satu untuk memulai.')}</div></section>
      <section class="content-card"><div class="card-heading"><h2>Agenda berikutnya</h2><button class="text-button" data-page="schedules">Lihat jadwal →</button></div><div class="list-stack">${events.length ? events.map(item => scheduleRow(item, true)).join('') : listEmpty('Belum ada agenda mendatang.')}</div></section></div>`;
  }

  function renderTasks() {
    const filters = ['Semua', 'Tinggi', 'Sedang', 'Rendah'];
    const rows = tasksFiltered();
    return `${pageHeader('DAFTAR KERJA', 'Tugas', 'Catat hal penting, lalu selesaikan satu per satu.', '<button class="primary-button" data-action="task.new">＋ Tugas baru</button>')}
      <div class="toolbar">${filters.map(value => `<button class="filter-button ${taskFilter === value ? 'active' : ''}" data-action="task.filter" data-value="${value}">${value}</button>`).join('')}<span class="toolbar-note">${rows.length} tugas</span></div>
      <section class="content-card"><div class="list-stack">${rows.length ? rows.map(item => taskRow(item)).join('') : listEmpty(searchText ? 'Tidak ada tugas yang cocok dengan pencarian.' : 'Belum ada tugas. Tambahkan tugas pertamamu.')}</div></section>`;
  }

  function renderRoutines() {
    const rows = routinesFiltered();
    return `${pageHeader('KEBIASAAN', 'Rutinitas', 'Simpan kebiasaan dan catatan agar mudah kamu ingat.', '<button class="primary-button" data-action="routine.new">＋ Rutinitas baru</button>')}
      <section class="content-card"><div class="list-stack">${rows.length ? rows.map(routineRow).join('') : listEmpty(searchText ? 'Tidak ada rutinitas yang cocok.' : 'Belum ada rutinitas yang tersimpan.')}</div></section>`;
  }

  function renderSchedules() {
    const rows = schedulesFiltered().sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));
    return `${pageHeader('AGENDA', 'Jadwal', 'Lihat acara yang sudah kamu catat dan tambahkan agenda baru.', '<button class="primary-button" data-action="schedule.new">＋ Jadwal baru</button>')}
      <section class="content-card"><div class="list-stack">${rows.length ? rows.map(item => scheduleRow(item)).join('') : listEmpty(searchText ? 'Tidak ada jadwal yang cocok.' : 'Belum ada jadwal.')}</div></section>`;
  }

  function renderCalendar() {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const count = new Date(year, monthIndex + 1, 0).getDate();
    const lastCount = new Date(year, monthIndex, 0).getDate();
    const start = new Date(year, monthIndex, 1 - firstDay);
    const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    const currentKey = isoDay(selectedDay);
    const selectedEvents = allSchedules().filter(event => isoDay(new Date(event.DateTime)) === currentKey).sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));
    const monthName = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return `${pageHeader('PERENCANAAN', 'Kalender', 'Pilih tanggal untuk melihat agenda yang tersimpan.', '<button class="primary-button" data-action="schedule.new">＋ Tambah jadwal</button>')}
      <div class="calendar-layout"><section class="content-card"><div class="card-heading"><div class="month-toolbar"><button class="icon-action" data-action="calendar.prev" aria-label="Bulan sebelumnya">‹</button><strong>${esc(monthName)}</strong><button class="icon-action" data-action="calendar.next" aria-label="Bulan berikutnya">›</button></div><button class="text-button" data-action="calendar.today">Hari ini</button></div>
      <div class="calendar-grid">${weekdays.map(day => `<div class="weekday">${day}</div>`).join('')}${days.map((date, index) => {
        const events = allSchedules().filter(event => isoDay(new Date(event.DateTime)) === isoDay(date));
        const className = [date.getMonth() !== monthIndex ? 'muted' : '', isoDay(date) === isoDay(new Date()) ? 'today' : '', isoDay(date) === currentKey ? 'selected' : ''].filter(Boolean).join(' ');
        return `<button class="calendar-day ${className}" data-action="calendar.select" data-date="${isoDay(date)}" aria-label="${esc(date.toLocaleDateString('id-ID'))}"><span>${date.getDate()}</span>${events.length ? `<span class="event-markers">${events.slice(0, 3).map(() => '<i></i>').join('')}</span>` : ''}</button>`;
      }).join('')}</div></section>
      <section class="content-card calendar-events"><h3>${esc(selectedDay.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3><div class="list-stack">${selectedEvents.length ? selectedEvents.map(item => scheduleRow(item, true)).join('') : listEmpty('Tidak ada agenda pada tanggal ini.')}</div></section></div>`;
  }

  function renderSettings() {
    const s = settings();
    const colorValue = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#172128';
    const poseNames = [['peek', 'Peek'], ['idle', 'Idle'], ['pointing', 'Pointing'], ['alert', 'Alert']];
    return `${pageHeader('PREFERENSI', 'Pengaturan', 'Atur tampilan dan perilaku REMM(i)E di desktop.', '<button class="primary-button" data-action="settings.save">Simpan perubahan</button>')}
      <div class="setting-grid">
        <section class="setting-card"><h2>Identitas dan tampilan</h2><p>Personalisasi nama dan warna panel.</p>
          <div class="field"><label for="setting-project">Nama aplikasi</label><input id="setting-project" value="${esc(data().ProjectName || '')}" maxlength="48"></div>
          <div class="field"><label for="setting-display">Nama tampilan</label><input id="setting-display" value="${esc(data().DisplayName || '')}" maxlength="48"></div>
          <div class="field"><label for="setting-theme">Tema</label><select id="setting-theme">${['Soft Sakura Pink', 'Cyberpunk Neon', 'Clean Milk White', 'Minimal Obsidian', 'Emerald Forest'].map(theme => `<option ${s.Theme === theme ? 'selected' : ''}>${theme}</option>`).join('')}</select></div>
          <div class="field-grid"><div class="field"><label for="setting-background">Warna latar</label><input id="setting-background" type="color" value="${colorValue(s.PanelBackground)}"></div><div class="field"><label for="setting-border">Warna bingkai</label><input id="setting-border" type="color" value="${colorValue(s.PanelBorder)}"></div></div>
          <div class="field"><label for="setting-opacity">Transparansi panel <span id="opacity-label">${Math.round((s.PanelOpacity ?? .95) * 100)}%</span></label><input id="setting-opacity" type="range" min="65" max="100" value="${Math.round((s.PanelOpacity ?? .95) * 100)}"></div>
        </section>
        <section class="setting-card"><h2>Perilaku desktop</h2><p>Pengaturan ini diterapkan oleh shell Windows.</p>
          ${settingToggle('setting-drag', 'Izinkan mascot dipindahkan', 'Drag mascot untuk memindahkan posisinya.', s.DragEnabled !== false)}
          ${settingToggle('setting-snap', 'Snap ke sisi terdekat', 'Rapatkan mascot ke sisi layar saat dilepas.', s.AutoSnap !== false)}
          ${settingToggle('setting-topmost', 'Jendela selalu di atas', 'Tampilkan mascot dan panel di atas jendela lain.', s.AlwaysOnTop !== false)}
          ${settingToggle('setting-remember-panel', 'Ingat posisi panel', 'Buka panel di lokasi terakhir.', s.RememberPanelPosition !== false)}
          ${settingToggle('setting-remember-mascot', 'Ingat posisi mascot', 'Pulihkan lokasi mascot saat aplikasi dimulai.', s.RememberMascotPosition !== false)}
        </section>
        <section class="setting-card"><h2>Gambar pose mascot</h2><p>Pilih file PNG atau JPEG. File disalin ke penyimpanan aplikasi.</p><div class="pose-grid">${poseNames.map(([key, label]) => `<label class="pose-upload"><span>${label}</span><input type="file" accept="image/png,image/jpeg" data-action="pose.upload" data-mode="${key}" aria-label="Unggah pose ${label}"></label>`).join('')}</div></section>
        <section class="setting-card"><h2>Backup dan pemulihan</h2><p>Simpan atau pulihkan tugas, rutinitas, jadwal, dan preferensi lokal.</p><div class="backup-actions"><button class="secondary-button" data-action="backup.export">⇩ Ekspor JSON</button><button class="secondary-button" data-action="backup.import">⇧ Pulihkan JSON</button></div></section>
        <section class="setting-card"><h2>Pengingat dan notifikasi</h2><p>Preferensi notifikasi tersimpan. Pengiriman reminder otomatis belum aktif pada build ini.</p>
          ${settingToggle('setting-notifications', 'Aktifkan preferensi notifikasi', 'Disimpan sebagai pengaturan untuk modul reminder.', s.NotificationsEnabled !== false)}
          ${settingToggle('setting-sound', 'Suara notifikasi', 'Preferensi suara untuk modul reminder.', s.NotificationSoundEnabled !== false)}
          <div class="field-grid"><div class="field"><label for="setting-lead">Pengingat (menit sebelum)</label><input id="setting-lead" type="number" min="0" max="1440" value="${Number(s.NotificationLeadMinutes ?? 5)}"></div><div class="field"><label for="setting-volume">Volume suara (%)</label><input id="setting-volume" type="number" min="0" max="100" value="${Number(s.NotificationVolume ?? 75)}"></div></div>
        </section>
        <section class="setting-card"><h2>Layanan eksternal</h2><p>Belum terhubung pada build ini.</p><div class="honest-note">Sinkronisasi Edlink dan Google Calendar belum diimplementasikan. Data pada aplikasi ini disimpan secara lokal.</div></section>
      </div>`;
  }

  function settingToggle(id, label, description, checked) {
    return `<div class="setting-row"><div><label for="${id}">${esc(label)}</label><small>${esc(description)}</small></div><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}></div>`;
  }

  function renderPage() {
    if (mode !== 'panel' || !snapshot) return;
    document.querySelectorAll('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === currentPage));
    document.getElementById('project-name').textContent = title(snapshot);
    document.getElementById('display-name').textContent = snapshot.DisplayName || 'Ruang produktivitasmu';
    document.getElementById('today-label').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    const pages = { dashboard: renderDashboard, tasks: renderTasks, routines: renderRoutines, schedules: renderSchedules, calendar: renderCalendar, settings: renderSettings };
    pageContent.innerHTML = (pages[currentPage] || renderDashboard)();
    const bg = settings().PanelBackground;
    const border = settings().PanelBorder;
    const palette = themePalette[settings().Theme] || themePalette['Soft Sakura Pink'];
    document.documentElement.style.setProperty('--bg', bg || '#0c1116');
    document.documentElement.style.setProperty('--panel-native', bg || '#131a21');
    document.documentElement.style.setProperty('--accent', border || palette.accent);
    document.documentElement.style.setProperty('--accent-strong', palette.strong);
    document.documentElement.style.setProperty('--accent-ink', palette.ink);
    document.documentElement.style.setProperty('--green', palette.green);
    document.getElementById('connection-label').textContent = 'Data tersimpan di perangkat ini';
  }

  function openModal(content) {
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="modal.backdrop"><section class="modal-card" role="dialog" aria-modal="true">${content}</section></div>`;
    const focusable = modalRoot.querySelector('input:not([type=hidden]),textarea,select');
    focusable?.focus();
  }

  function closeModal() { modalRoot.innerHTML = ''; }

  function formField(label, name, value = '', type = 'text', options = '') {
    const required = !['deadline', 'endDateTime', 'schedule'].includes(name);
    const requiredAttribute = required ? 'required' : '';
    const attr = type === 'textarea' ? `<textarea name="${name}" maxlength="1000">${esc(value)}</textarea>` : type === 'select' ? `<select name="${name}">${options}</select>` : `<input name="${name}" type="${type}" value="${esc(value)}" ${type === 'datetime-local' ? '' : 'maxlength="180"'} ${requiredAttribute}>`;
    return `<div class="field"><label>${esc(label)}</label>${attr}</div>`;
  }

  function showTaskForm(task = null) {
    const priority = task?.Priority || 'Sedang';
    const priorities = ['Tinggi', 'Sedang', 'Rendah'].map(value => `<option ${priority === value ? 'selected' : ''}>${value}</option>`).join('');
    const due = task?.Deadline ? new Date(task.Deadline) : null;
    const dueValue = due && !Number.isNaN(due.getTime()) ? `${isoDay(due)}T${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}` : '';
    openModal(`<div class="modal-heading"><div><h2>${task ? 'Edit tugas' : 'Tugas baru'}</h2><p>Isi detail yang kamu perlukan.</p></div><button class="window-button" data-action="modal.close" aria-label="Tutup">×</button></div>
      <form class="modal-form" data-form="task" data-id="${esc(task?.Id || '')}">${formField('Nama tugas', 'title', task?.Title || '')}${formField('Deskripsi', 'notes', task?.Notes || '', 'textarea')}<div class="field-grid">${formField('Prioritas', 'priority', '', 'select', priorities)}${formField('Tenggat (opsional)', 'deadline', dueValue, 'datetime-local')}</div><div class="modal-buttons"><button type="button" class="secondary-button" data-action="modal.close">Batal</button><button class="primary-button" type="submit">Simpan tugas</button></div></form>`);
  }

  function showRoutineForm(item = null) {
    openModal(`<div class="modal-heading"><div><h2>${item ? 'Edit rutinitas' : 'Rutinitas baru'}</h2><p>Catat kebiasaan yang ingin kamu jaga.</p></div><button class="window-button" data-action="modal.close" aria-label="Tutup">×</button></div>
      <form class="modal-form" data-form="routine" data-id="${esc(item?.Id || '')}">${formField('Nama rutinitas', 'title', item?.Title || '')}${formField('Jadwal atau frekuensi', 'schedule', item?.Schedule || '')}${formField('Catatan', 'notes', item?.Notes || '', 'textarea')}<label class="form-check"><input name="isActive" type="checkbox" ${item?.IsActive === false ? '' : 'checked'}> Rutinitas aktif</label><div class="modal-buttons"><button type="button" class="secondary-button" data-action="modal.close">Batal</button><button class="primary-button" type="submit">Simpan rutinitas</button></div></form>`);
  }

  function showScheduleForm(item = null) {
    const endDate = item?.EndDateTime ? new Date(item.EndDateTime) : null;
    const endValue = endDate && !Number.isNaN(endDate.getTime()) ? `${isoDay(endDate)}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}` : '';
    const date = item?.DateTime ? new Date(item.DateTime) : new Date();
    const dateValue = `${isoDay(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    openModal(`<div class="modal-heading"><div><h2>${item ? 'Edit jadwal' : 'Jadwal baru'}</h2><p>Simpan tanggal dan waktu agenda.</p></div><button class="window-button" data-action="modal.close" aria-label="Tutup">×</button></div>
      <form class="modal-form" data-form="schedule" data-id="${esc(item?.Id || '')}">${formField('Nama agenda', 'title', item?.Title || '')}<div class="field-grid">${formField('Mulai', 'dateTime', dateValue, 'datetime-local')}${formField('Selesai (opsional)', 'endDateTime', endValue, 'datetime-local')}</div>${formField('Deskripsi', 'notes', item?.Notes || '', 'textarea')}<div class="modal-buttons"><button type="button" class="secondary-button" data-action="modal.close">Batal</button><button class="primary-button" type="submit">Simpan jadwal</button></div></form>`);
  }

  function doDelete(type, id, label) {
    if (!window.confirm(`Hapus ${label}? Tindakan ini tidak dapat dibatalkan.`)) return;
    post(`${type}.delete`, { id });
  }

  function readForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function saveSettings() {
    const selectedTheme = document.getElementById('setting-theme')?.value || 'Soft Sakura Pink';
    const currentTheme = settings().Theme || 'Soft Sakura Pink';
    const borderInput = document.getElementById('setting-border')?.value || '#ef9fb8';
    const currentBorder = settings().PanelBorder || '#ef9fb8';
    const themeBorder = themePalette[selectedTheme]?.accent || '#ef9fb8';
    const s = {
      Theme: selectedTheme,
      PanelBackground: document.getElementById('setting-background')?.value,
      PanelBorder: selectedTheme !== currentTheme && borderInput.toLowerCase() === currentBorder.toLowerCase() ? themeBorder : borderInput,
      PanelOpacity: Number(document.getElementById('setting-opacity')?.value || 95) / 100,
      DragEnabled: document.getElementById('setting-drag')?.checked ?? true,
      AutoSnap: document.getElementById('setting-snap')?.checked ?? true,
      AlwaysOnTop: document.getElementById('setting-topmost')?.checked ?? true,
      RememberPanelPosition: document.getElementById('setting-remember-panel')?.checked ?? true,
      RememberMascotPosition: document.getElementById('setting-remember-mascot')?.checked ?? true,
      NotificationsEnabled: document.getElementById('setting-notifications')?.checked ?? true,
      NotificationSoundEnabled: document.getElementById('setting-sound')?.checked ?? true,
      NotificationLeadMinutes: Number(document.getElementById('setting-lead')?.value || 5),
      NotificationVolume: Number(document.getElementById('setting-volume')?.value || 75)
    };
    post('settings.save', { projectName: document.getElementById('setting-project')?.value || '', displayName: document.getElementById('setting-display')?.value || '', settings: s });
  }

  function handleClick(event) {
    const target = event.target.closest('[data-action],[data-page]');
    if (!target) return;
    if (target.dataset.page) {
      currentPage = target.dataset.page;
      if (currentPage === 'tasks') {
        post('search.update', { query: searchText, priority: taskFilter });
        return;
      }
      renderPage();
      return;
    }
    const { action, id, value } = target.dataset;
    switch (action) {
      case 'panel.close': post('panel.close'); break;
      case 'task.new': showTaskForm(); break;
      case 'task.edit': { const item = allTasks().find(row => row.Id === id); if (item) showTaskForm(item); break; }
      case 'task.delete': doDelete('task', id, 'tugas ini'); break;
      case 'task.toggle': break;
      case 'task.filter': taskFilter = value; post('search.update', { query: searchText, priority: taskFilter }); break;
      case 'routine.new': showRoutineForm(); break;
      case 'routine.edit': { const item = allRoutines().find(row => row.Id === id); if (item) showRoutineForm(item); break; }
      case 'routine.delete': doDelete('routine', id, 'rutinitas ini'); break;
      case 'schedule.new': showScheduleForm(); break;
      case 'schedule.edit': { const item = allSchedules().find(row => row.Id === id); if (item) showScheduleForm(item); break; }
      case 'schedule.delete': doDelete('schedule', id, 'jadwal ini'); break;
      case 'calendar.prev': month = new Date(month.getFullYear(), month.getMonth() - 1, 1); renderPage(); break;
      case 'calendar.next': month = new Date(month.getFullYear(), month.getMonth() + 1, 1); renderPage(); break;
      case 'calendar.today': month = new Date(new Date().getFullYear(), new Date().getMonth(), 1); selectedDay = new Date(); renderPage(); break;
      case 'calendar.select': selectedDay = new Date(`${target.dataset.date}T00:00:00`); month = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1); renderPage(); break;
      case 'settings.save': saveSettings(); break;
      case 'backup.export': post('backup.export'); break;
      case 'backup.import': post('backup.import'); break;
      case 'mascot.toggle': post('mascot.toggle'); break;
      case 'modal.close': closeModal(); break;
      case 'modal.backdrop': if (event.target === target) closeModal(); break;
      default: break;
    }
  }

  function handleSubmit(event) {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const values = readForm(form);
    const id = form.dataset.id;
    const type = form.dataset.form;
    if (type === 'routine') values.isActive = form.querySelector('[name="isActive"]')?.checked === true;
    if (type === 'task') post(id ? 'task.update' : 'task.create', { id, ...values });
    else if (type === 'routine') post(id ? 'routine.update' : 'routine.create', { id, ...values });
    else if (type === 'schedule') post(id ? 'schedule.update' : 'schedule.create', { id, ...values });
    closeModal();
  }

  function handleChange(event) {
    const input = event.target;
    if (input.matches('[data-action="pose.upload"]')) {
      const file = input.files?.[0];
      if (!file) return;
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        notify('Pilih PNG atau JPEG berukuran maksimal 5 MB.', 'error'); input.value = ''; return;
      }
      const reader = new FileReader();
      reader.onload = () => post('mascot.pose.upload', { mode: input.dataset.mode, dataUrl: reader.result });
      reader.onerror = () => notify('File gambar tidak dapat dibaca.', 'error');
      reader.readAsDataURL(file);
      return;
    }
    if (input.matches('[data-action="task.toggle"]')) post('task.toggle', { id: input.dataset.id, completed: input.checked });
  }

  function handleMessage(event) {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'snapshot') {
      snapshot = {
        ...message.data,
        FilteredTasks: message.filteredTasks || message.data?.Tasks || [],
        FilteredRoutines: message.filteredRoutines || message.data?.Routines || [],
        FilteredSchedules: message.filteredSchedules || message.data?.Schedules || []
      };
      if (mode === 'panel') renderPage();
      return;
    }
    if (message.type === 'mascot.pose') {
      const image = document.getElementById('mascot-image');
      const orb = document.getElementById('mascot-orb');
      if (orb) orb.dataset.pose = message.pose || 'peek';
      if (orb) orb.dataset.mode = message.mode || 'Image';
      if (image && message.src) image.src = message.src;
      return;
    }
    if (message.type === 'toast') notify(message.message || 'Selesai.', message.kind || 'success');
  }

  function initMascot() {
    const orb = document.getElementById('mascot-orb');
    const modeButton = document.querySelector('.mascot-mode');
    orb.addEventListener('pointerenter', () => post('mascot.hover', { hovered: true }));
    orb.addEventListener('pointerleave', () => post('mascot.hover', { hovered: false }));
    modeButton.addEventListener('pointerdown', event => event.stopPropagation());
    orb.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('.mascot-mode')) return;
      mascotStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      orb.setPointerCapture(event.pointerId);
      post('mascot.drag.start');
    });
    orb.addEventListener('pointermove', event => {
      if (!mascotStart || event.pointerId !== mascotStart.pointerId) return;
      const dx = event.clientX - mascotStart.x;
      const dy = event.clientY - mascotStart.y;
      if (!mascotStart.moved && Math.hypot(dx, dy) < 4) return;
      mascotStart.moved = true;
      post('mascot.drag.move', { dx, dy });
    });
    const end = event => {
      if (!mascotStart || event.pointerId !== mascotStart.pointerId) return;
      post('mascot.drag.end', { moved: mascotStart.moved });
      mascotStart = null;
    };
    orb.addEventListener('pointerup', end);
    orb.addEventListener('pointercancel', end);
    modeButton.addEventListener('click', () => post('mascot.toggle'));
    window.remmieMascot = { setPose: (pose, src) => handleMessage({ data: { type: 'mascot.pose', pose, src } }) };
    post('mascot.ready');
  }

  function initPanel() {
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('submit', handleSubmit);
    document.getElementById('global-search').addEventListener('input', event => sendSearch(event.target.value));
    const topbar = document.querySelector('.topbar');
    topbar.addEventListener('pointerdown', event => {
      if (!event.target.closest('[data-drag-handle]') || event.target.closest('button,input,label')) return;
      panelDragStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      topbar.setPointerCapture(event.pointerId);
      post('panel.drag.start');
    });
    topbar.addEventListener('pointermove', event => {
      if (!panelDragStart || event.pointerId !== panelDragStart.pointerId) return;
      post('panel.drag.move', { dx: event.clientX - panelDragStart.x, dy: event.clientY - panelDragStart.y });
    });
    const end = event => { if (panelDragStart && event.pointerId === panelDragStart.pointerId) { post('panel.drag.end'); panelDragStart = null; } };
    topbar.addEventListener('pointerup', end);
    topbar.addEventListener('pointercancel', end);
    document.addEventListener('input', event => {
      if (event.target.id === 'setting-opacity') document.getElementById('opacity-label').textContent = `${event.target.value}%`;
    });
    post('panel.ready');
  }

  if (bridge) bridge.addEventListener('message', handleMessage);
  if (mode === 'mascot') initMascot();
  else initPanel();
})();

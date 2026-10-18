interface SimplePanelProps {
  onClose: () => void;
}

export function SimplePanel({ onClose }: SimplePanelProps) {
  return (
    <main className="panel">
      <header className="panel-header" data-tauri-drag-region>
        <div>
          <div className="panel-kicker">REMEMBER ME</div>
          <h1>Task Panel</h1>
        </div>
        <button className="close-button" onClick={onClose} aria-label="Tutup">×</button>
      </header>

      <section className="welcome-card">
        <div className="status-dot" />
        <div>
          <strong>Widget aktif</strong>
          <p>Maskot tetap menjadi window kecil terpisah. Panel ini hanya dibuat ketika maskot diklik.</p>
        </div>
      </section>

      <section className="task-card">
        <h2>Today</h2>
        <div className="empty-task">Belum ada tugas. Tambahkan task di versi berikutnya.</div>
      </section>
    </main>
  );
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Atur posisi awal langsung menempel di sisi kanan layar desktop Windows (seperti Gambar 2)
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let screen_size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    let logical_width = screen_size.width as f64 / scale_factor;

                    // Posisikan window langsung di tepi kanan desktop (misal x = total_width - 150px, y = 140px)
                    let initial_x = (logical_width - 150.0).max(0.0);
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                        x: initial_x,
                        y: 140.0,
                    }));
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

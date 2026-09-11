#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Atur posisi awal jendela maskot langsung menempel di sisi kanan layar desktop Windows.
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let screen_size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    let logical_width = screen_size.width as f64 / scale_factor;

                    // Posisikan window langsung di tepi kanan desktop.
                    let initial_x = (logical_width - 240.0).max(0.0);
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                        x: initial_x,
                        y: 120.0,
                    }));
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Let React perform the final edge-peek placement. This initial
                // position only keeps the native window on-screen during startup.
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let screen_size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    let logical_width = screen_size.width as f64 / scale_factor;
                    let logical_height = screen_size.height as f64 / scale_factor;

                    let initial_x = (logical_width - 180.0).max(0.0);
                    let initial_y = (logical_height * 0.5 - 90.0).max(0.0);
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                        x: initial_x,
                        y: initial_y,
                    }));
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

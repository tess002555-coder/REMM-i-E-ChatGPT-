#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let scale = monitor.scale_factor();
                    let work = monitor.work_area();
                    let width = work.size.width as f64 / scale;
                    let height = work.size.height as f64 / scale;
                    let x = work.position.x as f64 / scale + width - 180.0 + 90.0;
                    let y = work.position.y as f64 / scale + (height - 180.0) / 2.0;
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
                }
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Remember ME V2");
}

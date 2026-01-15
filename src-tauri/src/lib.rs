// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_dock_icon_visibility(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use tauri::ActivationPolicy;
        app.set_activation_policy(if visible {
            ActivationPolicy::Regular
        } else {
            ActivationPolicy::Accessory
        })
        .map_err(|e| e.to_string())?;
    }
    let _ = app;
    let _ = visible;
    Ok(())
}

#[tauri::command]
fn set_status_icon_visibility(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    #[cfg(desktop)]
    {
        use tauri::{Manager, tray::TrayIconBuilder, tray::TrayIconEvent};
        const TRAY_ID: &str = "status";

        if visible {
            if let Some(tray) = app.tray_by_id(TRAY_ID) {
                tray.set_visible(true).map_err(|e| e.to_string())?;
                return Ok(());
            }

            let mut builder = TrayIconBuilder::with_id(TRAY_ID).tooltip("Konnyaku Translator");
            if let Some(icon) = app.default_window_icon().cloned() {
                builder = builder.icon(icon);
            }

            let tray = builder
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(&app)
                .map_err(|e| e.to_string())?;

            tray.set_visible(true).map_err(|e| e.to_string())?;
        } else if let Some(tray) = app.tray_by_id(TRAY_ID) {
            tray.set_visible(false).map_err(|e| e.to_string())?;
        }
    }
    let _ = app;
    let _ = visible;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    // Enable audio playback in WebView
                    let _ = window.eval("
                        window.addEventListener('DOMContentLoaded', () => {
                            console.log('[Tauri] Audio playback enabled');
                        });
                    ");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            set_dock_icon_visibility,
            set_status_icon_visibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

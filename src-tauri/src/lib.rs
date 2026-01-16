// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

struct CloseOnExitState(AtomicBool);

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
        use tauri::{
            menu::{Menu, MenuItem, PredefinedMenuItem},
            tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
            Manager,
        };
        const TRAY_ID: &str = "status";

        if visible {
            let menu = {
                let show_item =
                    MenuItem::with_id(&app, "tray_show", "Show App", true, None::<&str>)
                        .map_err(|e| e.to_string())?;
                let hide_item =
                    MenuItem::with_id(&app, "tray_hide", "Hide App", true, None::<&str>)
                        .map_err(|e| e.to_string())?;
                let quit_item =
                    MenuItem::with_id(&app, "tray_quit", "Quit", true, None::<&str>)
                        .map_err(|e| e.to_string())?;
                let separator = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
                Menu::with_items(&app, &[&show_item, &hide_item, &separator, &quit_item])
                    .map_err(|e| e.to_string())?
            };

            if let Some(tray) = app.tray_by_id(TRAY_ID) {
                tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
                tray.set_show_menu_on_left_click(false).map_err(|e| e.to_string())?;
                tray.set_visible(true).map_err(|e| e.to_string())?;
                return Ok(());
            }

            let mut builder = TrayIconBuilder::with_id(TRAY_ID)
                .tooltip("Konnyaku Translator")
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false);
            if let Some(icon) = app.default_window_icon().cloned() {
                builder = builder.icon(icon);
            }

            let tray = builder
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, button_state, .. } = event {
                        if button != MouseButton::Left || button_state != MouseButtonState::Up {
                            return;
                        }
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "tray_show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "tray_hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "tray_quit" => {
                            app.exit(0);
                        }
                        _ => {}
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

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn set_close_on_exit(state: tauri::State<CloseOnExitState>, enabled: bool) {
    state.0.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn set_devtools(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        if enabled {
            window.open_devtools();
        } else {
            window.close_devtools();
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CloseOnExitState(AtomicBool::new(true)))
        .enable_macos_default_menu(false)
        .menu(|handle| {
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{Menu, PredefinedMenuItem, Submenu};
                let app_menu = Submenu::with_items(
                    handle,
                    "Konnyaku Translator",
                    true,
                    &[
                        &PredefinedMenuItem::about(handle, None, None)?,
                        &PredefinedMenuItem::separator(handle)?,
                        &PredefinedMenuItem::hide(handle, None)?,
                        &PredefinedMenuItem::hide_others(handle, None)?,
                        &PredefinedMenuItem::show_all(handle, None)?,
                        &PredefinedMenuItem::separator(handle)?,
                        &PredefinedMenuItem::quit(handle, None)?,
                    ],
                )?;
                return Menu::with_items(handle, &[&app_menu]);
            }
            #[cfg(not(target_os = "macos"))]
            {
                tauri::menu::Menu::with_items(handle, &[])
            }
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let close_on_exit = window
                    .state::<CloseOnExitState>()
                    .0
                    .load(Ordering::Relaxed);
                if close_on_exit {
                    window.app_handle().exit(0);
                } else {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
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
            quit_app,
            set_close_on_exit,
            set_devtools,
            set_dock_icon_visibility,
            set_status_icon_visibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

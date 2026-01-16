import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { enable as enableAutostart, disable as disableAutostart } from '@tauri-apps/plugin-autostart';

export const applyAppVisibility = async (showDockIcon: boolean, showStatusIcon: boolean) => {
    if (!isTauri()) return;
    const window = getCurrentWindow();
    try {
        const isMac = /mac/i.test(navigator.platform || navigator.userAgent);
        if (!isMac) {
            await window.setSkipTaskbar(!showDockIcon);
        }
    } catch (error) {
        console.warn('[AppShell] Failed to toggle dock/taskbar visibility', error);
    }
    try {
        await invoke('set_dock_icon_visibility', { visible: showDockIcon });
    } catch (error) {
        console.warn('[AppShell] Failed to toggle dock icon visibility', error);
    }
    try {
        await invoke('set_status_icon_visibility', { visible: showStatusIcon });
    } catch (error) {
        console.warn('[AppShell] Failed to toggle status icon visibility', error);
    }
};

export const applyGlobalShortcut = async (shortcut: string) => {
    if (!isTauri()) return;
    try {
        await invoke('set_global_shortcut', { shortcut: shortcut.trim() });
    } catch (error) {
        console.warn('[AppShell] Failed to apply global shortcut', error);
    }
};

export const applyAutostart = async (enabled: boolean) => {
    if (!isTauri()) return;
    try {
        if (enabled) {
            await enableAutostart();
        } else {
            await disableAutostart();
        }
    } catch (error) {
        console.warn('[AppShell] Failed to apply autostart', error);
    }
};

export const applyDevtools = async (enabled: boolean) => {
    if (!isTauri()) return;
    try {
        await invoke('set_devtools', { enabled });
    } catch (error) {
        console.warn('[AppShell] Failed to toggle devtools', error);
    }
};

export const applyCloseOnExit = async (enabled: boolean) => {
    if (!isTauri()) return;
    try {
        await invoke('set_close_on_exit', { enabled });
    } catch (error) {
        console.warn('[AppShell] Failed to apply close-on-exit behavior', error);
    }
};

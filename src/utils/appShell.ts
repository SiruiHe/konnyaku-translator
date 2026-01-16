import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { enable as enableAutostart, disable as disableAutostart } from '@tauri-apps/plugin-autostart';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

export const applyAppVisibility = async (showDockIcon: boolean, showStatusIcon: boolean) => {
    if (!isTauri()) return;
    try {
        const window = getCurrentWindow();
        await window.setSkipTaskbar(!showDockIcon);
        await invoke('set_dock_icon_visibility', { visible: showDockIcon });
        await invoke('set_status_icon_visibility', { visible: showStatusIcon });
    } catch (error) {
        console.warn('[AppShell] Failed to apply visibility settings', error);
    }
};

export const applyGlobalShortcut = async (shortcut: string) => {
    if (!isTauri()) return;
    try {
        await unregisterAll();
        const normalized = shortcut.trim();
        if (!normalized) return;
        await register(normalized, (event) => {
            if (event.state !== 'Pressed') return;
            const window = getCurrentWindow();
            window.show().catch(() => {});
            window.setFocus().catch(() => {});
        });
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

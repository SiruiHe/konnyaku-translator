import { isTauri } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';

const STORE_PATH = 'secure.store';
const store = isTauri() ? new LazyStore(STORE_PATH, { autoSave: true, defaults: {} }) : null;
let initPromise: Promise<void> | null = null;

const ensureStore = async () => {
    if (!store) return;
    if (!initPromise) {
        initPromise = store.init();
    }
    await initPromise;
};

export const getSecureValue = async (key: string): Promise<string> => {
    if (!isTauri() || !store) {
        return localStorage.getItem(key) || '';
    }
    await ensureStore();
    const value = await store.get<string>(key);
    if (typeof value === 'string') {
        return value;
    }

    const legacy = localStorage.getItem(key);
    if (legacy && legacy.trim()) {
        await store.set(key, legacy);
        await store.save();
        localStorage.removeItem(key);
        return legacy;
    }

    return '';
};

export const setSecureValue = async (key: string, value: string): Promise<void> => {
    if (!isTauri() || !store) {
        if (value && value.trim()) {
            localStorage.setItem(key, value);
        } else {
            localStorage.removeItem(key);
        }
        return;
    }
    await ensureStore();
    if (value && value.trim()) {
        await store.set(key, value);
    } else {
        await store.delete(key);
    }
    await store.save();
    localStorage.removeItem(key);
};

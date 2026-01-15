import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Detect if running in Tauri environment
export const isTauri = () => !!(window as any).__TAURI__;

export const safeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (isTauri()) {
        console.log('[Network] Using Tauri Native Fetch');
        return tauriFetch(input, init);
    } else {
        console.log('[Network] Using Browser Standard Fetch');
        return fetch(input, init);
    }
};

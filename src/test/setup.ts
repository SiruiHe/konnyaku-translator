import '@testing-library/jest-dom';

const storage = new Map<string, string>();

const localStorageMock = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => {
        storage.set(key, value);
    },
    removeItem: (key: string) => {
        storage.delete(key);
    },
    clear: () => {
        storage.clear();
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
        return storage.size;
    },
};

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

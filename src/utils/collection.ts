export const MAX_COLLECTION_ITEMS = 100;
export const COLLECTION_STORAGE_KEY = 'konnyaku_translator_collection';
const LEGACY_COLLECTION_KEYS = ['mytranslator_collection', 'konjac_translator_collection'];

export const trimCollectionItems = <T>(items: T[]): T[] => {
    if (items.length <= MAX_COLLECTION_ITEMS) return items;
    return items.slice(0, MAX_COLLECTION_ITEMS);
};

const readCollection = <T>(key: string): T[] | null => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T[];
    } catch (error) {
        console.error('[Collection] Failed to parse collection', error);
        return null;
    }
};

export const loadCollectionItems = <T>(): T[] => {
    const current = readCollection<T>(COLLECTION_STORAGE_KEY);
    if (current) return current;
    for (const key of LEGACY_COLLECTION_KEYS) {
        const legacy = readCollection<T>(key);
        if (legacy) {
            localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(legacy));
            localStorage.removeItem(key);
            return legacy;
        }
    }
    return [];
};

export const saveCollectionItems = <T>(items: T[]): void => {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(items));
};

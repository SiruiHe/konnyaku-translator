import type { DictionaryData } from '../services/ILLMProvider';

const decodeJsonString = (value: string): string => {
    try {
        return JSON.parse(`"${value}"`);
    } catch {
        return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
};

const extractJsonString = (raw: string, key: string): string | null => {
    const regex = new RegExp(`\"${key}\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"`, 'g');
    let match: RegExpExecArray | null = null;
    let last: string | null = null;
    while ((match = regex.exec(raw)) !== null) {
        last = match[1];
    }
    if (last === null) return null;
    return decodeJsonString(last);
};

const extractJsonArray = (raw: string, key: string): string[] => {
    const regex = new RegExp(`\"${key}\"\\s*:\\s*\\[(.*?)\\]`, 'gs');
    let match: RegExpExecArray | null = null;
    let last: string | null = null;
    while ((match = regex.exec(raw)) !== null) {
        last = match[1];
    }
    if (last === null) return [];
    const wrapped = `[${last}]`;
    try {
        const parsed = JSON.parse(wrapped);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
        const items: string[] = [];
        const itemRegex = /\"((?:\\.|[^\"\\])*)\"/g;
        let itemMatch: RegExpExecArray | null = null;
        while ((itemMatch = itemRegex.exec(last)) !== null) {
            items.push(decodeJsonString(itemMatch[1]));
        }
        return items;
    }
};

export const buildPartialDictionary = (raw: string, fallbackWord: string): DictionaryData => {
    const word = extractJsonString(raw, 'word') || fallbackWord;
    const directTranslation = extractJsonString(raw, 'directTranslation') || '';
    const phonetic = extractJsonString(raw, 'phonetic') || '';
    const partsOfSpeech = extractJsonString(raw, 'partsOfSpeech') || '';
    const definition = extractJsonString(raw, 'definition') || '';
    const etymology = extractJsonString(raw, 'etymology') || '';
    const examples = extractJsonArray(raw, 'examples');
    const synonyms = extractJsonArray(raw, 'synonyms');

    return {
        word,
        directTranslation: directTranslation || undefined,
        phonetic,
        partsOfSpeech,
        definition,
        examples,
        etymology: etymology || undefined,
        synonyms: synonyms.length ? synonyms : undefined,
    };
};

export interface DictionaryData {
    word: string;
    directTranslation?: string; // Added for enhanced dictionary format
    phonetic: string;
    definition: string;
    examples: string[];
    synonyms?: string[];
    etymology?: string;
    partsOfSpeech: string; // e.g. "noun", "verb"
}

export type ProcessorResult =
    | { type: 'translation'; text: string }
    | { type: 'dictionary'; data: DictionaryData };

export interface ILLMProvider {
    id: string;
    name: string;

    // Single entry point: The LLM decides the mode
    process(
        text: string,
        sourceLang: string,
        targetLang: string,
        onPartial?: (partial: ProcessorResult) => void,
        options?: { signal?: AbortSignal }
    ): Promise<ProcessorResult>;

    speak(text: string, language?: string): Promise<ArrayBuffer | null>;
}

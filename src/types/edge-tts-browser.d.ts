declare module 'edge-tts-browser/models/EdgeTTSBrowser.js' {
    export interface EdgeVoice {
        Name: string;
        ShortName: string;
        Gender?: string;
        Locale?: string;
        FriendlyName?: string;
    }

    export default class EdgeTTSBrowser {
        static getVoices(): Promise<EdgeVoice[]>;
        constructor(tts: any);
        ttsToFile(fileName?: string): Promise<Blob>;
    }
}

declare module 'edge-tts-browser/models/TTS.js' {
    export interface TTSConfig {
        voice?: string;
        pitch?: string;
        rate?: string;
        volume?: string;
        text?: string | null;
        fileType?: { tag: string; ext: string };
    }

    export default class TTS {
        constructor(config?: TTSConfig);
        generateSSML(): string;
        generateCommand(): string;
        setVoiceParams(params: TTSConfig): void;
    }
}

declare module 'edge-tts-browser/constants/constants.js' {
    const constants: {
        WSS_URL: string;
        VOICE_LIST_URL: string;
        WSS_HEADERS: Record<string, string>;
        VOICE_HEADERS: Record<string, string>;
        OUTPUT_FORMATS: Record<string, { tag: string; ext: string }>;
    };
    export default constants;
}

declare module 'edge-tts-browser/utils/utils.js' {
    export function buildWebSocketURL(): string;
}

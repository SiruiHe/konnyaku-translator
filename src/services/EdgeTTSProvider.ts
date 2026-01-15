import EdgeTTSBrowser from 'edge-tts-browser/models/EdgeTTSBrowser.js';
import TTS from 'edge-tts-browser/models/TTS.js';
import constants from 'edge-tts-browser/constants/constants.js';
import { buildWebSocketURL } from 'edge-tts-browser/utils/utils.js';
import WebSocket from '@tauri-apps/plugin-websocket';
import { isTauri, safeFetch } from '../utils/http';
import { resolveSpeechLanguage } from '../utils/language';

type EdgeVoice = {
    ShortName: string;
    Locale?: string;
    FriendlyName?: string;
    Gender?: string;
};

type VoiceIndex = {
    byLocale: Map<string, EdgeVoice[]>;
    byLanguage: Map<string, EdgeVoice[]>;
    allNeural: EdgeVoice[];
    shortNames: Set<string>;
};

const PREFERRED_VOICES_BY_LOCALE: Record<string, string[]> = {
    'en-us': ['en-US-AriaNeural', 'en-US-JennyNeural'],
    'zh-cn': ['zh-CN-XiaoxiaoNeural', 'zh-CN-XiaoyiNeural'],
    'ja-jp': ['ja-JP-NanamiNeural'],
    'ko-kr': ['ko-KR-SunHiNeural'],
    'fr-fr': ['fr-FR-DeniseNeural'],
    'es-es': ['es-ES-ElviraNeural'],
    'de-de': ['de-DE-KatjaNeural'],
    'ru-ru': ['ru-RU-SvetlanaNeural'],
    'en-sg': ['en-SG-LunaNeural', 'en-SG-SerenaNeural'],
};

let voicesCache: EdgeVoice[] | null = null;
let voicesPromise: Promise<EdgeVoice[]> | null = null;
let voiceIndexCache: VoiceIndex | null = null;

const fetchVoices = async (): Promise<EdgeVoice[]> => {
    if (voicesCache) return voicesCache;
    if (voicesPromise) return voicesPromise;

    voicesPromise = (async () => {
        try {
            const response = await safeFetch(constants.VOICE_LIST_URL, {
                headers: constants.VOICE_HEADERS,
            });
            if (!response.ok) {
                throw new Error(`Edge voice list error: ${response.status}`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                voicesCache = data;
                return data;
            }
        } catch (e) {
            console.error('[EdgeTTS] Failed to load voices', e);
        }
        voicesCache = [];
        return [];
    })();

    return voicesPromise;
};

const buildVoiceIndex = (voices: EdgeVoice[]): VoiceIndex => {
    const neuralVoices = voices.filter((voice) => voice.ShortName?.endsWith('Neural'));
    const byLocale = new Map<string, EdgeVoice[]>();
    const byLanguage = new Map<string, EdgeVoice[]>();

    for (const voice of neuralVoices) {
        const locale = voice.Locale?.toLowerCase();
        if (!locale) continue;
        const base = locale.split('-')[0];

        const localeList = byLocale.get(locale) || [];
        localeList.push(voice);
        byLocale.set(locale, localeList);

        const langList = byLanguage.get(base) || [];
        langList.push(voice);
        byLanguage.set(base, langList);
    }

    for (const list of byLocale.values()) {
        list.sort((a, b) => a.ShortName.localeCompare(b.ShortName));
    }
    for (const list of byLanguage.values()) {
        list.sort((a, b) => a.ShortName.localeCompare(b.ShortName));
    }

    return {
        byLocale,
        byLanguage,
        allNeural: neuralVoices,
        shortNames: new Set(neuralVoices.map((voice) => voice.ShortName)),
    };
};

const getVoiceIndex = async (): Promise<VoiceIndex> => {
    if (voiceIndexCache) return voiceIndexCache;
    const voices = await fetchVoices();
    voiceIndexCache = buildVoiceIndex(voices);
    return voiceIndexCache;
};

const isFemale = (voice: EdgeVoice) => voice.Gender?.toLowerCase() === 'female';

const pickVoiceFromList = (list: EdgeVoice[], preferred?: string[]): string | null => {
    if (!list.length) return null;
    if (preferred) {
        const preferredSet = new Set(preferred);
        const preferredVoices = list.filter((voice) => preferredSet.has(voice.ShortName));
        const preferredFemale = preferredVoices.find(isFemale);
        if (preferredFemale) return preferredFemale.ShortName;
        if (preferredVoices.length) return preferredVoices[0].ShortName;
    }

    const female = list.find(isFemale);
    if (female) return female.ShortName;

    return list[0]?.ShortName || null;
};

const pickVoice = (language: string, index: VoiceIndex): string => {
    const normalized = language.toLowerCase();
    const preferred = PREFERRED_VOICES_BY_LOCALE[normalized];

    if (preferred) {
        for (const voice of preferred) {
            if (index.shortNames.has(voice)) return voice;
        }
    }

    const exactList = index.byLocale.get(normalized);
    if (exactList && exactList.length) {
        return pickVoiceFromList(exactList, preferred) || exactList[0].ShortName;
    }

    if (normalized.includes('-')) {
        const prefix = `${normalized}-`;
        const prefixed: EdgeVoice[] = [];
        for (const [locale, list] of index.byLocale.entries()) {
            if (locale.startsWith(prefix)) {
                prefixed.push(...list);
            }
        }
        if (prefixed.length) {
            prefixed.sort((a, b) => a.ShortName.localeCompare(b.ShortName));
            return pickVoiceFromList(prefixed, preferred) || prefixed[0].ShortName;
        }
    }

    const base = normalized.split('-')[0];
    const baseList = index.byLanguage.get(base);
    if (baseList && baseList.length) {
        return pickVoiceFromList(baseList, preferred) || baseList[0].ShortName;
    }

    const fallback = index.byLocale.get('en-us') || index.allNeural;
    if (fallback.length) {
        return fallback[0].ShortName;
    }

    return 'en-US-AriaNeural';
};

const parseMessageText = (text: string): Record<string, string> => {
    const obj: Record<string, string> = {};
    const lines = text.split('\r\n').filter(line => line !== '');
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx > -1) {
            const key = line.slice(0, idx);
            const value = line.slice(idx + 1);
            obj[key] = value;
        }
    }
    return obj;
};

const speakWithTauriWebSocket = async (tts: TTS): Promise<ArrayBuffer | null> => {
    const url = buildWebSocketURL();
    const socket = await WebSocket.connect(url, { headers: constants.WSS_HEADERS });
    const chunks: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
        const stop = async (err?: unknown) => {
            clearTimeout(timeout);
            unlisten?.();
            try {
                await socket.disconnect();
            } catch {
                // ignore disconnect errors
            }
            if (err) {
                reject(err);
            }
        };

        const finalize = async () => {
            clearTimeout(timeout);
            unlisten?.();
            try {
                await socket.disconnect();
            } catch {
                // ignore disconnect errors
            }

            const total = chunks.reduce((sum, c) => sum + c.length, 0);
            if (!total) {
                resolve(null);
                return;
            }

            const merged = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) {
                merged.set(chunk, offset);
                offset += chunk.length;
            }
            resolve(merged.buffer);
        };

        const timeout = setTimeout(() => {
            stop(new Error('Edge TTS timed out'));
        }, 20000);

        const unlisten = socket.addListener((message) => {
            if (message.type === 'Binary') {
                const buffer = new Uint8Array(message.data);
                if (buffer.length < 2) return;

                const headerLength = (buffer[0] << 8) | (buffer[1] + '\r\n'.length);
                const header = buffer.subarray(0, headerLength);
                const headerText = new TextDecoder().decode(header);
                const meta = parseMessageText(headerText);
                if (meta.Path !== 'audio') return;

                const payload = buffer.subarray(headerLength);
                if (payload.length) {
                    chunks.push(payload);
                }
            } else if (message.type === 'Text') {
                const meta = parseMessageText(message.data);
                if (meta.Path === 'turn.end') {
                    void finalize();
                }
            }
        });

        socket
            .send(tts.generateCommand())
            .then(() => socket.send(tts.generateSSML()))
            .catch((err) => {
                void stop(err);
            });
    });
};

export class EdgeTTSProvider {
    static async speak(text: string, language: string = 'en'): Promise<ArrayBuffer | null> {
        if (!text.trim()) return null;

        const resolvedLang = resolveSpeechLanguage(text, language);
        const index = await getVoiceIndex();
        const voice = pickVoice(resolvedLang, index);

        const tts = new TTS({
            voice,
            text,
            fileType: constants.OUTPUT_FORMATS.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
        });

        try {
            if (isTauri()) {
                return await speakWithTauriWebSocket(tts);
            }

            const edge = new EdgeTTSBrowser(tts);
            const blob = await edge.ttsToFile();
            return await blob.arrayBuffer();
        } catch (e) {
            console.error('[EdgeTTS] Speak failed', e);
            return null;
        }
    }
}

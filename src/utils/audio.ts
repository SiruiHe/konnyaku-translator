let sharedAudioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentAudio: HTMLAudioElement | null = null;
let audioGeneration = 0;

const getAudioContext = (): AudioContext | null => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioContext) sharedAudioContext = new Ctx();
    return sharedAudioContext;
};

export const unlockAudioContext = async (): Promise<boolean> => {
    const ctx = getAudioContext();
    if (!ctx) return false;

    try {
        if (ctx.state !== 'running') {
            await ctx.resume();
        }

        // Play a tiny silent buffer to unlock audio on strict WebViews.
        const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        return true;
    } catch (e) {
        console.warn('[Audio] Failed to unlock audio context', e);
        return false;
    }
};

export const stopAllAudio = (): void => {
    audioGeneration += 1;
    if (currentSource) {
        try {
            currentSource.stop();
        } catch {
            // ignore stop errors
        }
        try {
            currentSource.disconnect();
        } catch {
            // ignore disconnect errors
        }
        currentSource = null;
    }

    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch {
            // ignore pause errors
        }
        currentAudio = null;
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

export const getAudioToken = (): number => audioGeneration;

export const playAudioBuffer = async (buffer: ArrayBuffer, token?: number): Promise<boolean> => {
    const ctx = getAudioContext();
    if (!ctx) return false;

    try {
        const currentToken = token ?? audioGeneration;
        if (currentToken !== audioGeneration) return false;

        if (ctx.state !== 'running') {
            await ctx.resume();
        }

        const decoded = await ctx.decodeAudioData(buffer.slice(0));
        if (currentToken !== audioGeneration) return false;
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        currentSource = source;
        source.onended = () => {
            if (currentSource === source) {
                currentSource = null;
            }
        };
        source.start(0);
        return true;
    } catch (e) {
        console.error('[Audio] Failed to decode or play buffer', e);
        return false;
    }
};

export const playAudioUrl = async (url: string, token?: number): Promise<boolean> => {
    try {
        const currentToken = token ?? audioGeneration;
        if (currentToken !== audioGeneration) return false;
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = () => {
            if (currentAudio === audio) {
                currentAudio = null;
            }
        };
        await audio.play();
        return true;
    } catch (e) {
        console.error('[Audio] HTMLAudio play failed', e);
        return false;
    }
};

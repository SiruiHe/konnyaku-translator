import { useEffect, useRef, useState } from 'react';
import { ProcessorResult } from '../services/ILLMProvider';
import { EdgeTTSProvider } from '../services/EdgeTTSProvider';
import { openaiProvider } from '../App';
import { getAudioToken, playAudioBuffer, playAudioUrl, stopAllAudio, unlockAudioContext } from '../utils/audio';

interface Props {
    result: ProcessorResult | null;
    isLoading?: boolean;
    isSaved?: boolean;
    onToggleSave?: (item: ProcessorResult) => boolean | void;
    ttsMode: 'edge' | 'gpt';
    targetLang: string;
}

const OutputArea: React.FC<Props> = ({ result, isLoading, isSaved, onToggleSave, ttsMode, targetLang }) => {
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef<number | null>(null);
    const saved = Boolean(isSaved);

    useEffect(() => {
        if (copyTimeoutRef.current) {
            window.clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = null;
        }
        setCopied(false);
    }, [result]);

    const getSpeakText = (): string | null => {
        if (!result) return null;
        if (result.type === 'translation') return result.text;

        const direct = result.data.directTranslation?.trim();
        if (direct) {
            const parts = direct.split('=');
            const right = parts.length > 1 ? parts.slice(1).join('=').trim() : direct;
            const cleaned = right.split(/[（(]/)[0].trim();
            if (cleaned) return cleaned;
        }

        return result.data.definition || result.data.word;
    };

    const handleSpeak = async () => {
        const textToSpeak = getSpeakText();
        if (!textToSpeak) return;

        stopAllAudio();
        const audioToken = getAudioToken();

        await unlockAudioContext();

        if (ttsMode === 'gpt') {
            const audioBuffer = await openaiProvider.speak(textToSpeak, targetLang);
            if (audioToken !== getAudioToken()) return;
            if (audioBuffer) {
                const played = await playAudioBuffer(audioBuffer, audioToken);
                if (played) return;

                const blobUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mpeg' }));
                const playedUrl = await playAudioUrl(blobUrl, audioToken);
                URL.revokeObjectURL(blobUrl);
                if (playedUrl) return;
            }

            const edgeBuffer = await EdgeTTSProvider.speak(textToSpeak, targetLang);
            if (audioToken !== getAudioToken()) return;
            if (edgeBuffer) {
                const played = await playAudioBuffer(edgeBuffer, audioToken);
                if (played) return;

                const blobUrl = URL.createObjectURL(new Blob([edgeBuffer], { type: 'audio/mpeg' }));
                await playAudioUrl(blobUrl, audioToken);
                URL.revokeObjectURL(blobUrl);
            }
            return;
        }

        const edgeBuffer = await EdgeTTSProvider.speak(textToSpeak, targetLang);
        if (audioToken !== getAudioToken()) return;
        if (edgeBuffer) {
            const played = await playAudioBuffer(edgeBuffer, audioToken);
            if (played) return;

            const blobUrl = URL.createObjectURL(new Blob([edgeBuffer], { type: 'audio/mpeg' }));
            await playAudioUrl(blobUrl, audioToken);
            URL.revokeObjectURL(blobUrl);
        }
    };

    // Copy Helper
    const handleCopy = async () => {
        if (!result) return;
        const text = result.type === 'dictionary' ?
            `${result.data.word}\n${result.data.definition}` :
            result.text;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (copyTimeoutRef.current) {
            window.clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(() => {
            setCopied(false);
            copyTimeoutRef.current = null;
        }, 1200);
    };

    if (isLoading && !result) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 dark:text-stone-600 animate-pulse">
                <div className="text-4xl font-light mb-4">Thinking...</div>
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="h-full flex items-center justify-center text-stone-300 dark:text-neutral-700 select-none">
                <div className="text-center">
                    <div className="text-6xl mb-4 opacity-20">A</div>
                    <p className="font-light">Enter text or press Paste</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col group">
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {result.type === 'dictionary' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="border-b border-stone-100 dark:border-neutral-700 pb-4">
                            <div className="flex items-baseline gap-4">
                                <h1 className="text-4xl font-bold text-stone-800 dark:text-stone-100">{result.data.word}</h1>
                                <span className="font-mono text-stone-400 dark:text-stone-500 text-lg">{result.data.phonetic}</span>
                        </div>
                        {result.data.partsOfSpeech && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-stone-100 dark:bg-neutral-700 text-stone-500 dark:text-stone-300 text-xs font-semibold rounded uppercase tracking-wider">
                                {result.data.partsOfSpeech}
                            </span>
                        )}
                    </div>

                    {result.data.directTranslation && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Direct Translation</h3>
                            <p className="text-lg md:text-xl font-semibold text-purple-900 dark:text-purple-100 whitespace-pre-wrap break-words">
                                {result.data.directTranslation}
                            </p>
                        </div>
                    )}

                    <div>
                        <p className="text-xl md:text-2xl font-serif text-stone-700 dark:text-stone-200 leading-relaxed whitespace-pre-wrap break-words">
                            {result.data.definition}
                        </p>
                    </div>

                    {result.data.examples && result.data.examples.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Examples</h3>
                            <ul className="space-y-2 pl-4 border-l-2 border-stone-100 dark:border-neutral-700">
                                {result.data.examples.map((ex, i) => (
                                    <li key={i} className="text-stone-600 dark:text-stone-400 italic whitespace-pre-wrap break-words">"{ex}"</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.data.etymology && (
                        <div className="pt-4 text-sm text-stone-400 dark:text-stone-500">
                            <span className="font-semibold block mb-1 uppercase tracking-wider text-[10px]">Etymology</span>
                            {result.data.etymology}
                        </div>
                    )}
                    </div>
                ) : (
                    <div className="text-xl md:text-2xl text-stone-800 dark:text-stone-200 leading-relaxed font-light animate-in fade-in duration-300 whitespace-pre-wrap break-words">
                        {result.text}
                    </div>
                )}
            </div>

            {/* Floating Action Bar */}
            <div className="shrink-0 px-6 md:px-8 pb-4 pt-2 flex justify-end">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent px-1 py-1 rounded-lg">
                    <button
                        onClick={handleCopy}
                        className={`p-2 rounded-lg transition-all ${copied ? 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/15' : 'text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-neutral-700/40'}`}
                        title="Copy"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
                    </button>
                    <button
                        onClick={() => {
                            if (onToggleSave) {
                                onToggleSave(result);
                            }
                        }}
                        className={`p-2 rounded-lg transition-all ${saved ? 'text-yellow-500 bg-yellow-500/15 dark:bg-yellow-500/20' : 'text-stone-400 hover:text-yellow-500 hover:bg-yellow-500/10 dark:hover:bg-yellow-500/10'}`}
                        title="Save to Collection"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </button>
                    <button
                        onClick={handleSpeak}
                        className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Play Audio"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OutputArea;

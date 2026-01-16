import React, { useRef, useEffect, useState } from 'react';
import { EdgeTTSProvider } from '../services/EdgeTTSProvider';
import { openaiProvider } from '../App';
import { getAudioToken, playAudioBuffer, playAudioUrl, stopAllAudio, unlockAudioContext } from '../utils/audio';
import { resolveSpeechLanguage } from '../utils/language';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onTranslate?: () => void;
    onClear?: () => void;
    ttsMode: 'edge' | 'gpt';
    sourceLang: string;
}

const InputArea: React.FC<Props> = ({ value, onChange, onTranslate, onClear, ttsMode, sourceLang }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [pasted, setPasted] = useState(false);
    const pasteTimeoutRef = useRef<number | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onTranslate && onTranslate();
        }
    };

    useEffect(() => {
        // Auto-focus
        textareaRef.current?.focus();
        return () => {
            if (pasteTimeoutRef.current) {
                window.clearTimeout(pasteTimeoutRef.current);
                pasteTimeoutRef.current = null;
            }
        };
    }, []);

    const flashPasted = () => {
        setPasted(true);
        if (pasteTimeoutRef.current) {
            window.clearTimeout(pasteTimeoutRef.current);
        }
        pasteTimeoutRef.current = window.setTimeout(() => {
            setPasted(false);
            pasteTimeoutRef.current = null;
        }, 900);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            onChange(text);
            flashPasted();
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };

    const handlePasteEvent = () => {
        flashPasted();
    };

    const handleSpeak = async () => {
        if (!value) return;

        stopAllAudio();
        const audioToken = getAudioToken();

        await unlockAudioContext();

        const speechLang = resolveSpeechLanguage(value, sourceLang);

        if (ttsMode === 'gpt') {
            const audioBuffer = await openaiProvider.speak(value, speechLang);
            if (audioToken !== getAudioToken()) return;
            if (audioBuffer) {
                const played = await playAudioBuffer(audioBuffer, audioToken);
                if (played) return;

                const blobUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mpeg' }));
                const playedUrl = await playAudioUrl(blobUrl, audioToken);
                URL.revokeObjectURL(blobUrl);
                if (playedUrl) return;
            }

            const edgeBuffer = await EdgeTTSProvider.speak(value, speechLang);
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

        const edgeBuffer = await EdgeTTSProvider.speak(value, speechLang);
        if (audioToken !== getAudioToken()) return;
        if (edgeBuffer) {
            const played = await playAudioBuffer(edgeBuffer, audioToken);
            if (played) return;

            const blobUrl = URL.createObjectURL(new Blob([edgeBuffer], { type: 'audio/mpeg' }));
            await playAudioUrl(blobUrl, audioToken);
            URL.revokeObjectURL(blobUrl);
        }
    };

    const handleClear = () => {
        if (onClear) {
            onClear();
            return;
        }
        stopAllAudio();
        onChange('');
    };

    return (
        <div className="flex flex-col h-full relative group">
            <textarea
                ref={textareaRef}
                className="w-full h-full bg-transparent resize-none outline-none text-xl md:text-2xl p-6 md:p-8 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePasteEvent}
                placeholder="Type something..."
                spellCheck={false}
            />

            {/* Floating Action Bar */}
            <div className="absolute bottom-4 right-4 flex gap-2 transition-opacity opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                {/* Speak Button */}
                {value && (
                    <button
                        onClick={handleSpeak}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Read Aloud"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                    </button>
                )}

                {/* Paste Button */}
                <button
                    onClick={handlePaste}
                    className={`p-2 rounded-lg transition-colors ${pasted ? 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/15' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50/60 dark:hover:bg-blue-900/30'}`}
                    title="Paste from Clipboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
                </button>

                {/* Clear Button */}
                {value && (
                    <button
                        onClick={handleClear}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Clear text"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputArea;

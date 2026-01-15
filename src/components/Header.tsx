import React from 'react';
import { LANGUAGE_OPTIONS } from '../utils/languageOptions';

interface Props {
    sourceLang: string;
    targetLang: string;
    onSourceChange: (lang: string) => void;
    onTargetChange: (lang: string) => void;
    onTranslate: () => void;
    onToggleCollection: () => void;
}

const Header: React.FC<Props> = ({ sourceLang, targetLang, onSourceChange, onTargetChange, onToggleCollection }) => {
    return (
        <header className="h-14 bg-white dark:bg-neutral-900 border-b border-stone-200 dark:border-neutral-800 flex items-center justify-between px-4 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            {/* Left: Window Controls Spacer (Mac) */}
            <div className="w-16"></div>

            {/* Center: Language Selectors */}
            <div className="flex items-center gap-2 bg-stone-100 dark:bg-neutral-800 p-1 rounded-lg shadow-sm border border-stone-200 dark:border-neutral-700" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <select
                    value={sourceLang}
                    onChange={(e) => onSourceChange(e.target.value)}
                    className="bg-transparent text-sm font-medium text-stone-700 dark:text-stone-300 py-1 pl-2 pr-6 outline-none cursor-pointer hover:bg-white dark:hover:bg-neutral-700 rounded-md transition-colors appearance-none"
                >
                    {LANGUAGE_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>

                <button
                    onClick={() => {
                        if (sourceLang === 'auto') return;
                        const temp = sourceLang;
                        onSourceChange(targetLang);
                        onTargetChange(temp);
                    }}
                    className="p-1 text-stone-400 hover:text-blue-500 transition-colors"
                    title="Swap Languages"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>
                </button>

                <select
                    value={targetLang}
                    onChange={(e) => onTargetChange(e.target.value)}
                    className="bg-transparent text-sm font-medium text-stone-700 dark:text-stone-300 py-1 pl-2 pr-6 outline-none cursor-pointer hover:bg-white dark:hover:bg-neutral-700 rounded-md transition-colors appearance-none"
                >
                    {LANGUAGE_OPTIONS.filter(l => l.code !== 'auto').map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
            </div>

            {/* Right: Actions */}
            <div className="w-16 flex justify-end gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button
                    onClick={onToggleCollection}
                    className="p-2 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                    title="My Collection"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                </button>
            </div>
        </header>
    );
};

export default Header;

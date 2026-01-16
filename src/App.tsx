import { useEffect, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import InputArea from './components/InputArea';
import OutputArea from './components/OutputArea';
import CollectionView from './components/CollectionView';
import Settings from './components/Settings';
import { GeminiProvider } from './services/GeminiProvider';
import { OpenAIProvider } from './services/OpenAIProvider';
import { ProcessorResult } from './services/ILLMProvider';
import { stopAllAudio } from './utils/audio';
import { loadCollectionItems, saveCollectionItems, trimCollectionItems } from './utils/collection';
import { applyAppVisibility, applyAutostart, applyCloseOnExit, applyDevtools, applyGlobalShortcut } from './utils/appShell';

const geminiProvider = new GeminiProvider('gemini-3-flash-preview', 'Gemini 3 Flash', '');

// Export so components can import for TTS
export const openaiProvider = new OpenAIProvider('gpt-5.2', 'GPT-5.2', '');

function App() {
  const [activeProviderName, setActiveProviderName] = useState<'gemini' | 'openai'>(() => {
    const saved = localStorage.getItem('active_provider');
    return (saved === 'gemini' || saved === 'openai') ? saved : 'gemini';
  });

  // Save provider to localStorage when it changes
  const handleSetProvider = (name: 'gemini' | 'openai') => {
    setActiveProviderName(name);
    localStorage.setItem('active_provider', name);
  };
  const provider = activeProviderName === 'gemini' ? geminiProvider : openaiProvider;

  // TTS Mode: 'edge' (Default) or 'gpt' (OpenAI) - load from localStorage
  const [ttsMode, setTtsMode] = useState<'edge' | 'gpt'>(() => {
    const saved = localStorage.getItem('tts_mode');
    return (saved === 'gpt' || saved === 'edge') ? saved : 'gpt';
  });

  // Save ttsMode to localStorage when it changes
  const handleSetTtsMode = (mode: 'edge' | 'gpt') => {
    setTtsMode(mode);
    localStorage.setItem('tts_mode', mode);
  };

  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('zh-CN');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<ProcessorResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const translateAbortRef = useRef<AbortController | null>(null);
  const translateRequestIdRef = useRef(0);

  const buildSaveKey = (item: ProcessorResult): string => {
    if (item.type === 'dictionary') {
      const word = item.data.word?.trim() || '';
      const direct = item.data.directTranslation?.trim() || '';
      const definition = item.data.definition?.trim() || '';
      return `dictionary|${word}|${direct}|${definition}`;
    }
    const text = item.text?.trim() || '';
    return `translation|${text}`;
  };

  type SavedItem = ProcessorResult & { id: number; date: string; key?: string };

  const getSavedItems = (): SavedItem[] => {
    try {
      return loadCollectionItems<SavedItem>();
    } catch (e) {
      console.error("Failed to load collection", e);
      return [];
    }
  };

  const isItemSaved = (item: ProcessorResult): boolean => {
    const key = buildSaveKey(item);
    const saved = getSavedItems();
    return saved.some((entry) => (entry.key ?? buildSaveKey(entry)) === key);
  };

  useEffect(() => {
    if (!result) {
      setIsSaved(false);
      return;
    }
    setIsSaved(isItemSaved(result));
  }, [result]);

  useEffect(() => {
    const applySettings = () => {
      const showDockIcon = (localStorage.getItem('show_dock_icon') ?? 'true') === 'true';
      const showStatusIcon = (localStorage.getItem('show_status_icon') ?? 'true') === 'true';
      const globalShortcut = localStorage.getItem('global_shortcut') || 'CommandOrControl+Shift+L';
      const autoStartEnabled = (localStorage.getItem('auto_start_enabled') ?? 'false') === 'true';
      const closeOnExit = (localStorage.getItem('close_on_exit') ?? 'true') === 'true';
      const devtoolsEnabled = (localStorage.getItem('devtools_enabled') ?? 'false') === 'true';
      applyAppVisibility(showDockIcon, showStatusIcon);
      applyGlobalShortcut(globalShortcut);
      applyAutostart(autoStartEnabled);
      applyCloseOnExit(closeOnExit);
      applyDevtools(devtoolsEnabled);
    };

    applySettings();
    const onSettingsUpdated = () => applySettings();
    window.addEventListener('settings-updated', onSettingsUpdated);
    return () => window.removeEventListener('settings-updated', onSettingsUpdated);
  }, []);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    translateAbortRef.current?.abort();
    stopAllAudio();
    const requestId = ++translateRequestIdRef.current;
    const controller = new AbortController();
    translateAbortRef.current = controller;

    setIsTranslating(true);
    setResult(null); // Clear previous
    try {
      const res = await provider.process(
        inputText,
        sourceLang,
        targetLang,
        (partial) => {
          if (requestId !== translateRequestIdRef.current) return;
          setResult(partial);
        },
        { signal: controller.signal }
      );
      if (requestId !== translateRequestIdRef.current) return;
      setResult(res);
    } catch (error) {
      if (requestId !== translateRequestIdRef.current) return;
      console.error("Translation Failed", error);
      setResult({ type: 'translation', text: `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      if (requestId === translateRequestIdRef.current) {
        setIsTranslating(false);
      }
    }
  };

  const handleToggleSave = (item: ProcessorResult) => {
    try {
      const key = buildSaveKey(item);
      const saved = getSavedItems();
      const matchesKey = (entry: SavedItem) => (entry.key ?? buildSaveKey(entry)) === key;
      const exists = saved.some(matchesKey);

      if (exists) {
        const updated = saved.filter((entry) => !matchesKey(entry));
        saveCollectionItems(updated);
        setIsSaved(false);
        return false;
      }

      const newItem = { ...item, id: Date.now(), date: new Date().toISOString(), key };
      const nextItems = trimCollectionItems([newItem, ...saved]);
      saveCollectionItems(nextItems);
      setIsSaved(true);
      return true;
    } catch (e) {
      console.error("Failed to toggle save", e);
      return false;
    }
  };

  const handleRecycle = (item: any) => {
    setShowCollection(false);
    if (item.type === 'dictionary') {
      setInputText(item.data.word);
      setResult(item);
    } else {
      setInputText(item.text); // For translation, restore text
      setResult(item);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-stone-50 dark:bg-neutral-900 border border-transparent">
      {/* Header */}
      <Header
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSourceChange={setSourceLang}
        onTargetChange={setTargetLang}
        onTranslate={handleTranslate}
        onToggleCollection={() => setShowCollection((prev) => !prev)}
      />


      {/* Main Split View */}
      <main className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-stone-200 dark:divide-neutral-800 overflow-hidden relative">

        {/* Left: Input */}
        <div className="flex-1 flex flex-col min-h-[40vh] md:min-h-0 bg-transparent">
          <InputArea
            value={inputText}
            onChange={setInputText}
            onClear={() => {
              translateAbortRef.current?.abort();
              translateRequestIdRef.current += 1;
              stopAllAudio();
              setIsTranslating(false);
              setInputText('');
              setResult(null);
            }}
            onTranslate={handleTranslate}
            ttsMode={ttsMode}
            sourceLang={sourceLang}
          />
        </div>

        {/* Right: Output */}
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-800 shadow-inner overflow-hidden">
          <OutputArea
            result={result}
            isLoading={isTranslating}
            isSaved={isSaved}
            onToggleSave={handleToggleSave}
            ttsMode={ttsMode}
            targetLang={targetLang}
          />

          {/* Model Selector (Subtle footer inside output) */}
          <div className="px-6 py-2 text-xs text-stone-400 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-neutral-700">
            <div className="flex items-center gap-2 border-r border-stone-200 dark:border-neutral-700 pr-3 mr-3">
              <span>Voice:</span>
              <button
                onClick={() => handleSetTtsMode('edge')}
                className={`hover:text-stone-600 dark:hover:text-stone-300 ${ttsMode === 'edge' ? 'text-purple-500 font-semibold' : ''}`}
              >Edge</button>
              <span className="text-stone-200">/</span>
              <button
                onClick={() => handleSetTtsMode('gpt')}
                className={`hover:text-stone-600 dark:hover:text-stone-300 ${ttsMode === 'gpt' ? 'text-purple-500 font-semibold' : ''}`}
              >GPT</button>
            </div>

            <span>Model:</span>
            <button
              onClick={() => handleSetProvider('gemini')}
              className={`hover:text-stone-600 dark:hover:text-stone-300 ${activeProviderName === 'gemini' ? 'text-blue-500 font-semibold' : ''}`}
            >Gemini3</button>
            <span className="text-stone-200">|</span>
            <button
              onClick={() => handleSetProvider('openai')}
              className={`hover:text-stone-600 dark:hover:text-stone-300 ${activeProviderName === 'openai' ? 'text-green-500 font-semibold' : ''}`}
            >GPT</button>

            <span className="text-stone-200">|</span>
            <button
              onClick={() => setShowSettings(true)}
              className="hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-1"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>
        </div>

        {/* Collection Overlay */}
        {showCollection && (
          <div className="absolute inset-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-sm p-6 overflow-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
            <CollectionView onRecycle={handleRecycle} />
          </div>
        )}

        {/* Settings Modal */}
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      </main>
    </div>
  );
}

export default App;

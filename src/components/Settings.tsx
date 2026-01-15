import React, { useState, useEffect, useRef } from 'react';
import { applyAppVisibility, applyAutostart, applyGlobalShortcut } from '../utils/appShell';
import { getSecureValue, setSecureValue } from '../utils/secureStore';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SettingsData {
    geminiApiKey: string;
    openaiApiKey: string;
    selectedGeminiModel: string;
    selectedOpenAIModel: string;
    geminiThinkingLevel: string;
    openaiReasoningEffort: string;
    promptPreset: string;
    showDockIcon: boolean;
    showStatusIcon: boolean;
    globalShortcut: string;
    autoStartEnabled: boolean;
    closeOnExit: boolean;
    customPromptsEnabled: boolean;
    phrasePrompt: string;
    sentencePrompt: string;
}

const DEFAULT_PHRASE_PROMPT = `You are a professional dictionary and language expert. When given a phrase or word (≤10 words):

1. **Direct Translation (准确直译)**: Provide the most accurate, concise translation that precisely captures the meaning
   - Format: "[Original] = [Translation] ([context if needed])"
   - Example: "สวัสดีครับ = 你好（男性用语）"
   - This MUST be the first line, clear and prominent
   - IT MUST ACCURATELY EXPRESS THE EXACT MEANING of the original phrase/word

2. **Detailed Explanation**: Then provide:
   - Pronunciation (use IPA only when appropriate for the source language; otherwise use the standard romanization/pronunciation scheme, e.g., Mandarin Pinyin with tone marks, Japanese Kana + Romaji, Korean Hangul + RR, Thai RTGS, Vietnamese Quoc ngu)
   - Part of speech
   - Detailed meaning and usage
   - Example sentences
   - Etymology (if interesting)

Return a raw JSON object (no markdown) with this structure:
{
  "mode": "dictionary",
  "word": "Input text",
  "directTranslation": "Exact translation as described above",
  "phonetic": "Pronunciation per above (include scheme label when not IPA)",
  "partsOfSpeech": "n./v./adj.",
  "definition": "Detailed definition in target language",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "etymology": "Brief origin",
  "synonyms": ["Synonym1", "Synonym2"]
}

IMPORTANT: Return ONLY valid JSON. Do not wrap in \`\`\`json blocks.`;

const DEFAULT_SENTENCE_PROMPT = `You are a professional translator. Translate the given text accurately while preserving tone, style, and cultural nuances. Provide natural, fluent translation. If the target language is English (Singapore), use natural Singaporean English word choice and mild Singlish particles sparingly (e.g., lah, lor) without being exaggerated.

Preserve the original formatting exactly, including line breaks, indentation, bullet markers, and spacing.

Return ONLY the translated text. Do not wrap in JSON or markdown.`;

const PROMPT_PRESETS: Record<string, { label: string; phrasePrompt: string; sentencePrompt: string }> = {
    general: {
        label: 'General',
        phrasePrompt: DEFAULT_PHRASE_PROMPT,
        sentencePrompt: DEFAULT_SENTENCE_PROMPT,
    },
};

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'api' | 'prompts'>('general');
    const [settings, setSettings] = useState<SettingsData>({
        geminiApiKey: '',
        openaiApiKey: '',
        selectedGeminiModel: 'gemini-3-flash-preview',
        selectedOpenAIModel: 'gpt-4o-2024-11-20',
        geminiThinkingLevel: 'auto',
        openaiReasoningEffort: 'auto',
        promptPreset: 'general',
        showDockIcon: true,
        showStatusIcon: true,
        globalShortcut: 'CommandOrControl+Shift+L',
        autoStartEnabled: false,
        closeOnExit: true,
        customPromptsEnabled: false,
        phrasePrompt: DEFAULT_PHRASE_PROMPT,
        sentencePrompt: DEFAULT_SENTENCE_PROMPT,
    });

    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
    const shortcutInputRef = useRef<HTMLInputElement>(null);

    // Load settings from localStorage
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [geminiKey, openaiKey] = await Promise.all([
                    getSecureValue('gemini_api_key'),
                    getSecureValue('openai_api_key'),
                ]);
                const geminiModel = localStorage.getItem('selected_gemini_model') || 'gemini-3-flash-preview';
                const openaiModel = localStorage.getItem('selected_openai_model') || 'gpt-4o-2024-11-20';
                const geminiThinkingLevel = localStorage.getItem('gemini_thinking_level') || 'auto';
                const openaiReasoningEffort = localStorage.getItem('openai_reasoning_effort') || 'auto';
                const promptPreset = localStorage.getItem('prompt_preset') || 'general';
                const showDockIcon = (localStorage.getItem('show_dock_icon') ?? 'true') === 'true';
                const showStatusIcon = (localStorage.getItem('show_status_icon') ?? 'true') === 'true';
                const globalShortcut = localStorage.getItem('global_shortcut') || 'CommandOrControl+Shift+L';
                const autoStartEnabled = (localStorage.getItem('auto_start_enabled') ?? 'false') === 'true';
                const closeOnExit = (localStorage.getItem('close_on_exit') ?? 'true') === 'true';

                const customPromptsStr = localStorage.getItem('custom_prompts');
                const customPrompts = customPromptsStr ? JSON.parse(customPromptsStr) : {};
                const preset = PROMPT_PRESETS[promptPreset] || PROMPT_PRESETS.general;

                setSettings({
                    geminiApiKey: geminiKey,
                    openaiApiKey: openaiKey,
                    selectedGeminiModel: geminiModel,
                    selectedOpenAIModel: openaiModel,
                    geminiThinkingLevel,
                    openaiReasoningEffort,
                    promptPreset,
                    showDockIcon,
                    showStatusIcon,
                    globalShortcut,
                    autoStartEnabled,
                    closeOnExit,
                    customPromptsEnabled: customPrompts.enabled || false,
                    phrasePrompt: customPrompts.phrase_prompt || preset.phrasePrompt,
                    sentencePrompt: customPrompts.sentence_prompt || preset.sentencePrompt,
                });
            } catch (error) {
                console.error('[Settings] Error loading settings:', error);
            }
        };

        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    // Save settings to localStorage
    const handleSave = async () => {
        try {
            await Promise.all([
                setSecureValue('gemini_api_key', settings.geminiApiKey),
                setSecureValue('openai_api_key', settings.openaiApiKey),
            ]);
            localStorage.setItem('selected_gemini_model', settings.selectedGeminiModel);
            localStorage.setItem('selected_openai_model', settings.selectedOpenAIModel);
            localStorage.setItem('gemini_thinking_level', settings.geminiThinkingLevel);
            localStorage.setItem('openai_reasoning_effort', settings.openaiReasoningEffort);
            localStorage.setItem('prompt_preset', settings.promptPreset);
            localStorage.setItem('show_dock_icon', String(settings.showDockIcon));
            localStorage.setItem('show_status_icon', String(settings.showStatusIcon));
            localStorage.setItem('global_shortcut', settings.globalShortcut.trim());
            localStorage.setItem('auto_start_enabled', String(settings.autoStartEnabled));
            localStorage.setItem('close_on_exit', String(settings.closeOnExit));

            localStorage.setItem('custom_prompts', JSON.stringify({
                enabled: settings.customPromptsEnabled,
                phrase_prompt: settings.phrasePrompt,
                sentence_prompt: settings.sentencePrompt,
            }));

            // Trigger a custom event to notify App component
            window.dispatchEvent(new Event('settings-updated'));

            await applyAppVisibility(settings.showDockIcon, settings.showStatusIcon);
            await applyGlobalShortcut(settings.globalShortcut);
            await applyAutostart(settings.autoStartEnabled);

            alert('Settings saved successfully!');
            onClose();
        } catch (error) {
            console.error('[Settings] Error saving settings:', error);
            alert('Failed to save settings');
        }
    };

    const handleReset = () => {
        if (confirm('Reset prompts to default?')) {
            const preset = PROMPT_PRESETS[settings.promptPreset] || PROMPT_PRESETS.general;
            setSettings(prev => ({
                ...prev,
                phrasePrompt: preset.phrasePrompt,
                sentencePrompt: preset.sentencePrompt,
                customPromptsEnabled: false,
            }));
        }
    };

    const startRecordingShortcut = () => {
        setIsRecordingShortcut(true);
        requestAnimationFrame(() => {
            shortcutInputRef.current?.focus();
        });
    };

    const stopRecordingShortcut = () => {
        setIsRecordingShortcut(false);
    };

    const normalizeShortcutKey = (key: string) => {
        if (key === ' ') return 'Space';
        if (key.length === 1) return key.toUpperCase();
        return key;
    };

    const handleShortcutKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isRecordingShortcut) return;
        event.preventDefault();
        event.stopPropagation();

        if (event.key === 'Escape') {
            stopRecordingShortcut();
            return;
        }

        const isModifierOnly = ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key);
        if (isModifierOnly) return;

        if ((event.key === 'Backspace' || event.key === 'Delete') && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
            setSettings(prev => ({ ...prev, globalShortcut: '' }));
            stopRecordingShortcut();
            return;
        }

        const parts: string[] = [];
        if (event.metaKey || event.ctrlKey) parts.push('CommandOrControl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');

        const key = normalizeShortcutKey(event.key);
        if (!key || parts.length === 0) {
            return;
        }
        parts.push(key);
        setSettings(prev => ({ ...prev, globalShortcut: parts.join('+') }));
        stopRecordingShortcut();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-3 font-medium transition-colors ${activeTab === 'general'
                            ? 'text-purple-600 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`px-6 py-3 font-medium transition-colors ${activeTab === 'api'
                            ? 'text-purple-600 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        API Keys & Models
                    </button>
                    <button
                        onClick={() => setActiveTab('prompts')}
                        className={`px-6 py-3 font-medium transition-colors ${activeTab === 'prompts'
                            ? 'text-purple-600 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        Custom Prompts
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">App Behavior</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300">
                                        <span>Show Dock Icon (macOS)</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.showDockIcon}
                                            onChange={(e) => setSettings(prev => ({ ...prev, showDockIcon: e.target.checked }))}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300">
                                        <span>Show Status Bar Icon (macOS)</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.showStatusIcon}
                                            onChange={(e) => setSettings(prev => ({ ...prev, showStatusIcon: e.target.checked }))}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300">
                                        <span>Launch on Startup</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.autoStartEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, autoStartEnabled: e.target.checked }))}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300">
                                        <span>Close Window Exits App</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.closeOnExit}
                                            onChange={(e) => setSettings(prev => ({ ...prev, closeOnExit: e.target.checked }))}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                    </label>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Global Shortcut (show app)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={shortcutInputRef}
                                                type="text"
                                                value={isRecordingShortcut ? 'Press keys...' : settings.globalShortcut}
                                                readOnly
                                                onKeyDown={handleShortcutKeyDown}
                                                onFocus={() => setIsRecordingShortcut(true)}
                                                onBlur={stopRecordingShortcut}
                                                placeholder="CommandOrControl+Shift+L"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={startRecordingShortcut}
                                                className={`px-3 py-2 text-sm rounded-md border transition-colors ${isRecordingShortcut ? 'border-purple-500 text-purple-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                                            >
                                                {isRecordingShortcut ? 'Recording' : 'Record'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSettings(prev => ({ ...prev, globalShortcut: '' }))}
                                                className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Leave empty to disable. Example: CommandOrControl+Shift+L
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="space-y-6">
                            {/* Gemini Section */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Gemini Configuration</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            API Key
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showGeminiKey ? 'text' : 'password'}
                                                value={settings.geminiApiKey}
                                                onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                                                placeholder="Enter Gemini API key"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowGeminiKey(!showGeminiKey)}
                                                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                                            >
                                                {showGeminiKey ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Model
                                        </label>
                                        <select
                                            value={settings.selectedGeminiModel}
                                            onChange={(e) => setSettings(prev => ({ ...prev, selectedGeminiModel: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                                            <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Reasoning Effort
                                        </label>
                                        <select
                                            value={settings.geminiThinkingLevel}
                                            onChange={(e) => setSettings(prev => ({ ...prev, geminiThinkingLevel: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="auto">Auto (default)</option>
                                            <option value="minimal">Minimal (fastest)</option>
                                            <option value="low">Low (fast)</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* OpenAI Section */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">OpenAI Configuration</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            API Key
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showOpenAIKey ? 'text' : 'password'}
                                                value={settings.openaiApiKey}
                                                onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                                                placeholder="Enter OpenAI API key"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                                            >
                                                {showOpenAIKey ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Model
                                        </label>
                                        <select
                                            value={settings.selectedOpenAIModel}
                                            onChange={(e) => setSettings(prev => ({ ...prev, selectedOpenAIModel: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="gpt-5.2">gpt-5.2</option>
                                            <option value="gpt-5.2-chat-latest">gpt-5.2-chat-latest</option>
                                            <option value="gpt-5-mini">gpt-5-mini</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Reasoning Effort
                                        </label>
                                        <select
                                            value={settings.openaiReasoningEffort}
                                            onChange={(e) => setSettings(prev => ({ ...prev, openaiReasoningEffort: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="auto">Auto (default)</option>
                                            <option value="low">Low (fast)</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'prompts' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Prompt Style
                                </label>
                                <select
                                    value={settings.promptPreset}
                                    onChange={(e) => {
                                        const presetId = e.target.value;
                                        const preset = PROMPT_PRESETS[presetId] || PROMPT_PRESETS.general;
                                        setSettings(prev => ({
                                            ...prev,
                                            promptPreset: presetId,
                                            phrasePrompt: prev.customPromptsEnabled ? prev.phrasePrompt : preset.phrasePrompt,
                                            sentencePrompt: prev.customPromptsEnabled ? prev.sentencePrompt : preset.sentencePrompt,
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {Object.entries(PROMPT_PRESETS).map(([key, preset]) => (
                                        <option key={key} value={key}>{preset.label}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Built-in prompt styles for common use cases.
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.customPromptsEnabled}
                                        onChange={(e) => setSettings(prev => ({ ...prev, customPromptsEnabled: e.target.checked }))}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Advanced Custom Prompts
                                    </span>
                                </label>
                                <button
                                    onClick={handleReset}
                                    className="text-sm text-purple-600 hover:text-purple-700"
                                >
                                    Reset to Default
                                </button>
                            </div>

                            {settings.customPromptsEnabled && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Phrase/Word Prompt (≤10 words)
                                        </label>
                                        <textarea
                                            value={settings.phrasePrompt}
                                            onChange={(e) => setSettings(prev => ({ ...prev, phrasePrompt: e.target.value }))}
                                            rows={8}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                                            placeholder="Enter custom prompt for phrases/words..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Sentence Prompt ({'>'}10 words)
                                        </label>
                                        <textarea
                                            value={settings.sentencePrompt}
                                            onChange={(e) => setSettings(prev => ({ ...prev, sentencePrompt: e.target.value }))}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                                            placeholder="Enter custom prompt for sentences..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => {
                            // Test 1: Web Audio API Beep
                            try {
                                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                                const osc = ctx.createOscillator();
                                osc.connect(ctx.destination);
                                osc.start();
                                osc.stop(ctx.currentTime + 0.2);
                                console.log('[AudioTest] Beep played');
                            } catch (e) {
                                console.error('[AudioTest] Beep failed:', e);
                                alert('Audio Context Failed: ' + e);
                            }

                            // Test 2: Speech Synthesis
                            if ('speechSynthesis' in window) {
                                const u = new SpeechSynthesisUtterance("Audio check one two");
                                window.speechSynthesis.speak(u);
                                console.log('[AudioTest] Speech triggered');
                            } else {
                                alert('speechSynthesis not supported');
                            }
                        }}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md text-sm font-medium"
                    >
                        🔊 Test Audio
                    </button>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;

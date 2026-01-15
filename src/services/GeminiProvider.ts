import { ILLMProvider, ProcessorResult } from './ILLMProvider';
import { safeFetch } from '../utils/http';
import { parseSseChunk } from '../utils/streaming';
import { buildPartialDictionary } from '../utils/dictionaryStreaming';
import { getLanguageLabel } from '../utils/languageOptions';
import { isDictionaryMode } from '../utils/translationMode';
import { getSecureValue } from '../utils/secureStore';

export class GeminiProvider implements ILLMProvider {
    id: string;
    name: string;
    apiKey: string;

    constructor(id: string, name: string, apiKey: string) {
        this.id = id;
        this.name = name;
        this.apiKey = apiKey;
    }

    async process(
        text: string,
        _sourceLang: string,
        targetLang: string,
        onPartial?: (partial: ProcessorResult) => void,
        options?: { signal?: AbortSignal }
    ): Promise<ProcessorResult> {
        // Load settings from localStorage with fallback to constructor values
        const storedApiKey = await getSecureValue('gemini_api_key');
        const apiKey = (storedApiKey && storedApiKey.trim()) ? storedApiKey : this.apiKey;
        const storedModelId = localStorage.getItem('selected_gemini_model');
        const modelId = (storedModelId && storedModelId.trim()) ? storedModelId : this.id;
        const thinkingLevel = localStorage.getItem('gemini_thinking_level') || 'auto';

        console.log('[GeminiProvider] Using model:', modelId, 'API Key:', apiKey ? 'present' : 'missing');

        // Load custom prompts from settings
        const customPromptsStr = localStorage.getItem('custom_prompts');
        const customPrompts = customPromptsStr ? JSON.parse(customPromptsStr) : {};

        const isCustomEnabled = customPrompts.enabled || false;
        const isPhraseMode = isDictionaryMode(text);

        const targetLabel = getLanguageLabel(targetLang);
        let systemPrompt = '';

        if (isCustomEnabled) {
            // Use custom prompts from settings
            systemPrompt = isPhraseMode ? customPrompts.phrase_prompt : customPrompts.sentence_prompt;
            systemPrompt += `\n\nTarget Language: ${targetLabel}\nInput Text: "${text}"`;
        } else {
            // Default prompt with enhanced dictionary format
            if (isPhraseMode) {
                systemPrompt = `You are a professional dictionary and language expert. When given a phrase or word (≤10 words):

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

Target Language: ${targetLabel}
Input Text: "${text}"

Return a raw JSON object (no markdown) with this structure:
{
  "mode": "dictionary",
  "word": "${text}",
  "directTranslation": "Exact translation as described above",
  "phonetic": "Pronunciation per above (include scheme label when not IPA)",
  "partsOfSpeech": "n./v./adj.",
  "definition": "Detailed definition in target language",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "etymology": "Brief origin",
  "synonyms": ["Synonym1", "Synonym2"]
}

IMPORTANT: Return ONLY valid JSON. Do not wrap in \`\`\`json blocks.`;
            } else {
                systemPrompt = `You are a professional translator. Translate the given text accurately while preserving tone, style, and cultural nuances. Provide natural, fluent translation. If the target language is English (Singapore), use natural Singaporean English word choice and mild Singlish particles sparingly (e.g., lah, lor) without being exaggerated.

Target Language: ${targetLabel}
Input Text: "${text}"

Preserve the original formatting exactly, including line breaks, indentation, bullet markers, and spacing.

Return ONLY the translated text. Do not wrap in JSON or markdown.`;
            }
        }

        try {
            const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;
            const generationConfig: Record<string, any> = {};

            if (isPhraseMode) {
                generationConfig.responseMimeType = "application/json";
            }

            const normalizedThinking = thinkingLevel.toLowerCase();
            const lowerModel = modelId.toLowerCase();
            if (normalizedThinking !== 'auto') {
                if (lowerModel.includes('gemini-3')) {
                    let appliedLevel = normalizedThinking;
                    if (lowerModel.includes('pro')) {
                        if (appliedLevel === 'minimal') appliedLevel = 'low';
                        if (appliedLevel === 'medium') appliedLevel = 'high';
                    }
                    generationConfig.thinkingConfig = { thinkingLevel: appliedLevel };
                } else if (lowerModel.includes('gemini-2.5')) {
                    const budgetMap: Record<string, number> = {
                        minimal: lowerModel.includes('pro') ? 128 : 0,
                        low: 256,
                        medium: 1024,
                        high: 4096,
                    };
                    const budget = budgetMap[normalizedThinking];
                    if (budget !== undefined) {
                        generationConfig.thinkingConfig = { thinkingBudget: budget };
                    }
                }
            }

            const baseRequest = {
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined
            };

            const sendRequest = async (body: typeof baseRequest) => {
                return await safeFetch(streamUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: options?.signal
                });
            };

            let response = await sendRequest(baseRequest);

            if (!response.ok) {
                const errText = await response.text();
                const isThinkingError = /thinkingconfig|thinkinglevel|thinkingbudget|invalid_argument/i.test(errText);
                if (generationConfig.thinkingConfig && isThinkingError) {
                    const retryGenerationConfig = { ...generationConfig };
                    delete retryGenerationConfig.thinkingConfig;
                    const retryBody = {
                        ...baseRequest,
                        generationConfig: Object.keys(retryGenerationConfig).length ? retryGenerationConfig : undefined
                    };
                    response = await sendRequest(retryBody);
                    if (!response.ok) {
                        const retryErr = await response.text();
                        throw new Error(`Gemini API Error: ${response.status} - ${retryErr}`);
                    }
                } else {
                    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
                }
            }

            let rawText = '';

            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let doneReading = false;

                while (!doneReading) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const parsedChunk = parseSseChunk(buffer, chunk);
                    buffer = parsedChunk.buffer;

                    for (const event of parsedChunk.events) {
                        if (event === '[DONE]') {
                            doneReading = true;
                            break;
                        }
                        try {
                            const payload = JSON.parse(event);
                            const parts = payload.candidates?.[0]?.content?.parts || [];
                            const chunkText = parts.map((p: any) => p.text || '').join('');
                            if (chunkText) {
                                rawText += chunkText;
                                if (onPartial) {
                                    if (isPhraseMode) {
                                        onPartial({
                                            type: 'dictionary',
                                            data: buildPartialDictionary(rawText, text)
                                        });
                                    } else {
                                        onPartial({ type: 'translation', text: rawText });
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[Gemini] Failed to parse stream chunk', e);
                        }
                    }
                }
            } else {
                const data = await response.json();
                rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }

            // Parse the JSON response
            if (!isPhraseMode) {
                return { type: 'translation', text: rawText };
            }

            const parsed = JSON.parse(rawText);

            if (parsed.mode === 'dictionary') {
                return {
                    type: 'dictionary',
                    data: {
                        word: parsed.word,
                        directTranslation: parsed.directTranslation,
                        phonetic: parsed.phonetic,
                        definition: parsed.definition,
                        examples: parsed.examples,
                        etymology: parsed.etymology,
                        synonyms: parsed.synonyms,
                        partsOfSpeech: parsed.partsOfSpeech
                    }
                };
            } else {
                return {
                    type: 'translation',
                    text: parsed.text || rawText
                };
            }

        } catch (e) {
            if (e instanceof Error && /abort|cancel/i.test(e.name + e.message)) {
                return { type: 'translation', text: '' };
            }
            // Fallback to treating it as translation if JSON fails
            return { type: 'translation', text: "Error processing request. Please try again." };
        }
    }

    async speak(text: string, _language?: string): Promise<ArrayBuffer | null> {
        try {
            console.log(`Gemini TTS Request: "${text}"`);
            const modelId = 'gemini-2.5-flash-preview-tts';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

            const response = await safeFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: "Aoede"
                                }
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // 404 means model not found or not accessible with current key scope
                if (response.status === 404) {
                    console.error("Gemini TTS Model not found. Check availability.", errText);
                    return null;
                }
                throw new Error(`Gemini TTS API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();

            // Allow for standard Gemini candidate structure or specific audio output
            // Usually valid audio comes in 'inlineData' or inside a part with mimeType audio/mp3 or audio/wav
            const part = data.candidates?.[0]?.content?.parts?.[0];

            if (part && part.inlineData && part.inlineData.mimeType?.startsWith('audio')) {
                const base64Audio = part.inlineData.data;
                const binary = atob(base64Audio);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes.buffer;
            }

            console.warn("Gemini TTS: No audio data found in response.", data);
            return null;

        } catch (e) {
            console.error("Gemini TTS Error", e);
            return null;
        }
    }
}

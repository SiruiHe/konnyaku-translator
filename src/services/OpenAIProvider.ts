import { ILLMProvider, ProcessorResult } from './ILLMProvider';
import { safeFetch } from '../utils/http';
import { parseSseChunk } from '../utils/streaming';
import { buildPartialDictionary } from '../utils/dictionaryStreaming';
import { getLanguageLabel } from '../utils/languageOptions';
import { isDictionaryMode } from '../utils/translationMode';
import { getSecureValue } from '../utils/secureStore';

export class OpenAIProvider implements ILLMProvider {
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
        const url = 'https://api.openai.com/v1/chat/completions';

        // Load settings from localStorage
        const storedApiKey = await getSecureValue('openai_api_key');
        const apiKey = storedApiKey || this.apiKey;
        const storedModelId = localStorage.getItem('selected_openai_model');
        const modelId = storedModelId || this.id;
        const reasoningEffort = localStorage.getItem('openai_reasoning_effort') || 'auto';
        const supportsReasoningEffort = /gpt-5/i.test(modelId);
        const useReasoningEffort = supportsReasoningEffort && reasoningEffort !== 'auto';

        console.log('[OpenAIProvider] Using model:', modelId);

        // Load custom prompts
        const customPromptsStr = localStorage.getItem('custom_prompts');
        const customPrompts = customPromptsStr ? JSON.parse(customPromptsStr) : {};
        const isCustomEnabled = customPrompts.enabled || false;
        const isPhraseMode = isDictionaryMode(text);

        const targetLabel = getLanguageLabel(targetLang);
        let systemPrompt = '';

        if (isCustomEnabled) {
            systemPrompt = isPhraseMode ? customPrompts.phrase_prompt : customPrompts.sentence_prompt;
            systemPrompt += `\n\nTarget Language: ${targetLabel}\nInput Text: "${text}"`;
        } else {
            // Default prompt (same as Gemini's enhanced prompt)
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
            const payload: Record<string, any> = {
                model: modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                response_format: isPhraseMode ? { type: "json_object" } : undefined,
                stream: true
            };

            if (useReasoningEffort) {
                payload.reasoning_effort = reasoningEffort;
            }

            const sendRequest = async (body: Record<string, any>) => {
                const controller = new AbortController();
                if (options?.signal) {
                    if (options.signal.aborted) {
                        controller.abort();
                    } else {
                        const onAbort = () => controller.abort();
                        options.signal.addEventListener('abort', onAbort, { once: true });
                    }
                }
                const timeout = setTimeout(() => controller.abort(), 45000);
                try {
                    return await safeFetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                            'Accept': 'text/event-stream'
                        },
                        body: JSON.stringify(body),
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeout);
                }
            };

            let response = await sendRequest(payload);

            if (!response.ok) {
                const errText = await response.text();
                if (useReasoningEffort && /reasoning_effort|unrecognized|unknown/i.test(errText)) {
                    delete payload.reasoning_effort;
                    response = await sendRequest(payload);
                    if (!response.ok) {
                        const retryErr = await response.text();
                        throw new Error(`OpenAI API Error: ${response.status} - ${retryErr}`);
                    }
                } else {
                    throw new Error(`OpenAI API Error: ${response.status} - ${errText}`);
                }
            }

            let content = '';
            const contentType = response.headers.get('content-type') || '';

            if (response.body && contentType.includes('text/event-stream')) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let rawResponse = '';
                let doneReading = false;

                while (!doneReading) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    rawResponse += chunk;
                    const parsedChunk = parseSseChunk(buffer, chunk);
                    buffer = parsedChunk.buffer;

                    for (const event of parsedChunk.events) {
                        if (event === '[DONE]') {
                            doneReading = true;
                            break;
                        }
                        try {
                            const payload = JSON.parse(event);
                            const delta = payload.choices?.[0]?.delta?.content || '';
                            if (delta) {
                                content += delta;
                                if (onPartial) {
                                    if (isPhraseMode) {
                                        onPartial({
                                            type: 'dictionary',
                                            data: buildPartialDictionary(content, text)
                                        });
                                    } else {
                                        onPartial({ type: 'translation', text: content });
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[OpenAI] Failed to parse stream chunk', e);
                        }
                    }
                }
                if (!content && rawResponse.trim().startsWith('{')) {
                    try {
                        const data = JSON.parse(rawResponse);
                        content = data.choices?.[0]?.message?.content || content;
                    } catch (e) {
                        console.warn('[OpenAI] Failed to parse non-SSE response', e);
                    }
                }
            } else {
                const data = await response.json();
                content = data.choices?.[0]?.message?.content || '{}';
            }

            if (!isPhraseMode) {
                return { type: 'translation', text: content };
            }

            const parsed = JSON.parse(content || '{}');

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
                return { type: 'translation', text: parsed.text };
            }
        } catch (e) {
            if (e instanceof Error && /abort|cancel/i.test(e.name + e.message)) {
                return { type: 'translation', text: '' };
            }
            console.error("OpenAI Error", e);
            return { type: 'translation', text: "Error calling OpenAI." };
        }
    }

    async speak(text: string, _language?: string): Promise<ArrayBuffer | null> {
        try {
            const url = 'https://api.openai.com/v1/audio/speech';
            // Load settings from localStorage
            const storedApiKey = await getSecureValue('openai_api_key');
            const apiKey = storedApiKey || this.apiKey;

            const response = await safeFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini-tts",
                    input: text,
                    voice: "nova"
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenAI TTS Error: ${response.status} - ${errText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('audio')) {
                const errText = await response.text();
                throw new Error(`OpenAI TTS Unexpected Content-Type: ${contentType} - ${errText}`);
            }

            return await response.arrayBuffer();
        } catch (e) {
            console.error("OpenAI TTS Error", e);
            return null;
        }
    }
}

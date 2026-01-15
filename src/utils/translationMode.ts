const CJK_REGEX = /[\u4E00-\u9FFF]/g;
const SENTENCE_PUNCT_REGEX = /[.!?。！？…]/;
const CLAUSE_PUNCT_REGEX = /[,;，；:：]/;

export const isDictionaryMode = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return true;

    if (trimmed.includes('\n')) return false;

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const cjkCount = (trimmed.match(CJK_REGEX) || []).length;
    const totalLen = trimmed.length;
    const hasSentencePunct = SENTENCE_PUNCT_REGEX.test(trimmed);
    const hasClausePunct = CLAUSE_PUNCT_REGEX.test(trimmed);

    if (wordCount > 12 || cjkCount > 20 || totalLen > 60) return false;
    if ((hasSentencePunct || hasClausePunct) && (wordCount > 4 || cjkCount > 6 || totalLen > 18)) return false;

    return true;
};

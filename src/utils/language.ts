const CJK_REGEX = /[\u4E00-\u9FFF]/;
const HIRAGANA_KATAKANA_REGEX = /[\u3040-\u30FF]/;
const HANGUL_REGEX = /[\uAC00-\uD7AF]/;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const THAI_REGEX = /[\u0E00-\u0E7F]/;
const VIETNAMESE_REGEX = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/;

const DEFAULT_LOCALE_BY_LANG: Record<string, string> = {
    en: 'en-us',
    en_sg: 'en-sg',
    zh: 'zh-cn',
    ja: 'ja-jp',
    ko: 'ko-kr',
    fr: 'fr-fr',
    es: 'es-es',
    de: 'de-de',
    ru: 'ru-ru',
    th: 'th-th',
    vi: 'vi-vn',
    ms: 'ms-my',
    id: 'id-id',
    fil: 'fil-ph',
    pt: 'pt-br',
    it: 'it-it',
    ar: 'ar-sa',
    hi: 'hi-in',
    tr: 'tr-tr',
    nl: 'nl-nl',
    sv: 'sv-se',
    pl: 'pl-pl',
    cs: 'cs-cz',
    el: 'el-gr',
    he: 'he-il',
    ta: 'ta-in',
    uk: 'uk-ua',
    nan: 'zh-tw',
};

export const normalizeLangCode = (lang?: string): string => {
    if (!lang) return DEFAULT_LOCALE_BY_LANG.en;
    const lower = lang.toLowerCase();
    if (lower === 'auto') return 'auto';
    if (lower === 'en-sg') return 'en-sg';
    const base = lower.split('-')[0];
    if (base === 'nan') return DEFAULT_LOCALE_BY_LANG.nan;
    if (lower.includes('-')) return lower;
    return DEFAULT_LOCALE_BY_LANG[base] || base;
};

export const detectLanguageFromText = (text: string): string => {
    if (CJK_REGEX.test(text)) return 'zh';
    if (HIRAGANA_KATAKANA_REGEX.test(text)) return 'ja';
    if (HANGUL_REGEX.test(text)) return 'ko';
    if (CYRILLIC_REGEX.test(text)) return 'ru';
    if (THAI_REGEX.test(text)) return 'th';
    if (VIETNAMESE_REGEX.test(text)) return 'vi';
    return 'en';
};

export const resolveSpeechLanguage = (text: string, lang?: string): string => {
    const normalized = normalizeLangCode(lang);
    if (normalized !== 'auto') return normalized;
    const detected = detectLanguageFromText(text);
    return DEFAULT_LOCALE_BY_LANG[detected] || detected;
};

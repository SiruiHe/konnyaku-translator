export type LanguageOption = {
    code: string;
    name: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en-US', name: 'English' },
    { code: 'en-SG', name: 'English (Singapore)' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'zh-HK', name: 'Cantonese (Hong Kong)' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'fr-FR', name: 'French' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'de-DE', name: 'German' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'th-TH', name: 'Thai' },
    { code: 'vi-VN', name: 'Vietnamese' },
    { code: 'ms-MY', name: 'Malay' },
    { code: 'id-ID', name: 'Indonesian' },
    { code: 'fil-PH', name: 'Filipino' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ar-SA', name: 'Arabic' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'tr-TR', name: 'Turkish' },
    { code: 'nl-NL', name: 'Dutch' },
    { code: 'sv-SE', name: 'Swedish' },
    { code: 'pl-PL', name: 'Polish' },
    { code: 'cs-CZ', name: 'Czech' },
    { code: 'el-GR', name: 'Greek' },
    { code: 'he-IL', name: 'Hebrew' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'nan', name: 'Min Nan (Taiwanese)' },
    { code: 'lo-LA', name: 'Lao' },
    { code: 'km-KH', name: 'Khmer' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'uk-UA', name: 'Ukrainian' },
];

const LABELS = new Map(LANGUAGE_OPTIONS.map((item) => [item.code.toLowerCase(), item.name]));

export const getLanguageLabel = (code: string): string => {
    return LABELS.get(code.toLowerCase()) || code;
};

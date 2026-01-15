import React from 'react';
import '../App.css';
import { LANGUAGE_OPTIONS } from '../utils/languageOptions';

interface Props {
    targetLang: string;
    onTargetLangChange: (lang: string) => void;
}

const ActionToolbar: React.FC<Props> = ({ targetLang, onTargetLangChange }) => {
    return (
        <div className="action-toolbar">
            <div className="left-actions">
                <select
                    value={targetLang}
                    onChange={(e) => onTargetLangChange(e.target.value)}
                    className="lang-select"
                >
                    {LANGUAGE_OPTIONS.filter((item) => item.code !== 'auto').map((item) => (
                        <option key={item.code} value={item.code}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="right-actions">
                <button className="btn-icon" title="Copy to Clipboard">
                    📋
                </button>
                <button className="btn-icon" title="Play Pronunciation">
                    🔊
                </button>
            </div>
        </div>
    );
};

export default ActionToolbar;

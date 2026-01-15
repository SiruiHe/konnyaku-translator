import React, { useRef, useEffect } from 'react';
import '../App.css';

interface Props {
    value: string;
    onChange: (value: string) => void;
}

const TranslationInput: React.FC<Props> = ({ value, onChange }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <div className="input-section glass-panel">
            <textarea
                ref={textareaRef}
                className="translation-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter text to translate..."
                autoFocus
            />
        </div>
    );
};

export default TranslationInput;

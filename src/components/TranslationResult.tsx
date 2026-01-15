import React from 'react';
import '../App.css';

interface Props {
    input: string;
    targetLang: string;
}

const TranslationResult: React.FC<Props> = ({ input }) => {
    // Placeholder for actual translation logic
    return (
        <div className="result-section glass-panel">
            {input ? (
                <div className="result-placeholder">
                    <p className="placeholder-text">Translation will appear here...</p>
                    {/* Future: Render Markdown or Text */}
                </div>
            ) : (
                <div className="result-empty">
                    <span className="icon">✨</span>
                </div>
            )}
        </div>
    );
};

export default TranslationResult;

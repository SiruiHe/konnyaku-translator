import React from 'react';
import '../App.css';

const Footer: React.FC = () => {
    return (
        <footer className="app-footer">
            <div className="footer-status">
                <span className="status-dot online"></span>
                <span>Powered by Gemini 3 Flash</span>
            </div>
            <div className="footer-info">
                v0.1.0-alpha
            </div>
        </footer>
    );
};

export default Footer;

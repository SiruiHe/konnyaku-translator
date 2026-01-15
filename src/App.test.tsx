import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
    it('renders translation input', () => {
        render(<App />);
        const textarea = screen.getByPlaceholderText(/Type something\.\.\./i);
        expect(textarea).toBeInTheDocument();
    });
});

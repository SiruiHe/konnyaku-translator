import { parseSseChunk } from './streaming';

describe('parseSseChunk', () => {
    it('parses complete events', () => {
        const result = parseSseChunk('', 'data: {"a":1}\n\n');
        expect(result.events).toEqual(['{"a":1}']);
        expect(result.buffer).toBe('');
    });

    it('buffers partial events across chunks', () => {
        let state = parseSseChunk('', 'data: {"b":');
        expect(state.events).toEqual([]);

        state = parseSseChunk(state.buffer, '2}\n\n');
        expect(state.events).toEqual(['{"b":2}']);
        expect(state.buffer).toBe('');
    });

    it('ignores non-data lines', () => {
        const result = parseSseChunk('', 'event: message\ndata: hello\n\n');
        expect(result.events).toEqual(['hello']);
    });
});

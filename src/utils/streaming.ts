export const parseSseChunk = (buffer: string, chunk: string): { events: string[]; buffer: string } => {
    const combined = (buffer + chunk).replace(/\r\n/g, '\n');
    const events: string[] = [];
    let cursor = 0;

    while (true) {
        const idx = combined.indexOf('\n\n', cursor);
        if (idx === -1) break;
        const rawEvent = combined.slice(cursor, idx);
        cursor = idx + 2;

        const lines = rawEvent.split('\n');
        for (const line of lines) {
            if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                if (data) events.push(data);
            }
        }
    }

    return { events, buffer: combined.slice(cursor) };
};

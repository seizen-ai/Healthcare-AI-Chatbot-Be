const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export const chunkText = (text, source) => {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];
    let i = 0;
    let chunkIndex = 0;

    while (i < words.length) {
        chunks.push({
            text: words.slice(i, i + CHUNK_SIZE).join(' '),
            source,
            chunkIndex: chunkIndex++,
        });
        i += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    return chunks;
};

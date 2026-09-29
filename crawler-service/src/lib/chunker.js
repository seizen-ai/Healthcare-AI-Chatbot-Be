const CHUNK_TARGET = 900;
const CHUNK_OVERLAP = 100;

const splitSentences = (text) => {
    return text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
};

export const chunkText = (text, source) => {
    const sentences = splitSentences(text);
    const chunks = [];
    let current = '';
    let chunkIndex = 0;
    let sentenceIdx = 0;
    let overlapStart = 0;

    while (sentenceIdx < sentences.length) {
        const sentence = sentences[sentenceIdx].trim();
        if (!sentence) { sentenceIdx++; continue; }

        if (current.length + sentence.length + 1 <= CHUNK_TARGET + 200) {
            current += (current ? ' ' : '') + sentence;
            sentenceIdx++;
        } else {
            if (current) {
                chunks.push({ text: current, source, chunkIndex: chunkIndex++ });
            }
            const overlapText = current.slice(-CHUNK_OVERLAP);
            current = overlapText ? overlapText + ' ' + sentence : sentence;
            sentenceIdx++;
        }
    }

    if (current.trim()) {
        chunks.push({ text: current.trim(), source, chunkIndex: chunkIndex++ });
    }

    return chunks;
};

import { FlagEmbedding, EmbeddingModel } from 'fastembed';

console.log('[Model] Downloading BGE-small-en-v1.5...');

await FlagEmbedding.init({
    model: EmbeddingModel.BGESmallENV15,
    cacheDir: '/root/.cache/fastembed',
});

console.log('[Model] BGE-small-en-v1.5 ready.');
process.exit(0);

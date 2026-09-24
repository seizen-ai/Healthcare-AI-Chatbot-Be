import { EmbeddingModel, FlagEmbedding } from 'fastembed';
import os from 'os';
import path from 'path';

export const VECTOR_SIZE = 384;
const EMBED_BATCH_SIZE = 32;

const FASTEMBED_CACHE_DIR = process.env.NODE_ENV === 'production'
    ? '/root/.cache/fastembed'
    : path.join(os.tmpdir(), 'fastembed_cache');

let embeddingModel = null;

const getEmbeddingModel = async () => {
    if (!embeddingModel) {
        console.log(`[Fastembed] Loading model (cacheDir: ${FASTEMBED_CACHE_DIR})...`);
        embeddingModel = await FlagEmbedding.init({
            model: EmbeddingModel.BGESmallENV15,
            cacheDir: FASTEMBED_CACHE_DIR,
        });
        console.log(`[Fastembed] Model loaded. RSS: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    }
    return embeddingModel;
};

export const warmupEmbeddingModel = async () => {
    try {
        await getEmbeddingModel();
        console.log('[Fastembed] Model pre-warmed successfully.');
    } catch (err) {
        console.error('[Fastembed] Model warmup failed:', err.message);
    }
};

export const generateEmbeddings = async (chunks) => {
    const model = await getEmbeddingModel();
    const texts = chunks.map((c) => c.text);
    const results = [];
    let idx = 0;

    for await (const batch of model.embed(texts, EMBED_BATCH_SIZE)) {
        for (const vector of batch) {
            results.push({
                ...chunks[idx],
                embedding: Array.from(vector),
            });
            idx++;
        }
    }

    console.log(`[Fastembed] Generated ${results.length} embedding(s).`);
    return results;
};

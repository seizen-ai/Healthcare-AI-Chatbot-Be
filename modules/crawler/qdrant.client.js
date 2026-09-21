import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
    host: process.env.QDRANT_HOST || 'localhost',
    port: parseInt(process.env.QDRANT_PORT || '6333'),
});

/**
 * Ensures a Qdrant collection exists. Creates it if not.
 * Collection name = hospital publicKey (one collection per hospital).
 *
 * @param {string} collectionName
 * @param {number} vectorSize - dimensionality of the embedding (3072 for text-embedding-3-large, 1536 for small)
 */
export const ensureCollection = async (collectionName, vectorSize = 3072) => {
    try {
        const { result: exists } = await qdrantClient.collectionExists(collectionName);
        if (exists) {
            console.log(`[Qdrant] Collection "${collectionName}" already exists.`);
            return;
        }
    } catch (_) {
        // collectionExists may throw on some versions — treat as non-existent
    }

    await qdrantClient.createCollection(collectionName, {
        vectors: {
            size: vectorSize,
            distance: 'Cosine',
        },
        optimizers_config: {
            default_segment_number: 2,
        },
        replication_factor: 1,
    });

    console.log(`[Qdrant] Collection "${collectionName}" created (dims=${vectorSize}).`);
};

/**
 * Batch-upserts points into a Qdrant collection.
 *
 * @param {string} collectionName
 * @param {Array<{ id: string|number, vector: number[], payload: object }>} points
 */
export const upsertPoints = async (collectionName, points) => {
    if (!points.length) return;

    await qdrantClient.upsert(collectionName, {
        wait: true,
        points,
    });

    console.log(`[Qdrant] Upserted ${points.length} point(s) into "${collectionName}".`);
};

export default qdrantClient;

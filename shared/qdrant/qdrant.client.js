import { QdrantClient } from '@qdrant/js-client-rest';
import { createHash } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

const qdrantConfig = isProduction
    ? {
        url: process.env.PROD_QDRANT_URL,
        apiKey: process.env.PROD_QDRANT_API_KEY || undefined,
        checkCompatibility: false,
    }
    : {
        host: process.env.DEV_QDRANT_HOST || 'qdrant',
        port: parseInt(process.env.DEV_QDRANT_PORT || '6333', 10),
        checkCompatibility: false,
    };

const qdrantClient = new QdrantClient(qdrantConfig);

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'hospital_knowledge';

export const ensureCollection = async (vectorSize) => {
    try {
        const { result: exists } = await qdrantClient.collectionExists(COLLECTION_NAME);
        if (exists) return;
    } catch (_) { }

    await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: { size: vectorSize, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 },
        replication_factor: 1,
    });

    await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'hospitalId',
        field_schema: 'keyword',
    });

    console.log(`[Qdrant] Collection "${COLLECTION_NAME}" created (dims=${vectorSize}).`);
};

export const deletePointsByHospital = async (hospitalId) => {
    try {
        await qdrantClient.delete(COLLECTION_NAME, {
            filter: {
                must: [{ key: 'hospitalId', match: { value: hospitalId } }],
            },
        });
        console.log(`[Qdrant] Deleted old points for hospital ${hospitalId}.`);
    } catch (err) {
        console.warn(`[Qdrant] deletePointsByHospital warning: ${err.message}`);
    }
};

export const deterministicPointId = (hospitalId, source, chunkIndex) => {
    const hash = createHash('sha256')
        .update(`${hospitalId}:${source}:${chunkIndex}`)
        .digest('hex');
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        '4' + hash.slice(13, 16),
        '8' + hash.slice(17, 20),
        hash.slice(20, 32),
    ].join('-');
};

export const upsertEmbeddedChunks = async (hospitalId, embeddedChunks) => {
    const BATCH_SIZE = 100;

    const points = embeddedChunks.map((chunk) => ({
        id: deterministicPointId(hospitalId, chunk.source, chunk.chunkIndex),
        vector: chunk.embedding,
        payload: {
            hospitalId,
            source: chunk.source,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
        },
    }));

    for (let i = 0; i < points.length; i += BATCH_SIZE) {
        const batch = points.slice(i, i + BATCH_SIZE);
        await qdrantClient.upsert(COLLECTION_NAME, { wait: true, points: batch });
    }

    console.log(`[Qdrant] Upserted ${points.length} point(s) for hospital ${hospitalId}.`);
    return points.length;
};

export default qdrantClient;

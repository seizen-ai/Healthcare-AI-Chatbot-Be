import { QdrantClient } from '@qdrant/js-client-rest';
import qdrantConfig from './qdrant.config.js';

const qdrantClient = new QdrantClient(qdrantConfig);


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


export const upsertPoints = async (collectionName, points) => {
    if (!points.length) return;

    await qdrantClient.upsert(collectionName, {
        wait: true,
        points,
    });

    console.log(`[Qdrant] Upserted ${points.length} point(s) into "${collectionName}".`);
};

export default qdrantClient;

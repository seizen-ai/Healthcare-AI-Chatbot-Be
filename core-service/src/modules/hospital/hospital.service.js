import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../utils/AppError.js';
import hospitalRepository from './hospital.repository.js';
import { cacheService } from '../../../../shared/redis/index.js';
import kafkaProducer from '../../../../shared/kafka/producer/kafka.producer.js';
import { KAFKA_TOPICS } from '../../../../shared/kafka/topics/kafka.topics.js';

const toSlug = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 180);

const generateUniqueSlug = async (base, maxAttempts = 5) => {
    for (let i = 0; i < maxAttempts; i++) {
        const candidate = i === 0 ? base : `${base}-${randomBytes(3).toString('hex')}`;
        const taken = await hospitalRepository.slugExists(candidate);
        if (!taken) return candidate;
    }
    throw new AppError('Could not generate a unique hospital slug. Please try again.', 500);
};

const generatePublicKey = () => randomBytes(16).toString('hex');

const PRIVATE_PATTERNS = [
    /^(10\.)/,
    /^(172\.(1[6-9]|2\d|3[01])\.)/,
    /^(192\.168\.)/,
    /^(127\.)/,
    /^(0\.)/,
    /^(169\.254\.)/,
    /^(::1|fc|fd|fe80)/i,
];

const BLOCKED_HOSTNAMES = [
    'localhost',
    'metadata.google.internal',
    'metadata.google',
    '169.254.169.254',
];

const isUrlSafe = (urlString) => {
    try {
        const parsed = new URL(urlString);
        const hostname = parsed.hostname.toLowerCase();

        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        if (BLOCKED_HOSTNAMES.includes(hostname)) return false;
        if (PRIVATE_PATTERNS.some((re) => re.test(hostname))) return false;

        return true;
    } catch {
        return false;
    }
};

class HospitalService {
    async createHospital(data, ownerId, idempotencyKey) {
        const slug = await generateUniqueSlug(toSlug(data.name));
        const publicKey = generatePublicKey();

        const hospital = await hospitalRepository.createHospital({
            ...data,
            ownerId,
            slug,
            publicKey,
        });

        const listCacheKey = `hospitals:user:${ownerId}`;
        await cacheService.delete(listCacheKey);

        const itemCacheKey = `hospital:${hospital._id}`;
        await cacheService.set(itemCacheKey, hospital, { ttlSeconds: 300 });
        await cacheService.set(`req-status:${ownerId}:${idempotencyKey}`, 'COMPLETED', { keepTtl: true });
        await cacheService.set(`req-response:${ownerId}:${idempotencyKey}`, { payload: hospital, statusCode: 201 }, { ttlSeconds: 24 * 60 * 60 });

        return hospital;
    }

    async getHospitals(userId, cursor, limit) {
        const listCacheKey = `hospitals:user:${userId}:${cursor}:${limit}`;

        const query = {
            ownerId: userId,
            isDeleted: false
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const hospitals = await hospitalRepository.getPaginatedHospitals(query, -1, limit + 1);
        if (!hospitals) throw new AppError('Hospitals Not Found', 404);

        const nextCursor = hospitals.length == limit + 1 ? hospitals[hospitals.length - 2]._id : null;

        if (hospitals.length == limit + 1) {
            hospitals.pop();
        }

        const result = { data: hospitals, nextCursor };
        await cacheService.set(listCacheKey, result, 300);
        return result;
    }

    async deleteHospital(hospitalId, ownerId) {
        const result = await hospitalRepository.softDeleteHospital({ _id: hospitalId, isDeleted: false, ownerId });
        if (!result) throw new AppError('Hospital Not Found', 404);

        await cacheService.delete(`hospitals:user:${ownerId}`);
        await cacheService.delete(`hospital:${hospitalId}`);

        return {
            success: true,
            message: "Hospital Deleted Successfully",
        };
    }

    async activateBot(hospitalId, hospital, body) {
        if (hospital.onboarding?.step === 'knowledge_processing') {
            throw new AppError('Bot activation is already in progress. Please wait.', 409);
        }

        const { type } = body;
        const eventId = uuidv4();
        const requestedAt = new Date().toISOString();

        let event;

        if (type === 'website_crawl') {
            const { websiteUrl } = body;

            if (!isUrlSafe(websiteUrl)) {
                throw new AppError('The provided website URL is not allowed (private/internal address).', 400);
            }

            event = {
                eventId,
                hospitalId: hospitalId.toString(),
                type,
                websiteUrl,
                documents: null,
                requestedAt,
            };
        } else if (type === 'document_crawl') {
            const documents = body.documents.map(({ fileRef, fileName, mimeType }) => ({
                fileRef,
                fileName,
                mimeType,
            }));

            event = {
                eventId,
                hospitalId: hospitalId.toString(),
                type,
                websiteUrl: null,
                documents,
                requestedAt,
            };
        }

        await hospitalRepository.setBotActivationInProgress(hospitalId, {
            eventId,
            type,
            requestedAt,
        });

        await cacheService.delete(`hospital:${hospitalId}`);//Delete stale data from the redis

        await kafkaProducer.publish(KAFKA_TOPICS.KNOWLEDGE_CRAWLER, event);

        return {
            success: true,
            hospitalId: hospitalId.toString(),
            status: 'IN_PROGRESS',
            message: 'Bot activation started. Knowledge base is being built, this may take a few minutes.',
        };
    }
}

export default new HospitalService();

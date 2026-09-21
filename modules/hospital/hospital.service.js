import { randomBytes } from 'crypto';
import { AppError } from '../../utils/AppError.js';
import hospitalRepository from './hospital.repository.js';
import { cacheService } from '../../redis/index.js';
import kafkaProducer from '../../kafka/producer/kafka.producer.js';
import { KAFKA_TOPICS } from '../../kafka/topics/kafka.topics.js';


const toSlug = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')   // strip non-word chars
        .replace(/[\s_]+/g, '-')    // spaces → hyphens
        .replace(/-+/g, '-')        // collapse consecutive hyphens
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

        // Invalidate hospitals list cache for the owner
        const listCacheKey = `hospitals:user:${ownerId}`;
        await cacheService.delete(listCacheKey);

        const itemCacheKey = `hospital:${hospital._id}`;
        await cacheService.set(itemCacheKey, hospital, { ttlSeconds: 300 });
        await cacheService.set(`req-status:${ownerId}:${idempotencyKey}`, 'COMPLETED', { keepTtl: true });
        await cacheService.set(`req-response:${ownerId}:${idempotencyKey}`, { payload: hospital, statusCode: 201 }, { ttlSeconds: 24 * 60 * 60 });

        return hospital;
    }

    // async getHospitalById(hospitalId, userId) {
    //     const hospital = await hospitalRepository.getHospital({
    //         _id: hospitalId,
    //         ownerId: userId,
    //     });

    //     if (!hospital) throw new AppError('Hospital not found', 404);

    //     return hospital;
    // }

    async getHospitals(userId, cursor, limit) {
        const listCacheKey = `hospitals:user:${userId}:${cursor}:${limit}`;
        // const cached = await cacheService.get(listCacheKey);
        // if (cached) return cached;//Optimization

        const query = {
            ownerId: userId,
            isDeleted: false
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        console.log(query);

        const hospitals = await hospitalRepository.getPaginatedHospitals(query, -1, limit + 1);
        if (!hospitals) throw new AppError('Hospitals Not Found', 404);

        const nextCursor = hospitals.length == limit + 1 ? hospitals[hospitals.length - 2]._id : null;

        if (hospitals.length == limit + 1) {//Important check
            hospitals.pop(); //remove extra element
        }

        const result = {
            data: hospitals,
            nextCursor
        }
        await cacheService.set(listCacheKey, result, 300);
        return result;
    }

    async deleteHospital(hospitalId, ownerId) {
        const result = await hospitalRepository.softDeleteHospital({ _id: hospitalId, isDeleted: false, ownerId });
        if (!result) throw new AppError('Hospital Not Found', 404);

        // Invalidate caches
        const listCacheKey = `hospitals:user:${ownerId}`;
        const itemCacheKey = `hospital:${hospitalId}`;
        await cacheService.delete(listCacheKey);
        await cacheService.delete(itemCacheKey);

        return {
            success: true,
            message: "Hospital Deleted Successfully",
        };
    }


    async activateBot(hospitalId, hospital) {
        // Guard: already active or crawl already in progress
        if (hospital.status === 'active') {
            throw new AppError('Bot is already active for this hospital.', 409);
        }

        if (hospital.onboarding?.step === 'knowledge_processing') {
            throw new AppError('Bot activation is already in progress. Please wait.', 409);
        }

        if (!hospital.website?.url) {
            throw new AppError('Hospital website URL is not set. Please add a website before activating the bot.', 400);
        }

        // Mark as processing immediately so the dashboard can reflect the state
        await hospitalRepository.updateOnboardingStep(hospitalId, 'knowledge_processing');

        // Invalidate cache so next fetch reflects the new step
        await cacheService.delete(`hospital:${hospitalId}`);

        // Publish the crawl job to Kafka — the crawler service handles the rest
        await kafkaProducer.publish(KAFKA_TOPICS.WEBSITE_CRAWL, {
            hospitalId: hospitalId.toString(),
            websiteUrl: hospital.website.url,
            publicKey: hospital.publicKey,
            hospitalName: hospital.name,
        });

        return {
            success: true,
            message: 'Bot activation started. Knowledge base is being built, this may take a few minutes.',
            onboardingStep: 'knowledge_processing',
        };
    }

}

export default new HospitalService();

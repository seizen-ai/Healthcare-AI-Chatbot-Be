import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../utils/AppError.js';
import chatbotRepository from './chatbot.repository.js';
import { cacheService } from '../../../../shared/redis/index.js';
import kafkaProducer from '../../../../shared/kafka/producer/kafka.producer.js';
import { KAFKA_TOPICS } from '../../../../shared/kafka/topics/kafka.topics.js';
import knowledgeDocFileRepository from '../upload/knowledgeDocFile.repository.js';

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
        const taken = await chatbotRepository.slugExists(candidate);
        if (!taken) return candidate;
    }
    throw new AppError('Could not generate a unique chatbot slug. Please try again.', 500);
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

class ChatbotService {
    async createChatbot(data, ownerId, idempotencyKey) {
        const slug = await generateUniqueSlug(toSlug(data.name));
        const publicKey = generatePublicKey();

        const chatbot = await chatbotRepository.createChatbot({
            ...data,
            ownerId,
            slug,
            publicKey,
        });

        const listCacheKey = `chatbots:user:${ownerId}`;
        await cacheService.delete(listCacheKey);

        const itemCacheKey = `chatbot:${chatbot._id}`;
        await cacheService.set(itemCacheKey, chatbot, { ttlSeconds: 300 });
        await cacheService.set(`req-status:${ownerId}:${idempotencyKey}`, 'COMPLETED', { keepTtl: true });
        await cacheService.set(`req-response:${ownerId}:${idempotencyKey}`, { payload: chatbot, statusCode: 201 }, { ttlSeconds: 24 * 60 * 60 });

        return chatbot;
    }

    async getChatbots(userId, cursor, limit) {
        const listCacheKey = `chatbots:user:${userId}:${cursor}:${limit}`;

        const query = {
            ownerId: userId,
            isDeleted: false
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const chatbots = await chatbotRepository.getPaginatedChatbots(query, -1, limit + 1);
        if (!chatbots) throw new AppError('Chatbots Not Found', 404);

        const nextCursor = chatbots.length == limit + 1 ? chatbots[chatbots.length - 2]._id : null;

        if (chatbots.length == limit + 1) {
            chatbots.pop();
        }

        const result = { data: chatbots, nextCursor };
        await cacheService.set(listCacheKey, result, 300);
        return result;
    }

    async deleteChatbot(chatbotId, ownerId) {
        const result = await chatbotRepository.softDeleteChatbot({ _id: chatbotId, isDeleted: false, ownerId });
        if (!result) throw new AppError('Chatbot Not Found', 404);

        await cacheService.delete(`chatbots:user:${ownerId}`);
        await cacheService.delete(`chatbot:${chatbotId}`);

        return {
            success: true,
            message: "Chatbot Deleted Successfully",
        };
    }

    async activateBot(chatbotId, chatbot, body) {
        if (chatbot.onboarding?.step === 'knowledge_processing') {
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
                chatbotId: chatbotId.toString(),
                type,
                websiteUrl,
                documents: null,
                requestedAt,
            };
        } else if (type === 'document_crawl') {
            const requestedRefs = body.documents.map((d) => d.fileRef);

            const dbDocs = await knowledgeDocFileRepository.findByFileRefsAndChatbot(
                requestedRefs,
                chatbotId
            );

            if (dbDocs.length === 0) {
                throw new AppError('No valid uploaded documents found for the provided file references.', 400);
            }

            const docIds = dbDocs.map((d) => d._id);
            await knowledgeDocFileRepository.bulkSetStatus(docIds, 'PROCESSING');

            const documents = dbDocs.map((d) => ({
                fileRef: d.fileRef,
                fileName: d.fileName,
                mimeType: d.mimeType,
            }));

            event = {
                eventId,
                chatbotId: chatbotId.toString(),
                type,
                websiteUrl: null,
                documents,
                requestedAt,
            };
        }

        await chatbotRepository.setBotActivationInProgress(chatbotId, {
            eventId,
            type,
            requestedAt,
        });

        await cacheService.delete(`chatbot:${chatbotId}`);

        await kafkaProducer.publish(KAFKA_TOPICS.KNOWLEDGE_CRAWLER, event);

        return {
            success: true,
            chatbotId: chatbotId.toString(),
            status: 'IN_PROGRESS',
            message: 'Bot activation started. Knowledge base is being built, this may take a few minutes.',
        };
    }

}

export default new ChatbotService();

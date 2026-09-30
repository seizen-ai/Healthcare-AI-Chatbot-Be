import { catchAsync } from "../utils/CatchAsync.js";
import chatbotRepository from "../modules/chatbot/chatbot.repository.js";
import { AppError } from "../utils/AppError.js";
import { cacheService } from '../../../shared/redis/index.js';

export const checkChatbotOwnerShip = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const chatbotId = req.params.chatbotId;

    const itemCacheKey = `chatbot:${chatbotId}`;
    const cached = await cacheService.get(itemCacheKey);

    if (cached && cached.ownerId === userId) {
        req.chatbot = cached;
        return next();
    } else if (cached) {
        throw new AppError('Chatbot Not Found or Unauthorized', 404);
    }

    const chatbot = await chatbotRepository.getChatbot({
        ownerId: userId,
        _id: chatbotId,
        isDeleted: false
    });

    if (!chatbot) {
        throw new AppError('Chatbot Not Found or Unauthorized', 404);
    }

    await cacheService.set(itemCacheKey, chatbot);

    req.chatbot = chatbot;
    return next();
});

export const handleRace = catchAsync(async (req, res, next) => {
    const idempotencyKey = req.headers.idempotencykey || req.headers['x-idempotency-key'];
    const userId = req.user.id;

    if (!idempotencyKey) {
        throw new AppError('Idempotency key is required', 400);
    }

    req.idempotencyKey = idempotencyKey;

    const cached = await cacheService.setnx(`req-status:${userId}:${idempotencyKey}`, 'PROCESSING', 24 * 60 * 60);
    if (!cached) {
        const cacheStatus = await cacheService.get(`req-status:${userId}:${idempotencyKey}`);
        if (cacheStatus === 'COMPLETED') {
            const data = await cacheService.get(`req-response:${userId}:${idempotencyKey}`);
            return res.status(data.statusCode).json({
                success: true,
                data: data.payload
            });
        }
        throw new AppError('Request already processing', 409);
    }

    next();
});

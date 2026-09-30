import chatbotService from './chatbot.service.js';
import { catchAsync } from '../../utils/CatchAsync.js';
import { streamingUploadHandler } from '../upload/upload.handler.js';

export const getChatbotById = catchAsync(async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Chatbot Fetched Successfully",
        data: req.chatbot
    });
});

export const createChatbot = catchAsync(async (req, res) => {
    const result = await chatbotService.createChatbot(req.body, req.user.id, req.headers.idempotencyKey);
    return res.status(201).json(result);
});

export const getChatbots = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const result = await chatbotService.getChatbots(req.user.id, req.query.cursor, limit);
    return res.status(200).json(result);
});

export const deleteChatbot = catchAsync(async (req, res) => {
    const result = await chatbotService.deleteChatbot(req.params.chatbotId, req.user.id);
    return res.status(200).json(result);
});

export const activateBot = catchAsync(async (req, res) => {
    const result = await chatbotService.activateBot(
        req.params.chatbotId,
        req.chatbot,
        req.body
    );
    return res.status(202).json(result);
});

export const uploadKnowledgeDocs = streamingUploadHandler;

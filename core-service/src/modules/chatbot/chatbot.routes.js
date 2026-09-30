import express from 'express';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { inputValidation } from '../../middlewares/ValidationMiddleware.js';
import { getChatbotById, createChatbot, getChatbots, deleteChatbot, activateBot, uploadKnowledgeDocs } from './chatbot.controller.js';
import { createChatbotSchema, activateBotSchema } from './chatbot.validator.js';
import { checkChatbotOwnerShip, handleRace } from '../../middlewares/chatbotModule.js';

const router = express.Router();

router.post('/create-chatbot', verifyToken, inputValidation(createChatbotSchema), handleRace, createChatbot);
router.get('/get-chatbot/:chatbotId', verifyToken, checkChatbotOwnerShip, getChatbotById);
router.get('/get-chatbots', verifyToken, getChatbots);
router.delete('/delete-chatbot/:chatbotId', verifyToken, deleteChatbot);
router.post('/:chatbotId/activate', verifyToken, checkChatbotOwnerShip, inputValidation(activateBotSchema), activateBot);
router.post('/:chatbotId/file/upload', verifyToken, checkChatbotOwnerShip, uploadKnowledgeDocs);

export default router;

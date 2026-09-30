import { Chatbot } from './chatbot.model.js';

class chatbotRepository {
    getChatbot(query) {
        return Chatbot.findOne(query);
    }

    getChatbots(query, sortingOrder, limit) {
        return Chatbot.find(query).sort({ _id: sortingOrder }).limit(limit);
    }

    getPaginatedChatbots(query, sortingOrder, limit) {
        return Chatbot.find(query).sort({ _id: sortingOrder }).limit(limit);
    }

    createChatbot(data) {
        return Chatbot.create(data);
    }

    slugExists(slug) {
        return Chatbot.exists({ slug });
    }

    softDeleteChatbot(query) {
        return Chatbot.findByIdAndUpdate(query, { isDeleted: true, deletedAt: new Date() }, { new: true });
    }

    updateOnboardingStep(chatbotId, step, extra = {}) {
        return Chatbot.findByIdAndUpdate(
            chatbotId,
            { $set: { 'onboarding.step': step, ...extra } },
            { new: true }
        );
    }

    setBotActivationInProgress(chatbotId, { eventId, type, requestedAt }) {
        return Chatbot.findByIdAndUpdate(
            chatbotId,
            {
                $set: {
                    'onboarding.step': 'knowledge_processing',
                    'botActivation.eventId': eventId,
                    'botActivation.type': type,
                    'botActivation.requestedAt': requestedAt,
                    'botActivation.error': null,
                },
            },
            { new: true }
        );
    }

    setBotActivationSuccess(chatbotId, eventId) {
        return Chatbot.findOneAndUpdate(
            { _id: chatbotId, 'botActivation.eventId': eventId },
            {
                $set: {
                    'onboarding.step': 'knowledge_ready',
                    'onboarding.completedAt': new Date(),
                    'botActivation.activatedAt': new Date(),
                    'botActivation.error': null,
                    status: 'active',
                },
            },
            { new: true }
        );
    }

    setBotActivationFailed(chatbotId, eventId, errorMessage) {
        return Chatbot.findOneAndUpdate(
            { _id: chatbotId, 'botActivation.eventId': eventId },
            {
                $set: {
                    'onboarding.step': 'crawler_failed',
                    'botActivation.error': errorMessage,
                },
            },
            { new: true }
        );
    }

    findStaleActivations(cutoffDate) {
        return Chatbot.find({
            'onboarding.step': 'knowledge_processing',
            'botActivation.requestedAt': { $lt: cutoffDate },
        });
    }
}

export default new chatbotRepository();

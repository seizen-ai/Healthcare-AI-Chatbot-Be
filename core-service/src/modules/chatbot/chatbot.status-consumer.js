import KafkaConsumer from '../../../../shared/kafka/consumer/kafka.consumer.js';
import { KAFKA_TOPICS } from '../../../../shared/kafka/topics/kafka.topics.js';
import chatbotRepository from './chatbot.repository.js';
import { cacheService } from '../../../../shared/redis/index.js';
import { KnowledgeDocFile } from '../upload/knowledgeDocFile.model.js';

const statusConsumer = new KafkaConsumer(
    process.env.STATUS_CONSUMER_GROUP || 'knowledge-status-group'
);

const handleStatusEvent = async (payload) => {
    const { eventId, chatbotId, success, error: errorMessage } = payload;

    console.log(`[StatusConsumer] Received status for chatbot ${chatbotId} | eventId=${eventId} | success=${success}`);

    if (!eventId || !chatbotId) {
        console.warn('[StatusConsumer] Malformed status event, skipping.');
        return;
    }

    let updated;

    if (success) {
        updated = await chatbotRepository.setBotActivationSuccess(chatbotId, eventId);

        await KnowledgeDocFile.updateMany(
            { chatbotId, status: 'PROCESSING', isDeleted: false },
            { $set: { status: 'ACTIVE', errorMessage: null } }
        );
    } else {
        const errMsg = errorMessage || 'Unknown error during knowledge processing.';
        updated = await chatbotRepository.setBotActivationFailed(chatbotId, eventId, errMsg);

        await KnowledgeDocFile.updateMany(
            { chatbotId, status: 'PROCESSING', isDeleted: false },
            { $set: { status: 'FAILED', errorMessage: errMsg } }
        );
    }

    if (!updated) {
        console.warn(`[StatusConsumer] No update for chatbot ${chatbotId} (eventId mismatch or already processed).`);
        return;
    }

    await cacheService.delete(`chatbot:${chatbotId}`);

    console.log(`[StatusConsumer] Chatbot ${chatbotId} updated → step: ${updated.onboarding.step}, status: ${updated.status}`);
};

export const startStatusConsumer = async () => {
    await statusConsumer.subscribe(
        KAFKA_TOPICS.KNOWLEDGE_PROCESS_STATUS,
        handleStatusEvent
    );

    console.log('[StatusConsumer] Listening on topic:', KAFKA_TOPICS.KNOWLEDGE_PROCESS_STATUS);
};

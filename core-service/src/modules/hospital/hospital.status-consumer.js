import KafkaConsumer from '../../../../shared/kafka/consumer/kafka.consumer.js';
import { KAFKA_TOPICS } from '../../../../shared/kafka/topics/kafka.topics.js';
import hospitalRepository from './hospital.repository.js';
import { cacheService } from '../../../../shared/redis/index.js';

const statusConsumer = new KafkaConsumer(
    process.env.STATUS_CONSUMER_GROUP || 'knowledge-status-group'
);

const handleStatusEvent = async (payload) => {
    const { eventId, hospitalId, success, error: errorMessage } = payload;

    console.log(`[StatusConsumer] Received status for hospital ${hospitalId} | eventId=${eventId} | success=${success}`);

    if (!eventId || !hospitalId) {
        console.warn('[StatusConsumer] Malformed status event, skipping.');
        return;
    }

    let updated;

    if (success) {
        updated = await hospitalRepository.setBotActivationSuccess(hospitalId, eventId);
    } else {
        const errMsg = errorMessage || 'Unknown error during knowledge processing.';
        updated = await hospitalRepository.setBotActivationFailed(hospitalId, eventId, errMsg);
    }

    if (!updated) {
        console.warn(`[StatusConsumer] No update for hospital ${hospitalId} (eventId mismatch or already processed).`);
        return;
    }

    await cacheService.delete(`hospital:${hospitalId}`);

    console.log(`[StatusConsumer] Hospital ${hospitalId} updated → step: ${updated.onboarding.step}, status: ${updated.status}`);
};

export const startStatusConsumer = async () => {
    await statusConsumer.subscribe(
        KAFKA_TOPICS.KNOWLEDGE_PROCESS_STATUS,
        handleStatusEvent
    );

    console.log('[StatusConsumer] Listening on topic:', KAFKA_TOPICS.KNOWLEDGE_PROCESS_STATUS);
};

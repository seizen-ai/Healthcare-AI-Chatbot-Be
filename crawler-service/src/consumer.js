import KafkaConsumer from '../../shared/kafka/consumer/kafka.consumer.js';
import kafkaProducer from '../../shared/kafka/producer/kafka.producer.js';
import { TOPICS, CRAWL_TYPES } from '../../shared/events/index.js';
import { handleWebsiteCrawl } from './handlers/website-crawl.handler.js';
import { handleDocumentCrawl } from './handlers/document-crawl.handler.js';

const GROUP_ID = process.env.CRAWLER_CONSUMER_GROUP || 'crawler-service-group';
const consumer = new KafkaConsumer(GROUP_ID);

const publishStatus = async (event, success, stats = {}, error = null) => {
    const statusEvent = {
        eventId: event.eventId,
        hospitalId: event.hospitalId,
        type: event.type,
        success,
        error,
        stats: {
            pagesOrFiles: stats.pagesOrFiles || 0,
            chunks: stats.chunks || 0,
        },
        finishedAt: new Date().toISOString(),
    };

    await kafkaProducer.publish(TOPICS.KNOWLEDGE_PROCESS_STATUS, statusEvent);
    console.log(`[Consumer] Published status: success=${success} for hospital ${event.hospitalId}`);
};

const handleEvent = async (event) => {
    console.log(`[Consumer] Received event: type=${event.type}, hospitalId=${event.hospitalId}, eventId=${event.eventId}`);

    let stats = {};

    try {
        switch (event.type) {
            case CRAWL_TYPES.WEBSITE_CRAWL:
                stats = await handleWebsiteCrawl(event);
                break;
            case CRAWL_TYPES.DOCUMENT_CRAWL:
                stats = await handleDocumentCrawl(event);
                break;
            default:
                throw new Error(`Unknown event type: ${event.type}`);
        }

        await publishStatus(event, true, stats);
    } catch (err) {
        console.error(`[Consumer] Handler failed for hospital ${event.hospitalId}:`, err.message);
        await publishStatus(event, false, stats, err.message);
    }
};

export const startConsumer = async () => {
    await kafkaProducer.connect();
    
    await consumer.subscribe(
        TOPICS.KNOWLEDGE_CRAWLER,
        handleEvent
    );

    console.log(`[Consumer] Listening on topic: ${TOPICS.KNOWLEDGE_CRAWLER}`);
};

export const stopConsumer = async () => {
    if (consumer.consumer) {
        await consumer.consumer.disconnect();
    }
    await kafkaProducer.disconnect();
};

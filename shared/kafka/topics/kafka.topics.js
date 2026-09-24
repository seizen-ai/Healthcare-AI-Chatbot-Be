import { TOPICS } from '../../events/index.js';

export const KAFKA_TOPICS = {

    SEND_EMAIL: "notification.email.send",

    WEBSITE_CRAWL: "crawler.website.request",

    GENERATE_EMBEDDINGS: "embedding.generate",

    CHATBOT_ACTIVATED: "chatbot.activation.completed",

    // ─── Knowledge crawler event topics (shared contract) ───
    KNOWLEDGE_CRAWLER: TOPICS.KNOWLEDGE_CRAWLER,

    KNOWLEDGE_PROCESS_STATUS: TOPICS.KNOWLEDGE_PROCESS_STATUS,
};
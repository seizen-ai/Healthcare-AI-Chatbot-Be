import { startCrawlerConsumer } from './crawler.consumer.js';
import { warmupEmbeddingModel } from './crawler.service.js';

export const startCrawlerService = async () => {
    // Pre-load the embedding model so it's ready when a crawl request arrives
    await warmupEmbeddingModel();
    await startCrawlerConsumer();
    console.log('Crawler service started.');
};

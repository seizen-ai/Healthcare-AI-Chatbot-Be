import { startCrawlerConsumer } from './crawler.consumer.js';

export const startCrawlerService = async () => {
    await startCrawlerConsumer();
    console.log('Crawler service started.');
};

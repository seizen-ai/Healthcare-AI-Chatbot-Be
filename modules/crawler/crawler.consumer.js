import KafkaConsumer from '../../kafka/consumer/kafka.consumer.js';
import { KAFKA_TOPICS } from '../../kafka/topics/kafka.topics.js';
import crawlerService from './crawler.service.js';


const crawlerConsumer = new KafkaConsumer(
    process.env.CRAWLER_CONSUMER_GROUP || 'crawler-service-group'
);

export const startCrawlerConsumer = async () => {
    await crawlerConsumer.subscribe(
        KAFKA_TOPICS.WEBSITE_CRAWL,
        async (payload) => {
            console.log('[CrawlerConsumer] Received crawl request:', payload);
            await crawlerService.process(payload);
        }
    );

    console.log('[CrawlerConsumer] Listening on topic:', KAFKA_TOPICS.WEBSITE_CRAWL);
};

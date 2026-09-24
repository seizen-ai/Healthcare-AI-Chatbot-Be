import 'dotenv/config';
import express from 'express';
import { startConsumer, stopConsumer } from './src/consumer.js';
import { warmupEmbeddingModel } from './src/lib/embeddings.js';

const app = express();
const PORT = process.env.CRAWLER_PORT || 5001;

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'Crawler Service',
        version: '1.0.0',
        uptime: `${Math.floor(process.uptime())} seconds`,
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        timestamp: new Date().toISOString(),
    });
});

const start = async () => {
    try {
        console.log('[CrawlerService] Booting...');
        await warmupEmbeddingModel();
        await startConsumer();

        app.listen(PORT, () => {
            console.log(`[CrawlerService] Health endpoint on port ${PORT}`);
            console.log('[CrawlerService] Ready and listening for events.');
        });
    } catch (err) {
        console.error('[CrawlerService] Failed to start:', err);
        process.exit(1);
    }
};

const shutdown = async (signal) => {
    console.log(`[CrawlerService] ${signal} received. Shutting down...`);
    await stopConsumer().catch(() => {});
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

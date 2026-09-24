import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';
import 'dotenv/config';
import cookieParser from 'cookie-parser';

import { globalErrorHandler } from './src/middlewares/ErrorMiddleware.js';
import kafkaProducer from '../shared/kafka/producer/kafka.producer.js';
import { ensureKafkaTopics } from '../shared/kafka/admin/kafka.admin.js';
import { retryOperation } from '../shared/kafka/utils/kafka.retry.js';
import { startNotificationService } from './src/modules/notification/notification.bootstrap.js';
import { startKeepAliveCron } from './src/utils/cron.js';
import { startStatusConsumer } from './src/modules/hospital/hospital.status-consumer.js';
import { startActivationTimeoutCron } from './src/modules/hospital/hospital.activation-timeout.js';
import { checkRedisConnection } from '../shared/redis/bootstrap/redis.bootstrap.js';
import { redisClient } from '../shared/redis/index.js';

import authRouter from './src/modules/auth/auth.routes.js';
import hospitalRouter from './src/modules/hospital/hospital.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.set('case sensitive routing', true);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));
app.use(mongoSanitize());
app.use(express.json());

app.get('/health', async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            status: "healthy",
            service: "Healthcare AI Chatbot Backend",
            version: "1.0.0",
            environment: process.env.NODE_ENV || "development",
            uptime: `${Math.floor(process.uptime())} seconds`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            status: "unhealthy",
            message: "Health check failed."
        });
    }
});

app.use('/api/auth', authRouter);
app.use('/api/hospital', hospitalRouter);

app.use(globalErrorHandler);

const startServer = async () => {
    try {
        const mongoUri = process.env.NODE_ENV === 'production'
            ? process.env.PROD_MONGO_URI
            : process.env.DEV_MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('Booting up the server...');
        console.log(`Database connected successfully [NODE_ENV=${process.env.NODE_ENV || 'development'}].`);

        await retryOperation(async () => {
            await ensureKafkaTopics();
            await kafkaProducer.connect();
        }, { label: "Kafka", retries: 10, delayMs: 3000 });

        checkRedisConnection(redisClient);

        await startNotificationService();
        await startStatusConsumer();
        startActivationTimeoutCron();
        startKeepAliveCron();

        app.listen(PORT, () => {
            console.log(`Server Started Successfully on PORT : ${PORT}`);
        });
    } catch (error) {
        console.log('There is some problem booting the server: ', error);
        process.exit(0);
    }
};

startServer();
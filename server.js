import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';
import 'dotenv/config';
import { globalErrorHandler } from './middlewares/ErrorMiddleware.js';
import cookieParser from 'cookie-parser';

//Kafka imports
import kafkaProducer from './kafka/producer/kafka.producer.js';
import { ensureKafkaTopics } from './kafka/admin/kafka.admin.js';
import { retryOperation } from './kafka/utils/kafka.retry.js';
import { startNotificationService } from './modules/notification/notification.bootstrap.js';
import { startCrawlerService } from './modules/crawler/crawler.bootstrap.js';
import { startKeepAliveCron } from './utils/cron.js';

//Redis imports
import { checkRedisConnection } from './redis/bootstrap/redis.bootstrap.js';
import { redisClient } from './redis/index.js';

//Routers
import authRouter from './modules/auth/auth.routes.js';
import hospitalRouter from './modules/hospital/hospital.routes.js';

//Rate limiter
import { rateLimiter } from './middlewares/rateLimter.js';



const app = express();
const PORT = process.env.PORT || 5000;

app.set('case sensitive routing', true);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Must match your Vite frontend URL exactly
    credentials: true,               // Crucial for sending/receiving httpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));
app.use(mongoSanitize());//To prevent noSQL injection attacks
app.use(express.json());//json package opener

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

// request initialization.
// app.use('/api/auth', rateLimiter({ routeName: "Authentication", windowSec: 900, requests: 10 }), authRouter);
app.use('/api/auth', authRouter);
app.use('/api/hospital', hospitalRouter);


app.use(globalErrorHandler);
const startServer = async () => {
    try {
        //DB Connection
        const mongoUri = process.env.NODE_ENV === 'production'
            ? (process.env.PROD_MONGO_URI)
            : (process.env.DEV_MONGO_URI);
        await mongoose.connect(mongoUri);
        console.log('Booting up the server...');
        console.log(`Database connected successfully [NODE_ENV=${process.env.NODE_ENV || 'development'}].`);

        //Kafka Startup Sequence
        await retryOperation(async () => {
            await ensureKafkaTopics();
            await kafkaProducer.connect();
        }, { label: "Kafka", retries: 10, delayMs: 3000 });



        //Redis Connection Check
        checkRedisConnection(redisClient);

        //Start Notification Service
        await startNotificationService();

        //Start Crawler Service
        await startCrawlerService();

        //Start Keep-Alive Cron
        startKeepAliveCron();

        //Start Server
        app.listen(PORT, () => {
            console.log(`Server Started Successfully on PORT : ${PORT}`);
        });
    } catch (error) {
        console.log('There is some problem booting the server: ', error);
        process.exit(0);
    }
};

startServer();
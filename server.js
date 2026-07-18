import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';
import 'dotenv/config';
import { globalErrorHandler } from './utils/ErrorMiddleware.js';
import { catchAsync } from './utils/CatchAsync.js';
import { AppError } from './utils/AppError.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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

app.get('/', catchAsync(
    async (req,res,next) => {
    return next(new AppError('Global Error handling is working fine', 400));
}
));


app.use(globalErrorHandler);
const startServer = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Booting up the server...');
        console.log('Database connected sucessfully.');

        app.listen(PORT, () => {
            console.log(`Server Started Successfully on PORT : ${PORT}`);
        });
    }catch(error){
        console.log('There is some problem booting the server: ', error.message);
        process.exit(0);
    }
};

startServer();
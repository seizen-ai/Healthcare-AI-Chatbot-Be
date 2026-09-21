import { cacheService } from "../redis/index.js";
export const globalErrorHandler = async (err, req, res, next) => {
    console.log(err);
    if (req.idempotencyKey) {//Clear the lock if error occurs else user has to wait for 24hrs or whatever ttl time you set, until lock expires
        await cacheService.delete(`req-status:${req.idempotencyKey}`).catch(() => { });
        await cacheService.delete(`req-response:${req.idempotencyKey}`).catch(() => { });
    }
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        error: err.errors,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};
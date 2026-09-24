import { AppError } from '../utils/AppError.js';
import { cacheService } from '../../../shared/redis/index.js';
import { catchAsync } from '../utils/CatchAsync.js';

//Parameters passing flexible middleware via closure function
export const rateLimiter = ({ routeName, windowSec, requests }) => {
    return catchAsync(async (req, res, next) => {
        const ip = req.ip;

        const key = `${ip}:${routeName}`;

        const val = await cacheService.incr(key);


        if (val === 1) {
            await cacheService.expire(key, windowSec);
        }


        if (val > requests) {
            throw new AppError('Too Many Requests, Please Try Again Later.', 429);
        }


        next();//Allow the user request to hit the route
    });
}

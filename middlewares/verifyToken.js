import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/CatchAsync.js";
import { CacheService } from "../redis/services/cache.service.js";
import { REDIS_KEYS } from "../redis/constants/redis.constants.js";
import jwt from 'jsonwebtoken';

export const verifyToken = catchAsync(async (req,res,next) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if(!accessToken) throw new AppError('Error : Token not found', 401);

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

    if(!decoded) throw new AppError('Error : Invalid or expired token', 401);

    //Now check if jwt token jwtid is blacklisted in redis then just reject this request
    const jwtid = decoded.jwtid;
    const blacklisted = await CacheService.get(REDIS_KEYS.BLACKLISTED_TOKEN(jwtid));

    if(blacklisted) throw new AppError('Session Expired : token has been logged out', 401);

    req.user = decoded;


    next();
});
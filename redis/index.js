import redisConfig from "./config/redis.config.js";
import getRedisClient from "./client/redis.client.js"
import CacheService from "./services/cache.service.js";

const redisClient = getRedisClient(redisConfig);
const cacheService = new CacheService(redisClient);


export {
    redisClient,
    cacheService
};
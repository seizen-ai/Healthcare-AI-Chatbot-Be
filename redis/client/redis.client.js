import Redis from 'ioredis';
import { redisConfig } from '../config/redis.config.js';

let instance = null;

const getRedisClient = () => {
  if (!instance) {
    instance = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      keyPrefix: redisConfig.keyPrefix,
      maxRetriesPerRequest: 3,
    });

    instance.on('error', (err) => console.error('Redis Client Error', err));
    instance.on('connect', () => console.log('Redis Client Connected'));
  }
  return instance;
};


export default getRedisClient();
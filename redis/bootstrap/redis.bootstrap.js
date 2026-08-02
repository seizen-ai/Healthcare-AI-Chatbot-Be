import redisClient from '../client/redis.client.js';

export const checkRedisConnection = async () => {
  try {
    await redisClient.ping();
    console.log('Redis is ready and accepting connections.');
  } catch (error) {
    console.error('Redis failed to connect on startup:', error);
    process.exit(1); 
  }
};
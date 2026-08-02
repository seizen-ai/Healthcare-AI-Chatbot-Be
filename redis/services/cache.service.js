import redisClient from '../client/redis.client.js';

export class CacheService {
  
  // Generic getter that automatically parses JSON
  static async get(key) {
    const data = await redisClient.get(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (e) {
      return data; // Return as plain string if it's not JSON
    }
  }

  // Generic setter that automatically stringifies objects
  static async set(key, value, ttlSeconds) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
    
    if (ttlSeconds) {
      await redisClient.set(key, stringValue, 'EX', ttlSeconds);
    } else {
      await redisClient.set(key, stringValue);
    }
  }

  static async delete(key) {
    await redisClient.del(key);
  }
}
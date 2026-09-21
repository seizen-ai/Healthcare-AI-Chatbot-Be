import Redis from 'ioredis';
import redisConfig from '../config/redis.config.js';

let instance = null;

const getRedisClient = (config = redisConfig) => {

  if (!instance) {
    const clientOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      keyPrefix: config.keyPrefix,
      maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
      ...(config.tls ? { tls: config.tls } : {}),
    };

    instance = new Redis(clientOptions);

    instance.on('error', (err) => console.error(`[Redis] Error (${config.host}:${config.port}):`, err.message));
    instance.on('connect', () => console.log(`[Redis] Connected successfully to ${config.host}:${config.port} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`));
  }
  return instance;
};


export default getRedisClient;
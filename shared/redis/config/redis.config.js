import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';


const extractHostFromUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
};

const upstashHost = extractHostFromUrl(process.env.UPSTASH_REDIS_REST_URL);


const redisConfig = isProduction
  ? {
    host: upstashHost,
    port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379', 10),
    password: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
    tls: (upstashHost || process.env.UPSTASH_REDIS_TLS === 'true') ? {} : undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 3,
  }
  : {
    host: process.env.DEV_REDIS_HOST,
    port: parseInt(process.env.DEV_REDIS_PORT || '6379', 10),
    password: process.env.DEV_REDIS_PASSWORD || undefined,
    tls: process.env.DEV_REDIS_TLS === 'true' ? {} : undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 3,
  };

export default redisConfig;
class CacheService {
  constructor(redisClient) {
    this.client = redisClient;
  }

  async get(key) {
    const data = await this.client.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }


  async set(key, value, options = {}) {
    if (key === undefined || key === null) {
      throw new Error('cacheService.set: "key" is required.');
    }

    const { ttlSeconds, keepTtl = false } = options;

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    const args = [key, stringValue];

    if (ttlSeconds) {
      args.push('EX', ttlSeconds);
    } else if (keepTtl) {
      args.push('KEEPTTL');
    }

    return this.client.set(...args);
  }

  async setnx(key, value, ttlSeconds) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;


    const args = [key, stringValue, 'NX'];
    if (ttlSeconds) args.push('EX', ttlSeconds);


    const result = await this.client.set(...args);
    return result === 'OK';
  }

  async incr(key) {
    if (!key) return;
    return await this.client.incr(key);
  }

  async delete(key) {
    if (!key) return;
    await this.client.del(key);
  }

  async expire(key, windowSeconds) {
    if (!key) return;
    await this.client.expire(key, windowSeconds);
  }

  // Get remaining TTL (in seconds) for a key
  async ttl(key) {
    if (!key) return null;
    return await this.client.ttl(key);
  }
}


export default CacheService;
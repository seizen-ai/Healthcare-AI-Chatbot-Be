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


  async set(key, value, ttlSeconds) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

    if (ttlSeconds) {
      await this.client.set(key, stringValue, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, stringValue);
    }
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
}


export default CacheService;
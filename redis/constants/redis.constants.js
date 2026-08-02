export const REDIS_TTL = {
    ONE_MINUTE: 60,
    ONE_HOUR: 3600,
    ONE_DAY: 86400,
  };
  
  export const REDIS_KEYS = {
    USER_SESSION: (userId) => `session:${userId}`,
    RATE_LIMIT: (ip) => `ratelimit:${ip}`,
    RESET_PASSWORD_TOKEN: (userId) => `reset_token:${userId}`,
    BLACKLISTED_TOKEN: (jwtid) => `blacklist:${jwtid}`,
  };
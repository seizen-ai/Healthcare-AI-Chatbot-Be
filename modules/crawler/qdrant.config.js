import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

const qdrantConfig = isProduction
  ? {
    url: process.env.PROD_QDRANT_URL,
    apiKey: process.env.PROD_QDRANT_API_KEY || undefined,
    checkCompatibility: false,
  }
  : {
    host: process.env.DEV_QDRANT_HOST || 'qdrant',
    port: parseInt(process.env.DEV_QDRANT_PORT || '6333', 10),
    checkCompatibility: false,
  };

export default qdrantConfig;

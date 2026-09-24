import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

const getKafkaCaCert = () => {
  const customPath = process.env.PROD_KAFKA_CA_PATH ? path.resolve(process.cwd(), process.env.PROD_KAFKA_CA_PATH) : null;
  if (customPath && fs.existsSync(customPath)) {
    return fs.readFileSync(customPath, 'utf-8');
  }
  const defaultPaths = [
    path.resolve(process.cwd(), 'certs/ca.pem'),
    path.resolve(process.cwd(), 'certs/aiven-ca.pem'),
  ];
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
  }
  if (process.env.PROD_KAFKA_CA_CERT) {
    return process.env.PROD_KAFKA_CA_CERT;
  }
  return null;
};

const caCert = getKafkaCaCert();

const kafkaConfig = isProduction
  ? {
    clientId: process.env.KAFKA_CLIENT_ID || 'healthcare-chatbot',
    brokers: [
      process.env.PROD_KAFKA_BROKER
    ],
    ssl: caCert
      ? {
        rejectUnauthorized: true,
        ca: [caCert],
      }
      : {
        rejectUnauthorized: process.env.PROD_KAFKA_REJECT_UNAUTHORIZED === 'true',
      },
    sasl: process.env.PROD_KAFKA_PASSWORD
      ? {
        mechanism: process.env.PROD_KAFKA_SASL_MECHANISM,
        username: process.env.PROD_KAFKA_USERNAME,
        password: process.env.PROD_KAFKA_PASSWORD,
      }
      : undefined,
    topicDefaults: {
      numPartitions: Number(process.env.KAFKA_TOPIC_PARTITIONS) || 1,
      replicationFactor: Number(process.env.KAFKA_TOPIC_REPLICATION_FACTOR) || 1,
    },
  }
  : {
    clientId: process.env.KAFKA_CLIENT_ID || 'healthcare-chatbot',
    brokers: [
      process.env.DEV_KAFKA_BROKER || 'kafka:9092',
    ],
    ssl: false,
    sasl: undefined,
    topicDefaults: {
      numPartitions: Number(process.env.KAFKA_TOPIC_PARTITIONS) || 1,
      replicationFactor: Number(process.env.KAFKA_TOPIC_REPLICATION_FACTOR) || 1,
    },
  };

export default kafkaConfig;

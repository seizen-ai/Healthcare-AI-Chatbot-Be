import { Kafka } from "kafkajs";
import kafkaConfig from "../config/kafka.config.js";

const clientOptions = {
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  ...(kafkaConfig.ssl ? { ssl: kafkaConfig.ssl } : {}),
  ...(kafkaConfig.sasl ? { sasl: kafkaConfig.sasl } : {}),
};

const kafka = new Kafka(clientOptions);

export default kafka;
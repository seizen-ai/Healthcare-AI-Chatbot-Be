import { Kafka } from "kafkajs";
import kafkaConfig from "../config/kafka.config.js";

const kafka = new Kafka(kafkaConfig);

export default kafka;
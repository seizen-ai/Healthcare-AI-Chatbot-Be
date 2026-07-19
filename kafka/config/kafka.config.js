const kafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || "healthcare-chatbot",

    brokers: [
        process.env.KAFKA_BROKER || "kafka:9092"
    ],

    topicDefaults: {
        numPartitions: Number(process.env.KAFKA_TOPIC_PARTITIONS) || 1,
        replicationFactor: Number(process.env.KAFKA_TOPIC_REPLICATION_FACTOR) || 1
    }
};

export default kafkaConfig;

import kafka from "../client/kafka.client.js";
import kafkaConfig from "../config/kafka.config.js";
import { KAFKA_TOPICS } from "../topics/kafka.topics.js";

const ensuredTopics = new Set();

const createTopicIfMissing = async (admin, topic) => {
    const existingTopics = await admin.listTopics();

    if (existingTopics.includes(topic)) {
        return false;
    }

    await admin.createTopics({
        waitForLeaders: true,
        topics: [{
            topic,
            numPartitions: kafkaConfig.topicDefaults.numPartitions,
            replicationFactor: kafkaConfig.topicDefaults.replicationFactor
        }]
    });

    console.log(`Kafka topic created: ${topic}`);
    return true;
};

export const ensureTopic = async (topic) => {
    if (ensuredTopics.has(topic)) {
        return;
    }

    const admin = kafka.admin();

    try {
        await admin.connect();
        await createTopicIfMissing(admin, topic);
        ensuredTopics.add(topic);
    } finally {
        await admin.disconnect();
    }
};

export const ensureKafkaTopics = async () => {
    const topics = Object.values(KAFKA_TOPICS);
    const admin = kafka.admin();

    try {
        await admin.connect();

        const existingTopics = await admin.listTopics();
        const topicsToCreate = topics.filter((topic) => !existingTopics.includes(topic));

        if (topicsToCreate.length > 0) {
            await admin.createTopics({
                waitForLeaders: true,
                topics: topicsToCreate.map((topic) => ({
                    topic,
                    numPartitions: kafkaConfig.topicDefaults.numPartitions,
                    replicationFactor: kafkaConfig.topicDefaults.replicationFactor
                }))
            });

            console.log(`Kafka topics created: ${topicsToCreate.join(", ")}`);
        }

        topics.forEach((topic) => ensuredTopics.add(topic));
    } finally {
        await admin.disconnect();
    }
};

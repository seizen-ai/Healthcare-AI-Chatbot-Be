import KafkaConsumer from "../../../kafka/consumer/kafka.consumer.js";
import { KAFKA_TOPICS } from "../../../kafka/topics/kafka.topics.js";
import { EmailService } from "../email/email.service.js";

const emailService = new EmailService();
const CONSUMER_GROUP = process.env.KAFKA_EMAIL_CONSUMER_GROUP || "notification-email-group";

export const startEmailConsumer = async () => {
    const consumer = new KafkaConsumer(CONSUMER_GROUP);

    await consumer.subscribe(KAFKA_TOPICS.SEND_EMAIL, async (payload) => {
        try {
            await emailService.handleEmailEvent(payload);
            console.log(`Email sent successfully to ${payload.to} (${payload.type})`);
        } catch (error) {
            console.error(`Failed to process email event for ${payload?.to}:`, error.message);
        }
    });

    console.log(`Email consumer subscribed to topic: ${KAFKA_TOPICS.SEND_EMAIL}`);
};

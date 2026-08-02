import kafka from "../client/kafka.client.js";
import { ensureTopic } from "../admin/kafka.admin.js";

class KafkaProducer {
  constructor() {
    this.producer = kafka.producer();
    this.connected = false;

    this.producer.on(this.producer.events.DISCONNECT, () => {
      console.warn(
        "Kafka Producer disconnected! Will reconnect on next publish.",
      );
      this.connected = false;
    });
  }

  async connect() {
    if (this.connected) return;

    await this.producer.connect();

    this.connected = true;

    console.log("Kafka Producer Connected Successfully.");
  }

  async publish(topic, payload) {
    await ensureTopic(topic);
    await this.connect();

    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
        },
      ],
    });
  }

  async disconnect() {
    if (!this.connected) return;

    await this.producer.disconnect();

    this.connected = false;
  }
}

export default new KafkaProducer();

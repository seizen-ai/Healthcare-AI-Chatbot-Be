import kafka from "../client/kafka.client.js";
import { ensureTopic } from "../admin/kafka.admin.js";

class KafkaConsumer {

    constructor(groupId) {

        this.consumer = kafka.consumer({
            groupId
        });

        this.connected = false;

    }

    async connect() {

        if (this.connected) return;

        await this.consumer.connect();

        this.connected = true;

        console.log("Kafka Consumer Connected Successfully");
    }

    async subscribe(topic, handler) {
        await ensureTopic(topic);
        await this.connect();

        await this.consumer.subscribe({
            topic,
            fromBeginning: false
        });

        await this.consumer.run({

            eachMessage: async ({ message }) => {

                const payload = JSON.parse(
                    message.value.toString()
                );

                await handler(payload);

            }

        });

    }

}

export default KafkaConsumer;
const fs = require('fs');

const fixes = {
    'core-service/src/modules/notification/consumers/email.consumer.js': [
        { find: "import KafkaConsumer from '';", replace: "import KafkaConsumer from '../../../../../shared/kafka/consumer/kafka.consumer.js';" },
        { find: "import { KAFKA_TOPICS } from '';", replace: "import { KAFKA_TOPICS } from '../../../../../shared/kafka/topics/kafka.topics.js';" }
    ],
    'core-service/src/modules/auth/auth.service.js': [
        { find: "import kafkaProducer from '';", replace: "import kafkaProducer from '../../../../shared/kafka/producer/kafka.producer.js';" },
        { find: "import { KAFKA_TOPICS } from '';", replace: "import { KAFKA_TOPICS } from '../../../../shared/kafka/topics/kafka.topics.js';" },
        { find: "import { REDIS_KEYS } from '';", replace: "import { REDIS_KEYS } from '../../../../shared/redis/constants/redis.constants.js';" },
        { find: "import { cacheService } from '';", replace: "import { cacheService } from '../../../../shared/redis/index.js';" }
    ],
    'core-service/src/middlewares/verifyToken.js': [
        { find: "import { cacheService } from '';", replace: "import { cacheService } from '../../../shared/redis/index.js';" },
        { find: "import { REDIS_KEYS } from '';", replace: "import { REDIS_KEYS } from '../../../shared/redis/constants/redis.constants.js';" }
    ],
    'core-service/src/middlewares/hospitalModule.js': [
        { find: "import { cacheService } from '';", replace: "import { cacheService } from '../../../shared/redis/index.js';" }
    ],
    'core-service/src/middlewares/ErrorMiddleware.js': [
        { find: "import { cacheService } from '';", replace: "import { cacheService } from '../../../shared/redis/index.js';" }
    ]
};

for (const [file, rules] of Object.entries(fixes)) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        for (const rule of rules) {
            content = content.replace(rule.find, rule.replace);
        }
        fs.writeFileSync(file, content);
        console.log('Restored:', file);
    }
}

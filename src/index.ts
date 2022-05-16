import dotenv from 'dotenv';

dotenv.config();

/* eslint-disable import/first */
import { Consumer } from 'sqs-consumer';
import _ from 'lodash';
import { transpile } from './transpile';
import { startBot, sendLogMessage } from './bot';

function validateEnv(key: string) {
    if (!process.env[key]) {
        throw new Error(`Missing ${key}`);
    }
}

const throttleSend = _.throttle(sendLogMessage, 10000);
const TWENTY_MINUTES = 1000 * 60 * 20;
async function launch() {
    [
        'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'TELEGRAM_TOKEN', 'ADMIN_CHAT_ID', 'QUEUE_URL',
        'BOT_SERVER_URL',
    ].forEach(validateEnv);

    await startBot();

    const consumer = Consumer.create({
        region: process.env.AWS_REGION,
        queueUrl: process.env.QUEUE_URL,
        handleMessageTimeout: TWENTY_MINUTES,
        handleMessage: async ({ Body }) => {
            if (Body) {
                const { chatId, url, messageId } = JSON.parse(Body);
                const errors = [];
                if (!chatId) {
                    errors.push('Missing chatId');
                }
                if (!url) {
                    errors.push('Missing url');
                }
                if (!messageId) {
                    errors.push('Missing messageId');
                }

                if (errors.length > 0) {
                    throw new Error(errors.join(','));
                }

                console.log('Got message!');
                await transpile(url, chatId, messageId);
            }
        },
    });

    consumer.on('error', (err) => {
        throttleSend(err.message);
    });

    consumer.on('processing_error', (err) => {
        throttleSend(err.message);
    });
    consumer.start();
}

launch();

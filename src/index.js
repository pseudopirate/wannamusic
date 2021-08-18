const { transpile } = require('./transpile')
const { Consumer } = require('sqs-consumer')
const { startBot, sendLogMessage } = require('./bot')
const _ = require('lodash')

function validateEnv (key) {
    if (!process.env[key]) {
        throw new Error(`Missing ${key}`)
    }
}

const throttleSend = _.throttle(sendLogMessage, 10000)

async function launch () {
    [
        'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'TELEGRAM_TOKEN', 'ADMIN_CHAT_ID', 'QUEUE_URL',
        'DROPBOX_TOKEN'
    ].forEach(validateEnv)

    await startBot()

    const consumer = Consumer.create({
        region: process.env.AWS_REGION,
        queueUrl: process.env.QUEUE_URL,
        handleMessage: async ({ Body }) => {
            const { chatId, url, messageId } = JSON.parse(Body)
            const errors = []
            if (!chatId) {
                errors.push('Missing chatId')
            }
            if (!url) {
                errors.push('Missing url')
            }
            if (!messageId) {
                errors.push('Missing messageId')
            }

            if (errors.length > 0) {
                throw new Error(errors.join(','))
            }

            console.log('Got message!')
            await transpile(url, chatId, messageId)
        }
    })

    consumer.on('error', (err) => {
        throttleSend(err)
    })

    consumer.on('processing_error', (err) => {
        throttleSend(err)
    })
    consumer.start()
}

launch()

const { Telegraf } = require('telegraf')
const _ = require('lodash')
const ytdl = require('ytdl-core')
const AWS = require('aws-sdk')

const SQS = new AWS.SQS({ apiVersion: '2012-11-05' })
const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.start((ctx) => {
  return ctx.reply('Hi! Send me a video link')
})

bot.on('text', async (ctx) => {
  const text = _.get(ctx, ['update', 'message', 'text'])

  if (text === '/ping') {
    return ctx.reply('pong')
  }
  const chatId = _.get(ctx, ['update', 'message', 'chat', 'id'])
  const messageId = _.get(ctx, ['update', 'message', 'message_id'])

  if (ytdl.validateURL(text)) {
    const params = {
      MessageBody: JSON.stringify({ chatId, messageId, url: text }),
      QueueUrl: process.env.QUEUE_URL,
      MessageAttributes: {
        chatId: {
          DataType: 'Number',
          StringValue: String(chatId)
        },
        messageId: {
          DataType: 'Number',
          StringValue: String(messageId)
        },
        url: {
          DataType: 'String',
          StringValue: text
        }
      }
    }

    try {
      await SQS.sendMessage(params).promise()
    } catch (error) {
      console.error(error)
      return ctx.reply('Please try again')
    }

    return ctx.reply("Got it! I'll reply you soon")
  } else {
    return ctx.reply('Invalid link')
  }
})

exports.handler = async (event) => {
  const body = JSON.parse(event.body)
  const message = _.get(body, ['message'])
  if (!message) {
    return { statusCode: 400 }
  }

  await bot.handleUpdate(body)

  return { statusCode: 200, body: '' }
}

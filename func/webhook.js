const { Telegraf } = require('telegraf')
const _ = require('lodash')
const ytdl = require('ytdl-core')

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.start((ctx) => {
  return ctx.reply('Hi! Send me a video link')
})

bot.on('text', (ctx) => {
  const text = _.get(ctx, ['update', 'message', 'text'])

  if (text === '/ping') {
    return ctx.reply('pong')
  }
  const chatId = _.get(ctx, ['update', 'message', 'chat', 'id'])
  const messageId = _.get(ctx, ['update', 'message', 'chat', 'id'])

  if (ytdl.validateURL(text)) {
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

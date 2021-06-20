const Telegraf = require('telegraf')
const _ = require('lodash')
const ytdl = require('ytdl-core')

const TOKEN = process.env.TELEGRAM_TOKEN

const tg = new Telegraf(TOKEN)

exports.handler = async (event, context) => {
  const body = JSON.parse(event.body)
  const message = _.get(body, ['message'])
  if (!message) {
    return { statusCode: 400 }
  }
  switch (message.text) {
    case '/ping': {
      await tg.sendMessage(message.chat.id, 'pong')
      break
    }
    case '/start': {
      await tg.sendMessage(message.chat.id, 'Hi! Send me video link')
      break
    }
    default: {
      if (ytdl.validateURL(message.text)) {
        await tg.sendMessage(message.chat.id, "Got it! I'll reply you soon")
      } else {
        await tg.sendMessage(message.chat.id, 'Invalid link')
      }
    }
  }

  return { statusCode: 200 }
}

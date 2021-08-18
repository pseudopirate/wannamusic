const { Telegraf } = require('telegraf')
const _ = require('lodash')
const ytdl = require('ytdl-core')
const { onUrl } = require('./commands')

const progressStatusMap = new Map()
const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.start((ctx) => {
    return ctx.reply('Hi! Send me a video link')
})

bot.on('text', async (ctx) => {
    const text = _.get(ctx, ['update', 'message', 'text'])

    if (text === '/ping') {
        return ctx.reply('pong')
    } else if (text === '/status') {
        const chatId = _.get(ctx, ['update', 'message', 'chat', 'id'])
        const status = progressStatusMap.get(chatId)
        const msg = status ? `Processed ${status}` : 'Nothing to process or waiting in queue'
        return ctx.reply(msg)
    }

    if (ytdl.validateURL(text)) {
        return onUrl(ctx, text)
    } else {
        return ctx.reply('Invalid link')
    }
})

async function startBot () {
    await bot.launch()
    return bot
}

function sendLogMessage (msg) {
    bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, msg)
}

function sendDocument (url, chatId, messageId) {
    return bot.telegram.sendDocument(chatId, url, { reply_to_message_id: messageId })
}

function sendAudio (url, chatId, messageId) {
    return bot.telegram.sendAudio(chatId, { source: url }, { reply_to_message_id: messageId })
}

function sendLinkMessage (url, chatId, messageId) {
    return bot.telegram.sendMessage(
        chatId, `Here is your <a href="${url}">download link</a>. It expires in one day`,
        { reply_to_message_id: messageId, parse_mode: 'HTML' }
    )
}
function sendMessage (msg, chatId, messageId) {
    return bot.telegram.sendMessage(
        chatId, msg,
        { reply_to_message_id: messageId, parse_mode: 'HTML' }
    )
}

module.exports = {
    startBot,
    sendLogMessage,
    sendDocument,
    sendMessage,
    sendLinkMessage,
    sendAudio,
    progressStatusMap
}

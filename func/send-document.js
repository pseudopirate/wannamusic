const AWS = require('aws-sdk')
const { Telegraf } = require('telegraf')

const TOKEN = process.env.TELEGRAM_TOKEN
const FIFTY_MB = 50 << 20
const s3 = new AWS.S3()
const bot = new Telegraf(TOKEN)

bot.use(async (ctx, next) => {
  const { url, size, chatId, messageId } = ctx.update

  if (size < FIFTY_MB) {
    await ctx.tg.sendDocument(chatId, url, { reply_to_message_id: messageId })
  } else {
    await ctx.tg.sendMessage(
      chatId, `Here is your <a href="${url}">download link</a>. It expires in one day`,
      { reply_to_message_id: messageId, parse_mode: 'HTML' }
    )
  }
  await next()
})

exports.handler = async (event) => {
  const s3Object = event.Records[0].s3.object
  const [chatId, messageId] = s3Object.key.split('/')

  const url = await s3.getSignedUrlPromise('getObject', {
    Key: s3Object.key,
    Bucket: process.env.S3_BUCKET
  })

  await bot.handleUpdate({
    size: s3Object.size,
    url,
    chatId,
    messageId
  })

  return { statusCode: 200, body: '' }
}

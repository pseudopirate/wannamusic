const AWS = require('aws-sdk')
const Telegraf = require('telegraf').Telegraf

const TOKEN = process.env.TELEGRAM_TOKEN
const FIFTY_MB = 50 << 20
const s3 = new AWS.S3()
const tg = new Telegraf(TOKEN)

exports.handler = async (event) => {
  const s3Object = event.Records[0].s3.object
  const [chatId, messageId] = s3Object.key.split('/')
  const url = await s3.getSignedUrlPromise({
    Key: s3Object.key,
    Bucket: process.env.S3_BUCKET
  })

  if (s3Object.size < FIFTY_MB) {
    await tg.sendDocument(chatId, url, { reply_to_message_id: messageId })
  } else {
    await tg.sendMessage(chatId, 'Here is your download link')
    await tg.sendMessage(chatId, url)
    await tg.sendMessage(chatId, 'Link expires in one day')
  }

  return { statusCode: 200 }
}

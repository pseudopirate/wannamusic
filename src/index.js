const express = require('express')
const transpile = require('./transpile')
const { Consumer } = require('sqs-consumer')
const server = express()
const port = 3000

server.get('/ping', (req, res) => {
  res.status(200).send('pong')
})

const consumer = Consumer.create({
  queueUrl: process.env.QUEUE_URL,
  handleMessage: async ({ Body }) => {
    console.log('🚀 ~ file: index.js ~ line 14 ~ handleMessage: ~ Body', Body)
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
  console.error('Consumer error', err)
})

consumer.on('processing_error', (err) => {
  console.error('Consumer processing error', err)
})

function launch () {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error('Missing AWS_ACCESS_KEY_ID')
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('Missing AWS_SECRET_ACCESS_KEY')
  }
  if (!process.env.S3_BUCKET) {
    throw new Error('Missing S3_BUCKET')
  }
  if (!process.env.QUEUE_URL) {
    throw new Error('Missing QUEUE_URL')
  }

  consumer.start()
  server.listen(port, () => {
    console.log(`Listening at ${port}`)
  })
}

launch()

const express = require('express')
const app = express()
const port = 3000
const transpile = require('./transpile')

app.use(express.json())

app.post('/', async (req, res) => {
  const body = req.body
  const errors = []
  if (!body || !body.chatId) {
    errors.push('Missing chatId')
  }
  if (!body || !body.urls) {
    errors.push('Missing urls')
  }

  if (errors.length > 0) {
    return res.status(400).send({
      status: 400,
      message: errors.join(',')
    })
  }

  try {
    await transpile(body.urls, body.chatId)
  } catch (error) {
    return res.send({
      status: 500,
      message: 'not ok',
      error
    })
  }
  return res.status(200).send({
    status: 200,
    message: 'ok'
  })
})

function launchServer () {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error('Missing AWS_ACCESS_KEY_ID')
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('Missing AWS_SECRET_ACCESS_KEY')
  }
  if (!process.env.S3_BUCKET) {
    throw new Error('Missing S3_BUCKET')
  }
  app.listen(port, () => {
    console.log(`Listening at ${port}`)
  })
}

launchServer()

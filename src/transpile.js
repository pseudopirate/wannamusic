const fs = require('fs')
const ytdl = require('ytdl-core')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const AWS = require('aws-sdk')
const _ = require('lodash')

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

async function transpile (url, chatId, messageId) {
  const isValidUrl = ytdl.validateURL(url)
  if (!isValidUrl) {
    throw new Error('Invalid url')
  }
  const info = await ytdl.getInfo(url)
  const title = _.get(info, ['videoDetails', 'title']) || ytdl.getURLVideoID(url)

  const filePath = path.resolve(__dirname, '../tmp', `${title}.mp3`)
  return new Promise((resolve, reject) => {
    console.log('Processing started', title)
    console.time('l')

    const yVideo = ytdl(url)

    ffmpeg(yVideo)
      .format('mp3')
      .noVideo()
      .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine)
      })
      .on('progress', function (progress) {
        const val = progress.timemark
        console.log('Timemark: ' + val)
      })
      .on('error', function (err) {
        console.log('An error occurred: ' + err.message)
        reject(err)
      })
      .on('end', function () {
        console.log('Processing finished !')
        const params = {
          Key: `${chatId}/${messageId}/audio${Date.now()}.mp3`,
          Bucket: process.env.S3_BUCKET,
          Body: fs.createReadStream(filePath)
        }
        console.log('Uploading file to S3')

        s3.upload(params, function (err, data) {
          if (err) {
            console.log('Upload failed', err)
            reject(err)
          } else {
            console.log('Upload finished', data)
          }
          console.timeEnd('l')
          console.log('Removing file')

          fs.unlink(filePath, (err) => {
            if (err) {
              console.log('Removing failed', err)
              reject(err)
            } else {
              console.log('File removed')
              resolve()
            }
          })
        })
      })
      .pipe(fs.createWriteStream(filePath), { end: true })
  })
}

module.exports = transpile

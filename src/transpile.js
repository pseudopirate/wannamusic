const fs = require('fs')
const ytdl = require('ytdl-core')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const _ = require('lodash')
const utils = require('util')
const { progressStatusMap, sendAudio, sendMessage, sendLogMessage } = require('./bot')

const unlink = utils.promisify(fs.unlink)
const errors = new Map()

const sleep = async (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms)
})
const opts = {
    filter: 'audioonly',
    quality: 'highestaudio'
}

const TWO_MINUTES = 1000 * 60 * 2

async function transpile (url, chatId, messageId) {
    let messageSent = false
    const isValidUrl = ytdl.validateURL(url)
    if (!isValidUrl) {
        throw new Error('Invalid url')
    }
    const info = await ytdl.getInfo(url)
    const title = _.get(info, ['videoDetails', 'title']) || ytdl.getURLVideoID(url)

    const filePath = path.resolve(__dirname, '../tmp', `${title}.mp3`)
    return new Promise((resolve, reject) => {
        const errorsCount = errors.get(title) || 0
        if (errorsCount > 2) {
            sendLogMessage(`Failed to transpile ${title}`)
            sendMessage("Can't process this video. I've sent notification to developers", chatId)
            return resolve()
        }
        console.log('Processing started', title)

        const yVideo = ytdl(url, opts)

        ffmpeg(yVideo)
            .format('mp3')
            .noVideo()
            .on('start', function (commandLine) {
                console.log('Spawned Ffmpeg with command: ' + commandLine)
            })
            .on('progress', function (progress) {
                const val = progress.timemark
                if (!messageSent) {
                    messageSent = true
                    sendMessage(`Starting to process "${title}". You can send me /status to check processing status`, chatId)
                }
                progressStatusMap.set(chatId, `Processed ${val}`)
                console.log('Timemark: ' + val)
            })
            .on('error', function (err) {
                errors.set(title, errorsCount + 1)
                console.log('An error occurred: ' + err.message)
                reject(new Error(title + ' Error: ' + err.message))
            })
            .on('end', async function () {
                console.log('Processing finished !')
                progressStatusMap.set(chatId, 'Sending processed file...')
                try {
                    await Promise.race([
                        sendAudio(filePath, chatId),
                        sleep(TWO_MINUTES).then(() => {
                            throw new Error(`Send file timeout: ${title}`)
                        })
                    ])
                    console.log('File sent')
                    resolve()
                } catch (error) {
                    errors.set(title, errorsCount + 1)
                    reject(error)
                } finally {
                    await unlink(filePath)
                    console.log('File removed')
                    progressStatusMap.delete(chatId)
                }
            })
            .pipe(fs.createWriteStream(filePath), { end: true })
    })
}

module.exports = {
    transpile
}

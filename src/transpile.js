const fs = require('fs')
const ytdl = require('ytdl-core')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const _ = require('lodash')
const utils = require('util')
const { progressStatusMap, sendAudio } = require('./bot')
const Dropbox = require('dropbox').Dropbox

const stat = utils.promisify(fs.stat)
const unlink = utils.promisify(fs.unlink)

const FORTY_FIVE_MB = 45 << 20
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN })

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

        const yVideo = ytdl(url)

        ffmpeg(yVideo)
            .format('mp3')
            .noVideo()
            .on('start', function (commandLine) {
                console.log('Spawned Ffmpeg with command: ' + commandLine)
            })
            .on('progress', function (progress) {
                const val = progress.timemark
                progressStatusMap.set(chatId, val)
                console.log('Timemark: ' + val)
            })
            .on('error', function (err) {
                console.log('An error occurred: ' + err.message)
                reject(err)
            })
            .on('end', async function () {
                console.log('Processing finished !')

                try {
                    const stats = await stat(filePath)
                    if (stats.size < FORTY_FIVE_MB) {
                        await sendAudio(filePath, chatId, messageId)
                        resolve()
                    } else {
                        const file = fs.createReadStream(filePath)
                        await dbx.filesUpload({ path: `/${title}.mp3'`, contents: file })
                        resolve()
                    }
                } catch (error) {
                    reject(error)
                } finally {
                    await unlink(filePath)
                    progressStatusMap.delete(chatId)
                }
            })
            .pipe(fs.createWriteStream(filePath), { end: true })
    })
}

module.exports = {
    transpile
}

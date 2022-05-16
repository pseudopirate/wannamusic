import fs from 'fs';
import ytdl from 'ytdl-core';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import _ from 'lodash';
import utils from 'util';
import {
    progressStatusMap, sendAudio, sendMessage, sendLogMessage,
} from './bot';

const unlink = utils.promisify(fs.unlink);
const errors = new Map();

const sleep = async (ms: number) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const opts = {
    filter: 'audioonly',
    quality: 'highestaudio',
} as ytdl.downloadOptions;

const TWO_MINUTES = 1000 * 60 * 2;

export async function transpile(url: string, chatId: string, messageId: number) {
    let messageSent = false;
    const isValidUrl = ytdl.validateURL(url);
    if (!isValidUrl) {
        throw new Error('Invalid url');
    }
    const info = await ytdl.getInfo(url);
    const title = _.get(info, ['videoDetails', 'title']) || ytdl.getURLVideoID(url);

    const filePath = path.resolve(__dirname, '../tmp', `${title}.mp3`);
    return new Promise<void>((resolve, reject) => {
        const errorsCount = errors.get(title) || 0;
        if (errorsCount > 2) {
            sendLogMessage(`Failed to transpile ${title}`);
            sendMessage("Can't process this video. I've sent notification to developers", chatId, messageId);
            resolve();

            return;
        }
        console.log('Processing started', title);

        const yVideo = ytdl(url, opts);

        ffmpeg(yVideo)
            .format('mp3')
            .noVideo()
            .on('start', (commandLine) => {
                console.log(`Spawned Ffmpeg with command: ${commandLine}`);
            })
            .on('progress', (progress) => {
                const val = progress.timemark;
                if (!messageSent) {
                    messageSent = true;
                    sendMessage(`Starting to process "${title}". You can send me /status to check processing status`, chatId, messageId);
                }
                progressStatusMap.set(chatId, `Processed ${val}`);
                // console.log(`Timemark: ${val}`);
            })
            .on('error', (err) => {
                errors.set(title, errorsCount + 1);
                console.log(`An error occurred: ${err.message}`);
                reject(new Error(`${title} Error: ${err.message}`));
            })
            .on('end', async () => {
                console.log('Processing finished !');
                progressStatusMap.set(chatId, 'Sending processed file...');
                try {
                    await Promise.race([
                        sendAudio(filePath, chatId),
                        sleep(TWO_MINUTES).then(() => {
                            throw new Error(`Send file timeout: ${title}`);
                        }),
                    ]);
                    console.log('File sent');
                    resolve();
                } catch (error) {
                    errors.set(title, errorsCount + 1);
                    reject(error);
                } finally {
                    await unlink(filePath);
                    console.log('File removed');
                    progressStatusMap.delete(chatId);
                }
            })
            .pipe(fs.createWriteStream(filePath), { end: true });
    });
}

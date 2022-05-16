import { Telegraf } from 'telegraf';
import _ from 'lodash';
import ytdl from 'ytdl-core';

import { onUrl } from './commands';

export const progressStatusMap = new Map();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN as string, {
    telegram: {
        apiRoot: process.env.BOT_SERVER_URL,
    },
});

bot.start((ctx) => ctx.reply('Hi! Send me a video link'));

bot.on('text', async (ctx) => {
    const text = _.get(ctx, ['update', 'message', 'text']);

    if (text === '/ping') {
        return ctx.reply('pong');
    } if (text === '/status') {
        const chatId = _.get(ctx, ['update', 'message', 'chat', 'id']);
        const status = progressStatusMap.get(chatId);
        const msg = status || 'Nothing to process or waiting in queue';
        return ctx.reply(msg);
    }

    if (ytdl.validateURL(text)) {
        return onUrl(ctx, text);
    }
    return ctx.reply('Invalid link');
});

export async function startBot() {
    await bot.launch();
    return bot;
}

export function sendLogMessage(msg: string) {
    bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID as string, msg);
}

export function sendDocument(url: string, chatId: string, messageId: number) {
    return bot.telegram.sendDocument(chatId, url, { reply_to_message_id: messageId });
}

export function sendAudio(url: string, chatId: string, messageId?: number) {
    return bot.telegram.sendAudio(chatId, { source: url }, { reply_to_message_id: messageId });
}

export function sendLinkMessage(url: string, chatId: string, messageId: number) {
    return bot.telegram.sendMessage(
        chatId,
        `Here is your <a href="${url}">download link</a>. It expires in one day`,
        { reply_to_message_id: messageId, parse_mode: 'HTML' },
    );
}

export function sendMessage(msg: string, chatId: string, messageId: number) {
    return bot.telegram.sendMessage(
        chatId,
        msg,
        { reply_to_message_id: messageId, parse_mode: 'HTML' },
    );
}

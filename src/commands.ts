import AWS from 'aws-sdk';
import _ from 'lodash';
import { Context } from 'telegraf';

const SQS = new AWS.SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });

export async function onUrl(ctx: Context, text: string) {
    const chatId = _.get(ctx, ['update', 'message', 'chat', 'id']);
    const messageId = _.get(ctx, ['update', 'message', 'message_id']);

    const params = {
        MessageBody: JSON.stringify({ chatId, messageId, url: text }),
        QueueUrl: process.env.QUEUE_URL,
        MessageAttributes: {
            chatId: {
                DataType: 'Number',
                StringValue: String(chatId),
            },
            messageId: {
                DataType: 'Number',
                StringValue: String(messageId),
            },
            url: {
                DataType: 'String',
                StringValue: text,
            },
        },
    } as AWS.SQS.Types.SendMessageRequest;

    try {
        await SQS.sendMessage(params).promise();
    } catch (error) {
        return ctx.reply('Please try again');
    }

    return ctx.reply("Got it! I'll reply you soon");
}

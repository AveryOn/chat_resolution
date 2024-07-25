import { ModelObject } from "@adonisjs/lucid/types/model";
import { io } from "#socket/index";
import { computeSocketId } from "#socket/utils/basic_utils";

export function messageNewEmit(message: ModelObject, chatId: number | null, newChatId?: number) {
    try {
        const toUserSocketId: string = computeSocketId(message.toUserId);
        // Если чат новый
        if (chatId === null && newChatId) {
            io.to(toUserSocketId).emit('chat:create', message);
        }
        if (chatId) {
            io.to(toUserSocketId).emit('message:create', message);
        }
    } catch (err) {
        console.error(`socket/emits/message_emits: messageNewEmit  => ${err}`)
        throw err;
    }
}

export function messageUpdateEmit(message: ModelObject) {
    try {
        const toUserSocketId: string = computeSocketId(message.toUserId);
        io.to(toUserSocketId).emit('message:update', message);
    } catch (err) {
        console.error(`socket/emits/message_emits: messageUpdateEmit  => ${err}`)
        throw err;
    }
}

export function messageDeleteEmit(messageIds: number[], toUserId: number | undefined) {
    if(!messageIds.length) return;
    try {
        if(!toUserId) {
            console.error(`Не удалось получить toUserId в качестве ID пользователя-получателя сокет-события. Событие <message:delete> отправлено не было`);
            throw {
                meta: { status: 'error', code: 422, url: '/messages/delete' },
                data: { messages: [], preview: 'Не удалось удалить сообщения' },
            }
        }
        const toUserSocketId: string = computeSocketId(toUserId);
        io.to(toUserSocketId).emit('message:delete', messageIds);
    } catch (err) {
        console.error(`socket/emits/message_emits: messageDeleteEmit  => ${err}`)
        throw err;
    }
}
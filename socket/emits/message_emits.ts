import { ModelObject } from "@adonisjs/lucid/types/model";
import { io } from "#socket/index";
import { computeSocketId, computeChannelId, findSocketById } from "#socket/utils/basic_utils";

export function messageNewEmit(message: ModelObject, chatId: number | null, newChatId?: number) {
    try {
        console.log();
        
        const toUserSocketId: string = computeSocketId(message.toUserId);
        let channelId: string;
        // Если чат новый, значит комнаты для него не существует. Её нужно создать
        // if (chatId === null && newChatId) {
        //     io.to(channelId).emit('message:create', message);
        // }
        if(chatId) {
            channelId = computeChannelId(chatId);
            io.to(toUserSocketId).emit('message:create', message);
        }
    } catch (err) {
        console.error(`socket/emits/message_emits: messageNewEmit  => ${err}`)
        throw err;
    }
}
// import { io } from "#socket/index";
import { computeSocketId, findSocketById } from "#socket/utils/basic_utils";


// Обработка отключения сокета
export function statusDisconnectEmit(userId: number) {
    try {
        const toUserSocketId: string = computeSocketId(userId);
        const socketDisconnected = findSocketById(toUserSocketId);
        console.log(socketDisconnected);
        
        socketDisconnected.broadcast.emit('status:disconnect');
    } catch (err) {
        console.error(`socket/emits/status_emits: statusDisconnectEmit  => ${err}`)
        throw err;
    }
}

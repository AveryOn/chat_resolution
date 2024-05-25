import { io } from "#socket/index";
import { Socket } from "socket.io";

function getSocketId(userId: number): string {
    if (!userId) throw { message: 'Поле userId не действительно' }
    return `socket-client:${userId}`;
}

function getRoomId(chatId: number): string {
    if(!chatId) throw { message: 'Поле chatId не действительно' }
    return `room:${chatId}`;
}

export async function subscribeAndSend(meId: number, secondUserId: number, chatId: number, message: any) {
    try {
        const socketMeId = getSocketId(meId);
        const socketSecondId = getSocketId(secondUserId);
        const sockets = await io.fetchSockets();
        let newRoomId: string;
        let mySocket: Socket & any;
        sockets.forEach((socket) => {
            if(socket.handshake.auth?.socket_id === socketMeId || socket.handshake.auth?.socket_id === socketSecondId) {
                if(socket.handshake.auth?.socket_id === socketMeId) {
                    mySocket = socket;
                }
                newRoomId = getRoomId(chatId);
                socket.join(newRoomId);
            }
        });
        if(message && mySocket) {
            mySocket.to(newRoomId!).emit("message:new", message);
        }
        console.log('services/messages: => ',socketMeId, socketSecondId, newRoomId!);
        

    } catch (err) {
        console.error(err);
    }
}
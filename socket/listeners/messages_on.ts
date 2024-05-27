import { Server, Socket } from "socket.io";


// НЕ ИСПОЛЬЗУЕТСЯ
export function newMessageOn(io: Server, socket: Socket) {
    try {
        socket.on('message:create', (payload) => {
            console.log('Клиент создал событие @message:create', payload);
        })
    } catch (err) {
        console.log(err);
        throw err;
    }

}
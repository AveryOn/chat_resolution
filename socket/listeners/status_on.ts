
import { statusDisconnectEmit } from "#socket/emits/status_emits";
import { Socket } from "socket.io";


export function statusOn(socket: Socket) {
    try {
        socket.on('status:disconnect', (payload) => {
            console.log(payload);
            statusDisconnectEmit(payload.userId)
        })
    } catch (err) {
        console.log(err);
        throw err;
    }
}
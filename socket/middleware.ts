import { Socket } from "socket.io";
export interface ExtendedError extends Error {
    data?: any;
}

// Установка уникального ID новому соединению
export function useSetId(socket: Socket, next: (err?: ExtendedError | undefined) => void) {
    try {
        next();
    } catch (err) {
        console.error(`socket/middleware: useSetId => ${err}`)
    }
}
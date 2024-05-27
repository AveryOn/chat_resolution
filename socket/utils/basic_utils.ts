import { io } from "#socket/index";
import { Socket } from "socket.io";


// Перегрузки
export function computeSocketId(identifier: number, prefix?: string): string;
export function computeSocketId(identifier: number[], prefix?: string): string[];

// Формирование ID для сокет-клиента на основе ID пользователя
export function computeSocketId(identifier: number | number[], prefix?: string): string | string[] {
    try {
        if (typeof identifier === 'number') {
            if (prefix) return `${prefix}:` + identifier;
            return `socket-client:` + identifier;
        }
        else if (Array.isArray(identifier)) {
            const result = identifier.map((id: number) => {
                if (prefix) return `${prefix}:` + id;
                return `socket-client:` + id;
            });
            return result;
        }
        else throw new Error('utils/basic_utils: computeSocketIdНе  =>  Не удалось сформировать ID сокета');
    } catch (err) {
        throw err;
    }
}

// Формирование ID канала по ID чата
export function computeChannelId(identifier: number, prefix?: string): string {
    try {
        if (!identifier) throw 0;
        if (prefix) return `${prefix}:` + identifier;
        return 'room:' + identifier;
    } catch (err) {
        throw new Error('utils/basic_utils: computeChannelId  =>  Не удалось сформировать ID канала')
    }
}


// Перегрузки
export function findSocketById(socketId: string): Socket;
export function findSocketById(socketId: string[]): Socket[];

// Поиск сокета в мэпе сокетов
export function findSocketById(socketsId: string | string[]): Socket | Socket[] {
    let findedSockets: Socket | Socket[] = [];
    try {
        // Если был передан массив ID сокетов
        if (Array.isArray(socketsId)) {
            for (let [_, socket] of io.of("/").sockets) {
                socketsId.forEach((entry: string, index: number) => {
                    if (socket.socketId === entry) {
                        findedSockets.push(socket);
                        findedSockets[index] = socket;
                    }
                });
            }
        }
        // Если был передан один ID сокета
        else if (typeof socketsId === 'string') {
            for (let [_, socket] of io.of("/").sockets) {
                console.log(socket.socketId);
                if (socket.socketId === socketsId) {
                    socket = socket;
                }
            }
        }
    } catch (err) {
        throw new Error(`utils/basic_utils: findSocketById  =>  Не удалось найти сокет по ID=${socketsId}`)
    }
    return findedSockets!;
}
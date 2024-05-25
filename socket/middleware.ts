import { Socket } from "socket.io";
import { AccessToken } from "@adonisjs/auth/access_tokens";


interface ExtendedError extends Error {
    data?: any;
}

// Установка уникального ID новому соединению
export function SocketAuthMiddleware(socket: Socket, next: (err?: ExtendedError | undefined) => void) {
    try {
        // Проверка на существование токена доступа. Если токена нет, то коннект запрещен
        const token = AccessToken.decode('cht_', socket.handshake.auth.access_token);
        if(token) {
            next();
        } else {
            return next(new Error('Ошибка аутентификации'));
        }
    } catch (err) {
        console.error(`socket/middleware: useSetId => ${err}`);
    }
}
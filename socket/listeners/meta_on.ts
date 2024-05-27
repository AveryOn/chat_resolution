
// Прослушивание служебных событий

import chalk from "chalk";
import { Socket } from "socket.io";

// Отключение сокета
export function disconnectOn(socket: Socket) {
    socket.on('disconnect', () => {
        console.log(chalk.yellow('socket disconnect'));
    });
}

// Логирование сокет-запросов
export function loggingOn(socket: Socket) {
    socket.onAny((eventName, ...args) => {
        console.log(chalk.bgBlue.black('socket: => '), `event: ${eventName}`, 'args:', args);
    });
}
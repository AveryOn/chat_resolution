import express from 'express';
import { Express } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import env from '#start/env';
import { SocketAuthMiddleware } from '#socket/middleware';
import chalk from 'chalk';


const app: Express = express();
const server = http.createServer(app);
export const io = new Server(server, {
    connectionStateRecovery: {},
    cors: {
        // origin: "http://192.168.1.52:8080",
        origin: "*",
        credentials: true,
    },
});


io.use(SocketAuthMiddleware);
io.on('connection', async (socket) => {
    // ======================================  META  ======================================
    console.log(chalk.blue('socket connected'));
    socket.on('disconnect', () => {
        console.log(chalk.yellow('socket disconnect'));
    });

    // Логирование сокет-запросов
    socket.onAny((eventName, ...args) => {
        console.log(chalk.bgBlue.black('socket: => '), `event: ${eventName}`, 'args:', args);
    });

    // ====================================  PAYLOAD  =====================================
    socket.on('message', (data) => {
        io.emit('message', data);
    });
});

app.get('/', (req, res) => {
    res.send({ data: 'Express Server started' })
})

export function startSocketServer() {
    server.listen(env.get('SOCKET_PORT'), () => {
        console.log(chalk.bgBlue.black.bold(`SocketIO Server started on: http://${env.get('SOCKET_HOST')}:${env.get('SOCKET_PORT')}`));
    });
}



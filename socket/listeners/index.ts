import { Server } from 'socket.io';
import { Server as ServerType } from 'http';
import { SocketAuthMiddleware } from '#socket/middleware';
import chalk from 'chalk';
import { loggingOn, disconnectOn } from '#socket/listeners/meta_on';
import { newMessageOn } from '#socket/listeners/messages_on';
import { statusOn } from '#socket/listeners/status_on';

// Launch Socket Server...
export function launchSocketServer(server: ServerType) {
    const io = new Server(server, {
        connectionStateRecovery: {},
        cors: {
            // origin: "http://192.168.1.52:8080",
            origin: "*",
            credentials: true,
        },
    });

    // MIDDLEWARES
    io.use(SocketAuthMiddleware);

    io.on('connection', async (socket) => {
        console.log(chalk.blue('socket connected'));
        if(io.of('/').sockets.size >= 3) {
            io.emit('test', 'its server message')
        }
        // ======================================  META  ======================================
        disconnectOn(socket);
        loggingOn(socket);

        // ====================================  PAYLOAD  =====================================
        newMessageOn(io, socket);
        statusOn(socket);
    });

    return io;
}


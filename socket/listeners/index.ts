import { Server } from 'socket.io';
import { Server as ServerType } from 'http';
import { SocketAuthMiddleware } from '#socket/middleware';
import chalk from 'chalk';
import { loggingOn, disconnectOn } from '#socket/listeners/meta_on';
import { newMessageOn } from '#socket/listeners/messages_on';

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
        // ======================================  META  ======================================
        disconnectOn(socket);
        loggingOn(socket);

        // ====================================  PAYLOAD  =====================================
        newMessageOn(io, socket);
    });

    return io;
}


import express from 'express';
import { Express } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import env from '#start/env';
import { useSetId } from '#socket/middleware';


const app: Express = express();
const server = http.createServer(app);
export const io = new Server(server, {
    connectionStateRecovery: {},
    cors: {
        origin: "http://192.168.1.52:8080",
    }
});

// Установка уникального ID новому соединению
io.use(useSetId);

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.emit('hello', 'world');
    
    socket.on('message', (content) => {
        console.log(content);
    })

    socket.on('disconnect', () => {
        console.log('user Disconnect');
    })
});

app.get('/', (req, res) => {
    res.send({ data: 'Express Server started' })
})

export function startSocketServer() {
    server.listen(env.get('SOCKET_PORT'), () => {
        console.log(`SocketIO Server started on: http://${env.get('SOCKET_HOST')}:${env.get('SOCKET_PORT')}`);
    });
}



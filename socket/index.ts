import express from 'express';
import { Express } from 'express';
import http from 'http';
import env from '#start/env';
import chalk from 'chalk';
import { launchSocketServer } from '#socket/listeners/index';

const app: Express = express();
const server = http.createServer(app);

// Channels Tree
export interface ChannelTree {
    [key: string | number]: [
        firstSocketId: string | undefined,
        secondSocketId: string | undefined,
    ] | [];
}

// Channels
export const channels: ChannelTree = {};

// Launch Socket Server
export const io = launchSocketServer(server);


app.get('/', (req, res) => {
    if (req.query?.appkey === env.get('APP_KEY')) {
        res.send({ data: 'Express Server started!' })
    } else {
        res.send({ error: 'Unauthorization' });
    }
});

export function startSocketServer() {
    server.listen(env.get('SOCKET_PORT'), () => {
        console.log(chalk.bgBlue.black.bold(`SocketIO Server started on: http://${env.get('SOCKET_HOST')}:${env.get('SOCKET_PORT')}`));
    });
}



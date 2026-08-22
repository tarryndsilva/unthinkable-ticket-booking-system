import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { config } from './config';
import { setIO, eventRoom } from './sockets/io';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.clientUrl, credentials: true },
});

io.on('connection', (socket) => {
  socket.on('event:subscribe', (eventId: string) => {
    socket.join(eventRoom(eventId));
  });
  socket.on('event:unsubscribe', (eventId: string) => {
    socket.leave(eventRoom(eventId));
  });
});

setIO(io);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ticket Booking API listening on port ${config.port} [${config.nodeEnv}]`);
});

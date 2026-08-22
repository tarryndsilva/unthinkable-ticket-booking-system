import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function emitSeatUpdate(eventId: string, seats: Array<{ showSeatId: string; status: string; heldUntil?: Date | null }>) {
  if (!ioInstance) return;
  ioInstance.to(`event:${eventId}`).emit('seat:update', { eventId, seats });
}

export function eventRoom(eventId: string) {
  return `event:${eventId}`;
}

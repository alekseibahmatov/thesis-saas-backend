import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway(3330, { cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  sendUpdateNotification() {
    this.server.emit('alert', '');
  }
}

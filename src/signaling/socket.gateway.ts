import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface Client {
  clientId: string;
  isConnected: boolean;
}

interface Room {
  [key: string]: Client[]; // key: room name, value: array of clients
}

@WebSocketGateway(3300, { cors: true })
export class PttGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Room = {};

  async handleConnection(client: Socket) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.server.to(client.id).emit('userId', client.id);
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [room, clients] of Object.entries(this.rooms)) {
      const clientIndex = clients.findIndex((c) => c.clientId === client.id);
      if (clientIndex !== -1) {
        clients.splice(clientIndex, 1);
        client.to(room).emit('clientsCount', clients.length);
        if (clients.length === 1) {
          clients[0].isConnected = false;
        }
        if (clients.length === 0) {
          delete this.rooms[room];
        }
        break;
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { channel: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.channel);
    if (!this.rooms[data.channel]) {
      this.rooms[data.channel] = [];
    }
    this.rooms[data.channel].push({ clientId: client.id, isConnected: false });
    const clients = this.rooms[data.channel];

    console.log(`Client ${client.id} joined: ${data.channel}`);

    client.to(data.channel).emit('clientsCount', clients.length);
    client.emit('clientsCount', clients.length);

    if (clients.length === 2) {
      // If there are exactly two clients, initiate peer connection
      const [firstClient, secondClient] = clients;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.server
        .to(secondClient.clientId)
        .emit('startOffer', firstClient.clientId);
      console.log(`Sending start offer to ${secondClient.clientId}`);
    } else if (clients.length > 2) {
      // If more than two clients, establish mesh connections
      const otherClients = clients
        .filter((c) => c.clientId !== client.id)
        .map((c) => c.clientId);
      client.emit('establishMesh', otherClients);
      console.log(`Establishing mesh`);
    }
  }

  @SubscribeMessage('signal')
  handleSignal(
    @MessageBody()
    data: { channel: string; to: string; from: string; signal: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(data);
    const clients = this.rooms[data.channel] || [];
    const senderClient = clients.find((c) => c.clientId === client.id);

    if (data.signal.type === 'offer' || data.signal.type === 'answer') {
      senderClient.isConnected = true;
      const recipientClient = clients.find((c) => c.clientId === data.from);
      if (recipientClient) {
        recipientClient.isConnected = true;
      }
    }

    client.to(data.channel).to(data.to).emit('signal', data);
  }
}

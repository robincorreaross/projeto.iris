import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class IrisGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IrisGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitNewMessage(payload: { contact: any; conversation: any; message: any }) {
    this.server.emit('new-message', payload);
  }

  emitConversationUpdate(conversation: any) {
    this.server.emit('conversation-update', conversation);
  }

  emitConnectionStatus(status: any) {
    this.server.emit('connection-status', status);
  }
}

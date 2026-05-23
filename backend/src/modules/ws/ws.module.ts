import { Module } from '@nestjs/common';
import { IrisGateway } from './ws.gateway';

@Module({
  providers: [IrisGateway],
  exports: [IrisGateway],
})
export class WsModule {}

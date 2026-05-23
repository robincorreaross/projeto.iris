import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { WebhookProcessor } from './webhook.processor';
import { AutomationsModule } from '../automations/automations.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'webhook-queue' }),
    AutomationsModule,
    WsModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookProcessor],
})
export class WebhookModule {}

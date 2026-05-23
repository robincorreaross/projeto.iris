import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('webhooks')
export class WebhookController {
  constructor(@InjectQueue('webhook-queue') private readonly queue: Queue) {}

  @Post('whatsapp')
  @HttpCode(200)
  async receive(@Body() payload: any) {
    // Enqueue for async processing — respond immediately to Evolution API
    await this.queue.add('process-message', payload, {
      removeOnComplete: true,
      removeOnFail: false,
    });
    return { received: true };
  }
}

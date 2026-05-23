import { Controller, Get } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  @Get('status')
  getStatus() {
    return this.service.getStatus();
  }

  @Get('qrcode')
  getQrCode() {
    return this.service.getQrCode();
  }
}

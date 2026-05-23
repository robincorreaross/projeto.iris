import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fetch active integration credentials from DB — never from env */
  private async getClient(): Promise<{
    http: AxiosInstance;
    instance: string;
  }> {
    const integration = await this.prisma.integration.findFirst({
      where: { status: 'CONNECTED' },
      orderBy: { updated_at: 'desc' },
    });

    if (!integration) {
      throw new Error('No active WhatsApp integration found in database.');
    }

    const http = axios.create({
      baseURL: integration.base_url,
      headers: { apikey: integration.api_key },
    });

    return { http, instance: integration.instance_name };
  }

  /** Register webhook URL on Evolution API for the given instance */
  async registerWebhook(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
    webhookUrl: string,
  ) {
    const http = axios.create({
      baseURL: baseUrl,
      headers: { apikey: apiKey },
    });

    const payload = {
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
      ],
    };

    this.logger.log(`Registering webhook for instance "${instanceName}" → ${webhookUrl}`);
    const res = await http.post(`/webhook/set/${instanceName}`, payload);
    this.logger.log(`Webhook registered: ${JSON.stringify(res.data)}`);
    return res.data;
  }

  /** Send a text message */
  async sendText(to: string, text: string) {
    const { http, instance } = await this.getClient();
    const res = await http.post(`/message/sendText/${instance}`, {
      number: to,
      text,
    });
    return res.data;
  }

  /** Send a media (image/document) message */
  async sendMedia(to: string, mediaUrl: string, caption?: string) {
    const { http, instance } = await this.getClient();
    const res = await http.post(`/message/sendMedia/${instance}`, {
      number: to,
      mediatype: 'image',
      media: mediaUrl,
      caption: caption ?? '',
    });
    return res.data;
  }

  /** Fetch QR code for reconnection */
  async getQrCode() {
    const { http, instance } = await this.getClient();
    const res = await http.get(`/instance/connect/${instance}`);
    return res.data;
  }

  /** Check instance connection status */
  async getStatus() {
    const { http, instance } = await this.getClient();
    const res = await http.get(`/instance/fetchInstances`);
    const instances: any[] = res.data ?? [];
    return instances.find((i: any) => i.instance?.instanceName === instance) ?? null;
  }
}

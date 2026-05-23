import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

interface HandlePayload {
  phone: string;
  contact: any;
  conversation: any;
  messageText: string;
  isNewConversation: boolean;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async handle(payload: HandlePayload) {
    const { phone, contact, conversation, messageText, isNewConversation } = payload;

    const automations = await this.prisma.automation.findMany({
      where: { enabled: true },
    });

    const settings = await this.prisma.settings.findUnique({
      where: { id: 'store_config' },
    });

    // ── 1. Store open/closed check ───────────────────────────────────────────
    const scheduleRule = automations.find((a) => a.type === 'SCHEDULE');
    if (scheduleRule && settings) {
      const isClosed = this.isStoreClosed(settings.open_hours as any);
      if (isClosed && scheduleRule.content) {
        await this.whatsapp.sendText(phone, scheduleRule.content);
        this.logger.log(`[AUTO] Store closed message sent to ${phone}`);
        return; // Do not send welcome if store is closed
      }
    }

    // ── 2. Welcome message (first contact or new conversation) ───────────────
    if (isNewConversation) {
      const welcomeRule = automations.find((a) => a.type === 'WELCOME');
      if (welcomeRule?.content) {
        let welcomeText = welcomeRule.content
          .replace('{nome}', contact.name ?? 'cliente')
          .replace('{loja}', settings?.store_name ?? 'nossa loja');

        // Append app links if configured
        if (settings?.app_links) {
          const links = settings.app_links as Record<string, string>;
          const linkLines = Object.entries(links)
            .filter(([, v]) => v)
            .map(([k, v]) => `• ${k}: ${v}`)
            .join('\n');
          if (linkLines) welcomeText += `\n\n${linkLines}`;
        }

        await this.whatsapp.sendText(phone, welcomeText);
        this.logger.log(`[AUTO] Welcome sent to ${phone}`);
      }

      // Offer image (journal)
      const offerRule = automations.find((a) => a.type === 'OFFER');
      if (offerRule?.enabled && (offerRule.media_url || settings?.offer_image_url)) {
        const mediaUrl = offerRule.media_url ?? settings!.offer_image_url!;
        await this.whatsapp.sendMedia(phone, mediaUrl, 'Confira nossas ofertas! 🛒');
        this.logger.log(`[AUTO] Offer image sent to ${phone}`);
      }
    }

    // ── 3. Keyword-based auto-reply ──────────────────────────────────────────
    const keywordRules = automations.filter((a) => a.type === 'KEYWORD' && a.trigger);
    for (const rule of keywordRules) {
      const keyword = rule.trigger!.toLowerCase();
      if (messageText.toLowerCase().includes(keyword) && rule.content) {
        await this.whatsapp.sendText(phone, rule.content);
        this.logger.log(`[AUTO] Keyword "${keyword}" matched, reply sent to ${phone}`);
        break; // Only first match fires
      }
    }
  }

  private isStoreClosed(openHours: Record<string, { start: string; end: string; closed: boolean }>): boolean {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const dayConfig = openHours[dayName];

    if (!dayConfig || dayConfig.closed) return true;

    const [startH, startM] = dayConfig.start.split(':').map(Number);
    const [endH, endM] = dayConfig.end.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes < startMinutes || currentMinutes > endMinutes;
  }
}

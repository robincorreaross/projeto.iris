import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { AutomationsService } from '../automations/automations.service';
import { IrisGateway } from '../ws/ws.gateway';

@Processor('webhook-queue')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automations: AutomationsService,
    private readonly gateway: IrisGateway,
  ) {
    super();
  }

  async process(job: Job) {
    const payload = job.data;

    // Only process incoming text/media messages
    const event = payload?.event ?? payload?.type;
    if (!['messages.upsert', 'MESSAGES_UPSERT'].includes(event)) return;

    const msg = payload?.data ?? payload;
    const phone: string = (msg?.key?.remoteJid ?? '').replace('@s.whatsapp.net', '');
    const fromMe: boolean = msg?.key?.fromMe ?? false;

    if (!phone || fromMe) return;

    const rawText: string =
      msg?.message?.conversation ??
      msg?.message?.extendedTextMessage?.text ??
      '[mídia]';

    // Upsert Contact
    const contact = await this.prisma.contact.upsert({
      where: { phone },
      create: { phone, name: msg?.pushName ?? undefined, last_seen: new Date() },
      update: { last_seen: new Date(), name: msg?.pushName ?? undefined },
    });

    // Find or create active Conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        contact_id: contact.id,
        status: { in: ['NEW', 'IN_PROGRESS', 'WAITING'] },
      },
      orderBy: { created_at: 'desc' },
    });

    const isNewConversation = !conversation;
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { contact_id: contact.id, status: 'NEW' },
      });
    }

    // Save Message
    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversation.id,
        direction: 'IN',
        type: 'TEXT',
        content: rawText,
      },
    });

    this.logger.log(`Message from ${phone}: "${rawText}"`);

    // Emit realtime event to frontend
    this.gateway.emitNewMessage({ contact, conversation, message });

    // Trigger automations
    await this.automations.handle({
      phone,
      contact,
      conversation,
      messageText: rawText,
      isNewConversation,
    });
  }
}

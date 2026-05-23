import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';

export interface SaveIntegrationDto {
  provider?: string;
  base_url: string;
  api_key: string;
  instance_name: string;
}

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  async findActive() {
    return this.prisma.integration.findFirst({
      where: { status: { not: 'DISABLED' } },
      orderBy: { updated_at: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.integration.findMany({ orderBy: { updated_at: 'desc' } });
  }

  async save(dto: SaveIntegrationDto) {
    const existing = await this.prisma.integration.findUnique({
      where: { instance_name: dto.instance_name },
    });

    const integration = existing
      ? await this.prisma.integration.update({
          where: { instance_name: dto.instance_name },
          data: { ...dto, status: 'CONNECTING', updated_at: new Date() },
        })
      : await this.prisma.integration.create({
          data: { ...dto, status: 'CONNECTING' },
        });

    // Auto-register webhook on Evolution API
    try {
      const backendUrl =
        this.config.get<string>('BACKEND_PUBLIC_URL') ?? 'http://localhost:3001';

      await this.whatsapp.registerWebhook(
        dto.base_url,
        dto.api_key,
        dto.instance_name,
        `${backendUrl}/api/webhooks/whatsapp`,
      );

      return this.prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'CONNECTED', connected_at: new Date() },
      });
    } catch (err) {
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'DISCONNECTED' },
      });
      throw new BadRequestException(
        `Integration saved but webhook registration failed: ${(err as Error).message}`,
      );
    }
  }

  async remove(id: string) {
    const found = await this.prisma.integration.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Integration not found');
    return this.prisma.integration.delete({ where: { id } });
  }
}

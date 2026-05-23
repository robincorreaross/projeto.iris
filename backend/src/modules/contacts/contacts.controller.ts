import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.prisma.contact.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { last_seen: 'desc' },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.contact.findUniqueOrThrow({
      where: { id },
      include: { conversations: { include: { messages: true }, orderBy: { created_at: 'desc' } } },
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.contact.delete({ where: { id } });
  }
}

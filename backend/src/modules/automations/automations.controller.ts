import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('automations')
export class AutomationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.automation.findMany();
  }

  @Post()
  create(@Body() dto: any) {
    return this.prisma.automation.create({ data: dto });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.automation.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.automation.delete({ where: { id } });
  }
}

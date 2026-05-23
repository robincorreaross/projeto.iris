import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IntegrationsService, SaveIntegrationDto } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  findActive() {
    return this.service.findActive();
  }

  @Post()
  save(@Body() dto: SaveIntegrationDto) {
    return this.service.save(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

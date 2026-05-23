import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { WsModule } from './modules/ws/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    IntegrationsModule,
    WhatsappModule,
    WebhookModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    TemplatesModule,
    AutomationsModule,
    SettingsModule,
    UsersModule,
    WsModule,
  ],
})
export class AppModule {}

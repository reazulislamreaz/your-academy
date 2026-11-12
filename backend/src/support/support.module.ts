import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StorageModule } from '../storage/storage.module';
import { SupportAdminController } from './support-admin.controller';
import { SupportController } from './support.controller';
import { SupportConversationService } from './support-conversation.service';
import { SupportGateway } from './support.gateway';
import { SupportGuestService } from './support-guest.service';
import { SupportMessageService } from './support-message.service';
import { SupportPresenceService } from './support-presence.service';

@Module({
  imports: [JwtModule.register({}), StorageModule],
  controllers: [SupportController, SupportAdminController],
  providers: [
    SupportGuestService,
    SupportConversationService,
    SupportMessageService,
    SupportPresenceService,
    SupportGateway,
  ],
  exports: [SupportGuestService],
})
export class SupportModule {}

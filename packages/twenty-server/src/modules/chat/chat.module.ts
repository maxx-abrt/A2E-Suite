import { Module } from '@nestjs/common';

import { NotificationModule } from 'src/engine/core-modules/notification/notification.module';
import { RealtimeGatewayModule } from 'src/engine/core-modules/realtime-gateway/realtime-gateway.module';
import { MentionModule } from 'src/modules/mention/mention.module';
import { ChatMentionListener } from 'src/modules/chat/listeners/chat-mention.listener';
import { ChatRealtimeListener } from 'src/modules/chat/listeners/chat-realtime.listener';
import { ChatResolver } from 'src/modules/chat/resolvers/chat.resolver';
import { ChatMentionService } from 'src/modules/chat/services/chat-mention.service';
import { ChatMessageService } from 'src/modules/chat/services/chat-message.service';
import { ChatRealtimePublisherService } from 'src/modules/chat/services/chat-realtime-publisher.service';
import { ChatTypingService } from 'src/modules/chat/services/chat-typing.service';
import { ChatUnreadCountService } from 'src/modules/chat/services/chat-unread-count.service';

// P5.1 server domain module. It carries no tables: the chat entities are
// app-owned metadata objects (a2e-chat), so this module only adds behavior
// (cursor-paginated message reads, typing fan-out, durable write fan-out) on
// top of the shared WorkspaceOrmManager and the realtime gateway.
@Module({
  imports: [RealtimeGatewayModule, NotificationModule, MentionModule],
  providers: [
    ChatResolver,
    ChatMessageService,
    ChatTypingService,
    ChatUnreadCountService,
    ChatRealtimePublisherService,
    ChatRealtimeListener,
    ChatMentionService,
    ChatMentionListener,
  ],
})
export class ChatModule {}

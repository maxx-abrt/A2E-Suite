import { Module } from '@nestjs/common';

import { RealtimeGatewayModule } from 'src/engine/core-modules/realtime-gateway/realtime-gateway.module';
import { ChatResolver } from 'src/modules/chat/resolvers/chat.resolver';
import { ChatMessageService } from 'src/modules/chat/services/chat-message.service';
import { ChatTypingService } from 'src/modules/chat/services/chat-typing.service';

// P5.1 server domain module. It carries no tables: the chat entities are
// app-owned metadata objects (a2e-chat), so this module only adds behavior
// (cursor-paginated message reads, typing fan-out) on top of the shared
// WorkspaceOrmManager and the realtime gateway.
@Module({
  imports: [RealtimeGatewayModule],
  providers: [ChatResolver, ChatMessageService, ChatTypingService],
})
export class ChatModule {}

import { Module } from '@nestjs/common';

import { NotificationModule } from 'src/engine/core-modules/notification/notification.module';
import { RealtimeGatewayModule } from 'src/engine/core-modules/realtime-gateway/realtime-gateway.module';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { DocumentCommentMentionListener } from 'src/modules/mention/listeners/document-comment-mention.listener';
import { DocumentMentionListener } from 'src/modules/mention/listeners/document-mention.listener';
import { MentionAccessService } from 'src/modules/mention/services/mention-access.service';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';

// The cross-surface mentions engine (P8.2). No tables: it owns the shared parser,
// the member→user + permission filtering and the single notification emit seam,
// while each surface keeps its own listener (chat, document, comment).
@Module({
  imports: [NotificationModule, RealtimeGatewayModule, UserWorkspaceModule],
  providers: [
    MentionNotificationService,
    MentionAccessService,
    DocumentMentionListener,
    DocumentCommentMentionListener,
  ],
  exports: [MentionNotificationService],
})
export class MentionModule {}

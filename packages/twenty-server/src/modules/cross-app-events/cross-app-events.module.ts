import { Module } from '@nestjs/common';

import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { CrossAppLifecycleEventListener } from 'src/modules/cross-app-events/listeners/cross-app-lifecycle-event.listener';
import { CrossAppEventEmitterService } from 'src/modules/cross-app-events/services/cross-app-event-emitter.service';

// M11d: one cross-app lifecycle contract shared by recipes and the Inbox. It
// reuses WorkspaceEventEmitter (no second event bus) and only projects onto the
// contract, so adding a family never adds a per-pair subscription.
@Module({
  imports: [WorkspaceCacheModule],
  providers: [CrossAppEventEmitterService, CrossAppLifecycleEventListener],
  exports: [CrossAppEventEmitterService],
})
export class CrossAppEventsModule {}

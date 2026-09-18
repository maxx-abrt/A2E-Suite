import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type NotificationWatchTargetKind } from 'src/engine/core-modules/notification/constants/notification-watch-target-kind.constant';

@ObjectType('NotificationWatch')
export class NotificationWatchDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field({ nullable: false })
  targetKind: NotificationWatchTargetKind;

  @Field({ nullable: true })
  targetId: string | null;
}

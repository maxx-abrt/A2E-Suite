import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type NotificationWatchTargetKind } from 'src/engine/core-modules/notification/constants/notification-watch-target-kind.constant';

@ObjectType('NotificationWatch')
export class NotificationWatchDTO {
  @Field(() => UUIDScalarType)
  id: string;

  // A string-literal union reflects as Object; the resolver validates values.
  @Field(() => String, { nullable: false })
  targetKind: NotificationWatchTargetKind;

  @Field(() => String, { nullable: true })
  targetId: string | null;
}

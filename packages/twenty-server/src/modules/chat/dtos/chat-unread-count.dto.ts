import { Field, Int, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// One channel's unread state for the authenticated member. The query returns a
// list so the P5.2 sidebar can bold every followed channel in one round trip.
@ObjectType('ChatUnreadCount')
export class ChatUnreadCountDTO {
  @Field(() => UUIDScalarType)
  channelId: string;

  @Field(() => Int)
  unreadCount: number;
}

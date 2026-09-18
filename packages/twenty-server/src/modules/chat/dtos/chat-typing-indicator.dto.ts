import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('ChatTypingIndicator')
export class ChatTypingIndicatorDTO {
  @Field(() => UUIDScalarType)
  channelId: string;

  @Field(() => UUIDScalarType)
  workspaceMemberId: string;

  @Field(() => Boolean)
  isTyping: boolean;

  @Field(() => String)
  occurredAt: string;
}

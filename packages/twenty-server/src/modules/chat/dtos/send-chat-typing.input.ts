import { Field, InputType } from '@nestjs/graphql';

import { IsBoolean, IsUUID } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class SendChatTypingInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  channelId: string;

  @Field(() => Boolean)
  @IsBoolean()
  isTyping: boolean;
}

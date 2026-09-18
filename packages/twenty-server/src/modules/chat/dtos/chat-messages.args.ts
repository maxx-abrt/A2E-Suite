import { ArgsType, Field, Int } from '@nestjs/graphql';

import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { MAX_CHAT_MESSAGE_PAGE_SIZE } from 'src/modules/chat/services/chat-message.service';

// Keyset args, mirroring the metadata findMany connection: `first`-style
// limit + opaque `after` cursor. `channelId` is required — chat history is
// always read one channel at a time.
@ArgsType()
export class ChatMessagesArgs {
  @Field(() => UUIDScalarType)
  @IsUUID()
  channelId: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CHAT_MESSAGE_PAGE_SIZE, {
    message: `Limit cannot exceed ${MAX_CHAT_MESSAGE_PAGE_SIZE} items`,
  })
  limit?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  after?: string;
}

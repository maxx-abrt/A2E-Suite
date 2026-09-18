import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// Projection of the app-owned `chatMessage` workspace object exposed by the
// cursor-paginated chat query. Only the fields the chat UI needs are read;
// the full metadata CRUD stays the write path.
@ObjectType('ChatMessage')
export class ChatMessageDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field(() => String, { nullable: true })
  body: string | null;

  @Field(() => UUIDScalarType)
  channelId: string;

  @Field(() => UUIDScalarType, { nullable: true })
  authorId: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  threadParentId: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  editedAt: string | null;

  @Field(() => String, { nullable: true })
  deletedAt: string | null;
}

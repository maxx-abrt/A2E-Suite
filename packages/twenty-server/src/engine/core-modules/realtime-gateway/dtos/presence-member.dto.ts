import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('PresenceMember')
export class PresenceMemberDTO {
  @Field(() => UUIDScalarType)
  userId: string;

  @Field(() => UUIDScalarType, { nullable: true })
  workspaceMemberId?: string;

  @Field(() => String)
  lastSeenAt: string;

  @Field(() => Boolean)
  isTyping: boolean;

  @Field(() => String, { nullable: true })
  typingContext?: string;
}

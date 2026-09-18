import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatMessagePageInfo')
export class ChatMessagePageInfoDTO {
  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => String, { nullable: true })
  endCursor: string | null;
}

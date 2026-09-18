import { Field, ObjectType } from '@nestjs/graphql';

import { ChatMessageDTO } from 'src/modules/chat/dtos/chat-message.dto';

@ObjectType('ChatMessageEdge')
export class ChatMessageEdgeDTO {
  @Field(() => ChatMessageDTO)
  node: ChatMessageDTO;

  @Field(() => String)
  cursor: string;
}

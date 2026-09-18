import { Field, ObjectType } from '@nestjs/graphql';

import { ChatMessageEdgeDTO } from 'src/modules/chat/dtos/chat-message-edge.dto';
import { ChatMessagePageInfoDTO } from 'src/modules/chat/dtos/chat-message-page-info.dto';

@ObjectType('ChatMessageConnection')
export class ChatMessageConnectionDTO {
  @Field(() => [ChatMessageEdgeDTO])
  edges: ChatMessageEdgeDTO[];

  @Field(() => ChatMessagePageInfoDTO)
  pageInfo: ChatMessagePageInfoDTO;
}

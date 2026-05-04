import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisher } from '@collab-u/shared';

import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageReaction } from './entities/message-reaction.entity';

import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatInternalController } from './chat-internal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      MessageAttachment,
      MessageReaction,
    ]),
  ],
  controllers: [ChatController, ChatInternalController],
  providers: [ChatService, EventPublisher],
  exports: [ChatService],
})
export class ChatModule {}

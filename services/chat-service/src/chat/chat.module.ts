import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageReaction } from './entities/message-reaction.entity';

import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatInternalController } from './chat-internal.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      MessageAttachment,
      MessageReaction,
    ]),
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'collabu-jwt-super-secret-key-change-in-production-2025',
        signOptions: {
          expiresIn: configService.get<any>('JWT_EXPIRATION', '3600s'),
        },
      }),
    }),
  ],
  controllers: [ChatController, ChatInternalController],
  providers: [
    ChatService,
    EventPublisher,
    ChatGateway,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => {
        return new MicroserviceHttpClient(httpService as any);
      },
      inject: [HttpService],
    },
  ],
  exports: [ChatService, MicroserviceHttpClient],
})
export class ChatModule {}

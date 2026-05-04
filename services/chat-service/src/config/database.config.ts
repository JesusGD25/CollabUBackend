import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Conversation } from '../chat/entities/conversation.entity';
import { ConversationParticipant } from '../chat/entities/conversation-participant.entity';
import { Message } from '../chat/entities/message.entity';
import { MessageAttachment } from '../chat/entities/message-attachment.entity';
import { MessageReaction } from '../chat/entities/message-reaction.entity';

export function databaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5435', 10),
    username: process.env.DB_USERNAME ?? 'collabu_admin',
    password: process.env.DB_PASSWORD ?? 'collabu_secret_2025',
    database: process.env.DB_NAME ?? 'chat_db',
    entities: [Conversation, ConversationParticipant, Message, MessageAttachment, MessageReaction],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
}

import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { ChatService } from './chat.service';
import { ConversationsQueryDto } from './dto';

@ApiExcludeController()
@Controller('internal/chat')
export class ChatInternalController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations/project/:projectId')
  getConversationsByProject(@Param('projectId') projectId: string) {
    return this.chatService.getConversationsByProject(projectId);
  }

  @Get('conversations/:conversationId/participants')
  getParticipants(@Param('conversationId') conversationId: string) {
    return this.chatService.getParticipants(conversationId);
  }
}

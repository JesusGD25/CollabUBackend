import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole } from '@collab-u/shared';

import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
  MessagesQueryDto,
  ConversationsQueryDto,
  SearchMessagesDto,
} from './dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ──────────────────────────────────────────────────────────────────
  // CONVERSACIONES
  // ──────────────────────────────────────────────────────────────────

  @Get('conversations')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar mis conversaciones' })
  @ApiResponse({ status: 200, description: 'Lista paginada de conversaciones' })
  getMyConversations(
    @CurrentUser() user: any,
    @Query() query: ConversationsQueryDto,
  ) {
    return this.chatService.getUserConversations(user.id, query);
  }

  @Post('conversations')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nueva conversación' })
  @ApiResponse({ status: 201, description: 'Conversación creada' })
  createConversation(
    @CurrentUser() user: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(user.id, dto);
  }

  @Get('conversations/:id')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener detalle de una conversación' })
  @ApiParam({ name: 'id', type: 'string' })
  getConversation(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.getConversationById(id, user.id);
  }

  @Put('conversations/:id/archive')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Archivar una conversación' })
  @ApiParam({ name: 'id', type: 'string' })
  archiveConversation(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.archiveConversation(id, user.id);
  }

  // ──────────────────────────────────────────────────────────────────
  // MENSAJES
  // ──────────────────────────────────────────────────────────────────

  @Get('conversations/:id/messages')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener mensajes de una conversación' })
  @ApiParam({ name: 'id', type: 'string' })
  getMessages(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.chatService.getMessages(user.id, id, query);
  }

  @Post('conversations/:id/messages')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enviar un mensaje' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado' })
  sendMessage(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, id, dto);
  }

  @Put('conversations/:id/read')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Marcar conversación como leída' })
  @ApiParam({ name: 'id', type: 'string' })
  markAsRead(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.markConversationAsRead(user.id, id);
  }

  @Put('messages/:messageId')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Editar un mensaje (máx 15 minutos)' })
  @ApiParam({ name: 'messageId', type: 'string' })
  editMessage(
    @CurrentUser() user: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(user.id, messageId, dto);
  }

  @Delete('messages/:messageId')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un mensaje propio' })
  @ApiParam({ name: 'messageId', type: 'string' })
  deleteMessage(
    @CurrentUser() user: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.chatService.deleteMessage(user.id, messageId);
  }

  // ──────────────────────────────────────────────────────────────────
  // REACCIONES
  // ──────────────────────────────────────────────────────────────────

  @Post('messages/:messageId/reactions/:emoji')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Agregar reacción a un mensaje' })
  @ApiParam({ name: 'messageId', type: 'string' })
  @ApiParam({ name: 'emoji', type: 'string' })
  addReaction(
    @CurrentUser() user: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.chatService.addReaction(user.id, messageId, emoji);
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar reacción de un mensaje' })
  @ApiParam({ name: 'messageId', type: 'string' })
  @ApiParam({ name: 'emoji', type: 'string' })
  removeReaction(
    @CurrentUser() user: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.chatService.removeReaction(user.id, messageId, emoji);
  }

  // ──────────────────────────────────────────────────────────────────
  // BÚSQUEDA
  // ──────────────────────────────────────────────────────────────────

  @Get('search')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar en mensajes de mis conversaciones' })
  @ApiQuery({ name: 'q', required: true })
  searchMessages(@CurrentUser() user: any, @Query() query: SearchMessagesDto) {
    return this.chatService.searchMessages(user.id, query);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@collab-u/shared';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationType } from './entities/conversation.entity';
import { MessageType } from './entities/message.entity';

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockChatService = {
  getUserConversations: jest.fn(),
  createConversation: jest.fn(),
  getConversationById: jest.fn(),
  archiveConversation: jest.fn(),
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  markConversationAsRead: jest.fn(),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  searchMessages: jest.fn(),
};

const USER = { id: 'user-uuid-1' };
const CONV_ID = 'conv-uuid-1';
const MSG_ID = 'msg-uuid-1';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
    jest.clearAllMocks();
  });

  describe('getMyConversations', () => {
    it('should return paginated conversations', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockChatService.getUserConversations.mockResolvedValue(paginated);

      const result = await controller.getMyConversations(USER, {});

      expect(mockChatService.getUserConversations).toHaveBeenCalledWith(USER.id, {});
      expect(result).toEqual(paginated);
    });
  });

  describe('createConversation', () => {
    it('should create a conversation and return it', async () => {
      const dto = { participantIds: ['user-2'] };
      const conv = { id: CONV_ID, type: ConversationType.DIRECT, createdBy: USER.id };
      mockChatService.createConversation.mockResolvedValue(conv);

      const result = await controller.createConversation(USER, dto);

      expect(mockChatService.createConversation).toHaveBeenCalledWith(USER.id, dto);
      expect(result).toEqual(conv);
    });
  });

  describe('getConversation', () => {
    it('should return conversation detail', async () => {
      const conv = { id: CONV_ID };
      mockChatService.getConversationById.mockResolvedValue(conv);

      const result = await controller.getConversation(USER, CONV_ID);

      expect(mockChatService.getConversationById).toHaveBeenCalledWith(CONV_ID, USER.id);
      expect(result).toEqual(conv);
    });
  });

  describe('archiveConversation', () => {
    it('should archive the conversation', async () => {
      mockChatService.archiveConversation.mockResolvedValue({ message: 'Conversación archivada' });

      const result = await controller.archiveConversation(USER, CONV_ID);

      expect(mockChatService.archiveConversation).toHaveBeenCalledWith(CONV_ID, USER.id);
      expect(result).toEqual({ message: 'Conversación archivada' });
    });
  });

  describe('getMessages', () => {
    it('should return messages with hasMore', async () => {
      const response = { data: [], hasMore: false };
      mockChatService.getMessages.mockResolvedValue(response);

      const result = await controller.getMessages(USER, CONV_ID, { limit: 50 });

      expect(mockChatService.getMessages).toHaveBeenCalledWith(USER.id, CONV_ID, { limit: 50 });
      expect(result).toEqual(response);
    });
  });

  describe('sendMessage', () => {
    it('should send a message and return it', async () => {
      const dto = { content: 'Hola!' };
      const msg = { id: MSG_ID, conversationId: CONV_ID, senderId: USER.id, content: dto.content };
      mockChatService.sendMessage.mockResolvedValue(msg);

      const result = await controller.sendMessage(USER, CONV_ID, dto);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(USER.id, CONV_ID, dto);
      expect(result).toEqual(msg);
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation messages as read', async () => {
      mockChatService.markConversationAsRead.mockResolvedValue({
        message: 'Mensajes marcados como leídos',
        count: 3,
      });

      const result = await controller.markAsRead(USER, CONV_ID);

      expect(mockChatService.markConversationAsRead).toHaveBeenCalledWith(USER.id, CONV_ID);
      expect(result).toEqual({ message: 'Mensajes marcados como leídos', count: 3 });
    });
  });

  describe('editMessage', () => {
    it('should edit a message', async () => {
      const dto = { content: 'Texto editado' };
      const updated = { id: MSG_ID, content: dto.content, isEdited: true };
      mockChatService.editMessage.mockResolvedValue(updated);

      const result = await controller.editMessage(USER, MSG_ID, dto);

      expect(mockChatService.editMessage).toHaveBeenCalledWith(USER.id, MSG_ID, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockChatService.deleteMessage.mockResolvedValue({ message: 'Mensaje eliminado' });

      const result = await controller.deleteMessage(USER, MSG_ID);

      expect(mockChatService.deleteMessage).toHaveBeenCalledWith(USER.id, MSG_ID);
      expect(result).toEqual({ message: 'Mensaje eliminado' });
    });
  });

  describe('addReaction', () => {
    it('should add a reaction to a message', async () => {
      const reaction = { id: 'r-1', messageId: MSG_ID, userId: USER.id, emoji: '👍' };
      mockChatService.addReaction.mockResolvedValue(reaction);

      const result = await controller.addReaction(USER, MSG_ID, '👍');

      expect(mockChatService.addReaction).toHaveBeenCalledWith(USER.id, MSG_ID, '👍');
      expect(result).toEqual(reaction);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction', async () => {
      mockChatService.removeReaction.mockResolvedValue({ message: 'Reacción eliminada' });

      const result = await controller.removeReaction(USER, MSG_ID, '👍');

      expect(mockChatService.removeReaction).toHaveBeenCalledWith(USER.id, MSG_ID, '👍');
      expect(result).toEqual({ message: 'Reacción eliminada' });
    });
  });

  describe('searchMessages', () => {
    it('should search messages and return paginated results', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockChatService.searchMessages.mockResolvedValue(paginated);

      const result = await controller.searchMessages(USER, { q: 'hola' });

      expect(mockChatService.searchMessages).toHaveBeenCalledWith(USER.id, { q: 'hola' });
      expect(result).toEqual(paginated);
    });
  });
});

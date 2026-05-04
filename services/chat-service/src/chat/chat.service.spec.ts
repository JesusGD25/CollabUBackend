import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventPublisher } from '@collab-u/shared';

import { ChatService } from './chat.service';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { ConversationParticipant, ParticipantRole } from './entities/conversation-participant.entity';
import { Message, MessageType } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageReaction } from './entities/message-reaction.entity';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_1 = 'user-uuid-1';
const USER_2 = 'user-uuid-2';
const CONV_ID = 'conv-uuid-1';
const MSG_ID = 'msg-uuid-1';

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: CONV_ID,
    type: ConversationType.DIRECT,
    name: null,
    description: null,
    projectId: null,
    avatarUrl: null,
    isActive: true,
    lastMessageAt: null,
    lastMessagePreview: null,
    createdBy: USER_1,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [],
    messages: [],
    ...overrides,
  } as unknown as Conversation;
}

function makeParticipant(overrides: Partial<ConversationParticipant> = {}): ConversationParticipant {
  return {
    id: 'part-uuid-1',
    conversationId: CONV_ID,
    userId: USER_1,
    role: ParticipantRole.OWNER,
    nickname: null,
    isMuted: false,
    lastReadAt: null,
    lastReadMessageId: null,
    unreadCount: 0,
    joinedAt: new Date(),
    leftAt: null,
    isActive: true,
    conversation: null,
    ...overrides,
  } as unknown as ConversationParticipant;
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: MSG_ID,
    conversationId: CONV_ID,
    senderId: USER_1,
    type: MessageType.TEXT,
    content: 'Hola, ¿cómo estás?',
    replyToId: null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    metadata: null,
    createdAt: new Date(),
    conversation: null,
    replyTo: null,
    attachments: [],
    reactions: [],
    ...overrides,
  } as unknown as Message;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepo: ReturnType<typeof createMockRepo>;
  let participantRepo: ReturnType<typeof createMockRepo>;
  let messageRepo: ReturnType<typeof createMockRepo>;
  let attachmentRepo: ReturnType<typeof createMockRepo>;
  let reactionRepo: ReturnType<typeof createMockRepo>;

  // QueryBuilder mock reutilizable
  const makeQb = (result?: any) => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
    getRawMany: jest.fn().mockResolvedValue(result ?? []),
    getMany: jest.fn().mockResolvedValue(result ?? []),
    getManyAndCount: jest.fn().mockResolvedValue([result ?? [], 0]),
    getOne: jest.fn().mockResolvedValue(result ?? null),
  });

  beforeEach(async () => {
    conversationRepo = createMockRepo();
    participantRepo = createMockRepo();
    messageRepo = createMockRepo();
    attachmentRepo = createMockRepo();
    reactionRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Conversation), useValue: conversationRepo },
        { provide: getRepositoryToken(ConversationParticipant), useValue: participantRepo },
        { provide: getRepositoryToken(Message), useValue: messageRepo },
        { provide: getRepositoryToken(MessageAttachment), useValue: attachmentRepo },
        { provide: getRepositoryToken(MessageReaction), useValue: reactionRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  // ── createConversation ───────────────────────────────────────────

  describe('createConversation', () => {
    it('should create a direct conversation and add participants', async () => {
      const dto = { participantIds: [USER_2] };
      const conv = makeConversation();

      // No existe conversación directa previa
      participantRepo.createQueryBuilder.mockReturnValue(makeQb(null));
      conversationRepo.create.mockReturnValue(conv);
      conversationRepo.save.mockResolvedValue(conv);
      participantRepo.create.mockImplementation((d) => d);
      participantRepo.save.mockResolvedValue(undefined);

      const result = await service.createConversation(USER_1, dto);

      expect(conversationRepo.save).toHaveBeenCalled();
      expect(participantRepo.save).toHaveBeenCalledTimes(2); // owner + member
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'chat.conversation.created',
        expect.objectContaining({ createdBy: USER_1 }),
        'chat-service',
      );
      expect(result).toEqual(conv);
    });

    it('should return existing direct conversation if one already exists', async () => {
      const dto = { participantIds: [USER_2] };
      const existingParticipant = makeParticipant({ conversationId: CONV_ID });
      const existingConv = makeConversation();

      participantRepo.createQueryBuilder.mockReturnValue(makeQb(existingParticipant));
      conversationRepo.findOne.mockResolvedValue(existingConv);

      const result = await service.createConversation(USER_1, dto);

      expect(conversationRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(existingConv);
    });

    it('should send initial message if provided', async () => {
      const dto = { participantIds: [USER_2], initialMessage: 'Hola!' };
      const conv = makeConversation();
      const msg = makeMessage({ content: 'Hola!' });

      participantRepo.createQueryBuilder.mockReturnValue(makeQb(null));
      conversationRepo.create.mockReturnValue(conv);
      conversationRepo.save.mockResolvedValue(conv);
      participantRepo.create.mockImplementation((d) => d);
      participantRepo.save.mockResolvedValue(undefined);
      // For sendMessage inside createConversation:
      participantRepo.findOne.mockResolvedValue(makeParticipant());
      messageRepo.create.mockReturnValue(msg);
      messageRepo.save.mockResolvedValue(msg);
      conversationRepo.update.mockResolvedValue(undefined);
      participantRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb(null)) // for findDirectConversation
        .mockReturnValue({ // for unread_count update in sendMessage
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        });

      await service.createConversation(USER_1, dto);

      expect(messageRepo.save).toHaveBeenCalled();
    });
  });

  // ── sendMessage ──────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('should save a message and update conversation preview', async () => {
      const dto = { content: 'Mensaje de prueba' };
      const participant = makeParticipant();
      const msg = makeMessage({ content: dto.content });

      participantRepo.findOne.mockResolvedValue(participant);
      messageRepo.create.mockReturnValue(msg);
      messageRepo.save.mockResolvedValue(msg);
      conversationRepo.update.mockResolvedValue(undefined);
      const qb = makeQb();
      participantRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.sendMessage(USER_1, CONV_ID, dto);

      expect(messageRepo.save).toHaveBeenCalled();
      expect(conversationRepo.update).toHaveBeenCalledWith(
        CONV_ID,
        expect.objectContaining({ lastMessagePreview: dto.content }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'chat.message.sent',
        expect.objectContaining({ conversationId: CONV_ID, senderId: USER_1 }),
        'chat-service',
      );
      expect(result).toEqual(msg);
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      participantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.sendMessage(USER_1, CONV_ID, { content: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getMessages ──────────────────────────────────────────────────

  describe('getMessages', () => {
    it('should return messages with hasMore flag', async () => {
      const participant = makeParticipant();
      const messages = Array.from({ length: 3 }, (_, i) =>
        makeMessage({ id: `msg-${i}`, content: `Mensaje ${i}` }),
      );

      participantRepo.findOne.mockResolvedValue(participant);
      const qb = makeQb(messages);
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMessages(USER_1, CONV_ID, { limit: 50 });

      expect(result.hasMore).toBe(false);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      participantRepo.findOne.mockResolvedValue(null);

      await expect(service.getMessages(USER_1, CONV_ID, {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── editMessage ──────────────────────────────────────────────────

  describe('editMessage', () => {
    it('should edit message within time window', async () => {
      const msg = makeMessage({ createdAt: new Date() }); // recién creado
      const dto = { content: 'Texto editado' };
      const updated = { ...msg, content: dto.content, isEdited: true };

      messageRepo.findOne.mockResolvedValue(msg);
      messageRepo.save.mockResolvedValue(updated);

      const result = await service.editMessage(USER_1, MSG_ID, dto);

      expect(result.content).toBe(dto.content);
      expect(messageRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the sender', async () => {
      const msg = makeMessage({ senderId: USER_2 }); // otro usuario
      messageRepo.findOne.mockResolvedValue(msg);

      await expect(
        service.editMessage(USER_1, MSG_ID, { content: 'hack' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if edit window has passed', async () => {
      const oldDate = new Date(Date.now() - 20 * 60 * 1000); // 20 minutos atrás
      const msg = makeMessage({ createdAt: oldDate });
      messageRepo.findOne.mockResolvedValue(msg);

      await expect(
        service.editMessage(USER_1, MSG_ID, { content: 'tarde' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if message does not exist', async () => {
      messageRepo.findOne.mockResolvedValue(null);

      await expect(
        service.editMessage(USER_1, MSG_ID, { content: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteMessage ────────────────────────────────────────────────

  describe('deleteMessage', () => {
    it('should soft-delete a message', async () => {
      const msg = makeMessage();
      messageRepo.findOne.mockResolvedValue(msg);
      messageRepo.save.mockResolvedValue({ ...msg, isDeleted: true });

      const result = await service.deleteMessage(USER_1, MSG_ID);

      expect(messageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isDeleted: true }),
      );
      expect(result).toEqual({ message: 'Mensaje eliminado' });
    });

    it('should throw ForbiddenException if user is not the sender', async () => {
      const msg = makeMessage({ senderId: USER_2 });
      messageRepo.findOne.mockResolvedValue(msg);

      await expect(service.deleteMessage(USER_1, MSG_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if message not found', async () => {
      messageRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteMessage(USER_1, MSG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── markConversationAsRead ───────────────────────────────────────

  describe('markConversationAsRead', () => {
    it('should reset unread_count and update last_read_at', async () => {
      const participant = makeParticipant({ unreadCount: 5 });
      const lastMsg = makeMessage();

      participantRepo.findOne
        .mockResolvedValueOnce(participant) // assertParticipant
        .mockResolvedValueOnce(participant); // update participant
      messageRepo.findOne.mockResolvedValue(lastMsg);
      participantRepo.save.mockResolvedValue({ ...participant, unreadCount: 0 });

      const result = await service.markConversationAsRead(USER_1, CONV_ID);

      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ unreadCount: 0 }),
      );
      expect(result).toEqual({ message: 'Mensajes marcados como leídos', count: 5 });
    });

    it('should throw ForbiddenException if not a participant', async () => {
      participantRepo.findOne.mockResolvedValue(null);

      await expect(service.markConversationAsRead(USER_1, CONV_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── archiveConversation ──────────────────────────────────────────

  describe('archiveConversation', () => {
    it('should mark participant as inactive', async () => {
      const participant = makeParticipant();
      participantRepo.findOne.mockResolvedValue(participant);
      participantRepo.save.mockResolvedValue({ ...participant, isActive: false });

      const result = await service.archiveConversation(CONV_ID, USER_1);

      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(result).toEqual({ message: 'Conversación archivada' });
    });
  });

  // ── addReaction / removeReaction ─────────────────────────────────

  describe('addReaction', () => {
    it('should create a new reaction', async () => {
      const msg = makeMessage();
      const participant = makeParticipant();
      const reaction = { id: 'r-1', messageId: MSG_ID, userId: USER_1, emoji: '👍' };

      messageRepo.findOne.mockResolvedValue(msg);
      participantRepo.findOne.mockResolvedValue(participant);
      reactionRepo.findOne.mockResolvedValue(null);
      reactionRepo.create.mockReturnValue(reaction);
      reactionRepo.save.mockResolvedValue(reaction);

      const result = await service.addReaction(USER_1, MSG_ID, '👍');

      expect(reactionRepo.save).toHaveBeenCalled();
      expect(result).toEqual(reaction);
    });

    it('should return existing reaction if already reacted', async () => {
      const msg = makeMessage();
      const participant = makeParticipant();
      const existing = { id: 'r-1', messageId: MSG_ID, userId: USER_1, emoji: '👍' };

      messageRepo.findOne.mockResolvedValue(msg);
      participantRepo.findOne.mockResolvedValue(participant);
      reactionRepo.findOne.mockResolvedValue(existing);

      const result = await service.addReaction(USER_1, MSG_ID, '👍');

      expect(reactionRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction', async () => {
      const reaction = { id: 'r-1', messageId: MSG_ID, userId: USER_1, emoji: '👍' };
      reactionRepo.findOne.mockResolvedValue(reaction);
      reactionRepo.remove.mockResolvedValue(undefined);

      const result = await service.removeReaction(USER_1, MSG_ID, '👍');

      expect(reactionRepo.remove).toHaveBeenCalledWith(reaction);
      expect(result).toEqual({ message: 'Reacción eliminada' });
    });

    it('should throw NotFoundException if reaction not found', async () => {
      reactionRepo.findOne.mockResolvedValue(null);

      await expect(service.removeReaction(USER_1, MSG_ID, '👍')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── searchMessages ───────────────────────────────────────────────

  describe('searchMessages', () => {
    it('should return empty result when user has no conversations', async () => {
      participantRepo.find.mockResolvedValue([]);

      const result = await service.searchMessages(USER_1, { q: 'hola' });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    });

    it('should search messages across user conversations', async () => {
      const participant = makeParticipant();
      const msg = makeMessage({ content: 'Hola mundo' });

      participantRepo.find.mockResolvedValue([participant]);
      const qb = makeQb([msg]);
      qb.getManyAndCount.mockResolvedValue([[msg], 1]);
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchMessages(USER_1, { q: 'hola' });

      expect(result.total).toBe(1);
      expect(result.data[0]).toEqual(msg);
    });
  });
});

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EventPublisher } from '@collab-u/shared';

import { Conversation, ConversationType } from './entities/conversation.entity';
import { ConversationParticipant, ParticipantRole } from './entities/conversation-participant.entity';
import { Message, MessageType } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageReaction } from './entities/message-reaction.entity';

import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
  MessagesQueryDto,
  ConversationsQueryDto,
  SearchMessagesDto,
} from './dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  /** Minutos máximos para editar un mensaje */
  private readonly EDIT_WINDOW_MINUTES = 15;

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepo: Repository<MessageAttachment>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // CONVERSACIONES
  // ──────────────────────────────────────────────────────────────────

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    const type = dto.type ?? ConversationType.DIRECT;

    // Para conversaciones directas, verificar que no exista ya entre los mismos dos usuarios
    if (type === ConversationType.DIRECT && dto.participantIds.length === 1) {
      const existing = await this.findDirectConversation(userId, dto.participantIds[0]);
      if (existing) return existing;
    }

    const conversation = this.conversationRepo.create({
      type,
      name: dto.name,
      description: dto.description,
      projectId: dto.projectId,
      createdBy: userId,
      isActive: true,
    });
    await this.conversationRepo.save(conversation);

    // Añadir al creador como OWNER
    const creatorParticipant = this.participantRepo.create({
      conversationId: conversation.id,
      userId,
      role: ParticipantRole.OWNER,
    });
    await this.participantRepo.save(creatorParticipant);

    // Añadir el resto de participantes como MEMBER
    const memberParticipants = dto.participantIds.map((pid) =>
      this.participantRepo.create({
        conversationId: conversation.id,
        userId: pid,
        role: ParticipantRole.MEMBER,
      }),
    );
    await this.participantRepo.save(memberParticipants);

    // Enviar mensaje inicial si se proporcionó
    if (dto.initialMessage) {
      await this.sendMessage(userId, conversation.id, {
        content: dto.initialMessage,
        type: MessageType.TEXT,
      });
    }

    await this.eventPublisher.publish(
      'chat.conversation.created',
      { conversationId: conversation.id, createdBy: userId, type },
      'chat-service',
    );

    this.logger.log(`Conversación ${conversation.id} creada por ${userId}`);
    return conversation;
  }

  async getUserConversations(
    userId: string,
    query: ConversationsQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Obtener IDs de conversaciones donde el usuario es participante activo
    const participantQb = this.participantRepo
      .createQueryBuilder('p')
      .select('p.conversation_id', 'conversationId')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.is_active = true');

    const participations = await participantQb.getRawMany();
    const conversationIds = participations.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .where('c.id IN (:...ids)', { ids: conversationIds })
      .andWhere('c.is_active = :isActive', { isActive: query.isArchived !== true });

    const [data, total] = await qb
      .orderBy('c.last_message_at', 'DESC', 'NULLS LAST')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Enriquecer con unread_count del participante
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const participant = await this.participantRepo.findOne({
          where: { conversationId: conv.id, userId },
        });
        return { ...conv, unreadCount: participant?.unreadCount ?? 0 };
      }),
    );

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversationById(conversationId: string, userId: string): Promise<Conversation> {
    await this.assertParticipant(conversationId, userId);
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversación no encontrada');
    return conv;
  }

  async archiveConversation(conversationId: string, userId: string): Promise<{ message: string }> {
    const participant = await this.assertParticipant(conversationId, userId);
    // Archivar marcando al participante como inactivo
    participant.isActive = false;
    participant.leftAt = new Date();
    await this.participantRepo.save(participant);
    return { message: 'Conversación archivada' };
  }

  // ──────────────────────────────────────────────────────────────────
  // MENSAJES
  // ──────────────────────────────────────────────────────────────────

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    await this.assertParticipant(conversationId, userId);

    const message = this.messageRepo.create({
      conversationId,
      senderId: userId,
      type: dto.type ?? MessageType.TEXT,
      content: dto.content,
      replyToId: dto.replyToId ?? undefined,
    });
    await this.messageRepo.save(message);

    // Actualizar last_message en conversación
    await this.conversationRepo.update(conversationId, {
      lastMessageAt: message.createdAt,
      lastMessagePreview: dto.content?.substring(0, 255),
    });

    // Incrementar unread_count para todos los participantes excepto el remitente
    await this.participantRepo
      .createQueryBuilder()
      .update()
      .set({ unreadCount: () => 'unread_count + 1' })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('user_id != :userId', { userId })
      .andWhere('is_active = true')
      .execute();

    await this.eventPublisher.publish(
      'chat.message.sent',
      {
        messageId: message.id,
        conversationId,
        senderId: userId,
        content: dto.content?.substring(0, 255),
      },
      'chat-service',
    );

    this.logger.log(`Mensaje ${message.id} enviado en conversación ${conversationId}`);
    return message;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    query: MessagesQueryDto,
  ): Promise<{ data: Message[]; hasMore: boolean }> {
    await this.assertParticipant(conversationId, userId);

    const limit = query.limit ?? 50;
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.conversation_id = :conversationId', { conversationId })
      .andWhere('m.is_deleted = false')
      .orderBy('m.created_at', 'DESC')
      .take(limit + 1);

    if (query.before) {
      const ref = await this.messageRepo.findOne({ where: { id: query.before } });
      if (ref) {
        qb.andWhere('m.created_at < :refDate', { refDate: ref.createdAt });
      }
    }

    if (query.after) {
      const ref = await this.messageRepo.findOne({ where: { id: query.after } });
      if (ref) {
        qb.andWhere('m.created_at > :refDate', { refDate: ref.createdAt });
      }
    }

    const messages = await qb.getMany();
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return { data: messages.reverse(), hasMore };
  }

  async editMessage(
    userId: string,
    messageId: string,
    dto: EditMessageDto,
  ): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message || message.isDeleted) throw new NotFoundException('Mensaje no encontrado');
    if (message.senderId !== userId) throw new ForbiddenException('Solo puedes editar tus propios mensajes');

    const ageMs = Date.now() - message.createdAt.getTime();
    const ageMinutes = ageMs / 60000;
    if (ageMinutes > this.EDIT_WINDOW_MINUTES) {
      throw new BadRequestException(
        `Solo puedes editar mensajes dentro de los ${this.EDIT_WINDOW_MINUTES} minutos siguientes`,
      );
    }

    message.content = dto.content;
    message.isEdited = true;
    message.editedAt = new Date();
    return this.messageRepo.save(message);
  }

  async deleteMessage(userId: string, messageId: string): Promise<{ message: string }> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message || message.isDeleted) throw new NotFoundException('Mensaje no encontrado');
    if (message.senderId !== userId) throw new ForbiddenException('Solo puedes eliminar tus propios mensajes');

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = null;
    await this.messageRepo.save(message);
    return { message: 'Mensaje eliminado' };
  }

  async markConversationAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ message: string; count: number }> {
    await this.assertParticipant(conversationId, userId);

    const lastMessage = await this.messageRepo.findOne({
      where: { conversationId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });

    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });

    if (!participant) throw new NotFoundException('Participante no encontrado');

    const unreadCount = participant.unreadCount;
    participant.lastReadAt = new Date();
    participant.lastReadMessageId = lastMessage?.id ?? null;
    participant.unreadCount = 0;
    await this.participantRepo.save(participant);

    return { message: 'Mensajes marcados como leídos', count: unreadCount };
  }

  // ──────────────────────────────────────────────────────────────────
  // REACCIONES
  // ──────────────────────────────────────────────────────────────────

  async addReaction(userId: string, messageId: string, emoji: string): Promise<MessageReaction> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message || message.isDeleted) throw new NotFoundException('Mensaje no encontrado');
    await this.assertParticipant(message.conversationId, userId);

    const existing = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji },
    });
    if (existing) return existing;

    const reaction = this.reactionRepo.create({ messageId, userId, emoji });
    return this.reactionRepo.save(reaction);
  }

  async removeReaction(userId: string, messageId: string, emoji: string): Promise<{ message: string }> {
    const reaction = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji },
    });
    if (!reaction) throw new NotFoundException('Reacción no encontrada');
    await this.reactionRepo.remove(reaction);
    return { message: 'Reacción eliminada' };
  }

  // ──────────────────────────────────────────────────────────────────
  // BÚSQUEDA
  // ──────────────────────────────────────────────────────────────────

  async searchMessages(
    userId: string,
    query: SearchMessagesDto,
  ): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Obtener conversaciones del usuario
    const participations = await this.participantRepo.find({
      where: { userId, isActive: true },
    });
    const allowedConversationIds = participations.map((p) => p.conversationId);

    if (allowedConversationIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.conversation_id IN (:...ids)', { ids: allowedConversationIds })
      .andWhere('m.is_deleted = false')
      .andWhere('m.content ILIKE :q', { q: `%${query.q}%` });

    if (query.conversationId) {
      qb.andWhere('m.conversation_id = :convId', { convId: query.conversationId });
    }

    const [data, total] = await qb
      .orderBy('m.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ──────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────

  /** Verifica que el usuario sea participante activo; retorna el registro */
  private async assertParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ConversationParticipant> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });
    if (!participant) {
      throw new ForbiddenException('No eres participante de esta conversación');
    }
    return participant;
  }

  /** Busca conversación directa entre dos usuarios */
  private async findDirectConversation(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | null> {
    // Buscar conversaciones directas donde ambos usuarios son participantes
    const p1 = await this.participantRepo
      .createQueryBuilder('p')
      .innerJoin(
        'conversation_participants',
        'p2',
        'p2.conversation_id = p.conversation_id AND p2.user_id = :userId2',
        { userId2 },
      )
      .innerJoin('conversations', 'c', 'c.id = p.conversation_id AND c.type = :type', {
        type: ConversationType.DIRECT,
      })
      .where('p.user_id = :userId1', { userId1 })
      .andWhere('p.is_active = true')
      .getOne();

    if (!p1) return null;
    return this.conversationRepo.findOne({ where: { id: p1.conversationId } });
  }

  // ──────────────────────────────────────────────────────────────────
  // MÉTODOS INTERNOS (inter-servicio)
  // ──────────────────────────────────────────────────────────────────

  async getParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    return this.participantRepo.find({
      where: { conversationId, isActive: true },
    });
  }

  async getConversationsByProject(projectId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { projectId, type: ConversationType.PROJECT, isActive: true },
    });
  }
}

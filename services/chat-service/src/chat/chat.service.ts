import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Conversation, ConversationType } from './entities/conversation.entity';
import { ConversationParticipant, ParticipantRole } from './entities/conversation-participant.entity';
import { Message, MessageType } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { ChatGateway } from './chat.gateway';

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
    private readonly httpClient: MicroserviceHttpClient,
    /**
     * ChatGateway se inyecta con forwardRef para romper el ciclo (gateway
     * depende del service para persistir mensajes; service usa gateway para
     * emitir por WebSocket cuando el mensaje llega por HTTP). @Optional
     * evita romper tests unitarios sin gateway registrado.
     */
    @Optional() @Inject(forwardRef(() => ChatGateway))
    private readonly gateway?: ChatGateway,
  ) {}

  // Helper para consultar los nombres y avatares reales de usuarios en batch
  private async fetchProfilesMap(userIds: string[]): Promise<Map<string, { displayName: string; avatarUrl?: string }>> {
    const profileMap = new Map<string, { displayName: string; avatarUrl?: string }>();
    const uniqueUserIds = Array.from(new Set(userIds)).filter(id => !!id);
    if (uniqueUserIds.length === 0) return profileMap;

    try {
      const profiles = await this.httpClient.post<Array<{ userId: string; firstName: string; lastName: string; avatarUrl: string | null }>>(
        'user',
        '/internal/users/batch-basic',
        { userIds: uniqueUserIds }
      );
      profiles.forEach(p => {
        profileMap.set(p.userId, {
          displayName: `${p.firstName} ${p.lastName}`.trim(),
          avatarUrl: p.avatarUrl || undefined,
        });
      });
    } catch (err: any) {
      this.logger.error(`Error fetching user profiles in batch: ${err.message}`);
    }
    return profileMap;
  }

  // ──────────────────────────────────────────────────────────────────
  // CONVERSACIONES
  // ──────────────────────────────────────────────────────────────────

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<any> {
    const type = dto.type ?? ConversationType.DIRECT;

    // Para conversaciones directas, verificar que no exista ya entre los mismos dos usuarios
    if (type === ConversationType.DIRECT && dto.participantIds.length === 1) {
      const existing = await this.findDirectConversation(userId, dto.participantIds[0]);
      if (existing) return this.getConversationById(existing.id, userId);
    }

    // Para conversaciones de proyecto, existe UNA sola por projectId — el
    // workspace la abre cada vez que se entra. Si ya está creada, se
    // devuelve; los nuevos participantes se agregan como MEMBER.
    if (type === ConversationType.PROJECT && dto.projectId) {
      const existing = await this.conversationRepo.findOne({
        where: { type: ConversationType.PROJECT, projectId: dto.projectId, isActive: true },
      });
      if (existing) {
        await this.ensureParticipants(existing.id, userId, dto.participantIds);
        return this.getConversationById(existing.id, userId);
      }
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
    return this.getConversationById(conversation.id, userId);
  }

  private async mapMessage(msg: Message, currentUserId: string, profileMap?: Map<string, { displayName: string }>): Promise<any> {
    const sender = await this.participantRepo.findOne({
      where: { conversationId: msg.conversationId, userId: msg.senderId },
    });

    let senderDisplayName = sender?.nickname || (msg.senderId === currentUserId ? 'Tú' : 'Usuario');
    if (msg.senderId !== currentUserId) {
      const profile = profileMap?.get(msg.senderId);
      if (profile) {
        senderDisplayName = profile.displayName;
      }
    }

    // Los adjuntos se cargan por consulta separada porque `mapMessage`
    // recibe entidades que provienen de listas paginadas sin relations.
    const attachments = await this.attachmentRepo.find({
      where: { messageId: msg.id },
      order: { createdAt: 'ASC' },
    });

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: senderDisplayName,
      content: msg.content,
      messageType: msg.type,
      isRead: false,
      createdAt: msg.createdAt,
      attachments: attachments.map((a) => ({
        id: a.id,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        fileSizeBytes: a.fileSizeBytes,
        mimeType: a.mimeType,
        thumbnailUrl: a.thumbnailUrl,
      })),
    };
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

    // Recolectar todos los userIds de los participantes para buscar perfiles en batch
    const allUserIds: string[] = [];
    const rawConversationsData = await Promise.all(
      data.map(async (conv) => {
        const participant = await this.participantRepo.findOne({
          where: { conversationId: conv.id, userId },
        });

        const participants = await this.participantRepo.find({
          where: { conversationId: conv.id, isActive: true },
        });

        participants.forEach(p => allUserIds.push(p.userId));

        return { conv, participant, participants };
      })
    );

    const profileMap = await this.fetchProfilesMap(allUserIds);

    const enriched = await Promise.all(
      rawConversationsData.map(async ({ conv, participant, participants }) => {
        const enrichedParticipants = participants.map((p) => {
          const profile = profileMap.get(p.userId);
          return {
            userId: p.userId,
            displayName: profile?.displayName || p.nickname || (p.role === ParticipantRole.OWNER ? 'Empresa' : 'Estudiante'),
            avatarUrl: profile?.avatarUrl || undefined,
            role: p.role,
            isOnline: false,
          };
        });

        let lastMessage: any = undefined;
        if (conv.lastMessageAt) {
          const lastMsgEntity = await this.messageRepo.findOne({
            where: { conversationId: conv.id },
            order: { createdAt: 'DESC' },
          });
          if (lastMsgEntity) {
            lastMessage = await this.mapMessage(lastMsgEntity, userId, profileMap);
          }
        }

        return {
          id: conv.id,
          name: conv.name,
          description: conv.description,
          projectId: conv.projectId,
          isActive: conv.isActive,
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: conv.lastMessagePreview,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          unreadCount: participant?.unreadCount ?? 0,
          participants: enrichedParticipants,
          lastMessage,
        };
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

  async getConversationById(conversationId: string, userId: string): Promise<any> {
    await this.assertParticipant(conversationId, userId);
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversación no encontrada');

    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });

    const participants = await this.participantRepo.find({
      where: { conversationId, isActive: true },
    });

    const userIds = participants.map(p => p.userId);
    const profileMap = await this.fetchProfilesMap(userIds);

    const enrichedParticipants = participants.map((p) => {
      const profile = profileMap.get(p.userId);
      return {
        userId: p.userId,
        displayName: profile?.displayName || p.nickname || (p.role === ParticipantRole.OWNER ? 'Empresa' : 'Estudiante'),
        avatarUrl: profile?.avatarUrl || undefined,
        role: p.role,
        isOnline: false,
      };
    });

    let lastMessage: any = undefined;
    if (conv.lastMessageAt) {
      const lastMsgEntity = await this.messageRepo.findOne({
        where: { conversationId },
        order: { createdAt: 'DESC' },
      });
      if (lastMsgEntity) {
        lastMessage = await this.mapMessage(lastMsgEntity, userId, profileMap);
      }
    }

    return {
      id: conv.id,
      name: conv.name,
      description: conv.description,
      projectId: conv.projectId,
      isActive: conv.isActive,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      unreadCount: participant?.unreadCount ?? 0,
      participants: enrichedParticipants,
      lastMessage,
    };
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
  ): Promise<any> {
    await this.assertParticipant(conversationId, userId);

    // Con adjuntos y sin texto, el tipo derivado por el DTO puede llegar como
    // TEXT; se ajusta a FILE para que la UI renderice el bloque correcto.
    const hasAttachments = !!dto.attachments && dto.attachments.length > 0;
    const resolvedType = dto.type
      ?? (hasAttachments ? MessageType.FILE : MessageType.TEXT);

    const message = this.messageRepo.create({
      conversationId,
      senderId: userId,
      type: resolvedType,
      content: dto.content,
      replyToId: dto.replyToId ?? undefined,
    });
    await this.messageRepo.save(message);

    if (hasAttachments) {
      const rows = dto.attachments!.map((a) =>
        this.attachmentRepo.create({
          messageId: message.id,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileSizeBytes: a.fileSizeBytes ?? null as any,
          mimeType: a.mimeType ?? null as any,
          thumbnailUrl: a.thumbnailUrl ?? null as any,
        }),
      );
      await this.attachmentRepo.save(rows);
    }

    // El preview de la conversación cae al nombre del primer adjunto cuando
    // el mensaje se envía sin texto — más legible que una cadena vacía.
    const previewSource = dto.content?.trim()
      ? dto.content
      : hasAttachments
        ? `📎 ${dto.attachments![0].fileName}`
        : '';

    await this.conversationRepo.update(conversationId, {
      lastMessageAt: message.createdAt,
      lastMessagePreview: previewSource.substring(0, 255),
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

    // Obtener los destinatarios para notificaciones
    const participants = await this.participantRepo.find({
      where: { conversationId, isActive: true },
    });
    const recipientIds = participants
      .map((p) => p.userId)
      .filter((id) => id !== userId);

    await this.eventPublisher.publish(
      'chat.message.sent',
      {
        messageId: message.id,
        conversationId,
        senderId: userId,
        content: dto.content?.substring(0, 255),
        recipientIds,
      },
      'chat-service',
    );

    this.logger.log(`Mensaje ${message.id} enviado en conversación ${conversationId}`);

    const profileMap = await this.fetchProfilesMap([userId]);
    // Version "para el remitente" — senderName aparece como "Tú".
    const mapped = await this.mapMessage(message, userId, profileMap);

    // Difundir por WebSocket a la sala. IMPORTANTE: usamos una segunda
    // versión donde senderName es el nombre real del remitente, no "Tú",
    // porque el mismo payload lo reciben todos los participantes de la
    // sala y el "Tú" solo tiene sentido para quien envía. El frontend
    // suplanta el nombre por "Tú" cuando detecta que senderId es el suyo.
    if (this.gateway?.server) {
      const broadcast = {
        ...mapped,
        senderName: profileMap.get(userId)?.displayName ?? mapped.senderName,
      };
      this.gateway.server
        .to(`conversation_${conversationId}`)
        .emit('message', broadcast);
    }

    return mapped;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    query: MessagesQueryDto,
  ): Promise<{ data: any[]; hasMore: boolean }> {
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
    } else if (query.page && query.page > 1) {
      const skip = (query.page - 1) * limit;
      qb.skip(skip);
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

    const senderIds = messages.map(m => m.senderId);
    const profileMap = await this.fetchProfilesMap(senderIds);

    const enrichedData = await Promise.all(
      messages.map((msg) => this.mapMessage(msg, userId, profileMap)),
    );

    return { data: enrichedData.reverse(), hasMore };
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

  /**
   * Asegura que los userIds pasados sean participantes activos de la
   * conversación. Idempotente: si ya existen, no hace nada; si no, crea
   * la fila como MEMBER. Se usa al reutilizar conversaciones de proyecto
   * cuando un rol nuevo (asesor, jurado) entra al workspace por primera vez.
   */
  private async ensureParticipants(
    conversationId: string,
    creatorId: string,
    participantIds: string[],
  ): Promise<void> {
    const ids = Array.from(new Set([creatorId, ...participantIds])).filter(Boolean);
    if (ids.length === 0) return;

    const existing = await this.participantRepo.find({
      where: { conversationId, userId: In(ids) },
    });
    const existingIds = new Set(existing.map((p) => p.userId));

    // Reactivar los que estaban inactivos (por si salieron del proyecto)
    const toReactivate = existing.filter((p) => !p.isActive);
    for (const p of toReactivate) {
      p.isActive = true;
      await this.participantRepo.save(p);
    }

    const toCreate = ids
      .filter((id) => !existingIds.has(id))
      .map((id) =>
        this.participantRepo.create({
          conversationId,
          userId: id,
          role: id === creatorId ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
          isActive: true,
        }),
      );
    if (toCreate.length > 0) {
      await this.participantRepo.save(toCreate);
    }
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });
    return !!participant;
  }

  async getUserConversationIds(userId: string): Promise<string[]> {
    const participations = await this.participantRepo.find({
      where: { userId, isActive: true },
      select: ['conversationId'],
    });
    return participations.map((p) => p.conversationId);
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

  /** Uso interno (subscribers de eventos): evita crear canales duplicados por proyecto+nombre. */
  async findConversationByProjectAndName(projectId: string, name: string): Promise<Conversation | null> {
    return this.conversationRepo.findOne({ where: { projectId, name, isActive: true } });
  }

  /** Uso interno: cierra un canal grupal por completo (p. ej. asesor-jurado al desvincularse el jurado). */
  async closeConversation(conversationId: string): Promise<void> {
    await this.conversationRepo.update({ id: conversationId }, { isActive: false });
  }

  /** Uso interno: agrega un participante a un canal grupal existente (p. ej. nuevo jurado). */
  async addParticipantIfMissing(conversationId: string, userId: string): Promise<void> {
    const existing = await this.participantRepo.findOne({ where: { conversationId, userId } });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await this.participantRepo.save(existing);
      }
      return;
    }
    await this.participantRepo.save(
      this.participantRepo.create({ conversationId, userId, role: ParticipantRole.MEMBER }),
    );
  }
}

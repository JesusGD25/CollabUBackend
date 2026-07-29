import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventPublisher } from '@collab-u/shared';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { StoredFile, FileCategory, FileStatus } from './entities/stored-file.entity';
import { FileVersion } from './entities/file-version.entity';
import { StorageQuota } from './entities/storage-quota.entity';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileQueryDto } from './dto/file-query.dto';
import { QuotaResponseDto } from './dto/quota-response.dto';

const MIME_VALIDATIONS: Record<string, { mimes: string[]; maxSize: number }> = {
  cv: {
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024,
  },
  avatar: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
  },
  deliverable: {
    mimes: [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip', 'application/x-rar-compressed', 'application/gzip',
    ],
    maxSize: 50 * 1024 * 1024,
  },
  report: {
    mimes: [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxSize: 25 * 1024 * 1024,
  },
};

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.com', '.msi', '.ps1'];

const QUOTA_BY_ROLE: Record<string, number> = {
  student: 500 * 1024 * 1024,
  company: 2 * 1024 * 1024 * 1024,
  faculty: 1024 * 1024 * 1024,
  admin: 5 * 1024 * 1024 * 1024,
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(StoredFile) private fileRepo: Repository<StoredFile>,
    @InjectRepository(FileVersion) private versionRepo: Repository<FileVersion>,
    @InjectRepository(StorageQuota) private quotaRepo: Repository<StorageQuota>,
    private readonly eventPublisher: EventPublisher,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    dto: UploadFileDto,
  ): Promise<StoredFile> {
    // Validate blocked extensions
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${ext}`);
    }

    // Validate by category
    const category = dto.category || FileCategory.OTHER;
    const validation = MIME_VALIDATIONS[category];
    if (validation) {
      if (!validation.mimes.includes(file.mimetype)) {
        throw new BadRequestException(`Tipo MIME no permitido para categoría ${category}: ${file.mimetype}`);
      }
      if (file.size > validation.maxSize) {
        throw new BadRequestException(
          `Archivo excede el tamaño máximo para ${category}: ${Math.round(validation.maxSize / 1024 / 1024)}MB`,
        );
      }
    }

    // Check quota
    const quota = await this.getOrCreateQuota(userId);
    if (Number(quota.usedStorageBytes) + file.size > Number(quota.maxStorageBytes)) {
      throw new BadRequestException('Cuota de almacenamiento excedida');
    }
    if (quota.totalFiles >= quota.maxFiles) {
      throw new BadRequestException('Número máximo de archivos alcanzado');
    }
    if (file.size > quota.maxFileSizeBytes) {
      throw new BadRequestException(
        `Archivo excede el tamaño máximo permitido: ${Math.round(quota.maxFileSizeBytes / 1024 / 1024)}MB`,
      );
    }

    // Generate stored name and path
    const storedName = `${uuidv4()}${ext}`;
    const storagePath = path.join(this.uploadDir, storedName);

    // Move file from temp to storage
    fs.renameSync(file.path, storagePath);

    // Calculate checksum
    const checksum = this.calculateChecksum(storagePath);

    // Create file record
    const storedFile = this.fileRepo.create({
      ownerId: userId,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      category,
      entityType: dto.entityType,
      entityId: dto.entityId,
      storagePath,
      isPublic: dto.isPublic || false,
      checksum,
      status: FileStatus.ACTIVE,
    });

    const saved = await this.fileRepo.save(storedFile);

    if (saved.isPublic && !saved.publicUrl) {
      saved.publicUrl = `/api/v1/storage/files/${saved.id}/download`;
      await this.fileRepo.update(saved.id, { publicUrl: saved.publicUrl });
    }

    // Update quota
    quota.usedStorageBytes = Number(quota.usedStorageBytes) + file.size;
    quota.totalFiles += 1;
    await this.quotaRepo.save(quota);

    // Create initial version
    await this.versionRepo.save(
      this.versionRepo.create({
        fileId: saved.id,
        versionNumber: 1,
        storedName,
        storagePath,
        fileSizeBytes: file.size,
        checksum,
        uploadedBy: userId,
        changeNote: 'Versión inicial',
      }),
    );

    await this.eventPublisher.publish('storage.file.uploaded', {
      fileId: saved.id,
      ownerId: userId,
      category,
      originalName: file.originalname,
    }, 'storage-service');

    this.logger.log(`Archivo subido: ${saved.id} (${file.originalname})`);
    return saved;
  }

  async getFiles(userId: string, query: FileQueryDto) {
    const qb = this.fileRepo.createQueryBuilder('file');
    qb.where('file.ownerId = :userId', { userId });
    qb.andWhere('file.status = :status', { status: FileStatus.ACTIVE });

    if (query.category) {
      qb.andWhere('file.category = :category', { category: query.category });
    }
    if (query.entityType) {
      qb.andWhere('file.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.entityId) {
      qb.andWhere('file.entityId = :entityId', { entityId: query.entityId });
    }

    qb.orderBy('file.createdAt', 'DESC');

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFileInfo(fileId: string, userId: string): Promise<StoredFile> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId },
      relations: ['versions'],
    });
    if (!file || file.status === FileStatus.DELETED) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (file.ownerId !== userId && !file.isPublic) {
      throw new ForbiddenException('No tienes acceso a este archivo');
    }
    return file;
  }

  async getFileForDownload(fileId: string, userId: string | null): Promise<{ file: StoredFile; filePath: string }> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file || file.status === FileStatus.DELETED) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (!file.isPublic && file.category !== FileCategory.CV && file.category !== FileCategory.PORTFOLIO && file.ownerId !== userId) {
      throw new ForbiddenException('No tienes acceso a este archivo');
    }
    if (!fs.existsSync(file.storagePath)) {
      throw new NotFoundException('Archivo físico no encontrado');
    }
    return { file, filePath: file.storagePath };
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (file.ownerId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar este archivo');
    }

    // Soft delete
    file.status = FileStatus.DELETED;
    await this.fileRepo.save(file);

    // Update quota
    const quota = await this.getOrCreateQuota(userId);
    quota.usedStorageBytes = Math.max(0, Number(quota.usedStorageBytes) - Number(file.fileSizeBytes));
    quota.totalFiles = Math.max(0, quota.totalFiles - 1);
    await this.quotaRepo.save(quota);

    await this.eventPublisher.publish('storage.file.deleted', {
      fileId: file.id,
      ownerId: userId,
    }, 'storage-service');

    this.logger.log(`Archivo eliminado (soft): ${fileId}`);
  }

  async uploadNewVersion(
    fileId: string,
    userId: string,
    file: Express.Multer.File,
    changeNote?: string,
  ): Promise<FileVersion> {
    const storedFile = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!storedFile || storedFile.status === FileStatus.DELETED) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (storedFile.ownerId !== userId) {
      throw new ForbiddenException('No tienes permiso para versionar este archivo');
    }

    // Check quota for size difference
    const quota = await this.getOrCreateQuota(userId);
    const sizeDiff = file.size - Number(storedFile.fileSizeBytes);
    if (sizeDiff > 0 && Number(quota.usedStorageBytes) + sizeDiff > Number(quota.maxStorageBytes)) {
      throw new BadRequestException('Cuota de almacenamiento excedida');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    const storagePath = path.join(this.uploadDir, storedName);

    fs.renameSync(file.path, storagePath);
    const checksum = this.calculateChecksum(storagePath);

    const newVersionNumber = storedFile.version + 1;

    const version = await this.versionRepo.save(
      this.versionRepo.create({
        fileId: storedFile.id,
        versionNumber: newVersionNumber,
        storedName,
        storagePath,
        fileSizeBytes: file.size,
        checksum,
        uploadedBy: userId,
        changeNote,
      }),
    );

    // Update main file record
    storedFile.version = newVersionNumber;
    storedFile.storedName = storedName;
    storedFile.storagePath = storagePath;
    storedFile.fileSizeBytes = file.size;
    storedFile.checksum = checksum;
    storedFile.mimeType = file.mimetype;
    await this.fileRepo.save(storedFile);

    // Update quota
    if (sizeDiff !== 0) {
      quota.usedStorageBytes = Number(quota.usedStorageBytes) + sizeDiff;
      await this.quotaRepo.save(quota);
    }

    this.logger.log(`Nueva versión ${newVersionNumber} para archivo ${fileId}`);
    return version;
  }

  async getQuota(userId: string): Promise<QuotaResponseDto> {
    const quota = await this.getOrCreateQuota(userId);
    const used = Number(quota.usedStorageBytes);
    const max = Number(quota.maxStorageBytes);
    return {
      maxStorageBytes: max,
      usedStorageBytes: used,
      usedPercentage: max > 0 ? Math.round((used / max) * 10000) / 100 : 0,
      maxFileSizeBytes: Number(quota.maxFileSizeBytes),
      totalFiles: quota.totalFiles,
      maxFiles: quota.maxFiles,
      remainingBytes: Math.max(0, max - used),
    };
  }

  async generateSignedUrl(fileId: string, userId: string, expiresInMinutes: number = 60): Promise<{ url: string; expiresAt: Date }> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file || file.status === FileStatus.DELETED) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (file.ownerId !== userId) {
      throw new ForbiddenException('No tienes acceso a este archivo');
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const token = crypto
      .createHmac('sha256', process.env.SIGNED_URL_SECRET || 'collabu-signed-url-secret')
      .update(`${fileId}:${expiresAt.getTime()}`)
      .digest('hex');

    const baseUrl = process.env.STORAGE_BASE_URL || `http://localhost:3013`;
    const url = `${baseUrl}/api/v1/storage/files/${fileId}/download?token=${token}&expires=${expiresAt.getTime()}`;

    return { url, expiresAt };
  }

  // ── INTERNAL ──

  async verifyFile(fileId: string, ownerId?: string): Promise<{ exists: boolean; ownerId: string | null; publicUrl: string | null }> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file || file.status === FileStatus.DELETED) {
      return { exists: false, ownerId: null, publicUrl: null };
    }
    if (ownerId && file.ownerId !== ownerId) {
      return { exists: true, ownerId: file.ownerId, publicUrl: null };
    }
    return { exists: true, ownerId: file.ownerId, publicUrl: file.publicUrl };
  }

  async cleanupOrphanedFiles(olderThanDays: number, category?: FileCategory): Promise<{ deletedCount: number; freedBytes: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const qb = this.fileRepo.createQueryBuilder('file');
    qb.where('file.status = :status', { status: FileStatus.DELETED });
    qb.andWhere('file.updatedAt < :cutoff', { cutoff });
    if (category) {
      qb.andWhere('file.category = :category', { category });
    }

    const files = await qb.getMany();
    let freedBytes = 0;

    for (const file of files) {
      // Delete physical file
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }
      // Delete version files
      const versions = await this.versionRepo.find({ where: { fileId: file.id } });
      for (const v of versions) {
        if (fs.existsSync(v.storagePath)) {
          fs.unlinkSync(v.storagePath);
        }
      }
      freedBytes += Number(file.fileSizeBytes);
      await this.versionRepo.delete({ fileId: file.id });
      await this.fileRepo.remove(file);
    }

    this.logger.log(`Cleanup: ${files.length} archivos eliminados, ${freedBytes} bytes liberados`);
    return { deletedCount: files.length, freedBytes };
  }

  // ── EVENTO: crear quota al registrar usuario ──

  async initializeQuota(userId: string, role: string): Promise<void> {
    const existing = await this.quotaRepo.findOne({ where: { userId } });
    if (existing) return;

    const maxStorage = QUOTA_BY_ROLE[role] || QUOTA_BY_ROLE.student;
    await this.quotaRepo.save(
      this.quotaRepo.create({
        userId,
        maxStorageBytes: maxStorage,
      }),
    );
    this.logger.log(`Quota inicializada para usuario ${userId} (${role}): ${maxStorage} bytes`);
  }

  // ── PRIVADO ──

  private async getOrCreateQuota(userId: string): Promise<StorageQuota> {
    let quota = await this.quotaRepo.findOne({ where: { userId } });
    if (!quota) {
      quota = await this.quotaRepo.save(
        this.quotaRepo.create({ userId }),
      );
    }
    return quota;
  }

  private calculateChecksum(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

import { EventPublisher } from '@collab-u/shared';

import { StorageService } from './storage.service';
import { StoredFile, FileCategory, FileStatus } from './entities/stored-file.entity';
import { FileVersion } from './entities/file-version.entity';
import { StorageQuota } from './entities/storage-quota.entity';

import * as fs from 'fs';
import * as crypto from 'crypto';

jest.mock('fs');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mock-checksum-sha256'),
    }),
  }),
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mock-signed-token'),
    }),
  }),
}));

// ─── Mocks ──────────────────────────────────────────────────────────

const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Helpers ────────────────────────────────────────────────────────

function createMockStoredFile(overrides: Partial<StoredFile> = {}): StoredFile {
  return {
    id: 'file-uuid-1',
    ownerId: 'user-uuid-1',
    originalName: 'test.pdf',
    storedName: 'uuid-generated.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024000,
    category: FileCategory.CV,
    entityType: null,
    entityId: null,
    storagePath: '/uploads/uuid-generated.pdf',
    publicUrl: null,
    thumbnailUrl: null,
    checksum: 'abc123',
    status: FileStatus.ACTIVE,
    isPublic: false,
    metadata: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    ...overrides,
  } as StoredFile;
}

function createMockQuota(overrides: Partial<StorageQuota> = {}): StorageQuota {
  return {
    id: 'quota-uuid-1',
    userId: 'user-uuid-1',
    maxStorageBytes: 104857600,
    usedStorageBytes: 0,
    maxFileSizeBytes: 10485760,
    totalFiles: 0,
    maxFiles: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as StorageQuota;
}

function createMockMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024000,
    destination: '/tmp',
    filename: 'temp-file.pdf',
    path: '/tmp/temp-file.pdf',
    buffer: Buffer.from(''),
    stream: null as any,
    ...overrides,
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('StorageService', () => {
  let service: StorageService;
  let fileRepo: any;
  let versionRepo: any;
  let quotaRepo: any;

  beforeEach(async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.renameSync as jest.Mock).mockReturnValue(undefined);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('file content'));
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: getRepositoryToken(StoredFile), useFactory: createMockRepo },
        { provide: getRepositoryToken(FileVersion), useFactory: createMockRepo },
        { provide: getRepositoryToken(StorageQuota), useFactory: createMockRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    fileRepo = module.get(getRepositoryToken(StoredFile));
    versionRepo = module.get(getRepositoryToken(FileVersion));
    quotaRepo = module.get(getRepositoryToken(StorageQuota));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPLOAD FILE
  // ═══════════════════════════════════════════════════════════════════
  describe('uploadFile', () => {
    it('debería subir un archivo correctamente', async () => {
      const file = createMockMulterFile();
      const dto = { category: FileCategory.CV };
      const quota = createMockQuota();
      const storedFile = createMockStoredFile();

      quotaRepo.findOne.mockResolvedValue(quota);
      fileRepo.create.mockReturnValue(storedFile);
      fileRepo.save.mockResolvedValue(storedFile);
      versionRepo.create.mockReturnValue({});
      versionRepo.save.mockResolvedValue({});
      quotaRepo.save.mockResolvedValue(quota);

      const result = await service.uploadFile('user-uuid-1', file, dto);

      expect(result).toBeDefined();
      expect(result.originalName).toBe('test.pdf');
      expect(fs.renameSync).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'storage.file.uploaded',
        expect.objectContaining({ ownerId: 'user-uuid-1' }),
        'storage-service',
      );
    });

    it('debería rechazar extensiones bloqueadas', async () => {
      const file = createMockMulterFile({ originalname: 'malware.exe' });

      await expect(
        service.uploadFile('user-uuid-1', file, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar MIME type inválido para categoría cv', async () => {
      const file = createMockMulterFile({ mimetype: 'image/png' });
      const dto = { category: FileCategory.CV };

      await expect(
        service.uploadFile('user-uuid-1', file, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar archivo que excede tamaño máximo de categoría', async () => {
      const file = createMockMulterFile({ size: 20 * 1024 * 1024 }); // 20MB
      const dto = { category: FileCategory.CV }; // max 10MB

      await expect(
        service.uploadFile('user-uuid-1', file, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si cuota excedida', async () => {
      const file = createMockMulterFile();
      const quota = createMockQuota({ usedStorageBytes: 104857599 }); // casi llena

      quotaRepo.findOne.mockResolvedValue(quota);

      await expect(
        service.uploadFile('user-uuid-1', file, { category: FileCategory.CV }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si limite de archivos alcanzado', async () => {
      const file = createMockMulterFile();
      const quota = createMockQuota({ totalFiles: 100, maxFiles: 100 });

      quotaRepo.findOne.mockResolvedValue(quota);

      await expect(
        service.uploadFile('user-uuid-1', file, { category: FileCategory.CV }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET FILES
  // ═══════════════════════════════════════════════════════════════════
  describe('getFiles', () => {
    it('debería retornar archivos paginados', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[createMockStoredFile()], 1]),
      };
      fileRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getFiles('user-uuid-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('debería filtrar por categoría', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      fileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.getFiles('user-uuid-1', { category: FileCategory.CV, page: 1, limit: 20 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'file.category = :category',
        { category: FileCategory.CV },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET FILE INFO
  // ═══════════════════════════════════════════════════════════════════
  describe('getFileInfo', () => {
    it('debería retornar información del archivo con versiones', async () => {
      const file = createMockStoredFile();
      fileRepo.findOne.mockResolvedValue(file);

      const result = await service.getFileInfo('file-uuid-1', 'user-uuid-1');

      expect(result).toEqual(file);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getFileInfo('non-existent', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si no es propietario ni público', async () => {
      const file = createMockStoredFile({ ownerId: 'other-user', isPublic: false });
      fileRepo.findOne.mockResolvedValue(file);

      await expect(
        service.getFileInfo('file-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir acceso a archivos públicos', async () => {
      const file = createMockStoredFile({ ownerId: 'other-user', isPublic: true });
      fileRepo.findOne.mockResolvedValue(file);

      const result = await service.getFileInfo('file-uuid-1', 'user-uuid-1');

      expect(result).toEqual(file);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE FILE
  // ═══════════════════════════════════════════════════════════════════
  describe('deleteFile', () => {
    it('debería hacer soft delete del archivo', async () => {
      const file = createMockStoredFile();
      const quota = createMockQuota({ usedStorageBytes: 1024000, totalFiles: 1 });
      fileRepo.findOne.mockResolvedValue(file);
      fileRepo.save.mockResolvedValue({ ...file, status: FileStatus.DELETED });
      quotaRepo.findOne.mockResolvedValue(quota);
      quotaRepo.save.mockResolvedValue(quota);

      await service.deleteFile('file-uuid-1', 'user-uuid-1');

      expect(fileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FileStatus.DELETED }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'storage.file.deleted',
        expect.objectContaining({ fileId: 'file-uuid-1' }),
        'storage-service',
      );
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteFile('non-existent', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si no es propietario', async () => {
      const file = createMockStoredFile({ ownerId: 'other-user' });
      fileRepo.findOne.mockResolvedValue(file);

      await expect(
        service.deleteFile('file-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPLOAD NEW VERSION
  // ═══════════════════════════════════════════════════════════════════
  describe('uploadNewVersion', () => {
    it('debería crear una nueva versión', async () => {
      const file = createMockStoredFile();
      const multerFile = createMockMulterFile();
      const quota = createMockQuota();

      fileRepo.findOne.mockResolvedValue(file);
      quotaRepo.findOne.mockResolvedValue(quota);
      versionRepo.create.mockReturnValue({});
      versionRepo.save.mockResolvedValue({ versionNumber: 2 });
      fileRepo.save.mockResolvedValue({ ...file, version: 2 });
      quotaRepo.save.mockResolvedValue(quota);

      const result = await service.uploadNewVersion('file-uuid-1', 'user-uuid-1', multerFile, 'Actualización');

      expect(result.versionNumber).toBe(2);
    });

    it('debería lanzar NotFoundException si archivo no existe', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.uploadNewVersion('non-existent', 'user-uuid-1', createMockMulterFile()),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si no es propietario', async () => {
      const file = createMockStoredFile({ ownerId: 'other-user' });
      fileRepo.findOne.mockResolvedValue(file);

      await expect(
        service.uploadNewVersion('file-uuid-1', 'user-uuid-1', createMockMulterFile()),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // QUOTA
  // ═══════════════════════════════════════════════════════════════════
  describe('getQuota', () => {
    it('debería retornar información de cuota', async () => {
      const quota = createMockQuota({ usedStorageBytes: 52428800 }); // 50MB
      quotaRepo.findOne.mockResolvedValue(quota);

      const result = await service.getQuota('user-uuid-1');

      expect(result.maxStorageBytes).toBe(104857600);
      expect(result.usedStorageBytes).toBe(52428800);
      expect(result.usedPercentage).toBe(50);
      expect(result.remainingBytes).toBe(52428800);
    });

    it('debería crear cuota si no existe', async () => {
      quotaRepo.findOne.mockResolvedValue(null);
      const newQuota = createMockQuota();
      quotaRepo.create.mockReturnValue(newQuota);
      quotaRepo.save.mockResolvedValue(newQuota);

      const result = await service.getQuota('user-uuid-1');

      expect(result).toBeDefined();
      expect(quotaRepo.save).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SIGNED URL
  // ═══════════════════════════════════════════════════════════════════
  describe('generateSignedUrl', () => {
    it('debería generar URL firmada', async () => {
      const file = createMockStoredFile();
      fileRepo.findOne.mockResolvedValue(file);

      const result = await service.generateSignedUrl('file-uuid-1', 'user-uuid-1', 60);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('expiresAt');
      expect(result.url).toContain('file-uuid-1');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.generateSignedUrl('non-existent', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si no es propietario', async () => {
      const file = createMockStoredFile({ ownerId: 'other-user' });
      fileRepo.findOne.mockResolvedValue(file);

      await expect(
        service.generateSignedUrl('file-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // VERIFY FILE (internal)
  // ═══════════════════════════════════════════════════════════════════
  describe('verifyFile', () => {
    it('debería retornar exists: true para archivo existente', async () => {
      const file = createMockStoredFile();
      fileRepo.findOne.mockResolvedValue(file);

      const result = await service.verifyFile('file-uuid-1');

      expect(result.exists).toBe(true);
      expect(result.ownerId).toBe('user-uuid-1');
    });

    it('debería retornar exists: false para archivo no existente', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      const result = await service.verifyFile('non-existent');

      expect(result.exists).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INITIALIZE QUOTA
  // ═══════════════════════════════════════════════════════════════════
  describe('initializeQuota', () => {
    it('debería crear cuota para nuevo usuario student', async () => {
      quotaRepo.findOne.mockResolvedValue(null);
      quotaRepo.create.mockReturnValue(createMockQuota());
      quotaRepo.save.mockResolvedValue(createMockQuota());

      await service.initializeQuota('user-uuid-1', 'student');

      expect(quotaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          maxStorageBytes: 500 * 1024 * 1024,
        }),
      );
    });

    it('debería no crear si ya existe', async () => {
      quotaRepo.findOne.mockResolvedValue(createMockQuota());

      await service.initializeQuota('user-uuid-1', 'student');

      expect(quotaRepo.create).not.toHaveBeenCalled();
    });

    it('debería asignar cuota según rol', async () => {
      quotaRepo.findOne.mockResolvedValue(null);
      quotaRepo.create.mockReturnValue(createMockQuota());
      quotaRepo.save.mockResolvedValue(createMockQuota());

      await service.initializeQuota('company-user', 'company');

      expect(quotaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxStorageBytes: 2 * 1024 * 1024 * 1024,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════
  describe('cleanupOrphanedFiles', () => {
    it('debería eliminar archivos huérfanos', async () => {
      const deletedFile = createMockStoredFile({ status: FileStatus.DELETED });
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([deletedFile]),
      };
      fileRepo.createQueryBuilder.mockReturnValue(mockQb);
      versionRepo.find.mockResolvedValue([]);
      versionRepo.delete.mockResolvedValue({});
      fileRepo.remove.mockResolvedValue(deletedFile);

      const result = await service.cleanupOrphanedFiles(30);

      expect(result.deletedCount).toBe(1);
      expect(result.freedBytes).toBe(1024000);
    });
  });
});

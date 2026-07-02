import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { FileCategory, FileStatus } from './entities/stored-file.entity';

const mockStorageService = {
  uploadFile: jest.fn(),
  getFiles: jest.fn(),
  getFileInfo: jest.fn(),
  getFileForDownload: jest.fn(),
  deleteFile: jest.fn(),
  uploadNewVersion: jest.fn(),
  getQuota: jest.fn(),
  generateSignedUrl: jest.fn(),
};

describe('StorageController', () => {
  let controller: StorageController;
  let service: typeof mockStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    }).compile();

    controller = module.get<StorageController>(StorageController);
    service = mockStorageService;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('debería subir un archivo', async () => {
      const user = { userId: 'user-uuid-1' };
      const file = { originalname: 'test.pdf', size: 1024 } as Express.Multer.File;
      const dto = { category: FileCategory.CV };
      const expected = { id: 'file-1', originalName: 'test.pdf' };
      service.uploadFile.mockResolvedValue(expected);

      const result = await controller.uploadFile(user, file, dto);

      expect(result).toEqual(expected);
      expect(service.uploadFile).toHaveBeenCalledWith('user-uuid-1', file, dto);
    });
  });

  describe('getFiles', () => {
    it('debería listar archivos del usuario', async () => {
      const user = { userId: 'user-uuid-1' };
      const query = { page: 1, limit: 20 };
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      service.getFiles.mockResolvedValue(expected);

      const result = await controller.getFiles(user, query);

      expect(result).toEqual(expected);
    });
  });

  describe('getFileInfo', () => {
    it('debería obtener información del archivo', async () => {
      const user = { userId: 'user-uuid-1' };
      const expected = { id: 'file-1', originalName: 'test.pdf' };
      service.getFileInfo.mockResolvedValue(expected);

      const result = await controller.getFileInfo(user, 'file-1');

      expect(result).toEqual(expected);
      expect(service.getFileInfo).toHaveBeenCalledWith('file-1', 'user-uuid-1');
    });
  });

  describe('deleteFile', () => {
    it('debería eliminar un archivo', async () => {
      const user = { userId: 'user-uuid-1' };
      service.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile(user, 'file-1');

      expect(service.deleteFile).toHaveBeenCalledWith('file-1', 'user-uuid-1');
    });
  });

  describe('getQuota', () => {
    it('debería obtener información de cuota', async () => {
      const user = { userId: 'user-uuid-1' };
      const expected = {
        maxStorageBytes: 104857600,
        usedStorageBytes: 0,
        usedPercentage: 0,
        maxFileSizeBytes: 10485760,
        totalFiles: 0,
        maxFiles: 100,
        remainingBytes: 104857600,
      };
      service.getQuota.mockResolvedValue(expected);

      const result = await controller.getQuota(user);

      expect(result).toEqual(expected);
    });
  });

  describe('generateSignedUrl', () => {
    it('debería generar URL firmada', async () => {
      const user = { userId: 'user-uuid-1' };
      const expected = { url: 'http://localhost:3013/...', expiresAt: new Date() };
      service.generateSignedUrl.mockResolvedValue(expected);

      const result = await controller.generateSignedUrl(user, 'file-1', 60);

      expect(result).toEqual(expected);
      expect(service.generateSignedUrl).toHaveBeenCalledWith('file-1', 'user-uuid-1', 60);
    });
  });
});

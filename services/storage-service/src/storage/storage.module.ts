import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoredFile } from './entities/stored-file.entity';
import { FileVersion } from './entities/file-version.entity';
import { StorageQuota } from './entities/storage-quota.entity';

import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { StorageInternalController } from './storage-internal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StoredFile, FileVersion, StorageQuota])],
  controllers: [StorageController, StorageInternalController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

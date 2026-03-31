import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { StorageService } from './storage.service';
import { FileCategory } from './entities/stored-file.entity';

@ApiTags('Storage Internal')
@Controller('internal/storage')
export class StorageInternalController {
  constructor(private readonly storageService: StorageService) {}

  @Get('files/:fileId/verify')
  @ApiOperation({ summary: 'Verificar existencia y propiedad de archivo (uso interno)' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiResponse({ status: 200, description: 'Resultado de verificación' })
  async verifyFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.storageService.verifyFile(fileId, ownerId);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Limpiar archivos huérfanos (uso interno)' })
  @ApiResponse({ status: 200, description: 'Resultado de limpieza' })
  async cleanup(
    @Body() body: { olderThanDays: number; category?: FileCategory },
  ) {
    return this.storageService.cleanupOrphanedFiles(body.olderThanDays, body.category);
  }
}

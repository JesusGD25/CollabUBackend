import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@collab-u/shared';
import type { Response } from 'express';
import * as fs from 'fs';

import { StorageService } from './storage.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileQueryDto } from './dto/file-query.dto';
import { multerConfig } from '../config/multer.config';

@ApiTags('Storage')
@Controller('api/v1/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivo' })
  @ApiResponse({ status: 201, description: 'Archivo subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o cuota excedida' })
  async uploadFile(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }
    return this.storageService.uploadFile(user.userId, file, dto);
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar archivos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista paginada de archivos' })
  async getFiles(@CurrentUser() user: any, @Query() query: FileQueryDto) {
    return this.storageService.getFiles(user.userId, query);
  }

  @Get('files/:fileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener información del archivo' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Información del archivo con versiones' })
  async getFileInfo(
    @CurrentUser() user: any,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.storageService.getFileInfo(fileId, user.userId);
  }

  @Get('files/:fileId/download')
  @ApiOperation({ summary: 'Descargar archivo' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Archivo binario' })
  async downloadFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const userId = user?.userId || null;
    const { file, filePath } = await this.storageService.getFileForDownload(fileId, userId);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
      'Content-Length': file.fileSizeBytes.toString(),
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Delete('files/:fileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar archivo' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  async deleteFile(
    @CurrentUser() user: any,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    await this.storageService.deleteFile(fileId, user.userId);
  }

  @Post('files/:fileId/versions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir nueva versión del archivo' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Nueva versión creada' })
  async uploadNewVersion(
    @CurrentUser() user: any,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('changeNote') changeNote?: string,
  ) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }
    return this.storageService.uploadNewVersion(fileId, user.userId, file, changeNote);
  }

  @Get('quota')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener uso de cuota de almacenamiento' })
  @ApiResponse({ status: 200, description: 'Información de cuota' })
  async getQuota(@CurrentUser() user: any) {
    return this.storageService.getQuota(user.userId);
  }

  @Post('files/:fileId/signed-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar URL firmada temporal' })
  @ApiParam({ name: 'fileId', type: 'string', format: 'uuid' })
  @ApiBody({ schema: { properties: { expiresInMinutes: { type: 'number', default: 60 } } } })
  @ApiResponse({ status: 200, description: 'URL firmada generada' })
  async generateSignedUrl(
    @CurrentUser() user: any,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body('expiresInMinutes') expiresInMinutes?: number,
  ) {
    return this.storageService.generateSignedUrl(fileId, user.userId, expiresInMinutes || 60);
  }
}

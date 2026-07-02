import { Expose, Type } from 'class-transformer';
import { FileCategory, FileStatus } from '../entities/stored-file.entity';

export class FileVersionResponseDto {
  @Expose() id: string;
  @Expose() versionNumber: number;
  @Expose() fileSizeBytes: number;
  @Expose() uploadedBy: string;
  @Expose() changeNote: string;
  @Expose() createdAt: Date;
}

export class FileResponseDto {
  @Expose() id: string;
  @Expose() originalName: string;
  @Expose() mimeType: string;
  @Expose() fileSizeBytes: number;
  @Expose() category: FileCategory;
  @Expose() entityType: string;
  @Expose() entityId: string;
  @Expose() publicUrl: string;
  @Expose() thumbnailUrl: string;
  @Expose() status: FileStatus;
  @Expose() isPublic: boolean;
  @Expose() version: number;
  @Expose() createdAt: Date;

  @Expose()
  @Type(() => FileVersionResponseDto)
  versions?: FileVersionResponseDto[];
}

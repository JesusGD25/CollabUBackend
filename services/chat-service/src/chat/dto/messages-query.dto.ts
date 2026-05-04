import { IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessagesQueryDto {
  @ApiPropertyOptional({ description: 'Cursor: traer mensajes anteriores a este ID' })
  @IsOptional()
  @IsUUID()
  before?: string;

  @ApiPropertyOptional({ description: 'Cursor: traer mensajes posteriores a este ID' })
  @IsOptional()
  @IsUUID()
  after?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

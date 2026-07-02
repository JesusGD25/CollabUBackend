import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({ description: 'Nuevo contenido del mensaje' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

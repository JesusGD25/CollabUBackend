import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AsesorCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  comment: string;
}

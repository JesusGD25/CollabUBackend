import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WithdrawApplicationDto {
  @ApiProperty({ description: 'Razón del retiro de la postulación', minLength: 10 })
  @IsString()
  @MinLength(10)
  withdrawalReason: string;
}

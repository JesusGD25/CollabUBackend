import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  timestamp: string;

  static success<T>(data: T, message = 'Operación exitosa', statusCode = 200): ApiResponseDto<T> {
    return {
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static created<T>(data: T, message = 'Recurso creado exitosamente'): ApiResponseDto<T> {
    return this.success(data, message, 201);
  }

  static error(message: string, statusCode = 500, error?: string): ApiResponseDto<null> {
    return {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
    };
  }
}

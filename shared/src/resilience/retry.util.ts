import { Logger } from '@nestjs/common';

const logger = new Logger('RetryUtil');

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    multiplier?: number;
    operationName?: string;
  } = {},
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1000, multiplier = 2, operationName = 'operation' } =
    options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === maxRetries) {
        logger.error(`${operationName} falló después de ${maxRetries + 1} intentos: ${error.message}`);
        throw error;
      }

      const delay = initialDelayMs * Math.pow(multiplier, attempt);
      logger.warn(
        `${operationName} falló (intento ${attempt + 1}/${maxRetries + 1}). Reintentando en ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${operationName}: retry exhausted`);
}

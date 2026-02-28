import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  timeout?: number;
  errorThreshold?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalCount = 0;
  private lastFailureTime = 0;
  private readonly logger = new Logger('CircuitBreaker');

  constructor(
    private readonly name: string,
    private readonly options: Required<CircuitBreakerOptions>,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit breaker SEMI-ABIERTO para: ${this.name}`);
      } else {
        throw new Error(`Circuit breaker ABIERTO para: ${this.name}`);
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.options.timeout),
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.totalCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.logger.log(`Circuit breaker CERRADO para: ${this.name}`);
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.totalCount++;
    this.lastFailureTime = Date.now();

    if (
      this.totalCount >= this.options.volumeThreshold &&
      (this.failureCount / this.totalCount) * 100 >= this.options.errorThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.logger.warn(`Circuit breaker ABIERTO para: ${this.name}`);
    }
  }
}

@Injectable()
export class CircuitBreakerService {
  private readonly breakers = new Map<string, CircuitBreaker>();

  getBreaker(
    serviceName: string,
    options?: CircuitBreakerOptions,
  ): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const breaker = new CircuitBreaker(serviceName, {
        timeout: options?.timeout ?? 5000,
        errorThreshold: options?.errorThreshold ?? 50,
        resetTimeout: options?.resetTimeout ?? 30000,
        volumeThreshold: options?.volumeThreshold ?? 5,
      });
      this.breakers.set(serviceName, breaker);
    }
    return this.breakers.get(serviceName)!;
  }
}

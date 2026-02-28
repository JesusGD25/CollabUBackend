import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel } from 'amqplib';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { RABBITMQ_CONFIG } from './rabbitmq.config';

@Injectable()
export class EventSubscriber implements OnModuleInit {
  private channel: Channel;
  private readonly logger = new Logger('EventSubscriber');

  constructor(@Inject('RABBITMQ_CONNECTION') private readonly connection: ChannelModel) {}

  async onModuleInit() {
    this.channel = await this.connection.createChannel();
    await this.channel.prefetch(RABBITMQ_CONFIG.prefetchCount);

    await this.channel.assertExchange(
      RABBITMQ_CONFIG.deadLetterExchange.name,
      RABBITMQ_CONFIG.deadLetterExchange.type,
      RABBITMQ_CONFIG.deadLetterExchange.options,
    );

    this.logger.log('EventSubscriber inicializado');
  }

  async subscribe(
    queueName: string,
    routingKey: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): Promise<void> {
    await this.channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': RABBITMQ_CONFIG.deadLetterExchange.name,
        'x-dead-letter-routing-key': `dlq.${routingKey}`,
      },
    });

    await this.channel.bindQueue(queueName, RABBITMQ_CONFIG.exchange.name, routingKey);

    this.channel.consume(queueName, async (msg) => {
      if (!msg) return;

      const event: DomainEvent = JSON.parse(msg.content.toString());
      const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;

      try {
        await handler(event);
        this.channel.ack(msg);
        this.logger.log(`Evento procesado: ${event.eventType} [${event.eventId}]`);
      } catch (error: any) {
        this.logger.error(
          `Error procesando evento: ${event.eventType} [${event.eventId}] - Intento ${retryCount + 1}`,
          error.stack,
        );

        if (retryCount < RABBITMQ_CONFIG.retry.maxRetries) {
          const delay =
            RABBITMQ_CONFIG.retry.initialDelayMs *
            Math.pow(RABBITMQ_CONFIG.retry.multiplier, retryCount);

          setTimeout(() => {
            this.channel.publish(RABBITMQ_CONFIG.exchange.name, event.eventType, msg.content, {
              ...msg.properties,
              headers: { ...msg.properties.headers, 'x-retry-count': retryCount + 1 },
            });
          }, delay);
          this.channel.ack(msg);
        } else {
          this.channel.nack(msg, false, false);
          this.logger.error(`Evento enviado a DLQ: ${event.eventType} [${event.eventId}]`);
        }
      }
    });

    this.logger.log(`Suscrito a: ${routingKey} → cola: ${queueName}`);
  }
}

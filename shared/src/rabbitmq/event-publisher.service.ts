import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { RABBITMQ_CONFIG } from './rabbitmq.config';

@Injectable()
export class EventPublisher implements OnModuleInit {
  private channel: Channel;
  private readonly logger = new Logger('EventPublisher');

  constructor(@Inject('RABBITMQ_CONNECTION') private readonly connection: ChannelModel) {}

  async onModuleInit() {
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(
      RABBITMQ_CONFIG.exchange.name,
      RABBITMQ_CONFIG.exchange.type,
      RABBITMQ_CONFIG.exchange.options,
    );
    this.logger.log('EventPublisher inicializado');
  }

  async publish(
    eventType: string,
    data: Record<string, any>,
    source: string,
    correlationId?: string,
  ): Promise<void> {
    const event: DomainEvent = {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      source,
      correlationId: correlationId || uuidv4(),
      data,
    };

    this.channel.publish(
      RABBITMQ_CONFIG.exchange.name,
      eventType,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId,
        correlationId: event.correlationId,
        timestamp: Date.now(),
      },
    );

    this.logger.log(`Evento publicado: ${eventType} [${event.eventId}]`);
  }
}

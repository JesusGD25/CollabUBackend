import { DynamicModule, Module, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { EventPublisher } from './event-publisher.service';
import { EventSubscriber } from './event-subscriber.service';
import { RABBITMQ_CONFIG } from './rabbitmq.config';

@Module({})
export class RabbitMQModule {
  static forRoot(): DynamicModule {
    return {
      module: RabbitMQModule,
      global: true,
      providers: [
        {
          provide: 'RABBITMQ_CONNECTION',
          useFactory: async () => {
            const logger = new Logger('RabbitMQ');
            const url = RABBITMQ_CONFIG.url;
            let retries = 5;

            while (retries > 0) {
              try {
                const connection = await amqplib.connect(url);
                logger.log('Conexión a RabbitMQ establecida');

                connection.on('error', (err) => {
                  logger.error('Error de conexión RabbitMQ:', err.message);
                });

                connection.on('close', () => {
                  logger.warn('Conexión a RabbitMQ cerrada');
                });

                return connection;
              } catch (error: any) {
                retries--;
                logger.warn(
                  `No se pudo conectar a RabbitMQ (${5 - retries}/5): ${error.message}`,
                );
                if (retries === 0) throw error;
                await new Promise((resolve) => setTimeout(resolve, 5000));
              }
            }
          },
        },
        EventPublisher,
        EventSubscriber,
      ],
      exports: ['RABBITMQ_CONNECTION', EventPublisher, EventSubscriber],
    };
  }
}

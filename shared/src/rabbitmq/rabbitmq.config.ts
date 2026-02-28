export const RABBITMQ_CONFIG = {
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',

  exchange: {
    name: 'collab-u.events',
    type: 'topic' as const,
    options: { durable: true },
  },

  deadLetterExchange: {
    name: 'collab-u.events.dlx',
    type: 'topic' as const,
    options: { durable: true },
  },

  prefetchCount: 10,

  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    multiplier: 2,
  },
};

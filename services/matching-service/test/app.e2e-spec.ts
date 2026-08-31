import request from 'supertest';

// Pega contra el proceso real ya corriendo (ver nota de diseño en matching-integration.e2e-spec.ts:
// bootear una segunda instancia de AppModule vía Test.createTestingModule quedaba colgada
// indefinidamente, muy probablemente por el EventSubscriber/RabbitMQModule intentando una
// segunda suscripción concurrente sobre las mismas colas).
const BASE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3007';

describe('AppController (e2e)', () => {
  it('/health (GET)', () => {
    return request(BASE_URL).get('/health').expect(200);
  });
});

import request from 'supertest';

// Pega contra el proceso real ya corriendo (ver nota de diseño en
// matching-service/test/matching-integration.e2e-spec.ts: bootear una segunda instancia de
// AppModule vía Test.createTestingModule quedaba colgada indefinidamente, muy probablemente el
// EventSubscriber/RabbitMQModule intentando una segunda suscripción concurrente).
const BASE_URL = process.env.STUDENT_SERVICE_URL || 'http://localhost:3003';

describe('AppController (e2e)', () => {
  it('/health (GET)', () => {
    return request(BASE_URL).get('/health').expect(200);
  });
});

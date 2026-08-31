import request from 'supertest';

// Pega contra el proceso real ya corriendo, no contra una segunda instancia de
// AppModule vía Test.createTestingModule: ese enfoque queda colgado indefinidamente
// cuando el proceso nativo ya está corriendo y suscrito a RabbitMQ (segunda
// suscripción concurrente sobre las mismas colas — ver matching-integration.e2e-spec.ts
// para la investigación original). Además AppController/AppService (boilerplate de
// `nest new`) nunca se registran en AppModule en ningún servicio — GET '/' nunca
// respondió "Hello World!" en producción, así que ese no es un comportamiento real que
// deba probarse; `/health` sí lo es.
const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

describe('AppController (e2e)', () => {
  it('/health (GET)', () => {
    return request(BASE_URL).get('/health').expect(200);
  });
});

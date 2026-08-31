/**
 * Test de regresión — encontrado en FASE 8 del plan de matching (ver
 * PLANNING_MATCHING_SERVICE_FIX.md / CONTEXTO_SESION_FRONTEND_APLICACIONES.md).
 *
 * Bug real: con `target >= ES2022` (`useDefineForClassFields`, confirmado en tsconfig.json
 * de este servicio), TODO campo opcional declarado en un DTO de class-validator queda como
 * propiedad propia `undefined` en la instancia transformada por `ValidationPipe`, aunque el
 * cliente no lo haya enviado. `Object.assign(profile, dto)` copiaba esas propiedades
 * `undefined` sobre la entidad, y TypeORM las persistía como SQL NULL — cualquier PATCH
 * parcial a `/students/profile` borraba silenciosamente TODOS los campos nullable no
 * incluidos en esa request (`studentCode`, `programId`, `headline`, `cvUrl`, etc).
 *
 * No lo detectaban los tests unitarios (`student.service.spec.ts`) porque llaman a
 * `service.updateProfile()` directo con objetos literales de TypeScript (que solo tienen
 * las claves realmente escritas) — nunca pasan por `ValidationPipe`/`class-transformer`,
 * que es donde se origina el bug. Este spec sí pega contra el servidor real (mismo patrón
 * que matching-integration.e2e-spec.ts: bootear una segunda instancia de AppModule via
 * Test.createTestingModule quedaba colgada, probablemente por el EventSubscriber/RabbitMQ).
 *
 * Requiere: student-service real corriendo (Docker + `npm run start:dev`) y el seed corrido.
 */
import request from 'supertest';

const BASE_URL = process.env.STUDENT_SERVICE_URL || 'http://localhost:3003';

// student01 del seed (dcf8907d / b9addbae) — tiene studentCode y programId reales poblados,
// justo los dos campos nullable que el bug borraba.
const STUDENT_USER_ID = 'b9addbae-f9b5-4577-b700-3b42a13edcd2';

function studentHeaders() {
  return {
    'x-user-id': STUDENT_USER_ID,
    'x-user-role': 'student',
    'x-user-email': 'e2e-student@collabu.dev',
  };
}

describe('Student profile — PATCH parcial no debe borrar campos no enviados (regresión)', () => {
  it('un PATCH que solo envía "bio" preserva studentCode y programId existentes', async () => {
    const before = await request(BASE_URL)
      .get('/api/v1/students/profile')
      .set(studentHeaders())
      .expect(200);

    const originalStudentCode = before.body.studentCode;
    const originalProgramId = before.body.programId;
    const originalProgram = before.body.program;

    // Precondición del propio test: si el entorno no tiene estos campos poblados, el test
    // no probaría nada real — falla explícito en vez de dar un falso positivo.
    expect(originalStudentCode).toBeTruthy();
    expect(originalProgramId).toBeTruthy();

    try {
      const patched = await request(BASE_URL)
        .patch('/api/v1/students/profile')
        .set(studentHeaders())
        .send({ bio: 'regresión FASE 8 — no debe borrar otros campos' })
        .expect(200);

      expect(patched.body.bio).toBe('regresión FASE 8 — no debe borrar otros campos');
      expect(patched.body.studentCode).toBe(originalStudentCode);
      expect(patched.body.programId).toBe(originalProgramId);
      expect(patched.body.program).toBe(originalProgram);

      const after = await request(BASE_URL)
        .get('/api/v1/students/profile')
        .set(studentHeaders())
        .expect(200);

      expect(after.body.studentCode).toBe(originalStudentCode);
      expect(after.body.programId).toBe(originalProgramId);
    } finally {
      // Restaura bio al estado original para no dejar residuo del test en el seed.
      await request(BASE_URL)
        .patch('/api/v1/students/profile')
        .set(studentHeaders())
        .send({ bio: before.body.bio ?? '' });
    }
  });
});

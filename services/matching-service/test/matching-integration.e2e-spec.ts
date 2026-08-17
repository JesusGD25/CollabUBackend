/**
 * FASE 7 — Tests de integración reales del Matching Service.
 *
 * A diferencia de matching.service.spec.ts (unitario, HTTP mockeado), este spec pega
 * directo contra el matching-service REAL ya corriendo en localhost:3007 (Docker +
 * `npm run start:dev`, ver GUIA_EJECUCION.md), que a su vez hace llamadas HTTP reales,
 * sin mocks, a student-service (3003), project-service (3005) y admin-service (3011).
 *
 * Diseño: se prefirió pegar contra el proceso ya corriendo en vez de bootear una segunda
 * instancia de AppModule vía Test.createTestingModule — se probó ese enfoque primero y
 * quedaba colgado indefinidamente al inicializar (muy probablemente el EventSubscriber/
 * RabbitMQModule intentando una segunda suscripción concurrente sobre las mismas colas).
 * Pegar contra el proceso real es además más fiel a "integración real": ejercita el mismo
 * proceso que sirve producción/desarrollo, no una réplica paralela.
 *
 * Requisitos para correr este spec:
 *   - Los 14 servicios + infraestructura Docker corriendo (GUIA_EJECUCION.md).
 *   - Seed corrido: Backend/scripts/Run-Seed.ps1
 *   - node Backend/scripts/migrate-skills-unification.mjs
 *   - node Backend/scripts/migrate-student-program.mjs
 *
 * Los 9 pares estudiante/proyecto y sus scores esperados fueron calculados A MANO antes
 * de sembrar (ver PLANNING_MATCHING_SERVICE_FIX.md FASE 6) y verificados contra el
 * algoritmo real vía curl. Este spec convierte esa validación manual en un test repetible.
 *
 * No muta la base de datos de forma destructiva: cada `calculate` hace upsert por
 * UNIQUE(studentId, projectId) — correr el spec varias veces es seguro.
 */
import request from 'supertest';

const BASE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3007';
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3011';

const ADMIN_HEADERS = {
  'x-user-id': 'e2e-admin-user',
  'x-user-role': 'admin',
  'x-user-email': 'e2e-admin@collabu.dev',
};

function studentHeaders(userId: string) {
  return { 'x-user-id': userId, 'x-user-role': 'student', 'x-user-email': 'e2e-student@collabu.dev' };
}

// IDs reales del seed (Backend/scripts/seed_full_up.sql, sección FASE 6).
const PROJECT_MOTOR_IA = 'ea930fea-753f-463f-a9ef-e1c765b448c9';
const PROJECT_B2B = '7753b939-ab07-42b1-860c-8122109cdcee';
const PROJECT_INVENTARIO = '5f749e79-d4c3-41cf-af8a-9b1bc0593fee';
const PROJECT_ENCUESTAS = '73f5388a-21e4-41f3-9410-60c59289adf0';
const PROJECT_CHATBOT_NLP = '9df36b79-bdfc-4152-84fd-b265ce9c2618';
// Publicado directamente por seed SQL, sin pasar por la validación de app (>=1 skill) —
// caso real de dato legacy/inconsistente para el test de "proyecto sin skills".
const PROJECT_SIN_SKILLS = '9f8ace78-f0a6-4a8b-8d69-536340f84415'; // App Móvil de Fidelización

const STUDENT01 = 'b9addbae-f9b5-4577-b700-3b42a13edcd2'; // Sistemas, programId real, skills completas
const STUDENT02 = 'afb35c03-179f-40ef-8017-39c77723845a'; // Industrial, sin programId, skills parciales
const STUDENT18 = 'df66d290-4054-47bb-98bc-5b5984a5f03f'; // Sistemas, sin skills
const STUDENT19 = '70e41bcd-c32a-48f2-a3ba-9eb1a1df1d95'; // Electrónica, programId real, skills parciales
const STUDENT03 = 'db4a7f02-d6b7-45ea-a86a-5c945296cb3a'; // Sistemas, skills completas (B2B)
const STUDENT04 = 'e703a961-b7d0-4b71-ab06-dbdd656587e2'; // Electrónica, sem6, skills parciales
const STUDENT_EXTRA = '763c9133-31b0-4c2e-954d-05707b21b33f'; // Sistemas, skills extra
const STUDENT_LANG = 'e476dc18-974c-4563-a2eb-91ecf3ca24e8'; // Sistemas, idioma parcial
const STUDENT_PROGRAM_MISMATCH = '8113abaa-14bb-485f-a44a-91602e2d825c'; // Industrial, sin programId, skills altas

const NONEXISTENT_UUID = '00000000-0000-4000-8000-000000000000';

/** Verifica que admin-service esté vivo antes de arrancar — falla rápido y claro si no. */
async function assertDependenciesUp(): Promise<void> {
  const services = [
    { name: 'matching-service', url: `${BASE_URL}/health` },
    { name: 'student-service', url: 'http://localhost:3003/health' },
    { name: 'project-service', url: 'http://localhost:3005/health' },
    { name: 'admin-service', url: `${ADMIN_SERVICE_URL}/health` },
  ];
  for (const svc of services) {
    try {
      const res = await fetch(svc.url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (err) {
      throw new Error(
        `${svc.name} no responde en ${svc.url} — este spec requiere el entorno completo corriendo (ver GUIA_EJECUCION.md). Detalle: ${(err as Error).message}`,
      );
    }
  }
}

describe('Matching Service — integración real (FASE 7)', () => {
  beforeAll(async () => {
    await assertDependenciesUp();
  }, 15000);

  // ─── Los 9 escenarios reales de FASE 6, contra el algoritmo real ──────────

  describe('9 escenarios reales (calculados a mano antes de sembrar, verificados vía curl en FASE 6)', () => {
    it('Escenario 1 — match alto total (skills+nivel+programa+idioma perfectos)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT01, projectId: PROJECT_MOTOR_IA })
        .expect(201);

      expect(res.body.overallScore).toBe(100);
      expect(res.body.skillsScore).toBe(100);
      expect(res.body.proficiencyScore).toBe(100);
      expect(res.body.programScore).toBe(100);
      expect(res.body.semesterScore).toBe(100);
      expect(res.body.languageScore).toBe(100);
      expect(res.body.compatibilityLevel).toBe('high');
      expect(res.body.isRecommended).toBe(true);
      expect(res.body.skillsBreakdown.missing).toHaveLength(0);
      expect(res.body.skillsBreakdown.matched.map((s: any) => s.name).sort()).toEqual(
        ['Machine Learning', 'Python', 'SQL', 'TypeScript'].sort(),
      );
    });

    it('Escenario 2 — parcial + programa no coincide (fallback por substring, programId NULL)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT02, projectId: PROJECT_MOTOR_IA })
        .expect(201);

      expect(res.body.overallScore).toBe(44.38);
      expect(res.body.skillsScore).toBe(50);
      expect(res.body.programScore).toBe(0);
      expect(res.body.skillsBreakdown.matched.map((s: any) => s.name)).toEqual(['Python']);
      expect(res.body.skillsBreakdown.missing.map((s: any) => s.name).sort()).toEqual(
        ['Machine Learning', 'SQL', 'TypeScript'].sort(),
      );
    });

    it('Escenario 3 — sin ninguna skill (aísla el factor skills; mismo programa)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT18, projectId: PROJECT_MOTOR_IA })
        .expect(201);

      expect(res.body.overallScore).toBe(35);
      expect(res.body.skillsScore).toBe(0);
      expect(res.body.proficiencyScore).toBe(0);
      expect(res.body.programScore).toBe(100);
      expect(res.body.compatibilityLevel).toBe('low');
      expect(res.body.isRecommended).toBe(false);
      expect(res.body.skillsBreakdown.matched).toHaveLength(0);
      expect(res.body.skillsBreakdown.missing).toHaveLength(4);
    });

    it('Escenario 4 — parcial + programa no coincide (comparación DIRECTA de programId real)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT19, projectId: PROJECT_MOTOR_IA })
        .expect(201);

      expect(res.body.overallScore).toBe(44.38);
      expect(res.body.programScore).toBe(0);
    });

    it('Escenario 5 — match alto total en un segundo proyecto/skillset (React/NestJS)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT03, projectId: PROJECT_B2B })
        .expect(201);

      expect(res.body.overallScore).toBe(100);
      expect(res.body.isRecommended).toBe(true);
    });

    it('Escenario 6 — bajo compuesto: skills+programa+semestre insuficiente a la vez', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT04, projectId: PROJECT_B2B })
        .expect(201);

      expect(res.body.overallScore).toBe(34.38);
      expect(res.body.semesterScore).toBe(0); // sem6 < mínimo 8
      expect(res.body.programScore).toBe(0);
      expect(res.body.compatibilityLevel).toBe('low');
    });

    it('Escenario 7 — skills adicionales no requeridas (puebla skillsBreakdown.extra)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT_EXTRA, projectId: PROJECT_INVENTARIO })
        .expect(201);

      expect(res.body.overallScore).toBe(100);
      expect(res.body.skillsBreakdown.extra.map((s: any) => s.name).sort()).toEqual(
        ['AWS', 'Docker', 'Git', 'Kubernetes'].sort(),
      );
    });

    it('Escenario 8 — idioma parcial (2 requeridos, 1 presente → languageScore=50)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT_LANG, projectId: PROJECT_ENCUESTAS })
        .expect(201);

      expect(res.body.overallScore).toBe(97.5);
      expect(res.body.languageScore).toBe(50);
    });

    it('Escenario 9 — skills+nivel altos pero programa no coincide: NO anula el score (factor suave)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT_PROGRAM_MISMATCH, projectId: PROJECT_CHATBOT_NLP })
        .expect(201);

      expect(res.body.overallScore).toBe(85);
      expect(res.body.programScore).toBe(0);
      expect(res.body.skillsScore).toBe(100);
      expect(res.body.isRecommended).toBe(true); // alto pese a programa incompatible
    });
  });

  // ─── Reproducibilidad ──────────────────────────────────────────────────────

  it('recalcular el mismo par hace upsert (mismo id, no duplica filas)', async () => {
    const first = await request(BASE_URL)
      .post('/api/v1/matching/calculate')
      .set(ADMIN_HEADERS)
      .send({ studentId: STUDENT01, projectId: PROJECT_MOTOR_IA })
      .expect(201);

    const second = await request(BASE_URL)
      .post('/api/v1/matching/calculate')
      .set(ADMIN_HEADERS)
      .send({ studentId: STUDENT01, projectId: PROJECT_MOTOR_IA })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.overallScore).toBe(first.body.overallScore);
  });

  // ─── Umbral de recomendaciones ─────────────────────────────────────────────

  describe('recomendaciones solo se generan cuando overallScore >= 70', () => {
    it('un score bajo (< 70, student18/Motor IA=35) NO aparece en sus recomendaciones', async () => {
      await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT18, projectId: PROJECT_MOTOR_IA })
        .expect(201);

      const res = await request(BASE_URL)
        .get('/api/v1/matching/recommendations')
        .set(studentHeaders(STUDENT18))
        .expect(200);

      const rec = res.body.data.find((r: any) => r.matchResult.projectId === PROJECT_MOTOR_IA);
      expect(rec).toBeUndefined();
    });

    it('un score alto (>= 70) SÍ genera recomendación visible vía GET /recommendations, con projectTitle enriquecido', async () => {
      await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT01, projectId: PROJECT_MOTOR_IA })
        .expect(201);

      const res = await request(BASE_URL)
        .get('/api/v1/matching/recommendations')
        .set(studentHeaders(STUDENT01))
        .expect(200);

      const rec = res.body.data.find((r: any) => r.matchResult.projectId === PROJECT_MOTOR_IA);
      expect(rec).toBeDefined();
      expect(rec.matchResult.overallScore).toBe(100);
      expect(rec.projectTitle).toBe('Motor de Recomendación con IA');
      // Shape de paginación real de matching-service: {data,total,page,limit} plano, sin {meta}.
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
    });
  });

  // ─── Proyecto sin skills: dato legacy/inconsistente, no "sin requisitos" ──

  it('proyecto sin skills (dato legacy, sembrado directo sin pasar por la validación de app) da skillsScore=0, no neutral', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/matching/calculate')
      .set(ADMIN_HEADERS)
      .send({ studentId: STUDENT01, projectId: PROJECT_SIN_SKILLS })
      .expect(201);

    expect(res.body.skillsScore).toBe(0);
    expect(res.body.proficiencyScore).toBe(0);
    // Sin requisitos que matchear, matched/missing quedan vacíos — pero TODAS las skills
    // del estudiante caen en "extra" (ninguna hace match contra un proyecto sin skills),
    // que es información real y correcta, no un artefacto.
    expect(res.body.skillsBreakdown.matched).toHaveLength(0);
    expect(res.body.skillsBreakdown.missing).toHaveLength(0);
    expect(res.body.skillsBreakdown.extra.map((s: any) => s.name).sort()).toEqual(
      ['Machine Learning', 'Python', 'SQL', 'TypeScript'].sort(),
    );
  });

  // ─── Fallas de dependencias: nunca deben producir un score artificial ─────

  describe('fallas de servicios dependientes — nunca un score inventado', () => {
    it('studentId inexistente (student-service responde 404) → 503, y GET del resultado da 404 (nunca se persistió)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: NONEXISTENT_UUID, projectId: PROJECT_MOTOR_IA })
        .expect(503);

      expect(res.body.message).toMatch(/student-service/i);

      await request(BASE_URL)
        .get(`/api/v1/matching/results/student/${NONEXISTENT_UUID}/project/${PROJECT_MOTOR_IA}`)
        .set(ADMIN_HEADERS)
        .expect(404);
    });

    it('projectId inexistente (project-service responde 404) → 503, y GET del resultado da 404 (nunca se persistió)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/matching/calculate')
        .set(ADMIN_HEADERS)
        .send({ studentId: STUDENT01, projectId: NONEXISTENT_UUID })
        .expect(503);

      expect(res.body.message).toMatch(/project-service/i);

      await request(BASE_URL)
        .get(`/api/v1/matching/results/student/${STUDENT01}/project/${NONEXISTENT_UUID}`)
        .set(ADMIN_HEADERS)
        .expect(404);
    });

    // NOTA DE DISEÑO: se evaluó un test que detiene el proceso real de admin-service
    // (Stop-Process) para simular una caída de red genuina, no solo un 404. Se descartó:
    // localizar el proceso por patrón de línea de comandos (`Get-CimInstance ... -like
    // '*admin-service*'`) matcheó 17 PIDs no relacionados en la primera corrida (riesgo real
    // de matar procesos equivocados en un entorno con 14 servicios corriendo) y además abre
    // una ventana donde, si el test falla a mitad de camino, el entorno queda con admin-service
    // caído para el resto de la sesión. El mismo código (`programMatchScore` catch → throw
    // ServiceUnavailableException) ya está cubierto de forma determinística y segura por el
    // test unitario "debería lanzar ServiceUnavailableException si admin-service falla..." en
    // matching.service.spec.ts (HTTP mockeado, sin tocar procesos reales). Los dos tests de
    // arriba (studentId/projectId inexistente) ya ejercitan el mismo patrón catch-and-503
    // contra servicios reales vivos, solo que vía 404 en lugar de conexión rechazada — ambos
    // casos pasan por el mismo bloque try/catch en el código, así que la cobertura de la
    // rama de código es equivalente sin el riesgo operacional.
  });

  // ─── batch-calculate: fallas aisladas por estudiante, no contaminan el lote ─

  it('batch-calculate cuenta como fallidos los pares con dependencia caída, sin inventar scores para ellos', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/matching/batch-calculate')
      .set(ADMIN_HEADERS)
      .send({ projectId: PROJECT_MOTOR_IA, studentIds: [STUDENT01, NONEXISTENT_UUID] })
      .expect(201);

    expect(res.body.processed).toBe(1);
    expect(res.body.failed).toBe(1);

    await request(BASE_URL)
      .get(`/api/v1/matching/results/student/${NONEXISTENT_UUID}/project/${PROJECT_MOTOR_IA}`)
      .set(ADMIN_HEADERS)
      .expect(404);
  });
});

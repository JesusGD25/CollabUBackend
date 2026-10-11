-- =========================================================================
-- COLLAB-U — ENRIQUECIMIENTO DE ANALÍTICAS (estudiantes y empresas)
-- No modifica seed_full_up.sql ni seed_analytics_historical.sql. Idempotente:
-- usa ON CONFLICT DO NOTHING / UUIDs fijos. Ejecutar con Run-Seed.ps1 o
-- copiando el archivo al contenedor de postgres y corriéndolo con psql -f
-- (igual que seed_analytics_historical.sql).
--
-- Objetivo: las cuentas demo principales (student01-05, company01-02) no
-- tenían ningún proyecto completado ni evaluación propia, por lo que
-- /my-analytics y /company-analytics mostraban todo en cero pese a que el
-- cálculo del backend ya es real (no fabricado). Este script añade:
--   1. experiencia/educación/intereses/CV a student01-05 (sube
--      profile_completeness real, calculado luego con la misma fórmula
--      que usa student-service).
--   2. una aplicación completada + evaluaciones (empresa<->estudiante) más
--      para student01/company01 y student02/company02, sobre proyectos que
--      YA existían en el seed y no tenían aplicación de estos estudiantes.
--   3. recálculo de profile_completeness para TODOS los estudiantes a
--      partir de sus columnas/relaciones reales (misma fórmula que
--      student.service.ts#calculateProfileCompleteness) — no un número
--      fijo.
-- =========================================================================

SET client_encoding = 'UTF8';

-- ── 1. Experiencia, educación e intereses reales para student01-05 ──────
\c student_db;
SET client_encoding = 'UTF8';

UPDATE "student_profiles" SET cv_url = 'https://collabu.dev/cv/demo-sofia-martinez.pdf'
  WHERE id = 'dcf8907d-b726-4e4a-b8fa-520ffeea4c18';
UPDATE "student_profiles" SET cv_url = 'https://collabu.dev/cv/demo-student02.pdf'
  WHERE id = '18d0027b-a1d6-4323-8c86-cc9bb93ef810';
UPDATE "student_profiles" SET cv_url = 'https://collabu.dev/cv/demo-student03.pdf'
  WHERE id = 'f6ae184e-17fa-48a0-ac60-be57d96f0ef1';
UPDATE "student_profiles" SET cv_url = 'https://collabu.dev/cv/demo-student04.pdf'
  WHERE id = '70135d53-bd45-43a2-827f-851e56600c01';
UPDATE "student_profiles" SET cv_url = 'https://collabu.dev/cv/demo-student05.pdf'
  WHERE id = '42ff38c3-ea06-443f-bf01-75b69f314653';

INSERT INTO "experiences" (id, student_id, type, title, company_name, description, start_date, end_date, is_current, display_order) VALUES
('e1000001-0000-4000-8000-000000000001','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','internship','Practicante de Desarrollo Backend','Soluciones Digitales SAS','Apoyo en el desarrollo de APIs REST y mantenimiento de bases de datos.','2025-01-15','2025-06-30',false,0),
('e1000001-0000-4000-8000-000000000002','18d0027b-a1d6-4323-8c86-cc9bb93ef810','academic','Monitor de Laboratorio de Programación',NULL,'Apoyo a estudiantes de primeros semestres en cursos de programación.','2024-08-01',NULL,true,0),
('e1000001-0000-4000-8000-000000000003','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','freelance','Desarrollador Freelance','Independiente','Desarrollo de sitios web para pequeños negocios locales.','2024-03-01','2024-12-15',false,0),
('e1000001-0000-4000-8000-000000000004','70135d53-bd45-43a2-827f-851e56600c01','internship','Practicante de Soporte Técnico','Redes y Sistemas del Sur','Soporte técnico de primer nivel y configuración de redes.','2025-02-01','2025-07-31',false,0),
('e1000001-0000-4000-8000-000000000005','42ff38c3-ea06-443f-bf01-75b69f314653','volunteer','Voluntario en Semillero de Investigación',NULL,'Apoyo en la recolección y limpieza de datos para un proyecto de investigación.','2024-09-01',NULL,true,0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "education" (id, student_id, institution, degree, field_of_study, start_date, end_date, is_current, display_order) VALUES
('ed000001-0000-4000-8000-000000000001','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','Universidad de Nariño','Ingeniería de Sistemas','Ingeniería de Sistemas','2021-02-01',NULL,true,0),
('ed000001-0000-4000-8000-000000000002','18d0027b-a1d6-4323-8c86-cc9bb93ef810','Universidad de Nariño','Ingeniería Industrial','Ingeniería Industrial','2022-02-01',NULL,true,0),
('ed000001-0000-4000-8000-000000000003','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','Universidad de Nariño','Ingeniería de Sistemas','Ingeniería de Sistemas','2021-08-01',NULL,true,0),
('ed000001-0000-4000-8000-000000000004','70135d53-bd45-43a2-827f-851e56600c01','Universidad de Nariño','Ingeniería Electrónica','Ingeniería Electrónica','2022-08-01',NULL,true,0),
('ed000001-0000-4000-8000-000000000005','42ff38c3-ea06-443f-bf01-75b69f314653','Universidad de Nariño','Ingeniería de Sistemas','Ingeniería de Sistemas','2020-08-01',NULL,true,0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "interests" (id, student_id, area, sub_area, priority, display_order) VALUES
('9a000001-0000-4000-8000-000000000001','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','Backend','APIs y microservicios',1,0),
('9a000001-0000-4000-8000-000000000002','18d0027b-a1d6-4323-8c86-cc9bb93ef810','Datos','Analítica y BI',1,0),
('9a000001-0000-4000-8000-000000000003','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','Frontend','Experiencia de usuario',1,0),
('9a000001-0000-4000-8000-000000000004','70135d53-bd45-43a2-827f-851e56600c01','IoT','Sistemas embebidos',1,0),
('9a000001-0000-4000-8000-000000000005','42ff38c3-ea06-443f-bf01-75b69f314653','Machine Learning','Procesamiento de lenguaje natural',1,0)
ON CONFLICT ON CONSTRAINT uq_interest_student_area DO NOTHING;

-- ── 2. Aplicación completada + evaluaciones para student01/company01 ────
-- Proyecto ya existente en el seed (a3cf1251, "Módulo de Reportes
-- Analíticos", propiedad de company01) al que student01 no se había
-- postulado todavía.
\c application_db;
SET client_encoding = 'UTF8';

INSERT INTO "applications" (id, project_id, student_id, status, cover_letter, applied_at, reviewed_at, accepted_at, completed_at, created_at) VALUES
('a1000002-0000-4000-8000-000000000001','a3cf1251-2362-4217-a7cf-27c05cd43296','b9addbae-f9b5-4577-b700-3b42a13edcd2','completed','Me gustaría aportar mi experiencia en Python y SQL a este proyecto.','2026-05-01 09:00:00-05','2026-05-03 09:00:00-05','2026-05-03 09:00:00-05','2026-08-20 09:00:00-05','2026-05-01 09:00:00-05'),
('a1000002-0000-4000-8000-000000000002','3fa32d54-9bb9-43d9-8f32-9648f15f413e','afb35c03-179f-40ef-8017-39c77723845a','completed','Tengo experiencia previa generando reportes gerenciales con Power BI.','2026-05-05 09:00:00-05','2026-05-07 09:00:00-05','2026-05-07 09:00:00-05','2026-08-22 09:00:00-05','2026-05-05 09:00:00-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "application_timeline" (id, application_id, from_status, to_status, changed_by_user_id, created_at) VALUES
('a1000003-0000-4000-8000-000000000001','a1000002-0000-4000-8000-000000000001','pending','accepted','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-05-03 09:00:00-05'),
('a1000003-0000-4000-8000-000000000002','a1000002-0000-4000-8000-000000000001','accepted','completed','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-08-20 09:00:00-05'),
('a1000003-0000-4000-8000-000000000003','a1000002-0000-4000-8000-000000000002','pending','accepted','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2026-05-07 09:00:00-05'),
('a1000003-0000-4000-8000-000000000004','a1000002-0000-4000-8000-000000000002','accepted','completed','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2026-08-22 09:00:00-05')
ON CONFLICT (id) DO NOTHING;

\c evaluation_db;
SET client_encoding = 'UTF8';

INSERT INTO "evaluations" (id, application_id, project_id, evaluator_id, evaluated_id, evaluation_type, status,
  overall_score, overall_comment, strengths, areas_for_improvement, completed_at) VALUES
('e2000001-0000-4000-8000-000000000001','a1000002-0000-4000-8000-000000000001','a3cf1251-2362-4217-a7cf-27c05cd43296',
  '928b7648-201a-4ab8-8bbb-638a2e4f5490','b9addbae-f9b5-4577-b700-3b42a13edcd2','company_evaluates_student','completed',
  4.6,'Muy buen desempeño técnico, cumplió los entregables a tiempo.','Autonomía, dominio técnico en backend.','Podría mejorar la documentación de su código.','2026-08-21 10:00:00-05'),
('e2000001-0000-4000-8000-000000000002','a1000002-0000-4000-8000-000000000001','a3cf1251-2362-4217-a7cf-27c05cd43296',
  'b9addbae-f9b5-4577-b700-3b42a13edcd2','928b7648-201a-4ab8-8bbb-638a2e4f5490','student_evaluates_company','completed',
  4.7,'Buen acompañamiento del equipo y claridad en los requerimientos.','Comunicación, mentoría constante.',NULL,'2026-08-21 11:00:00-05'),
('e2000001-0000-4000-8000-000000000003','a1000002-0000-4000-8000-000000000002','3fa32d54-9bb9-43d9-8f32-9648f15f413e',
  '7e1cc874-aa38-4c57-8660-fbf182bfdbc7','afb35c03-179f-40ef-8017-39c77723845a','company_evaluates_student','completed',
  4.4,'Reportes entregados con buena calidad y puntualidad.','Organización, atención al detalle.','Podría proponer más mejoras por iniciativa propia.','2026-08-23 10:00:00-05'),
('e2000001-0000-4000-8000-000000000004','a1000002-0000-4000-8000-000000000002','3fa32d54-9bb9-43d9-8f32-9648f15f413e',
  'afb35c03-179f-40ef-8017-39c77723845a','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','student_evaluates_company','completed',
  4.3,'Buen ambiente de trabajo, aunque los tiempos de respuesta podrían mejorar.','Ambiente laboral, disposición del equipo.','Tiempos de retroalimentación.','2026-08-23 11:00:00-05')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Recalcular profile_completeness real para TODOS los estudiantes ──
-- Misma fórmula que student.service.ts#calculateProfileCompleteness:
-- program10 + semester10 + bio10 + skills15 + experiences15 + education15
-- + cvUrl10 + languages10 + interests5 (máx. 100). Se puede volver a
-- correr en cualquier momento sin efectos secundarios (no es un INSERT).
\c student_db;
SET client_encoding = 'UTF8';

UPDATE "student_profiles" sp SET profile_completeness =
  (CASE WHEN sp.program IS NOT NULL AND sp.program <> '' THEN 10 ELSE 0 END) +
  (CASE WHEN sp.semester IS NOT NULL THEN 10 ELSE 0 END) +
  (CASE WHEN sp.bio IS NOT NULL AND sp.bio <> '' THEN 10 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "skills" WHERE student_id = sp.id) THEN 15 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "experiences" WHERE student_id = sp.id) THEN 15 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "education" WHERE student_id = sp.id) THEN 15 ELSE 0 END) +
  (CASE WHEN sp.cv_url IS NOT NULL AND sp.cv_url <> '' THEN 10 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "languages" WHERE student_id = sp.id) THEN 10 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "interests" WHERE student_id = sp.id) THEN 5 ELSE 0 END);

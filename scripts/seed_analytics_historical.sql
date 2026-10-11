-- Generado por generate-seed-analytics-historical.mjs — FASE 5 del PLANNING_ANALYTICS_SERVICE.md
-- Cohorte histórica independiente (2025-10 a 2026-08) para analítica — NO modifica seed_full_up.sql.
-- Idempotente: usa ON CONFLICT DO NOTHING con UUIDs fijos generados una sola vez en este archivo.

\c auth_db;
SET client_encoding = 'UTF8';
INSERT INTO "users" (id, email, password_hash, role, is_verified, is_active, created_at) VALUES
('94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'datawave.hist@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'company', true, true, '2025-09-15 09:00:00-05'),
('41b34b92-46ba-41ac-bef9-c872bd9a7266', 'andesrobotics.hist@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'company', true, true, '2025-09-15 09:30:00-05'),
('834cc24f-ce67-4875-8ee0-d4002269c2f7', 'h.student01@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2025-10-05 08:00:00-05'),
('df7d772c-9da3-40d6-a4fd-09d0f4a13227', 'h.student02@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2025-10-08 08:00:00-05'),
('1e50afe9-4250-4a19-9a92-7f3309b1fb81', 'h.student03@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2025-11-04 08:00:00-05'),
('96f594b1-accf-4db5-aff8-580173ceb31b', 'h.student04@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2025-12-02 08:00:00-05'),
('74a83784-38e5-4f6c-a939-133722d58ef4', 'h.student05@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2025-12-10 08:00:00-05'),
('f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', 'h.student06@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2026-01-15 08:00:00-05'),
('4c15ebe8-919e-416d-829b-308bf4213f9f', 'h.student07@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2026-02-12 08:00:00-05'),
('647e4ad4-bc06-4185-8b5d-3a78deb86c14', 'h.student08@collabu.dev', '$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32', 'student', true, true, '2026-03-10 08:00:00-05')
ON CONFLICT (id) DO NOTHING;

\c user_db;
SET client_encoding = 'UTF8';
INSERT INTO "user_profiles" (id, user_id, role, first_name, last_name, country, created_at) VALUES
('35695db8-4e8b-4483-bf17-d35360074d7f', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'company', 'DataWave Analytics', '', 'Colombia', '2025-09-15 09:00:00-05'),
('6dbe729b-cca2-49b5-9b38-f67e52762f48', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'company', 'Andes Robotics', '', 'Colombia', '2025-09-15 09:30:00-05'),
('9a648110-c70b-4166-b750-d210b5938b85', '834cc24f-ce67-4875-8ee0-d4002269c2f7', 'student', 'Camila', 'Ortega', 'Colombia', '2025-10-05 08:00:00-05'),
('5689d850-daa8-4d60-9deb-32ef929f0f85', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', 'student', 'Julián', 'Restrepo', 'Colombia', '2025-10-08 08:00:00-05'),
('ccb71ba0-f536-4cd9-874e-6c697f84da2c', '1e50afe9-4250-4a19-9a92-7f3309b1fb81', 'student', 'Valentina', 'Suárez', 'Colombia', '2025-11-04 08:00:00-05'),
('1eedade2-32bc-4339-88a9-dfe0bd534bb6', '96f594b1-accf-4db5-aff8-580173ceb31b', 'student', 'Andrés', 'Muñoz', 'Colombia', '2025-12-02 08:00:00-05'),
('4c148ca3-6c47-4483-9273-3b9ba6ec6630', '74a83784-38e5-4f6c-a939-133722d58ef4', 'student', 'Laura', 'Cifuentes', 'Colombia', '2025-12-10 08:00:00-05'),
('e6d60bed-3cab-4066-9e56-6b9bed6f202c', 'f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', 'student', 'Santiago', 'Vargas', 'Colombia', '2026-01-15 08:00:00-05'),
('ac8ba374-8909-439c-a999-e21d04fb2eff', '4c15ebe8-919e-416d-829b-308bf4213f9f', 'student', 'Mariana', 'Herrera', 'Colombia', '2026-02-12 08:00:00-05'),
('94ca6f1b-c382-43af-b8c2-9e698bbb8c42', '647e4ad4-bc06-4185-8b5d-3a78deb86c14', 'student', 'Felipe', 'Castaño', 'Colombia', '2026-03-10 08:00:00-05')
ON CONFLICT (user_id) DO NOTHING;

\c company_db;
SET client_encoding = 'UTF8';
INSERT INTO "companies" (id, user_id, company_name, industry, company_size, verification_status, is_active, created_at) VALUES
('4303e7fe-4fe9-42cf-8bbc-66e17ab48e78', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'DataWave Analytics', 'Tecnología', 'small', 'verified', true, '2025-09-15 09:00:00-05'),
('1470e97a-fb8b-413b-ab5f-dd9837bb7a2f', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'Andes Robotics', 'Manufactura', 'medium', 'verified', true, '2025-09-15 09:30:00-05')
ON CONFLICT (id) DO NOTHING;

\c student_db;
SET client_encoding = 'UTF8';
INSERT INTO "student_profiles" (id, user_id, program, program_id, semester, availability, profile_completeness, is_visible, created_at) VALUES
('80437862-6988-4c52-b3f4-1ee6a2c15103', '834cc24f-ce67-4875-8ee0-d4002269c2f7', 'Ingeniería de Sistemas', 'ce933c9d-d239-4a63-b4d7-70e3f8bc5ca2', 6, 'flexible', 70, true, '2025-10-05 08:00:00-05'),
('b326e5b4-ab31-4ec1-8d83-d160dd744a77', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', 'Ingeniería Electrónica', '4a25db7e-06e9-467e-97b1-1401b3184951', 7, 'flexible', 70, true, '2025-10-08 08:00:00-05'),
('75369644-840d-4547-bae6-47d27528d4a0', '1e50afe9-4250-4a19-9a92-7f3309b1fb81', 'Ingeniería de Sistemas', 'ce933c9d-d239-4a63-b4d7-70e3f8bc5ca2', 5, 'flexible', 70, true, '2025-11-04 08:00:00-05'),
('33942adb-c890-4807-8ff0-db39a2cb4f3e', '96f594b1-accf-4db5-aff8-580173ceb31b', 'Ingeniería Civil', '30f9e04f-f5fb-4cbd-b57c-5402c9b0112d', 8, 'flexible', 70, true, '2025-12-02 08:00:00-05'),
('06c2a93f-0a54-47eb-8ffb-a0c521539f7f', '74a83784-38e5-4f6c-a939-133722d58ef4', 'Ingeniería de Sistemas', 'ce933c9d-d239-4a63-b4d7-70e3f8bc5ca2', 4, 'flexible', 70, true, '2025-12-10 08:00:00-05'),
('7cb0da9e-84f7-407d-ab33-957c98cd1ec2', 'f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', 'Ingeniería de Sistemas', 'ce933c9d-d239-4a63-b4d7-70e3f8bc5ca2', 7, 'flexible', 70, true, '2026-01-15 08:00:00-05'),
('590ce798-ee32-49b9-aed8-f30b04719b5e', '4c15ebe8-919e-416d-829b-308bf4213f9f', 'Ingeniería Electrónica', '4a25db7e-06e9-467e-97b1-1401b3184951', 6, 'flexible', 70, true, '2026-02-12 08:00:00-05'),
('ba4e0556-2992-4e4f-9de5-9890aef3d7e4', '647e4ad4-bc06-4185-8b5d-3a78deb86c14', 'Ingeniería de Sistemas', 'ce933c9d-d239-4a63-b4d7-70e3f8bc5ca2', 5, 'flexible', 70, true, '2026-03-10 08:00:00-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "skills" (id, student_id, name, catalog_skill_id, category, proficiency_level, created_at) VALUES
('de02f7e5-9a93-4615-a76d-b550163c5c54', '80437862-6988-4c52-b3f4-1ee6a2c15103', 'react', '24f537ad-2d5f-4878-9193-db98308cbfd4', 'framework', 'intermediate', '2025-10-05 08:00:00-05'),
('ff32a5fe-90c0-47a6-9a87-5f41630457b2', '80437862-6988-4c52-b3f4-1ee6a2c15103', 'javascript', 'bb7109ca-f045-468c-a914-e94ae4a8e1e2', 'language', 'intermediate', '2025-10-05 08:00:00-05'),
('b8e43a24-5539-4e59-9678-9c791de37305', '80437862-6988-4c52-b3f4-1ee6a2c15103', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', 'intermediate', '2025-10-05 08:00:00-05'),
('222b7f2e-ed75-486f-92f4-3039c1d1b5b4', 'b326e5b4-ab31-4ec1-8d83-d160dd744a77', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', 'intermediate', '2025-10-08 08:00:00-05'),
('3dff1335-53f8-4977-829b-e2c3d64d55ca', 'b326e5b4-ab31-4ec1-8d83-d160dd744a77', 'devops', '76e6576f-132c-48ae-a54f-948b2fb1b994', 'concept', 'intermediate', '2025-10-08 08:00:00-05'),
('2aeef7e5-0ab8-4e68-b2f4-529418151645', '75369644-840d-4547-bae6-47d27528d4a0', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', 'intermediate', '2025-11-04 08:00:00-05'),
('7dcb1051-46f8-4647-a6b8-01e72cee8706', '75369644-840d-4547-bae6-47d27528d4a0', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', 'intermediate', '2025-11-04 08:00:00-05'),
('49335464-36e4-442a-9720-a7de20f0b24c', '75369644-840d-4547-bae6-47d27528d4a0', 'machine learning', '4be23490-0acb-4dd3-afdf-2a4ebaaf69e1', 'concept', 'intermediate', '2025-11-04 08:00:00-05'),
('30279c6a-4048-453d-b6e1-992f1fda0742', '33942adb-c890-4807-8ff0-db39a2cb4f3e', 'figma', '725abd68-d8d5-494e-a57b-5fb023d23d04', 'tool', 'intermediate', '2025-12-02 08:00:00-05'),
('be6b9a69-7de5-41f5-b2ba-33a1905af30b', '33942adb-c890-4807-8ff0-db39a2cb4f3e', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', 'intermediate', '2025-12-02 08:00:00-05'),
('9cc62363-9920-48cf-8f4e-84726ad76ccd', '06c2a93f-0a54-47eb-8ffb-a0c521539f7f', 'javascript', 'bb7109ca-f045-468c-a914-e94ae4a8e1e2', 'language', 'intermediate', '2025-12-10 08:00:00-05'),
('e5bf1c9f-c1bf-4da8-b21f-f2fe374c51b8', '06c2a93f-0a54-47eb-8ffb-a0c521539f7f', 'react', '24f537ad-2d5f-4878-9193-db98308cbfd4', 'framework', 'intermediate', '2025-12-10 08:00:00-05'),
('9e49b29c-735b-41d2-a911-185838f543d9', '06c2a93f-0a54-47eb-8ffb-a0c521539f7f', 'typescript', '112637e0-809f-4fb8-816b-b6e052faba68', 'language', 'intermediate', '2025-12-10 08:00:00-05'),
('6acf4f36-b532-4e6a-be18-adbaec96df50', '7cb0da9e-84f7-407d-ab33-957c98cd1ec2', 'node', '952b9ac3-8cfe-4eea-beda-f28de7d09094', 'framework', 'intermediate', '2026-01-15 08:00:00-05'),
('82965958-0753-428e-ac26-15cf97a2142c', '7cb0da9e-84f7-407d-ab33-957c98cd1ec2', 'postgresql', '782750b1-e212-40d2-a409-0443136030f0', 'tool', 'intermediate', '2026-01-15 08:00:00-05'),
('32b702f8-ff30-4272-8ede-c22541bb9532', '7cb0da9e-84f7-407d-ab33-957c98cd1ec2', 'docker', 'db41a537-423a-4d78-b558-39caf6991b5c', 'tool', 'intermediate', '2026-01-15 08:00:00-05'),
('0d821a89-9db4-4736-a355-d7b5db2ffc68', '590ce798-ee32-49b9-aed8-f30b04719b5e', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', 'intermediate', '2026-02-12 08:00:00-05'),
('e41e2b90-06fe-4f99-bc54-aedcba09c4ba', '590ce798-ee32-49b9-aed8-f30b04719b5e', 'devops', '76e6576f-132c-48ae-a54f-948b2fb1b994', 'concept', 'intermediate', '2026-02-12 08:00:00-05'),
('213939dc-8677-4329-a074-bc1b260102b6', '590ce798-ee32-49b9-aed8-f30b04719b5e', 'docker', 'db41a537-423a-4d78-b558-39caf6991b5c', 'tool', 'intermediate', '2026-02-12 08:00:00-05'),
('3a3c381d-81bb-4d5e-8e78-b8cabcab1844', 'ba4e0556-2992-4e4f-9de5-9890aef3d7e4', 'java', 'a160445f-9466-47b0-896d-8941dc311da2', 'language', 'intermediate', '2026-03-10 08:00:00-05'),
('411340fd-be1a-4d83-aaa5-fe06397a1fe7', 'ba4e0556-2992-4e4f-9de5-9890aef3d7e4', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', 'intermediate', '2026-03-10 08:00:00-05')
ON CONFLICT (student_id, name) DO NOTHING;

\c project_db;
SET client_encoding = 'UTF8';
INSERT INTO "projects" (id, company_id, created_by_user_id, title, description, project_type, status, is_active, created_at) VALUES
('53b8a6d4-b5d2-4b39-a49f-773ebc6fee33', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'Plataforma de Analítica de Ventas', 'Proyecto histórico de analítica — Plataforma de Analítica de Ventas.', 'professional_practice', 'completed', true, '2025-10-12 09:00:00-05'),
('acc844ec-6d26-45d7-b8aa-dd635e55cf7c', '41b34b92-46ba-41ac-bef9-c872bd9a7266', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'Sistema de Control PLC', 'Proyecto histórico de analítica — Sistema de Control PLC.', 'internship', 'cancelled', true, '2025-10-18 09:00:00-05'),
('0cd08f1b-fbe3-44ff-9dbb-1abab7fbc854', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'Dashboard de KPIs Internos', 'Proyecto histórico de analítica — Dashboard de KPIs Internos.', 'professional_practice', 'completed', true, '2025-11-10 09:00:00-05'),
('7b5acda9-5d48-4567-acf7-19b4ecc8a971', '41b34b92-46ba-41ac-bef9-c872bd9a7266', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'Optimización de Firmware IoT', 'Proyecto histórico de analítica — Optimización de Firmware IoT.', 'thesis', 'in_progress', true, '2025-12-05 09:00:00-05'),
('4c895cad-ce4d-4935-9843-204012b5fe2a', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'Automatización de Reportes Financieros', 'Proyecto histórico de analítica — Automatización de Reportes Financieros.', 'professional_practice', 'needs_changes', true, '2026-01-08 09:00:00-05'),
('06625b1e-4621-45ec-9cca-12a304f2d4d9', '41b34b92-46ba-41ac-bef9-c872bd9a7266', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'App Móvil de Mantenimiento Predictivo', 'Proyecto histórico de analítica — App Móvil de Mantenimiento Predictivo.', 'professional_practice', 'in_progress', true, '2026-02-05 09:00:00-05'),
('86e171a8-2e87-4e73-83bb-407b31549c22', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'Migración a Arquitectura de Microservicios', 'Proyecto histórico de analítica — Migración a Arquitectura de Microservicios.', 'thesis', 'completed', true, '2026-03-10 09:00:00-05'),
('e7b3969e-3743-4c80-a560-ff8d040388c9', '41b34b92-46ba-41ac-bef9-c872bd9a7266', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'Gemelo Digital de Línea de Producción', 'Proyecto histórico de analítica — Gemelo Digital de Línea de Producción.', 'research', 'draft', true, '2026-03-20 09:00:00-05'),
('c9321e9f-8002-4fab-a6b8-1b64224e939d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'Bot de Soporte Interno con IA', 'Proyecto histórico de analítica — Bot de Soporte Interno con IA.', 'professional_practice', 'in_progress', true, '2026-04-10 09:00:00-05'),
('d0e85c8e-dac8-4108-96a1-525b9e4111b9', '41b34b92-46ba-41ac-bef9-c872bd9a7266', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'Sensorización de Planta con IoT', 'Proyecto histórico de analítica — Sensorización de Planta con IoT.', 'internship', 'in_progress', true, '2026-05-10 09:00:00-05'),
('4ab40f35-96d3-472e-b8c2-ea3a041bf018', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'Rediseño de UX del Portal de Clientes', 'Proyecto histórico de analítica — Rediseño de UX del Portal de Clientes.', 'professional_practice', 'published', true, '2026-06-10 09:00:00-05'),
('4dc23ef6-80d1-4d94-bb19-bcbb21f584a0', '41b34b92-46ba-41ac-bef9-c872bd9a7266', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'Plataforma de Trazabilidad de Inventario', 'Proyecto histórico de analítica — Plataforma de Trazabilidad de Inventario.', 'professional_practice', 'pending_approval', true, '2026-07-08 09:00:00-05'),
('10b5a3c4-faea-4e9f-9e2b-d1d755471c09', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', '94c3c0d6-10f3-4c0c-90a0-ee5b2d71cf7d', 'Motor de Recomendaciones de Productos', 'Proyecto histórico de analítica — Motor de Recomendaciones de Productos.', 'professional_practice', 'draft', true, '2026-08-01 09:00:00-05'),
('607b42f7-82bd-4e19-8ccd-c3472fa16e75', '41b34b92-46ba-41ac-bef9-c872bd9a7266', '41b34b92-46ba-41ac-bef9-c872bd9a7266', 'Panel de Control Remoto de Robots', 'Proyecto histórico de analítica — Panel de Control Remoto de Robots.', 'professional_practice', 'published', true, '2026-08-01 09:30:00-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "project_skills" (id, project_id, name, catalog_skill_id, category, is_mandatory, created_at) VALUES
('45c3f9d1-ac7b-4eca-8ae3-2aab8331d0ba', '53b8a6d4-b5d2-4b39-a49f-773ebc6fee33', 'react', '24f537ad-2d5f-4878-9193-db98308cbfd4', 'framework', true, '2025-10-12 09:00:00-05'),
('9e0179cb-cd8f-4afe-b848-de0beaa5e154', '53b8a6d4-b5d2-4b39-a49f-773ebc6fee33', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', true, '2025-10-12 09:00:00-05'),
('c0cb9eab-0388-4e78-86ad-e548126a6127', '53b8a6d4-b5d2-4b39-a49f-773ebc6fee33', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', true, '2025-10-12 09:00:00-05'),
('157d2af2-2afe-4702-9d4d-09c6a4fd75b6', 'acc844ec-6d26-45d7-b8aa-dd635e55cf7c', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', true, '2025-10-18 09:00:00-05'),
('aa714228-e3ed-4df0-80d1-a843658ca03b', 'acc844ec-6d26-45d7-b8aa-dd635e55cf7c', 'devops', '76e6576f-132c-48ae-a54f-948b2fb1b994', 'concept', true, '2025-10-18 09:00:00-05'),
('248c87f0-60eb-4c9e-8270-3e602ac1010b', '0cd08f1b-fbe3-44ff-9dbb-1abab7fbc854', 'react', '24f537ad-2d5f-4878-9193-db98308cbfd4', 'framework', true, '2025-11-10 09:00:00-05'),
('fa81be5c-1176-447b-8cfb-56e935bd8bcd', '0cd08f1b-fbe3-44ff-9dbb-1abab7fbc854', 'typescript', '112637e0-809f-4fb8-816b-b6e052faba68', 'language', true, '2025-11-10 09:00:00-05'),
('e878629e-f715-4358-a748-6020e99dc1fc', '0cd08f1b-fbe3-44ff-9dbb-1abab7fbc854', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', true, '2025-11-10 09:00:00-05'),
('364b93fa-2fb2-40bc-aebc-10f84aa7c713', '7b5acda9-5d48-4567-acf7-19b4ecc8a971', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', true, '2025-12-05 09:00:00-05'),
('b0732d13-ddda-44cd-8e9d-6fb14f29e31a', '7b5acda9-5d48-4567-acf7-19b4ecc8a971', 'devops', '76e6576f-132c-48ae-a54f-948b2fb1b994', 'concept', true, '2025-12-05 09:00:00-05'),
('b20581e4-0637-47d0-833b-d5d6282857d5', '4c895cad-ce4d-4935-9843-204012b5fe2a', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', true, '2026-01-08 09:00:00-05'),
('fca4f740-6f42-4d42-bd8d-a91e7bf64cf4', '4c895cad-ce4d-4935-9843-204012b5fe2a', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', true, '2026-01-08 09:00:00-05'),
('dd4abfac-249e-4825-917a-f0e5694c553d', '06625b1e-4621-45ec-9cca-12a304f2d4d9', 'react', '24f537ad-2d5f-4878-9193-db98308cbfd4', 'framework', true, '2026-02-05 09:00:00-05'),
('d086bd71-9cfc-4f11-96a2-97d2d3c0fcd1', '06625b1e-4621-45ec-9cca-12a304f2d4d9', 'machine learning', '4be23490-0acb-4dd3-afdf-2a4ebaaf69e1', 'concept', true, '2026-02-05 09:00:00-05'),
('d468aedc-188e-4c07-8fe1-6e69352cd5ce', '86e171a8-2e87-4e73-83bb-407b31549c22', 'node', '952b9ac3-8cfe-4eea-beda-f28de7d09094', 'framework', true, '2026-03-10 09:00:00-05'),
('764e5bac-4342-4cc0-926d-022e133f6695', '86e171a8-2e87-4e73-83bb-407b31549c22', 'docker', 'db41a537-423a-4d78-b558-39caf6991b5c', 'tool', true, '2026-03-10 09:00:00-05'),
('7a5a26c6-7275-4fab-a9be-c657081516d6', '86e171a8-2e87-4e73-83bb-407b31549c22', 'postgresql', '782750b1-e212-40d2-a409-0443136030f0', 'tool', true, '2026-03-10 09:00:00-05'),
('3a1f39cc-252b-4f8e-817b-987944bc081b', 'e7b3969e-3743-4c80-a560-ff8d040388c9', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', true, '2026-03-20 09:00:00-05'),
('30423188-d092-4f85-afab-3150219daefd', 'e7b3969e-3743-4c80-a560-ff8d040388c9', 'machine learning', '4be23490-0acb-4dd3-afdf-2a4ebaaf69e1', 'concept', true, '2026-03-20 09:00:00-05'),
('7a622f61-a34e-4b9d-9ec9-7aab875ded82', 'c9321e9f-8002-4fab-a6b8-1b64224e939d', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', true, '2026-04-10 09:00:00-05'),
('4cd1db14-4090-4f40-89d5-8a94e5be2044', 'c9321e9f-8002-4fab-a6b8-1b64224e939d', 'machine learning', '4be23490-0acb-4dd3-afdf-2a4ebaaf69e1', 'concept', true, '2026-04-10 09:00:00-05'),
('1ae1c81b-591b-43d1-9973-d510fc86a860', 'c9321e9f-8002-4fab-a6b8-1b64224e939d', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', true, '2026-04-10 09:00:00-05'),
('ae52d834-e6cc-415a-b063-6781193f7766', 'd0e85c8e-dac8-4108-96a1-525b9e4111b9', 'devops', '76e6576f-132c-48ae-a54f-948b2fb1b994', 'concept', true, '2026-05-10 09:00:00-05'),
('8067308f-423e-4cff-a71f-0fd86d10be8d', 'd0e85c8e-dac8-4108-96a1-525b9e4111b9', 'docker', 'db41a537-423a-4d78-b558-39caf6991b5c', 'tool', true, '2026-05-10 09:00:00-05'),
('eb1b1172-cd34-40fc-9e92-d774fa2391b5', '4ab40f35-96d3-472e-b8c2-ea3a041bf018', 'figma', '725abd68-d8d5-494e-a57b-5fb023d23d04', 'tool', true, '2026-06-10 09:00:00-05'),
('06857af0-72fe-4b2f-8a7c-897151e548c8', '4ab40f35-96d3-472e-b8c2-ea3a041bf018', 'react', '24f537ad-2d5f-4878-9193-db98308cbfd4', 'framework', true, '2026-06-10 09:00:00-05'),
('35c53bbd-779a-4e7d-8a93-16aa60de0838', '4dc23ef6-80d1-4d94-bb19-bcbb21f584a0', 'java', 'a160445f-9466-47b0-896d-8941dc311da2', 'language', true, '2026-07-08 09:00:00-05'),
('ae7d763d-ec6b-44bd-a4c2-e2f816eb4c16', '4dc23ef6-80d1-4d94-bb19-bcbb21f584a0', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', true, '2026-07-08 09:00:00-05'),
('34693c46-554c-4e98-b6bb-3476f30374b0', '10b5a3c4-faea-4e9f-9e2b-d1d755471c09', 'python', 'b47a51c0-9744-40a2-b67f-c0b08495c314', 'language', true, '2026-08-01 09:00:00-05'),
('d83451e2-41ac-4633-970e-324779d4eb8d', '10b5a3c4-faea-4e9f-9e2b-d1d755471c09', 'sql', '2bcdb12c-a449-4000-80a6-18d52e015379', 'language', true, '2026-08-01 09:00:00-05'),
('83109395-2c89-4710-8c3b-056da79347ae', '607b42f7-82bd-4e19-8ccd-c3472fa16e75', 'typescript', '112637e0-809f-4fb8-816b-b6e052faba68', 'language', true, '2026-08-01 09:30:00-05'),
('52587065-7377-4958-ae75-9b4a307bf2b1', '607b42f7-82bd-4e19-8ccd-c3472fa16e75', 'react', '24f537ad-2d5f-4878-9193-db98308cbfd4', 'framework', true, '2026-08-01 09:30:00-05')
ON CONFLICT (project_id, name) DO NOTHING;

\c application_db;
SET client_encoding = 'UTF8';
INSERT INTO "applications" (id, project_id, student_id, status, applied_at, accepted_at, completed_at, rejection_reason, withdrawal_reason, created_at) VALUES
('f270c8b7-a6f6-4ace-be0c-6696990ca5b5', '53b8a6d4-b5d2-4b39-a49f-773ebc6fee33', '834cc24f-ce67-4875-8ee0-d4002269c2f7', 'completed', '2025-10-20 10:00:00-05', '2025-10-22 10:00:00-05', '2026-03-15 10:00:00-05', NULL, NULL, '2025-10-20 10:00:00-05'),
('80f4fc83-0e98-4950-853b-87d5cdc590a1', '53b8a6d4-b5d2-4b39-a49f-773ebc6fee33', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', 'rejected', '2025-10-19 10:00:00-05', NULL, NULL, 'No se ajusta al perfil buscado en este momento.', NULL, '2025-10-19 10:00:00-05'),
('523fcd4e-d508-4f4a-b72e-6db96fd2bed5', 'acc844ec-6d26-45d7-b8aa-dd635e55cf7c', '834cc24f-ce67-4875-8ee0-d4002269c2f7', 'withdrawn', '2025-11-05 10:00:00-05', NULL, NULL, NULL, 'El estudiante retiró su postulación.', '2025-11-05 10:00:00-05'),
('852f5806-3649-437a-88dd-ba93cc7f0ea0', '0cd08f1b-fbe3-44ff-9dbb-1abab7fbc854', '834cc24f-ce67-4875-8ee0-d4002269c2f7', 'completed', '2025-11-15 10:00:00-05', '2025-11-18 10:00:00-05', '2026-04-01 10:00:00-05', NULL, NULL, '2025-11-15 10:00:00-05'),
('1553cccd-50bf-43a8-a43e-58540f4f3d3b', '0cd08f1b-fbe3-44ff-9dbb-1abab7fbc854', '1e50afe9-4250-4a19-9a92-7f3309b1fb81', 'rejected', '2025-11-14 10:00:00-05', NULL, NULL, 'No se ajusta al perfil buscado en este momento.', NULL, '2025-11-14 10:00:00-05'),
('02493c76-1711-415a-9970-6feb1b69bb00', '7b5acda9-5d48-4567-acf7-19b4ecc8a971', '96f594b1-accf-4db5-aff8-580173ceb31b', 'in_progress', '2025-12-12 10:00:00-05', '2025-12-15 10:00:00-05', NULL, NULL, NULL, '2025-12-12 10:00:00-05'),
('f73b3e34-25bb-48fe-80a4-ce2c3c372e8a', '7b5acda9-5d48-4567-acf7-19b4ecc8a971', '74a83784-38e5-4f6c-a939-133722d58ef4', 'rejected', '2025-12-13 10:00:00-05', NULL, NULL, 'No se ajusta al perfil buscado en este momento.', NULL, '2025-12-13 10:00:00-05'),
('65bf989b-20bd-4412-9e59-7b01536cc84d', '06625b1e-4621-45ec-9cca-12a304f2d4d9', 'f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', 'in_progress', '2026-02-10 10:00:00-05', '2026-02-14 10:00:00-05', NULL, NULL, NULL, '2026-02-10 10:00:00-05'),
('ef3d82f2-014b-4cd8-b53d-0600b70c2182', '06625b1e-4621-45ec-9cca-12a304f2d4d9', '4c15ebe8-919e-416d-829b-308bf4213f9f', 'rejected', '2026-02-14 10:00:00-05', NULL, NULL, 'No se ajusta al perfil buscado en este momento.', NULL, '2026-02-14 10:00:00-05'),
('c95a722e-c082-4e3e-bd77-36600451ae56', '86e171a8-2e87-4e73-83bb-407b31549c22', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', 'completed', '2026-03-16 10:00:00-05', '2026-03-19 10:00:00-05', '2026-08-15 10:00:00-05', NULL, NULL, '2026-03-16 10:00:00-05'),
('6ce5911f-f28d-4193-91fd-143a73c04344', '86e171a8-2e87-4e73-83bb-407b31549c22', '647e4ad4-bc06-4185-8b5d-3a78deb86c14', 'rejected', '2026-03-17 10:00:00-05', NULL, NULL, 'No se ajusta al perfil buscado en este momento.', NULL, '2026-03-17 10:00:00-05'),
('f5618738-03f1-4859-b66b-387cf77bc611', 'c9321e9f-8002-4fab-a6b8-1b64224e939d', '1e50afe9-4250-4a19-9a92-7f3309b1fb81', 'in_progress', '2026-04-12 10:00:00-05', '2026-04-16 10:00:00-05', NULL, NULL, NULL, '2026-04-12 10:00:00-05'),
('4d0c38d3-6ff9-46ca-8006-94856546b54c', 'c9321e9f-8002-4fab-a6b8-1b64224e939d', '74a83784-38e5-4f6c-a939-133722d58ef4', 'rejected', '2026-04-13 10:00:00-05', NULL, NULL, 'No se ajusta al perfil buscado en este momento.', NULL, '2026-04-13 10:00:00-05'),
('2c59f4be-bd4a-41dc-b64d-a8d51dbe7a7b', 'c9321e9f-8002-4fab-a6b8-1b64224e939d', 'f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', 'rejected', '2026-04-14 10:00:00-05', NULL, NULL, 'No se ajusta al perfil buscado en este momento.', NULL, '2026-04-14 10:00:00-05'),
('54046381-f282-408c-8a6b-f1875feade40', 'd0e85c8e-dac8-4108-96a1-525b9e4111b9', '4c15ebe8-919e-416d-829b-308bf4213f9f', 'in_progress', '2026-05-12 10:00:00-05', '2026-05-16 10:00:00-05', NULL, NULL, NULL, '2026-05-12 10:00:00-05'),
('b8890bf7-4eff-4a5e-85fe-c76c9bb400b8', '4ab40f35-96d3-472e-b8c2-ea3a041bf018', '96f594b1-accf-4db5-aff8-580173ceb31b', 'withdrawn', '2026-06-14 10:00:00-05', NULL, NULL, NULL, 'El estudiante retiró su postulación.', '2026-06-14 10:00:00-05'),
('594ce878-1559-4299-9030-fa79ea859fca', '607b42f7-82bd-4e19-8ccd-c3472fa16e75', '834cc24f-ce67-4875-8ee0-d4002269c2f7', 'pending', '2026-08-10 10:00:00-05', NULL, NULL, NULL, NULL, '2026-08-10 10:00:00-05'),
('fa8c31ee-462d-44ea-b0ca-fd006286e49e', '607b42f7-82bd-4e19-8ccd-c3472fa16e75', '647e4ad4-bc06-4185-8b5d-3a78deb86c14', 'under_review', '2026-08-12 10:00:00-05', NULL, NULL, NULL, NULL, '2026-08-12 10:00:00-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "application_timeline" (id, application_id, from_status, to_status, changed_by_user_id, created_at) VALUES
('1332a699-1596-4290-85be-9c87801a034c', 'f270c8b7-a6f6-4ace-be0c-6696990ca5b5', 'pending', 'accepted', '834cc24f-ce67-4875-8ee0-d4002269c2f7', '2025-10-22 10:00:00-05'),
('2aeb0f8a-dfea-4f00-bb26-b1f3fb3e2f8a', 'f270c8b7-a6f6-4ace-be0c-6696990ca5b5', 'accepted', 'in_progress', '834cc24f-ce67-4875-8ee0-d4002269c2f7', '2025-10-24 10:00:00-05'),
('d01dc748-9470-40e5-8ee3-e3671d9b2151', 'f270c8b7-a6f6-4ace-be0c-6696990ca5b5', 'in_progress', 'completed', '834cc24f-ce67-4875-8ee0-d4002269c2f7', '2026-03-15 10:00:00-05'),
('b8824009-8d7a-44e7-82a6-c99c8c092bf3', '80f4fc83-0e98-4950-853b-87d5cdc590a1', 'pending', 'rejected', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', '2025-10-21 10:00:00-05'),
('3a2e780e-e1c5-4ecc-ac56-03b44fe98abb', '523fcd4e-d508-4f4a-b72e-6db96fd2bed5', 'pending', 'withdrawn', '834cc24f-ce67-4875-8ee0-d4002269c2f7', '2025-12-05 10:00:00-05'),
('ae338404-6093-4b7c-83b1-b40f2d80a717', '852f5806-3649-437a-88dd-ba93cc7f0ea0', 'pending', 'accepted', '834cc24f-ce67-4875-8ee0-d4002269c2f7', '2025-11-18 10:00:00-05'),
('3bf47a16-ef6c-434b-b1c7-af61e09b6095', '852f5806-3649-437a-88dd-ba93cc7f0ea0', 'accepted', 'in_progress', '834cc24f-ce67-4875-8ee0-d4002269c2f7', '2025-11-20 10:00:00-05'),
('a1bf64a7-60b6-4971-99c1-420ac5b53ed0', '852f5806-3649-437a-88dd-ba93cc7f0ea0', 'in_progress', 'completed', '834cc24f-ce67-4875-8ee0-d4002269c2f7', '2026-04-01 10:00:00-05'),
('4c052585-2538-476c-9136-04e60504eafa', '1553cccd-50bf-43a8-a43e-58540f4f3d3b', 'pending', 'rejected', '1e50afe9-4250-4a19-9a92-7f3309b1fb81', '2025-11-16 10:00:00-05'),
('360e02c0-9785-4a24-88f0-1f1ed0f7804b', '02493c76-1711-415a-9970-6feb1b69bb00', 'pending', 'accepted', '96f594b1-accf-4db5-aff8-580173ceb31b', '2025-12-15 10:00:00-05'),
('a40ce0a4-d2c4-480f-a8ad-f9ced22e829d', '02493c76-1711-415a-9970-6feb1b69bb00', 'accepted', 'in_progress', '96f594b1-accf-4db5-aff8-580173ceb31b', '2025-12-17 10:00:00-05'),
('129bf024-510c-48e4-b5af-366cd4ff901b', 'f73b3e34-25bb-48fe-80a4-ce2c3c372e8a', 'pending', 'rejected', '74a83784-38e5-4f6c-a939-133722d58ef4', '2025-12-16 10:00:00-05'),
('fc9cddb4-7213-482c-95de-96fcd031e843', '65bf989b-20bd-4412-9e59-7b01536cc84d', 'pending', 'accepted', 'f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', '2026-02-14 10:00:00-05'),
('442ca151-8c1a-4327-a218-e3eb3f165c7a', '65bf989b-20bd-4412-9e59-7b01536cc84d', 'accepted', 'in_progress', 'f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', '2026-02-16 10:00:00-05'),
('52aea5d8-3410-43a1-9ff7-186a66efca5c', 'ef3d82f2-014b-4cd8-b53d-0600b70c2182', 'pending', 'rejected', '4c15ebe8-919e-416d-829b-308bf4213f9f', '2026-02-17 10:00:00-05'),
('2ead13b6-3a0f-4d98-9d63-86d5985455aa', 'c95a722e-c082-4e3e-bd77-36600451ae56', 'pending', 'accepted', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', '2026-03-19 10:00:00-05'),
('cbe1ed9e-1495-4b45-b2f5-04c33eb3b96e', 'c95a722e-c082-4e3e-bd77-36600451ae56', 'accepted', 'in_progress', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', '2026-03-21 10:00:00-05'),
('0f4eef66-31d7-4ecb-b219-8d89150e5b8c', 'c95a722e-c082-4e3e-bd77-36600451ae56', 'in_progress', 'completed', 'df7d772c-9da3-40d6-a4fd-09d0f4a13227', '2026-08-15 10:00:00-05'),
('43769ec2-47c4-4e51-bfe5-43bafb99a8f7', '6ce5911f-f28d-4193-91fd-143a73c04344', 'pending', 'rejected', '647e4ad4-bc06-4185-8b5d-3a78deb86c14', '2026-03-19 10:00:00-05'),
('c2cbdda9-19be-4276-a04c-ef232ac68ad5', 'f5618738-03f1-4859-b66b-387cf77bc611', 'pending', 'accepted', '1e50afe9-4250-4a19-9a92-7f3309b1fb81', '2026-04-16 10:00:00-05'),
('4599e859-729f-4384-9835-bb3cff838605', 'f5618738-03f1-4859-b66b-387cf77bc611', 'accepted', 'in_progress', '1e50afe9-4250-4a19-9a92-7f3309b1fb81', '2026-04-18 10:00:00-05'),
('f91d2aa6-e84b-4241-9684-802a64eaee98', '4d0c38d3-6ff9-46ca-8006-94856546b54c', 'pending', 'rejected', '74a83784-38e5-4f6c-a939-133722d58ef4', '2026-04-17 10:00:00-05'),
('389f8126-e338-49f3-8cec-c9563a025ff6', '2c59f4be-bd4a-41dc-b64d-a8d51dbe7a7b', 'pending', 'rejected', 'f09e9d64-e304-43e4-8bcb-bc36ab5b01e9', '2026-04-17 10:00:00-05'),
('42055f09-0622-4e00-817a-2335c88aa2ef', '54046381-f282-408c-8a6b-f1875feade40', 'pending', 'accepted', '4c15ebe8-919e-416d-829b-308bf4213f9f', '2026-05-16 10:00:00-05'),
('7d3f7b88-d5c1-4cbc-bfd4-a19dc1d30a23', '54046381-f282-408c-8a6b-f1875feade40', 'accepted', 'in_progress', '4c15ebe8-919e-416d-829b-308bf4213f9f', '2026-05-18 10:00:00-05'),
('949d8ed1-02d8-4592-94b0-0ea337e84f91', 'b8890bf7-4eff-4a5e-85fe-c76c9bb400b8', 'pending', 'withdrawn', '96f594b1-accf-4db5-aff8-580173ceb31b', '2026-06-20 10:00:00-05'),
('ac3d3e4d-7da3-475f-a001-e53d45ade3c8', 'fa8c31ee-462d-44ea-b0ca-fd006286e49e', 'pending', 'under_review', '647e4ad4-bc06-4185-8b5d-3a78deb86c14', '2026-08-13 10:00:00-05')
ON CONFLICT (id) DO NOTHING;


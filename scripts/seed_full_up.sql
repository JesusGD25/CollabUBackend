-- =========================================================================
-- COLLAB-U — SEED COMPLETO DE DESARROLLO
-- Cubre todos los roles reales y todos los estados reales del flujo
-- académico/proyecto según el código actual (ver GUIA_EJECUCION.md).
--
-- Contraseña de TODAS las cuentas de este seed: CollabU2026!
-- (hash bcrypt pre-calculado, solo válido para entorno de desarrollo)
--
-- Requiere que los 13 servicios hayan arrancado al menos una vez
-- (TypeORM synchronize crea las tablas) antes de ejecutar este script.
--
-- Ejecutar SIEMPRE con Run-Seed.ps1, que copia el archivo al contenedor.
-- Canalizarlo con `Get-Content | docker exec` corrompe los acentos.
-- =========================================================================
--
-- ═════════════════════════ 21 ESCENARIOS SEMBRADOS ═════════════════════════
--   E01: Proyecto pending_approval (revisión inicial pendiente)         → P1
--   E02: Proyecto needs_changes (facultad pidió cambios)                → P2
--   E03: Proyecto published sin postulaciones                           → P3
--   E04: Proyecto published con postulación rechazada                   → P4
--   E05: Proyecto published + postulación aceptada, en entrevista       → P5
--   E06: Postulación aceptada, esperando asesor (pending_supervisor)    → P17
--   E07: Asesor asignado, sin anteproyecto aún                          → P7
--   E08: Anteproyecto en proceso (submitted, sin revisión)              → P8
--   E09: Anteproyecto con jurados asignados, voto parcial               → P9
--   E10: Anteproyecto con corrección solicitada                         → P10
--   E11: Anteproyecto aprobado, esperando documentos                    → P11
--   E12: Acuerdo de iniciación pendiente                                → P12
--   E13: Proyecto en progreso, entregables activos                      → P13
--   E14: Proyecto próximo a finalizar (progreso >90%)                   → P14
--   E15: Proyecto completado con acta y nota final                     → P15
--   E16: Proyecto cancelado                                             → P16
--   E17: Postulación en pending_supervisor (asesor no ha aceptado)      → P17
--   E18: Anteproyecto vencido (deadline expirado)                       → P18
--   E19: Estudiante sin onboarding completo (nuevo usuario)             → student16
--   E20: Docente con doble rol (asesor en P9/P14 + jurado en P15)       → faculty04
--   E21: Caracteres especiales (á/é/í/ó/ú/ñ/ü) en todas las tablas
--        Ejemplos: Sofía, Andrés, Muñoz, Miguel Ángel, Ríos, Peña,
--        Suárez, Díaz, Ramírez, Ingeniería, etc.
--   E22: Cuenta real para probar entrega de correos al finalizar          → student20
--        email jesusdavidgd200425@gmail.com, proyecto en estado 'active'
--        con anteproyecto aprobado, acuerdo de iniciación y todos los
--        entregables aprobados. Admin puede iniciar finalización y probar
--        el envío del correo real al completar el proyecto (P20).
-- ═════════════════════════════════════════════════════════════════════════
--
-- NOTA sobre fechas: los datos están anclados al 2026-08-12. Para regenerar
-- con fechas relativas al presente (útil si CURRENT_DATE excede 2027), se
-- puede ejecutar seed_shift_dates.sql (opcional) tras la siembra base.
-- =========================================================================

-- El archivo es UTF-8. Se declara explícitamente para no depender del entorno
-- del contenedor: `\c` reinicia la conexión, así que se repite tras cada cambio
-- de base de datos.
SET client_encoding = 'UTF8';

-- ── Password hash compartido (bcrypt, costo 10) de "CollabU2026!" ────────
-- $2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32

-- =========================================================================
-- 1. AUTH_DB — usuarios (todos los roles reales: student, company, admin, faculty)
-- =========================================================================
\c auth_db;
SET client_encoding = 'UTF8';

INSERT INTO "users" (id, email, password_hash, role, is_verified, is_active) VALUES
-- Estudiantes (19)
('b9addbae-f9b5-4577-b700-3b42a13edcd2','student01@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('afb35c03-179f-40ef-8017-39c77723845a','student02@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('db4a7f02-d6b7-45ea-a86a-5c945296cb3a','student03@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('e703a961-b7d0-4b71-ab06-dbdd656587e2','student04@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('763c9133-31b0-4c2e-954d-05707b21b33f','student05@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('e476dc18-974c-4563-a2eb-91ecf3ca24e8','student06@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('8113abaa-14bb-485f-a44a-91602e2d825c','student07@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('d1a97678-5d09-4145-99cd-d341fa57b96f','student08@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('525229cc-c47f-493e-bb06-185cd9df0a7b','student09@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('2618e6fe-414d-4e5a-8f7e-603b9688af33','student10@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('19377bc1-51c0-485a-9474-919fce518a34','student11@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('4868659b-8b42-4522-8f93-903c370e84b1','student12@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('978be3f3-1bef-4b92-aa20-eb62f64402e6','student13@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('bf1bf33b-0300-4530-b89d-8965ed809db5','student14@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('de1c95f3-f5f1-4b34-ab19-e67ea2648129','student15@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('5211a20f-e559-4c7e-91bf-335cdfa44cda','student16@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('22915994-9802-4475-82da-50b5c1b20acc','student17@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('df66d290-4054-47bb-98bc-5b5984a5f03f','student18@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
('70e41bcd-c32a-48f2-a3ba-9eb1a1df1d95','student19@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true),
-- Empresas (3)
('928b7648-201a-4ab8-8bbb-638a2e4f5490','company01@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','company',true,true),
('7e1cc874-aa38-4c57-8660-fbf182bfdbc7','company02@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','company',true,true),
('4575b9ce-9a2a-489a-9c55-74e7b17ec204','company03@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','company',true,true),
-- Administrador (1)
('951e948d-e811-4403-bf33-a0ced78a17b1','admin01@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','admin',true,true),
-- Docentes / faculty (4): asesor + 2 jurados de anteproyecto + jurado final
('47a3161d-169f-4224-9fb3-fcf74c9796d2','faculty01@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','faculty',true,true),
('f5c155d1-dc3b-4363-af1d-15e245cede7f','faculty02@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','faculty',true,true),
('ea61d231-ae8b-46d4-9377-433328ec6215','faculty03@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','faculty',true,true),
('866b6e22-8676-4557-b37b-178c0c185f50','faculty04@collabu.dev','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','faculty',true,true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 2. USER_DB — perfiles core (nombre real por usuario)
-- =========================================================================
\c user_db;
SET client_encoding = 'UTF8';

INSERT INTO "user_profiles" (id, user_id, role, first_name, last_name) VALUES
('dd796748-209f-4fa4-adf1-322b86a0c840','b9addbae-f9b5-4577-b700-3b42a13edcd2','student','Sofía','Martínez'),
('3d634f2a-267e-460a-8891-c4abdd998c0d','afb35c03-179f-40ef-8017-39c77723845a','student','Camilo','Rojas'),
('a3b504db-7bef-4750-ae4c-cbcba75074d4','db4a7f02-d6b7-45ea-a86a-5c945296cb3a','student','Valentina','Ríos'),
('028cdc2f-edb6-46ab-9943-bd7abc11a671','e703a961-b7d0-4b71-ab06-dbdd656587e2','student','Andrés','Torres'),
('4e7123b6-2e97-400d-8efe-a5adacc1617f','763c9133-31b0-4c2e-954d-05707b21b33f','student','Laura','Gómez'),
('2785dc96-494c-4249-848d-a693e153aa5b','e476dc18-974c-4563-a2eb-91ecf3ca24e8','student','Juan Pablo','Díaz'),
('29b3017f-e51c-4c66-8bb6-7a2bbc5481cb','8113abaa-14bb-485f-a44a-91602e2d825c','student','Daniela','Suárez'),
('5dabf56f-42c0-46c9-be8a-f5f5476dfc47','d1a97678-5d09-4145-99cd-d341fa57b96f','student','Miguel Ángel','Cruz'),
('80278e08-717d-4d57-a871-07f1f030479a','525229cc-c47f-493e-bb06-185cd9df0a7b','student','Paula','Herrera'),
('92842ad8-ec1a-4e3e-8d29-f3a716f9c525','2618e6fe-414d-4e5a-8f7e-603b9688af33','student','Sebastián','Ortiz'),
('73a95b24-049f-45c2-ba6b-adccb89dc97c','19377bc1-51c0-485a-9474-919fce518a34','student','Camila','Vargas'),
('bb946a00-d1a7-457a-a461-9772263fdeb2','4868659b-8b42-4522-8f93-903c370e84b1','student','Nicolás','Peña'),
('8f2758a1-d710-41d4-ae30-3e159240b722','978be3f3-1bef-4b92-aa20-eb62f64402e6','student','Isabella','Castro'),
('9b07096f-30ea-4c32-a076-f88b83720622','bf1bf33b-0300-4530-b89d-8965ed809db5','student','Felipe','Moreno'),
('1c6355ab-abf6-466c-ba97-c906bef95312','de1c95f3-f5f1-4b34-ab19-e67ea2648129','student','Manuela','Duarte'),
('d3e0ac3d-43ba-4133-8695-94635fe21146','5211a20f-e559-4c7e-91bf-335cdfa44cda','student','Santiago','López'),
('3ea72c78-c1e0-4a57-ba1b-c22f644f5b5e','22915994-9802-4475-82da-50b5c1b20acc','student','Gabriela','Muñoz'),
('2381dbaf-c212-4b1d-8c4c-c6a9fa6b28d3','df66d290-4054-47bb-98bc-5b5984a5f03f','student','Tomás','Ramírez'),
('c17b4bc9-010b-4465-8c46-80f01c57df24','70e41bcd-c32a-48f2-a3ba-9eb1a1df1d95','student','Mariana','Salazar'),
('ee9528bc-f990-4faa-8136-b795f93d5162','928b7648-201a-4ab8-8bbb-638a2e4f5490','company','Carlos','Gómez'),
('fa71f868-2d08-4bba-ba52-c49d4d7f616b','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','company','Marcela','Vidal'),
('3beb5245-a0cb-4296-9c7d-9aab516ca135','4575b9ce-9a2a-489a-9c55-74e7b17ec204','company','Ricardo','Nieto'),
('30cc4084-0e75-4f0b-a66f-05d2eee6066f','951e948d-e811-4403-bf33-a0ced78a17b1','admin','Administrador','del Sistema'),
('6759669d-0d1a-4d97-bf30-3c319150a5f1','47a3161d-169f-4224-9fb3-fcf74c9796d2','faculty','Ana','Ruiz'),
('f6b61b53-927d-4fa0-b3c4-3f526965edf1','f5c155d1-dc3b-4363-af1d-15e245cede7f','faculty','Luis','Peña'),
('2585818d-7371-4a7f-8084-e5447d9a7899','ea61d231-ae8b-46d4-9377-433328ec6215','faculty','Marta','Ríos'),
('ac36da22-5b4f-4f7c-88b1-3716508cef8a','866b6e22-8676-4557-b37b-178c0c185f50','faculty','Jorge','Salas')
ON CONFLICT (user_id) DO NOTHING;

-- Marcar onboarding completo para todos excepto student16 (para probar onboarding)
UPDATE "user_profiles" SET is_onboarding_complete = true
WHERE user_id != '5211a20f-e559-4c7e-91bf-335cdfa44cda';

-- ── 2b. Enriquecimiento de UserProfile (regla 10 del planning) ──────────
-- IMPORTANTE (hallazgo real, ver PLANNING_RECONSTRUCCION_SEED.md §1.4): el flag
-- is_onboarding_complete de arriba puede ser sobrescrito en cualquier momento por
-- UserEventsSubscriber (user-service) al recibir student.profile.updated /
-- company.profile.updated / faculty.profile.updated, recalculando el valor real
-- vía isOnboardingReady() en cada servicio dueño del perfil. Para student-service
-- esa función exige program+semester+studentCode+BIO+≥1 skill — bio nunca se
-- sembraba, así que cualquier mutación futura del perfil revertía el flag a false
-- en vivo (reproducido en el navegador durante Fase H). Se corrige poblando bio.
UPDATE "user_profiles" SET phone='+57 300 111 2233', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas, interesado en desarrollo backend y machine learning aplicado a productos digitales.', linkedin_url='https://linkedin.com/in/sofia-martinez-dev', date_of_birth='2002-03-14', gender='female' WHERE user_id='b9addbae-f9b5-4577-b700-3b42a13edcd2';
UPDATE "user_profiles" SET phone='+57 301 222 3344', city='Ipiales', department='Nariño', bio='Estudiante de Ingeniería Industrial, con interés en optimización de procesos y análisis de datos.', linkedin_url='https://linkedin.com/in/camilo-rojas', date_of_birth='2001-07-22', gender='male' WHERE user_id='afb35c03-179f-40ef-8017-39c77723845a';
UPDATE "user_profiles" SET phone='+57 302 333 4455', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas enfocada en desarrollo frontend y experiencia de usuario.', linkedin_url='https://linkedin.com/in/valentina-rios', date_of_birth='2002-01-09', gender='female' WHERE user_id='db4a7f02-d6b7-45ea-a86a-5c945296cb3a';
UPDATE "user_profiles" SET phone='+57 303 444 5566', city='Tumaco', department='Nariño', bio='Estudiante de Ingeniería Electrónica, con interés en desarrollo web y sistemas embebidos.', linkedin_url='https://linkedin.com/in/andres-torres', date_of_birth='2003-05-30', gender='male' WHERE user_id='e703a961-b7d0-4b71-ab06-dbdd656587e2';
UPDATE "user_profiles" SET phone='+57 304 555 6677', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas con experiencia en despliegue de infraestructura en la nube.', linkedin_url='https://linkedin.com/in/laura-gomez', date_of_birth='2001-11-02', gender='female' WHERE user_id='763c9133-31b0-4c2e-954d-05707b21b33f';
UPDATE "user_profiles" SET phone='+57 305 666 7788', city='Popayán', department='Cauca', bio='Estudiante de Ingeniería de Sistemas apasionado por el desarrollo frontend y las interfaces accesibles.', linkedin_url='https://linkedin.com/in/juan-pablo-diaz', date_of_birth='2002-09-18', gender='male' WHERE user_id='e476dc18-974c-4563-a2eb-91ecf3ca24e8';
UPDATE "user_profiles" SET phone='+57 306 777 8899', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería Industrial con interés en inteligencia artificial aplicada a atención al cliente.', linkedin_url='https://linkedin.com/in/daniela-suarez', date_of_birth='2001-04-27', gender='female' WHERE user_id='8113abaa-14bb-485f-a44a-91602e2d825c';
UPDATE "user_profiles" SET phone='+57 307 888 9900', city='Cali', department='Valle del Cauca', bio='Estudiante de Ingeniería de Sistemas con experiencia en integraciones de pago y APIs de terceros.', linkedin_url='https://linkedin.com/in/miguel-cruz', date_of_birth='2000-12-05', gender='male' WHERE user_id='d1a97678-5d09-4145-99cd-d341fa57b96f';
UPDATE "user_profiles" SET phone='+57 310 999 0011', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas con enfoque en backend Java y normativa de facturación electrónica.', linkedin_url='https://linkedin.com/in/paula-herrera', date_of_birth='2001-08-16', gender='female' WHERE user_id='525229cc-c47f-493e-bb06-185cd9df0a7b';
UPDATE "user_profiles" SET phone='+57 311 000 1122', city='Medellín', department='Antioquia', bio='Estudiante de Ingeniería Electrónica interesado en diseño UX/UI y prototipado con Figma.', linkedin_url='https://linkedin.com/in/sebastian-ortiz', date_of_birth='2002-02-11', gender='male' WHERE user_id='2618e6fe-414d-4e5a-8f7e-603b9688af33';
UPDATE "user_profiles" SET phone='+57 312 111 2233', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas con buen manejo de bases de datos relacionales y optimización de consultas.', linkedin_url='https://linkedin.com/in/camila-vargas', date_of_birth='2001-06-23', gender='female' WHERE user_id='19377bc1-51c0-485a-9474-919fce518a34';
UPDATE "user_profiles" SET phone='+57 313 222 3344', city='Bogotá', department='Cundinamarca', bio='Estudiante de Ingeniería Industrial con interés en reportería gerencial y analítica de negocio.', linkedin_url='https://linkedin.com/in/nicolas-pena', date_of_birth='2001-10-08', gender='male' WHERE user_id='4868659b-8b42-4522-8f93-903c370e84b1';
UPDATE "user_profiles" SET phone='+57 314 333 4455', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas próxima a graduarse, con experiencia en gestión documental.', linkedin_url='https://linkedin.com/in/isabella-castro', date_of_birth='2000-09-14', gender='female' WHERE user_id='978be3f3-1bef-4b92-aa20-eb62f64402e6';
UPDATE "user_profiles" SET phone='+57 315 444 5566', city='Cali', department='Valle del Cauca', bio='Estudiante de Ingeniería de Sistemas interesado en arquitecturas de mensajería y sistemas distribuidos.', linkedin_url='https://linkedin.com/in/felipe-moreno', date_of_birth='2002-05-19', gender='male' WHERE user_id='bf1bf33b-0300-4530-b89d-8965ed809db5';
UPDATE "user_profiles" SET phone='+57 316 555 6677', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas con experiencia en monitoreo de infraestructura y DevOps básico.', linkedin_url='https://linkedin.com/in/manuela-duarte', date_of_birth='2001-03-02', gender='female' WHERE user_id='de1c95f3-f5f1-4b34-ab19-e67ea2648129';
UPDATE "user_profiles" SET phone='+57 317 666 7788', city='Ipiales', department='Nariño', bio='Estudiante de Ingeniería Industrial, aún completando su perfil en la plataforma.', linkedin_url=NULL, date_of_birth='2003-01-27', gender='male' WHERE user_id='5211a20f-e559-4c7e-91bf-335cdfa44cda';
UPDATE "user_profiles" SET phone='+57 318 777 8899', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas con interés en ciberseguridad y buenas prácticas de control de versiones.', linkedin_url='https://linkedin.com/in/gabriela-munoz', date_of_birth='2001-12-30', gender='female' WHERE user_id='22915994-9802-4475-82da-50b5c1b20acc';
UPDATE "user_profiles" SET phone='+57 319 888 9900', city='Pasto', department='Nariño', bio='Estudiante de Ingeniería de Sistemas, actualmente cursando su primer semestre en la plataforma de prácticas.', linkedin_url=NULL, date_of_birth='2002-07-06', gender='male' WHERE user_id='df66d290-4054-47bb-98bc-5b5984a5f03f';
UPDATE "user_profiles" SET phone='+57 320 999 0011', city='Tumaco', department='Nariño', bio='Estudiante de Ingeniería Electrónica interesado en sistemas embebidos e IoT aplicado a procesos industriales.', linkedin_url='https://linkedin.com/in/mariana-salazar', date_of_birth='2001-02-15', gender='female' WHERE user_id='70e41bcd-c32a-48f2-a3ba-9eb1a1df1d95';
UPDATE "user_profiles" SET phone='+57 321 000 1122', city='Bogotá', department='Cundinamarca', bio='Gerente de Talento de Tech Solutions Latam, encargado de la publicación y seguimiento de proyectos de práctica.', linkedin_url='https://linkedin.com/in/carlos-gomez-tsl', date_of_birth='1988-04-12', gender='male' WHERE user_id='928b7648-201a-4ab8-8bbb-638a2e4f5490';
UPDATE "user_profiles" SET phone='+57 322 111 2233', city='Medellín', department='Antioquia', bio='Coordinadora de proyectos de InnovaSoft SAS, responsable de la relación con estudiantes en práctica.', linkedin_url='https://linkedin.com/in/marcela-vidal', date_of_birth='1990-08-25', gender='female' WHERE user_id='7e1cc874-aa38-4c57-8660-fbf182bfdbc7';
UPDATE "user_profiles" SET phone='+57 323 222 3344', city='Cali', department='Valle del Cauca', bio='Fundador de Nueva Empresa SAS, agencia digital en proceso de verificación institucional.', linkedin_url='https://linkedin.com/in/ricardo-nieto', date_of_birth='1993-01-19', gender='male' WHERE user_id='4575b9ce-9a2a-489a-9c55-74e7b17ec204';
UPDATE "user_profiles" SET phone='+57 324 333 4455', city='Pasto', department='Nariño', bio='Administrador de la plataforma Collab-U, encargado de la verificación de proyectos y empresas.', linkedin_url=NULL, date_of_birth='1985-06-01', gender='other' WHERE user_id='951e948d-e811-4403-bf33-a0ced78a17b1';
UPDATE "user_profiles" SET phone='+57 325 444 5566', city='Pasto', department='Nariño', bio='Docente asesora de prácticas, especialista en Ingeniería de Software y acompañamiento de anteproyectos.', linkedin_url='https://linkedin.com/in/ana-ruiz-udenar', date_of_birth='1982-03-11', gender='female' WHERE user_id='47a3161d-169f-4224-9fb3-fcf74c9796d2';
UPDATE "user_profiles" SET phone='+57 326 555 6677', city='Pasto', department='Nariño', bio='Docente supervisor de prácticas, especialista en bases de datos y jurado de anteproyectos.', linkedin_url='https://linkedin.com/in/luis-pena-udenar', date_of_birth='1979-11-23', gender='male' WHERE user_id='f5c155d1-dc3b-4363-af1d-15e245cede7f';
UPDATE "user_profiles" SET phone='+57 327 666 7788', city='Pasto', department='Nariño', bio='Docente supervisora de prácticas, especialista en inteligencia artificial y jurado de anteproyectos.', linkedin_url='https://linkedin.com/in/marta-rios-udenar', date_of_birth='1986-09-05', gender='female' WHERE user_id='ea61d231-ae8b-46d4-9377-433328ec6215';
UPDATE "user_profiles" SET phone='+57 328 777 8899', city='Pasto', department='Nariño', bio='Director académico del programa, encargado de la gestión de proyectos y jurado final.', linkedin_url='https://linkedin.com/in/jorge-salas-udenar', date_of_birth='1975-05-17', gender='male' WHERE user_id='866b6e22-8676-4557-b37b-178c0c185f50';

-- ── 2c. bio en student_db.student_profiles (regla 8 + hallazgo del §2b) ─────
-- Requerido por isOnboardingReady() en student.service.ts (no forma parte del
-- cálculo de matching, seguro de sembrar incluso en los 9 escenarios protegidos).
\c student_db;
UPDATE "student_profiles" SET bio = 'Interesado en desarrollo backend y machine learning aplicado a productos digitales.' WHERE user_id = 'b9addbae-f9b5-4577-b700-3b42a13edcd2';
UPDATE "student_profiles" SET bio = 'Con interés en optimización de procesos y análisis de datos.' WHERE user_id = 'afb35c03-179f-40ef-8017-39c77723845a';
UPDATE "student_profiles" SET bio = 'Enfocada en desarrollo frontend y experiencia de usuario.' WHERE user_id = 'db4a7f02-d6b7-45ea-a86a-5c945296cb3a';
UPDATE "student_profiles" SET bio = 'Interesado en desarrollo web y sistemas embebidos.' WHERE user_id = 'e703a961-b7d0-4b71-ab06-dbdd656587e2';
UPDATE "student_profiles" SET bio = 'Con experiencia en despliegue de infraestructura en la nube.' WHERE user_id = '763c9133-31b0-4c2e-954d-05707b21b33f';
UPDATE "student_profiles" SET bio = 'Apasionado por el desarrollo frontend y las interfaces accesibles.' WHERE user_id = 'e476dc18-974c-4563-a2eb-91ecf3ca24e8';
UPDATE "student_profiles" SET bio = 'Con interés en inteligencia artificial aplicada a atención al cliente.' WHERE user_id = '8113abaa-14bb-485f-a44a-91602e2d825c';
UPDATE "student_profiles" SET bio = 'Con experiencia en integraciones de pago y APIs de terceros.' WHERE user_id = 'd1a97678-5d09-4145-99cd-d341fa57b96f';
UPDATE "student_profiles" SET bio = 'Con enfoque en backend Java y normativa de facturación electrónica.' WHERE user_id = '525229cc-c47f-493e-bb06-185cd9df0a7b';
UPDATE "student_profiles" SET bio = 'Interesado en diseño UX/UI y prototipado con Figma.' WHERE user_id = '2618e6fe-414d-4e5a-8f7e-603b9688af33';
UPDATE "student_profiles" SET bio = 'Con buen manejo de bases de datos relacionales y optimización de consultas.' WHERE user_id = '19377bc1-51c0-485a-9474-919fce518a34';
UPDATE "student_profiles" SET bio = 'Con interés en reportería gerencial y analítica de negocio.' WHERE user_id = '4868659b-8b42-4522-8f93-903c370e84b1';
UPDATE "student_profiles" SET bio = 'Próxima a graduarse, con experiencia en gestión documental.' WHERE user_id = '978be3f3-1bef-4b92-aa20-eb62f64402e6';
UPDATE "student_profiles" SET bio = 'Interesado en arquitecturas de mensajería y sistemas distribuidos.' WHERE user_id = 'bf1bf33b-0300-4530-b89d-8965ed809db5';
UPDATE "student_profiles" SET bio = 'Con experiencia en monitoreo de infraestructura y DevOps básico.' WHERE user_id = 'de1c95f3-f5f1-4b34-ab19-e67ea2648129';
UPDATE "student_profiles" SET bio = 'Interesado en ciberseguridad y buenas prácticas de control de versiones.' WHERE user_id = '22915994-9802-4475-82da-50b5c1b20acc';
UPDATE "student_profiles" SET bio = 'Interesado en sistemas embebidos e IoT aplicado a procesos industriales.' WHERE user_id = '70e41bcd-c32a-48f2-a3ba-9eb1a1df1d95';
-- student16 (5211a20f) y student18 (df66d290) se dejan SIN bio a propósito: son
-- los casos de onboarding incompleto / perfil sin skills (secciones 3b/3c).

-- =========================================================================
-- 3. STUDENT_DB — perfiles de estudiante
-- =========================================================================
\c student_db;
SET client_encoding = 'UTF8';

INSERT INTO "student_profiles" (id, user_id, program, faculty, semester, student_code) VALUES
('dcf8907d-b726-4e4a-b8fa-520ffeea4c18','b9addbae-f9b5-4577-b700-3b42a13edcd2','Ingeniería de Sistemas','Facultad de Ingeniería',8,'202010101'),
('18d0027b-a1d6-4323-8c86-cc9bb93ef810','afb35c03-179f-40ef-8017-39c77723845a','Ingeniería Industrial','Facultad de Ingeniería',7,'202010102'),
('f6ae184e-17fa-48a0-ac60-be57d96f0ef1','db4a7f02-d6b7-45ea-a86a-5c945296cb3a','Ingeniería de Sistemas','Facultad de Ingeniería',9,'202010103'),
('70135d53-bd45-43a2-827f-851e56600c01','e703a961-b7d0-4b71-ab06-dbdd656587e2','Ingeniería Electrónica','Facultad de Ingeniería',6,'202010104'),
('42ff38c3-ea06-443f-bf01-75b69f314653','763c9133-31b0-4c2e-954d-05707b21b33f','Ingeniería de Sistemas','Facultad de Ingeniería',9,'202010105'),
('ea6c0c74-2afd-4a5e-97b6-3472ffe41001','e476dc18-974c-4563-a2eb-91ecf3ca24e8','Ingeniería de Sistemas','Facultad de Ingeniería',8,'202010106'),
('35ed4bdf-1854-43f2-8494-3bc297a50531','8113abaa-14bb-485f-a44a-91602e2d825c','Ingeniería Industrial','Facultad de Ingeniería',9,'202010107'),
('96ff00fc-eac9-4af7-9b30-856abefbe12c','d1a97678-5d09-4145-99cd-d341fa57b96f','Ingeniería de Sistemas','Facultad de Ingeniería',10,'202010108'),
('088ee2c8-2a7e-4250-9776-3c046d50e633','525229cc-c47f-493e-bb06-185cd9df0a7b','Ingeniería de Sistemas','Facultad de Ingeniería',9,'202010109'),
('9dbade10-b36f-456d-a7c1-14ac9e8aa956','2618e6fe-414d-4e5a-8f7e-603b9688af33','Ingeniería Electrónica','Facultad de Ingeniería',8,'202010110'),
('2b93ca2c-6d10-4af6-9c0c-b732af41797f','19377bc1-51c0-485a-9474-919fce518a34','Ingeniería de Sistemas','Facultad de Ingeniería',9,'202010111'),
('d6fb28ed-6596-418a-8c4e-eb318c35a5c0','4868659b-8b42-4522-8f93-903c370e84b1','Ingeniería Industrial','Facultad de Ingeniería',8,'202010112'),
('0448f050-e4a9-4fd5-b271-35f0d96dd77e','978be3f3-1bef-4b92-aa20-eb62f64402e6','Ingeniería de Sistemas','Facultad de Ingeniería',10,'202010113'),
('f868d701-2f64-4e04-be13-672b0e412d58','bf1bf33b-0300-4530-b89d-8965ed809db5','Ingeniería de Sistemas','Facultad de Ingeniería',7,'202010114'),
('10977b30-8300-41dd-a431-c287c05a8293','de1c95f3-f5f1-4b34-ab19-e67ea2648129','Ingeniería de Sistemas','Facultad de Ingeniería',8,'202010115'),
('6b0f1dcc-d5c8-426d-801a-eee79e6cd7a5','5211a20f-e559-4c7e-91bf-335cdfa44cda','Ingeniería Industrial','Facultad de Ingeniería',6,'202010116'),
('02b5bad3-a766-4afc-bb42-b7eb5202c711','22915994-9802-4475-82da-50b5c1b20acc','Ingeniería de Sistemas','Facultad de Ingeniería',9,'202010117'),
('7d039efd-99a6-4c86-aba7-517dbc8f9814','df66d290-4054-47bb-98bc-5b5984a5f03f','Ingeniería de Sistemas','Facultad de Ingeniería',8,'202010118'),
('8ed662c8-df8e-453f-885d-965df3be8b8d','70e41bcd-c32a-48f2-a3ba-9eb1a1df1d95','Ingeniería Electrónica','Facultad de Ingeniería',9,'202010119')
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- 3b. STUDENT_DB — skills/idiomas para escenarios reales de matching
-- (ver PLANNING_MATCHING_SERVICE_FIX.md FASE 6). catalog_skill_id queda NULL
-- aquí a propósito: skill_catalog usa UUIDs generados en runtime
-- (admin-service onModuleInit), no deterministas entre entornos — se
-- resuelven después vía Backend/scripts/migrate-skills-unification.mjs
-- (matching-service igual matchea por nombre normalizado mientras tanto).
-- =========================================================================
INSERT INTO "skills" (id, student_id, name, catalog_skill_id, category, proficiency_level) VALUES
-- dcf8907d (student01, Ingeniería de Sistemas, sem8) — match alto contra "Motor de Recomendación con IA"
('a1000001-0000-4000-8000-000000000001','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','Python',NULL,'language','expert'),
('a1000001-0000-4000-8000-000000000002','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','Machine Learning',NULL,'concept','advanced'),
('a1000001-0000-4000-8000-000000000003','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','SQL',NULL,'language','intermediate'),
('a1000001-0000-4000-8000-000000000004','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','TypeScript',NULL,'language','advanced'),
-- 18d0027b (student02, Ingeniería Industrial, sin programId) — match parcial + programa no coincide (fallback por substring)
('a1000002-0000-4000-8000-000000000001','18d0027b-a1d6-4323-8c86-cc9bb93ef810','Python',NULL,'language','beginner'),
-- 7d039efd (student18, Ingeniería de Sistemas) — sin ninguna skill (aísla el factor skills; mismo programa)
-- 8ed662c8 (student19, Ingeniería Electrónica) — match parcial + programa no coincide (IDs reales, comparación directa)
('a1000019-0000-4000-8000-000000000001','8ed662c8-df8e-453f-885d-965df3be8b8d','Python',NULL,'language','beginner'),
-- f6ae184e (student03, Ingeniería de Sistemas, sem9) — match alto contra "Portal de Proveedores B2B"
('a1000003-0000-4000-8000-000000000001','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','React',NULL,'framework','advanced'),
('a1000003-0000-4000-8000-000000000002','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','NestJS',NULL,'framework','advanced'),
('a1000003-0000-4000-8000-000000000003','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','Docker',NULL,'tool','intermediate'),
('a1000003-0000-4000-8000-000000000004','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','PostgreSQL',NULL,'tool','intermediate'),
-- 70135d53 (student04, Ingeniería Electrónica, sem6) — match bajo (skills+programa+semestre insuficientes)
('a1000004-0000-4000-8000-000000000001','70135d53-bd45-43a2-827f-851e56600c01','React',NULL,'framework','beginner'),
-- 42ff38c3 (Ingeniería de Sistemas, sem9) — match alto con varias skills adicionales no requeridas ("extra")
('a1000005-0000-4000-8000-000000000001','42ff38c3-ea06-443f-bf01-75b69f314653','SQL',NULL,'language','advanced'),
('a1000005-0000-4000-8000-000000000002','42ff38c3-ea06-443f-bf01-75b69f314653','Docker',NULL,'tool','advanced'),
('a1000005-0000-4000-8000-000000000003','42ff38c3-ea06-443f-bf01-75b69f314653','AWS',NULL,'tool','intermediate'),
('a1000005-0000-4000-8000-000000000004','42ff38c3-ea06-443f-bf01-75b69f314653','Git',NULL,'tool','expert'),
('a1000005-0000-4000-8000-000000000005','42ff38c3-ea06-443f-bf01-75b69f314653','Kubernetes',NULL,'tool','intermediate'),
-- ea6c0c74 (Ingeniería de Sistemas, sem8) — match alto con idioma parcial (English sí, French no)
('a1000006-0000-4000-8000-000000000001','ea6c0c74-2afd-4a5e-97b6-3472ffe41001','React',NULL,'framework','intermediate'),
('a1000006-0000-4000-8000-000000000002','ea6c0c74-2afd-4a5e-97b6-3472ffe41001','JavaScript',NULL,'language','intermediate'),
-- 35ed4bdf (Ingeniería Industrial, sin programId, sem9) — skills altas pero programa no coincide (factor suave, no anula el score)
('a1000007-0000-4000-8000-000000000001','35ed4bdf-1854-43f2-8494-3bc297a50531','Python',NULL,'language','expert'),
('a1000007-0000-4000-8000-000000000002','35ed4bdf-1854-43f2-8494-3bc297a50531','Machine Learning',NULL,'concept','advanced')
ON CONFLICT (student_id, name) DO NOTHING;

INSERT INTO "languages" (id, student_id, language, proficiency) VALUES
('a2000001-0000-4000-8000-000000000001','dcf8907d-b726-4e4a-b8fa-520ffeea4c18','English','intermediate'),
('a2000003-0000-4000-8000-000000000001','f6ae184e-17fa-48a0-ac60-be57d96f0ef1','English','advanced'),
('a2000006-0000-4000-8000-000000000001','ea6c0c74-2afd-4a5e-97b6-3472ffe41001','English','advanced')
ON CONFLICT (student_id, language) DO NOTHING;

-- =========================================================================
-- 3c. STUDENT_DB — skills/idiomas del resto de estudiantes (no forman parte
-- de los 9 escenarios protegidos de FASE 6, se pueden ampliar libremente).
-- Mismo patrón: catalog_skill_id NULL, resuelto luego por
-- migrate-skills-unification.mjs. student16 (6b0f1dcc) se deja sin skills
-- a propósito — es el caso de onboarding incompleto.
-- =========================================================================
INSERT INTO "skills" (id, student_id, name, catalog_skill_id, category, proficiency_level) VALUES
-- 96ff00fc (student08, Sistemas, sem10)
('a1000008-0000-4000-8000-000000000001','96ff00fc-eac9-4af7-9b30-856abefbe12c','JavaScript',NULL,'language','advanced'),
('a1000008-0000-4000-8000-000000000002','96ff00fc-eac9-4af7-9b30-856abefbe12c','Node.js',NULL,'framework','advanced'),
('a1000008-0000-4000-8000-000000000003','96ff00fc-eac9-4af7-9b30-856abefbe12c','REST APIs',NULL,'concept','advanced'),
('a1000008-0000-4000-8000-000000000004','96ff00fc-eac9-4af7-9b30-856abefbe12c','Git',NULL,'tool','intermediate'),
-- 088ee2c8 (student09, Sistemas, sem9)
('a1000009-0000-4000-8000-000000000001','088ee2c8-2a7e-4250-9776-3c046d50e633','Java',NULL,'language','intermediate'),
('a1000009-0000-4000-8000-000000000002','088ee2c8-2a7e-4250-9776-3c046d50e633','Spring Boot',NULL,'framework','intermediate'),
('a1000009-0000-4000-8000-000000000003','088ee2c8-2a7e-4250-9776-3c046d50e633','Metodologías ágiles',NULL,'concept','advanced'),
-- 9dbade10 (student10, Electrónica, sem8)
('a1000010-0000-4000-8000-000000000001','9dbade10-b36f-456d-a7c1-14ac9e8aa956','Arduino',NULL,'framework','advanced'),
('a1000010-0000-4000-8000-000000000002','9dbade10-b36f-456d-a7c1-14ac9e8aa956','C++',NULL,'language','intermediate'),
('a1000010-0000-4000-8000-000000000003','9dbade10-b36f-456d-a7c1-14ac9e8aa956','Sistemas embebidos',NULL,'concept','intermediate'),
('a1000010-0000-4000-8000-000000000004','9dbade10-b36f-456d-a7c1-14ac9e8aa956','IoT',NULL,'concept','beginner'),
-- 2b93ca2c (student11, Sistemas, sem9)
('a1000011-0000-4000-8000-000000000001','2b93ca2c-6d10-4af6-9c0c-b732af41797f','SQL',NULL,'language','advanced'),
('a1000011-0000-4000-8000-000000000002','2b93ca2c-6d10-4af6-9c0c-b732af41797f','PostgreSQL',NULL,'tool','advanced'),
('a1000011-0000-4000-8000-000000000003','2b93ca2c-6d10-4af6-9c0c-b732af41797f','Análisis de datos',NULL,'concept','intermediate'),
-- d6fb28ed (student12, Industrial, sem8)
('a1000012-0000-4000-8000-000000000001','d6fb28ed-6596-418a-8c4e-eb318c35a5c0','Metodologías ágiles',NULL,'concept','intermediate'),
('a1000012-0000-4000-8000-000000000002','d6fb28ed-6596-418a-8c4e-eb318c35a5c0','Análisis de datos',NULL,'concept','beginner'),
('a1000012-0000-4000-8000-000000000003','d6fb28ed-6596-418a-8c4e-eb318c35a5c0','Trabajo en equipo',NULL,'concept','advanced'),
-- 0448f050 (student13, Sistemas, sem10)
('a1000013-0000-4000-8000-000000000001','0448f050-e4a9-4fd5-b271-35f0d96dd77e','SQL',NULL,'language','expert'),
('a1000013-0000-4000-8000-000000000002','0448f050-e4a9-4fd5-b271-35f0d96dd77e','PostgreSQL',NULL,'tool','advanced'),
('a1000013-0000-4000-8000-000000000003','0448f050-e4a9-4fd5-b271-35f0d96dd77e','Redis',NULL,'tool','intermediate'),
-- f868d701 (student14, Sistemas, sem7)
('a1000014-0000-4000-8000-000000000001','f868d701-2f64-4e04-be13-672b0e412d58','Angular',NULL,'framework','intermediate'),
('a1000014-0000-4000-8000-000000000002','f868d701-2f64-4e04-be13-672b0e412d58','TypeScript',NULL,'language','intermediate'),
('a1000014-0000-4000-8000-000000000003','f868d701-2f64-4e04-be13-672b0e412d58','Figma',NULL,'tool','beginner'),
-- 10977b30 (student15, Sistemas, sem8)
('a1000015-0000-4000-8000-000000000001','10977b30-8300-41dd-a431-c287c05a8293','AWS',NULL,'tool','intermediate'),
('a1000015-0000-4000-8000-000000000002','10977b30-8300-41dd-a431-c287c05a8293','Docker',NULL,'tool','intermediate'),
('a1000015-0000-4000-8000-000000000003','10977b30-8300-41dd-a431-c287c05a8293','DevOps',NULL,'concept','beginner'),
-- 02b5bad3 (student17, Sistemas, sem9)
('a1000017-0000-4000-8000-000000000001','02b5bad3-a766-4afc-bb42-b7eb5202c711','Ciberseguridad',NULL,'concept','intermediate'),
('a1000017-0000-4000-8000-000000000002','02b5bad3-a766-4afc-bb42-b7eb5202c711','Python',NULL,'language','intermediate'),
('a1000017-0000-4000-8000-000000000003','02b5bad3-a766-4afc-bb42-b7eb5202c711','Git',NULL,'tool','advanced')
ON CONFLICT (student_id, name) DO NOTHING;

INSERT INTO "languages" (id, student_id, language, proficiency) VALUES
('a2000008-0000-4000-8000-000000000001','96ff00fc-eac9-4af7-9b30-856abefbe12c','English','advanced'),
('a2000010-0000-4000-8000-000000000001','9dbade10-b36f-456d-a7c1-14ac9e8aa956','English','intermediate'),
('a2000011-0000-4000-8000-000000000001','2b93ca2c-6d10-4af6-9c0c-b732af41797f','English','intermediate'),
('a2000013-0000-4000-8000-000000000001','0448f050-e4a9-4fd5-b271-35f0d96dd77e','English','advanced'),
('a2000015-0000-4000-8000-000000000001','10977b30-8300-41dd-a431-c287c05a8293','English','basic'),
('a2000017-0000-4000-8000-000000000001','02b5bad3-a766-4afc-bb42-b7eb5202c711','Portugués','basic')
ON CONFLICT (student_id, language) DO NOTHING;

-- =========================================================================
-- 4. COMPANY_DB — perfiles de empresa (2 verificadas, 1 pendiente)
-- =========================================================================
\c company_db;
SET client_encoding = 'UTF8';

INSERT INTO "companies" (id, user_id, company_name, industry, verification_status, is_active) VALUES
('9affc33d-06e1-480f-bf5f-1cd883a86ffe','928b7648-201a-4ab8-8bbb-638a2e4f5490','Tech Solutions Latam','Tecnología','verified',true),
('e648ff94-d683-47f8-8d9d-e34d97dc3abf','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','InnovaSoft SAS','Tecnología','verified',true),
('ef822341-5cee-456b-8c59-2d225973bb40','4575b9ce-9a2a-489a-9c55-74e7b17ec204','Nueva Empresa SAS','Servicios','pending',true)
ON CONFLICT (user_id) DO NOTHING;

-- ── 4b. Enriquecimiento de perfiles de empresa (CompanyProfile completo) ──
UPDATE "companies" SET legal_name = 'Tech Solutions Latam S.A.S.', nit = '901234567-1', company_size = 'medium',
  description = 'Tech Solutions Latam es una consultora de desarrollo de software especializada en soluciones a la medida para el sector retail y financiero en Latinoamérica. Contamos con equipos multidisciplinarios en desarrollo web, móvil e inteligencia artificial aplicada a analítica de negocio.',
  website = 'https://techsolutionslatam.example.com', logo_url = 'https://storage.collabu.dev/dev/logos/tech-solutions-latam.png',
  founded_year = 2014, headquarters_city = 'Bogotá', headquarters_state = 'Cundinamarca', employee_count = 180
  WHERE id = '9affc33d-06e1-480f-bf5f-1cd883a86ffe';
UPDATE "companies" SET legal_name = 'InnovaSoft SAS', nit = '900876543-2', company_size = 'small',
  description = 'InnovaSoft SAS es una startup de tecnología enfocada en automatización de procesos empresariales, chatbots con procesamiento de lenguaje natural e integraciones de pagos electrónicos para pymes colombianas.',
  website = 'https://innovasoft.example.com', logo_url = 'https://storage.collabu.dev/dev/logos/innovasoft.png',
  founded_year = 2019, headquarters_city = 'Medellín', headquarters_state = 'Antioquia', employee_count = 45
  WHERE id = 'e648ff94-d683-47f8-8d9d-e34d97dc3abf';
UPDATE "companies" SET legal_name = 'Nueva Empresa SAS', nit = '901555222-3', company_size = 'startup',
  description = 'Nueva Empresa SAS es una agencia digital recién constituida, en proceso de verificación institucional, enfocada en desarrollo de sitios web y marketing digital para pequeños negocios.',
  website = 'https://nuevaempresa.example.com', logo_url = NULL,
  founded_year = 2025, headquarters_city = 'Cali', headquarters_state = 'Valle del Cauca', employee_count = 6
  WHERE id = 'ef822341-5cee-456b-8c59-2d225973bb40';

INSERT INTO "company_locations" (id, company_id, name, address, city, state, country, postal_code, is_headquarters, is_active) VALUES
('b1000001-0000-4000-8000-000000000001','9affc33d-06e1-480f-bf5f-1cd883a86ffe','Sede Principal Bogotá','Calle 93 # 14-20, Piso 8','Bogotá','Cundinamarca','Colombia','110221',true,true),
('b1000001-0000-4000-8000-000000000002','9affc33d-06e1-480f-bf5f-1cd883a86ffe','Oficina Medellín','Carrera 43A # 5-15, Torre 2','Medellín','Antioquia','Colombia','050021',false,true),
('b1000002-0000-4000-8000-000000000001','e648ff94-d683-47f8-8d9d-e34d97dc3abf','Sede Principal Medellín','Calle 10 # 40-30, Oficina 501','Medellín','Antioquia','Colombia','050022',true,true),
('b1000003-0000-4000-8000-000000000001','ef822341-5cee-456b-8c59-2d225973bb40','Sede Principal Cali','Avenida 6N # 28-10','Cali','Valle del Cauca','Colombia','760001',true,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "company_contacts" (id, company_id, first_name, last_name, position, email, phone, is_primary, is_active) VALUES
('b2000001-0000-4000-8000-000000000001','9affc33d-06e1-480f-bf5f-1cd883a86ffe','Carlos','Gómez','Gerente de Talento','carlos.gomez@techsolutionslatam.example.com','+57 300 1234567',true,true),
('b2000001-0000-4000-8000-000000000002','9affc33d-06e1-480f-bf5f-1cd883a86ffe','Marcela','Vidal','Coordinadora de Proyectos','marcela.vidal@techsolutionslatam.example.com','+57 301 2345678',false,true),
('b2000002-0000-4000-8000-000000000001','e648ff94-d683-47f8-8d9d-e34d97dc3abf','Ricardo','Nieto','CTO / Fundador','ricardo.nieto@innovasoft.example.com','+57 302 3456789',true,true),
('b2000003-0000-4000-8000-000000000001','ef822341-5cee-456b-8c59-2d225973bb40','Andrea','Salazar','Fundadora','contacto@nuevaempresa.example.com','+57 303 4567890',true,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "business_areas" (id, company_id, area_name, description, display_order) VALUES
('b3000001-0000-4000-8000-000000000001','9affc33d-06e1-480f-bf5f-1cd883a86ffe','Desarrollo de Software','Fábrica de software a la medida para clientes retail y financieros.',1),
('b3000001-0000-4000-8000-000000000002','9affc33d-06e1-480f-bf5f-1cd883a86ffe','Inteligencia Artificial','Modelos de recomendación, analítica predictiva y automatización de procesos.',2),
('b3000002-0000-4000-8000-000000000001','e648ff94-d683-47f8-8d9d-e34d97dc3abf','Automatización e Integraciones','Chatbots, integraciones de pago y automatización de procesos para pymes.',1),
('b3000003-0000-4000-8000-000000000001','ef822341-5cee-456b-8c59-2d225973bb40','Marketing Digital','Sitios web, landing pages y campañas digitales para pequeños negocios.',1)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 5. PROJECT_DB — 19 proyectos cubriendo los 7 ProjectStatus reales:
-- draft, pending_approval, needs_changes, published, in_progress, completed, cancelled
-- =========================================================================
\c project_db;
SET client_encoding = 'UTF8';

INSERT INTO "projects" (id, company_id, created_by_user_id, title, slug, description, project_type, status,
  duration_months, location_type, positions_available, application_deadline, start_date, end_date,
  faculty_review_notes, faculty_rejection_categories,
  faculty_reviewer_id, faculty_reviewed_at, submitted_for_review_at) VALUES
-- P1: recién creado (draft) — Tech Solutions Latam
('ba730172-e329-4788-bfe5-3b80d61dac7b','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Dashboard de Analítica Interna','dashboard-analitica-interna-tsl',
 'Tech Solutions Latam necesita centralizar los indicadores operativos que hoy están dispersos en hojas de cálculo y reportes manuales de cada área (ventas, soporte y desarrollo). El proyecto consiste en construir un dashboard interno con Angular que consuma los datos vía API REST y presente gráficas en tiempo real de los KPIs más relevantes para la gerencia.

El estudiante trabajará junto al equipo de desarrollo interno para definir los widgets prioritarios, implementar la capa de visualización y dejar preparada la actualización automática de los datos. Es un proyecto ideal para practicar consumo de APIs, manejo de estado en Angular y diseño de interfaces orientadas a datos.',
 'internship','draft',4,'remote',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
-- P2: pendiente de revisión (pending_approval)
('af50e121-4ecb-4cb3-9f13-a60778e4a702','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Automatización de Pruebas QA','automatizacion-pruebas-qa-tsl',
 'La plataforma de e-commerce de Tech Solutions Latam crece en funcionalidades cada release, y las pruebas de regresión manuales ya toman más de dos días por ciclo. Buscamos un estudiante que diseñe e implemente una suite de pruebas automatizadas end-to-end que cubra los flujos críticos: registro, carrito de compras, checkout y gestión de pedidos.

El proyecto incluye la selección de la herramienta de automatización, la definición de casos de prueba priorizados junto al equipo de QA, y la integración de la suite en el pipeline de CI existente para que corra en cada despliegue. Se espera un informe final con cobertura alcanzada y recomendaciones de mantenimiento.',
 'internship','pending_approval',5,'hybrid',2,'2026-09-30',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 10:00:00-05'),
-- P3: con cambios solicitados (needs_changes)
('24cbfde0-8fcd-4610-9ce2-515a016605c8','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Migración a Microservicios','migracion-microservicios-tsl',
 'Apoyo en la migración de un monolito legado de gestión de pedidos hacia una arquitectura de microservicios, separando los dominios de inventario, facturación y notificaciones en servicios independientes desplegados con Docker.',
 'professional_practice','needs_changes',6,'onsite',1,'2026-09-15',NULL,NULL,
 'La descripción no especifica el stack tecnológico ni los entregables esperados. Por favor detalla las tecnologías requeridas y agrega al menos 2 entregables.',
 ARRAY['descripcion_incompleta','faltan_entregables'],
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-08-03 09:15:00-05','2026-08-01 08:00:00-05'),
-- P4: publicado sin postulaciones
('9f8ace78-f0a6-4a8b-8d69-536340f84415','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'App Móvil de Fidelización','app-movil-fidelizacion-tsl',
 'Tech Solutions Latam quiere lanzar un programa de puntos y recompensas para los clientes finales de su plataforma de e-commerce. El proyecto consiste en desarrollar una app móvil híbrida con Flutter que permita a los usuarios consultar su saldo de puntos, canjear recompensas y recibir notificaciones de promociones.

La app debe integrarse con la API REST ya existente del backend de fidelización (autenticación, catálogo de recompensas y canjes) y seguir la guía de marca de la compañía. Se valorará experiencia previa manejando estado local, navegación y consumo de APIs REST en Flutter.

Es un proyecto de alcance acotado (6 meses) pensado como primera experiencia real de desarrollo móvil en un entorno productivo, con acompañamiento semanal del equipo de desarrollo interno.',
 'internship','published',6,'remote',2,'2026-09-20',NULL,NULL,'Cumple con todos los requisitos.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-07-20 11:00:00-05','2026-07-18 08:00:00-05'),
-- P5: publicado con postulaciones (pending / under_review / rejected / withdrawn)
('ea930fea-753f-463f-a9ef-e1c765b448c9','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Motor de Recomendación con IA','motor-recomendacion-ia-tsl',
 'El catálogo de productos de Tech Solutions Latam ha crecido significativamente y la tasa de conversión en la página de producto está por debajo del promedio del sector. Buscamos un estudiante o egresado reciente con bases sólidas en Python y Machine Learning para diseñar e implementar un motor de recomendación de productos basado en filtrado colaborativo y contenido, entrenado sobre el histórico de compras y navegación.

El alcance incluye la exploración y limpieza de los datos históricos, el entrenamiento y evaluación de al menos dos modelos candidatos, y la exposición de las recomendaciones vía un endpoint que consumirá el frontend de la tienda. Se espera documentación del proceso de modelado y métricas de precisión/cobertura del modelo elegido.

Este es un proyecto con fuerte componente analítico: se valorará experiencia previa con librerías de ciencia de datos y manejo de SQL para extraer y transformar los datos de origen.',
 'internship','published',6,'remote',2,'2026-08-20',NULL,NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-06-25 09:00:00-05','2026-06-20 08:00:00-05'),
-- P6: publicado con proceso de selección (shortlisted / interview)
('7753b939-ab07-42b1-860c-8122109cdcee','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Portal de Proveedores B2B','portal-proveedores-b2b-tsl',
 'Tech Solutions Latam gestiona hoy sus órdenes de compra a proveedores por correo electrónico y hojas de cálculo, lo que genera retrasos y errores de seguimiento. El proyecto consiste en construir un portal web B2B donde los proveedores puedan consultar órdenes de compra, actualizar el estado de despacho y cargar facturas, y donde el equipo de compras pueda dar seguimiento centralizado.

Se construirá con React en el frontend y NestJS en el backend, sobre una base de datos PostgreSQL, reutilizando el sistema de autenticación corporativo existente. El proyecto incluye el diseño del modelo de datos de órdenes/proveedores, la API REST correspondiente y las vistas principales del portal (listado de órdenes, detalle, carga de documentos).

Se espera que el estudiante participe en las reuniones de levantamiento de requisitos con el equipo de compras y entregue el portal funcional junto con documentación técnica básica.',
 'internship','published',5,'hybrid',1,'2026-07-15',NULL,NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-06-01 09:00:00-05','2026-05-28 08:00:00-05'),
-- P7: en desarrollo — con asesor asignado (aún sin anteproyecto)
('5f749e79-d4c3-41cf-af8a-9b1bc0593fee','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Sistema de Inventario en Tiempo Real','sistema-inventario-tiempo-real-tsl',
 'El almacén central de Tech Solutions Latam actualiza el inventario mediante cargues por lote una vez al día, lo que genera descuadres frecuentes con las ventas en tiempo real de la tienda en línea. El proyecto consiste en construir un sistema de control de inventario que refleje los movimientos de stock al instante usando WebSockets, notificando a los operadores cuando un producto esté por debajo del umbral mínimo.

El alcance cubre el modelo de datos de movimientos de inventario (entradas, salidas, ajustes), el canal de eventos en tiempo real y un panel de monitoreo para el equipo de bodega. El estudiante ya cuenta con asesor académico asignado y se encuentra en la etapa previa a la presentación del anteproyecto.',
 'internship','in_progress',6,'remote',1,'2026-05-01','2026-06-01',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-04-20 09:00:00-05','2026-04-15 08:00:00-05'),
-- P8: en proceso de anteproyecto
('73f5388a-21e4-41f3-9410-60c59289adf0','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Plataforma de Encuestas Internas','plataforma-encuestas-internas-tsl',
 'El área de Talento Humano de Tech Solutions Latam aplica encuestas de clima laboral usando formularios externos que no se integran con los sistemas internos ni permiten un seguimiento histórico. Se busca desarrollar una plataforma web propia para crear encuestas, distribuirlas por área y generar reportes automáticos con comparativos entre periodos.

El proyecto incluye el diseño del constructor de encuestas (preguntas de selección múltiple y escala), el flujo de respuesta anónima y el módulo de reportería con gráficas por dimensión evaluada. El estudiante ya envió la primera versión de su anteproyecto y se encuentra en etapa de revisión con su asesor.',
 'internship','in_progress',5,'remote',1,'2026-05-10','2026-06-05',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-04-25 09:00:00-05','2026-04-20 08:00:00-05'),
-- P9 (InnovaSoft): anteproyecto en revisión (voto de jurado parcial)
('9df36b79-bdfc-4152-84fd-b265ce9c2618','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','7e1cc874-aa38-4c57-8660-fbf182bfdbc7',
 'Chatbot de Soporte con NLP','chatbot-soporte-nlp-innovasoft',
 'InnovaSoft SAS recibe un volumen creciente de tickets de soporte repetitivos (restablecimiento de contraseña, estado de solicitudes, preguntas frecuentes) que hoy consumen buena parte del tiempo del equipo de atención al cliente. El proyecto de tesis consiste en diseñar e implementar un chatbot de atención basado en procesamiento de lenguaje natural capaz de resolver automáticamente las consultas más comunes y escalar a un agente humano cuando no logre resolver la solicitud.

El alcance incluye la definición de intenciones y entidades relevantes, el entrenamiento del modelo de clasificación de intención, la integración con el canal de chat de la plataforma y métricas de tasa de resolución automática. Al ser un proyecto de tesis, se espera un componente investigativo más profundo sobre el enfoque de NLP elegido y su justificación frente a alternativas.

El estudiante cuenta con asesor y dos jurados de anteproyecto asignados; el anteproyecto ya fue enviado y está actualmente en revisión, con un voto de aprobación registrado.',
 'thesis','in_progress',8,'hybrid',1,'2026-04-15','2026-05-01',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-04-01 09:00:00-05','2026-03-25 08:00:00-05'),
-- P10 (InnovaSoft): anteproyecto con correcciones solicitadas
('91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','7e1cc874-aa38-4c57-8660-fbf182bfdbc7',
 'API de Pagos Unificada','api-pagos-unificada-innovasoft',
 'Los clientes de InnovaSoft integran hoy cada pasarela de pago (tarjetas, PSE, billeteras digitales) por separado, lo que multiplica el esfuerzo de mantenimiento cada vez que se agrega un nuevo comercio. El proyecto consiste en construir una API unificada que abstraiga las distintas pasarelas de pago colombianas detrás de un contrato único, simplificando la integración para los comercios que usan la plataforma de InnovaSoft.

El estudiante ya presentó su anteproyecto y el jurado solicitó ampliar los objetivos específicos y el cronograma antes de continuar con la revisión final; la nueva versión ya fue enviada.',
 'professional_practice','in_progress',6,'remote',1,'2026-04-10','2026-04-28',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-03-28 09:00:00-05','2026-03-20 08:00:00-05'),
-- P11 (InnovaSoft): anteproyecto aprobado + documentos pendientes
('f86b000b-3aa1-46ea-b04a-f5fff488409e','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','7e1cc874-aa38-4c57-8660-fbf182bfdbc7',
 'Sistema de Facturación Electrónica','sistema-facturacion-electronica-innovasoft',
 'La normativa de la DIAN exige que las facturas electrónicas cumplan un formato y proceso de validación específico, y varios clientes de InnovaSoft aún facturan manualmente. El proyecto consiste en desarrollar un módulo de facturación electrónica que genere, firme digitalmente y transmita las facturas conforme a la normativa vigente, integrado al sistema de ventas existente.

El anteproyecto ya fue aprobado por unanimidad y el estudiante se encuentra en etapa de documentación previa al inicio formal de la práctica (carta de aceptación y póliza de seguro estudiantil pendientes).',
 'internship','in_progress',6,'remote',1,'2026-03-15','2026-04-01',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-03-01 09:00:00-05','2026-02-25 08:00:00-05'),
-- P12 (Tech Solutions): iniciado (acuerdo de iniciación firmado)
('29d645f3-04c3-4b18-9481-f2bf894c219f','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Rediseño de Experiencia de Usuario','rediseno-ux-tsl',
 'La plataforma web principal de Tech Solutions Latam mantiene una interfaz sin actualizar desde hace más de tres años, y los reportes de soporte muestran fricción recurrente en el flujo de checkout y en la navegación del catálogo. El proyecto consiste en un rediseño completo de la experiencia de usuario, desde investigación con usuarios reales hasta la entrega de un nuevo sistema de diseño en Figma.

El alcance incluye entrevistas y pruebas de usabilidad con clientes actuales, wireframes y prototipos de alta fidelidad de las pantallas críticas, y una guía de componentes reutilizable para que el equipo de frontend implemente los cambios progresivamente. El acuerdo de iniciación ya fue firmado y el estudiante se encuentra activo en el proyecto.',
 'internship','in_progress',5,'remote',1,'2026-02-15','2026-03-01',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-02-01 09:00:00-05','2026-01-28 08:00:00-05'),
-- P13 (Tech Solutions): en desarrollo con entregables y comentarios
('ae93ab6c-021c-4147-84ce-b0cebc1cc467','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Optimización de Base de Datos','optimizacion-base-datos-tsl',
 'La base de datos transaccional principal de Tech Solutions Latam presenta tiempos de respuesta crecientes en los reportes de ventas, especialmente en horas pico. El proyecto consiste en diagnosticar los cuellos de botella de las consultas más pesadas, proponer índices y ajustes de esquema, e implementar las mejoras validando el impacto real en los tiempos de respuesta.

El estudiante ya entregó el informe de diagnóstico (aprobado) y actualmente trabaja en el script de índices optimizados, con seguimiento semanal del asesor académico y retroalimentación directa de la empresa sobre cada entregable.',
 'internship','in_progress',5,'remote',1,'2026-01-15','2026-02-01',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-01-05 09:00:00-05','2025-12-28 08:00:00-05'),
-- P14 (InnovaSoft): próximo a finalizar
('3fa32d54-9bb9-43d9-8f32-9648f15f413e','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','7e1cc874-aa38-4c57-8660-fbf182bfdbc7',
 'Módulo de Reportes Gerenciales','modulo-reportes-gerenciales-innovasoft',
 'La gerencia de InnovaSoft necesita reportes consolidados de ventas, clientes y proyectos que hoy se arman manualmente cada mes en hojas de cálculo. El proyecto consiste en construir un módulo de generación de reportes gerenciales exportables en PDF y Excel, con filtros por periodo, cliente y línea de negocio, conectado directamente a las bases de datos operativas.

El proyecto está prácticamente terminado: el asesor ya dio la señal de finalización y se están recopilando los documentos finales antes del cierre formal de la práctica.',
 'internship','in_progress',6,'remote',1,'2025-12-01','2026-01-05',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2025-11-20 09:00:00-05','2025-11-15 08:00:00-05'),
-- P15 (Tech Solutions): finalizado (completed)
('fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Sistema de Gestión Documental','sistema-gestion-documental-tsl',
 'Tech Solutions Latam almacenaba contratos, facturas y actas en carpetas compartidas sin control de versiones ni permisos diferenciados. El proyecto consistió en construir un sistema web de gestión documental interna con carga, categorización, control de versiones y permisos por rol, reemplazando el esquema de carpetas compartidas.

El proyecto finalizó exitosamente: el estudiante completó todas las etapas del proceso académico (anteproyecto, desarrollo, entregables y documentos finales) y el acta de nota final ya fue emitida. El sistema quedó en producción y es usado activamente por el equipo administrativo.',
 'internship','completed',6,'remote',1,'2025-11-01','2026-01-15','2026-07-30','Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2025-10-20 09:00:00-05','2025-10-15 08:00:00-05'),
-- P16 (Tech Solutions): cancelado
('ad3c358f-282f-46d5-952c-9bd988bd9690','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Integración con ERP Legado','integracion-erp-legado-tsl',
 'El proyecto buscaba integrar la plataforma de Tech Solutions Latam con un sistema ERP legado vía servicios SOAP, sincronizando órdenes de compra e inventario entre ambos sistemas. La empresa canceló el proyecto por un cambio de prioridades internas antes de que se completara el proceso de selección de candidatos.',
 'internship','cancelled',4,'onsite',1,'2026-03-01',NULL,NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-02-10 09:00:00-05','2026-02-05 08:00:00-05'),
-- P17 (InnovaSoft): publicado, estudiante seleccionado, asesor pendiente de aceptar
('d03c3c3b-9a74-4591-a559-7c54720e87bb','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','7e1cc874-aa38-4c57-8660-fbf182bfdbc7',
 'Servicio de Notificaciones Push','servicio-notificaciones-push-innovasoft',
 'Los productos de InnovaSoft necesitan notificar a sus usuarios (recordatorios, cambios de estado, alertas) tanto en la app móvil como en el navegador, pero hoy cada equipo implementa su propia solución de forma aislada. El proyecto consiste en construir un microservicio centralizado de notificaciones push multi-canal (móvil y web) que los demás servicios de la compañía puedan invocar mediante una API interna sencilla.

El alcance incluye la integración con proveedores de push (FCM/Web Push), una cola de envío con reintentos, y un panel básico de auditoría de notificaciones enviadas. El estudiante ya fue seleccionado tras el proceso de entrevistas y está a la espera de que el docente asesor invitado confirme su aceptación para iniciar formalmente el acompañamiento académico.',
 'internship','published',5,'remote',1,'2026-08-05',NULL,NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-07-10 09:00:00-05','2026-07-05 08:00:00-05'),
-- P18 (InnovaSoft): anteproyecto vencido (expired) — proyecto cancelado tras vencimiento
('99ee7169-93ad-46aa-ac19-c696bc7edf36','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','7e1cc874-aa38-4c57-8660-fbf182bfdbc7',
 'Panel de Monitoreo de Servidores','panel-monitoreo-servidores-innovasoft',
 'InnovaSoft opera varios servidores on-premise sin una herramienta centralizada de monitoreo, lo que ha causado incidentes detectados tarde. El proyecto buscaba construir un panel de monitoreo en tiempo real de métricas de CPU, memoria y disponibilidad, con alertas automáticas ante umbrales críticos.

El anteproyecto fue enviado pero el jurado no alcanzó a revisarlo dentro del plazo establecido y quedó vencido; ante la falta de avance académico, el proceso fue cancelado administrativamente.',
 'professional_practice','in_progress',6,'onsite',1,'2026-03-20','2026-04-05',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-03-10 09:00:00-05','2026-03-05 08:00:00-05'),
-- P19 (Nueva Empresa SAS, empresa no verificada aún): borrador
('1b491d8a-2193-4b7c-9196-4bbc038bbba7','4575b9ce-9a2a-489a-9c55-74e7b17ec204','4575b9ce-9a2a-489a-9c55-74e7b17ec204',
 'Landing Page Corporativa','landing-page-corporativa-nueva-empresa',
 'Nueva Empresa SAS, agencia digital recién constituida, necesita una landing page institucional que presente sus servicios de desarrollo web y marketing digital, con un formulario de contacto que envíe los leads directamente al correo comercial. El proyecto consiste en el diseño y desarrollo de esta landing page, priorizando velocidad de carga y una presentación clara del portafolio de servicios.

Este proyecto aún está en borrador: la empresa todavía no ha completado su proceso de verificación institucional en la plataforma, por lo que la publicación queda pendiente de esa validación.',
 'internship','draft',2,'remote',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "project_deliverables" (id, project_id, title, description, due_date, weight_percentage, display_order, is_mandatory) VALUES
('3284f72d-ce1d-4e79-aac9-2bb6169491fd','ae93ab6c-021c-4147-84ce-b0cebc1cc467','Informe de análisis de rendimiento','Diagnóstico de cuellos de botella en consultas actuales.','2026-02-15',30,1,true),
('171ebb3e-a1e9-42b2-b09e-cb19bb58ebfd','ae93ab6c-021c-4147-84ce-b0cebc1cc467','Script de índices optimizados','Entrega del script SQL con los índices propuestos e implementados.','2026-03-01',40,2,true),
('922f2d13-53dd-476c-9bb9-8ca12c132730','ae93ab6c-021c-4147-84ce-b0cebc1cc467','Informe final de resultados','Comparativa de tiempos de respuesta antes/después.','2026-03-20',30,3,true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 5b. PROJECT_DB — skills/requisitos/programa académico para escenarios
-- reales de matching (ver PLANNING_MATCHING_SERVICE_FIX.md FASE 6).
-- academic_programs se siembra con el NOMBRE del programa (texto), no UUID:
-- academic_programs (admin_db) usa UUIDs generados en runtime, no deterministas
-- entre entornos. Backend/scripts/migrate-skills-unification.mjs (paso 5,
-- migrateAcademicPrograms) resuelve estos nombres a los UUIDs reales del
-- catálogo vivo — el mismo mecanismo ya usado para migrar datos legacy.
-- catalog_skill_id de project_skills queda NULL por la misma razón que en
-- student_db.skills; mismo script (paso 4) lo backfillea.
--
-- IMPORTANTE — bug real encontrado y corregido: estos UPDATE son incondicionales
-- por diseño original, así que re-correr el seed DESPUÉS de haber corrido la
-- migración revertía el UUID de vuelta a texto plano (rompía matching-service:
-- admin-service recibe un valor no-UUID en /internal/admin/programs/by-ids,
-- Postgres rechaza el filtro, la llamada falla y matching-service devuelve 503
-- para ese proyecto). Ahora cada UPDATE solo aplica si el valor actual NO es ya
-- un UUID (re-correr el seed tras la migración deja el dato migrado intacto).
-- =========================================================================
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'ea930fea-753f-463f-a9ef-e1c765b448c9' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Motor de Recomendación con IA
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 8
  WHERE id = '7753b939-ab07-42b1-860c-8122109cdcee' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Portal de Proveedores B2B
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 5
  WHERE id = '5f749e79-d4c3-41cf-af8a-9b1bc0593fee' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Sistema de Inventario en Tiempo Real
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 5
  WHERE id = '73f5388a-21e4-41f3-9410-60c59289adf0' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Plataforma de Encuestas Internas
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 7
  WHERE id = '9df36b79-bdfc-4152-84fd-b265ce9c2618' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Chatbot de Soporte con NLP

INSERT INTO "project_skills" (id, project_id, name, catalog_skill_id, category, proficiency_level, is_mandatory) VALUES
-- Motor de Recomendación con IA (ea930fea)
('b1000001-0000-4000-8000-000000000001','ea930fea-753f-463f-a9ef-e1c765b448c9','Python',NULL,'language','intermediate',true),
('b1000001-0000-4000-8000-000000000002','ea930fea-753f-463f-a9ef-e1c765b448c9','Machine Learning',NULL,'concept','intermediate',true),
('b1000001-0000-4000-8000-000000000003','ea930fea-753f-463f-a9ef-e1c765b448c9','SQL',NULL,'language','beginner',false),
('b1000001-0000-4000-8000-000000000004','ea930fea-753f-463f-a9ef-e1c765b448c9','TypeScript',NULL,'language','intermediate',false),
-- Portal de Proveedores B2B (7753b939)
('b1000002-0000-4000-8000-000000000001','7753b939-ab07-42b1-860c-8122109cdcee','React',NULL,'framework','intermediate',true),
('b1000002-0000-4000-8000-000000000002','7753b939-ab07-42b1-860c-8122109cdcee','NestJS',NULL,'framework','intermediate',true),
('b1000002-0000-4000-8000-000000000003','7753b939-ab07-42b1-860c-8122109cdcee','Docker',NULL,'tool','beginner',false),
('b1000002-0000-4000-8000-000000000004','7753b939-ab07-42b1-860c-8122109cdcee','PostgreSQL',NULL,'tool','beginner',false),
-- Sistema de Inventario en Tiempo Real (5f749e79) — un solo requisito obligatorio, deja margen para "skills extra"
('b1000003-0000-4000-8000-000000000001','5f749e79-d4c3-41cf-af8a-9b1bc0593fee','SQL',NULL,'language','intermediate',true),
-- Plataforma de Encuestas Internas (73f5388a)
('b1000004-0000-4000-8000-000000000001','73f5388a-21e4-41f3-9410-60c59289adf0','React',NULL,'framework','beginner',true),
('b1000004-0000-4000-8000-000000000002','73f5388a-21e4-41f3-9410-60c59289adf0','JavaScript',NULL,'language','beginner',false),
-- Chatbot de Soporte con NLP (9df36b79)
('b1000005-0000-4000-8000-000000000001','9df36b79-bdfc-4152-84fd-b265ce9c2618','Python',NULL,'language','advanced',true),
('b1000005-0000-4000-8000-000000000002','9df36b79-bdfc-4152-84fd-b265ce9c2618','Machine Learning',NULL,'concept','intermediate',true)
ON CONFLICT (project_id, name) DO NOTHING;

INSERT INTO "project_requirements" (id, project_id, requirement_type, name, is_mandatory) VALUES
-- Motor de Recomendación con IA: idioma opcional (deseable, no filtra)
('b2000001-0000-4000-8000-000000000001','ea930fea-753f-463f-a9ef-e1c765b448c9','language','English',false),
-- Portal de Proveedores B2B: idioma obligatorio único
('b2000002-0000-4000-8000-000000000001','7753b939-ab07-42b1-860c-8122109cdcee','language','English',true),
-- Plataforma de Encuestas Internas: dos idiomas obligatorios (para probar coincidencia parcial 1/2)
('b2000004-0000-4000-8000-000000000001','73f5388a-21e4-41f3-9410-60c59289adf0','language','English',true),
('b2000004-0000-4000-8000-000000000002','73f5388a-21e4-41f3-9410-60c59289adf0','language','French',true)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 5c. PROJECT_DB — skills/programa académico para el resto de proyectos
-- (no forman parte de los 9 escenarios protegidos de FASE 6, se amplían
-- libremente). Mismo patrón: nombre de programa en texto + catalog_skill_id
-- NULL, resuelto por migrate-skills-unification.mjs.
-- =========================================================================
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'ba730172-e329-4788-bfe5-3b80d61dac7b' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Dashboard de Analítica Interna
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'af50e121-4ecb-4cb3-9f13-a60778e4a702' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Automatización de Pruebas QA
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 7
  WHERE id = '24cbfde0-8fcd-4610-9ce2-515a016605c8' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Migración a Microservicios
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = '9f8ace78-f0a6-4a8b-8d69-536340f84415' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- App Móvil de Fidelización
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = '91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- API de Pagos Unificada
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'f86b000b-3aa1-46ea-b04a-f5fff488409e' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Sistema de Facturación Electrónica
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 5
  WHERE id = '29d645f3-04c3-4b18-9481-f2bf894c219f' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Rediseño de Experiencia de Usuario
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 7
  WHERE id = 'ae93ab6c-021c-4147-84ce-b0cebc1cc467' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Optimización de Base de Datos
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = '3fa32d54-9bb9-43d9-8f32-9648f15f413e' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Módulo de Reportes Gerenciales
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'fa6cd72e-83ce-4404-a8bc-a0e294c15f1e' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Sistema de Gestión Documental
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'ad3c358f-282f-46d5-952c-9bd988bd9690' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Integración con ERP Legado
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'd03c3c3b-9a74-4591-a559-7c54720e87bb' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Servicio de Notificaciones Push
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = '99ee7169-93ad-46aa-ac19-c696bc7edf36' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Panel de Monitoreo de Servidores
UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 3
  WHERE id = '1b491d8a-2193-4b7c-9196-4bbc038bbba7' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-'); -- Landing Page Corporativa
-- Nota: el UPDATE de academic_programs del proyecto E22 (a3cf1251) se movió a la
-- sección 13 (después de su INSERT en "projects") por el mismo motivo que las
-- project_skills de E22: aquí el proyecto todavía no existe y el UPDATE afectaba
-- 0 filas en silencio (confirmado corriendo el seed contra Postgres real).

INSERT INTO "project_skills" (id, project_id, name, catalog_skill_id, category, proficiency_level, is_mandatory) VALUES
-- Dashboard de Analítica Interna (ba730172, draft)
('b1000006-0000-4000-8000-000000000001','ba730172-e329-4788-bfe5-3b80d61dac7b','Angular',NULL,'framework','intermediate',true),
('b1000006-0000-4000-8000-000000000002','ba730172-e329-4788-bfe5-3b80d61dac7b','Análisis de datos',NULL,'concept','beginner',false),
-- Automatización de Pruebas QA (af50e121, pending_approval)
('b1000007-0000-4000-8000-000000000001','af50e121-4ecb-4cb3-9f13-a60778e4a702','Testing',NULL,'concept','intermediate',true),
('b1000007-0000-4000-8000-000000000002','af50e121-4ecb-4cb3-9f13-a60778e4a702','CI/CD',NULL,'concept','beginner',false),
-- Migración a Microservicios (24cbfde0, needs_changes)
('b1000008-0000-4000-8000-000000000001','24cbfde0-8fcd-4610-9ce2-515a016605c8','Microservicios',NULL,'concept','intermediate',true),
('b1000008-0000-4000-8000-000000000002','24cbfde0-8fcd-4610-9ce2-515a016605c8','Docker',NULL,'tool','intermediate',true),
('b1000008-0000-4000-8000-000000000003','24cbfde0-8fcd-4610-9ce2-515a016605c8','Kubernetes',NULL,'tool','beginner',false),
-- App Móvil de Fidelización (9f8ace78, published): a propósito SIN project_skills.
-- matching-integration.e2e-spec.ts (PROJECT_SIN_SKILLS) usa este proyecto como el
-- caso real de "dato legacy publicado sin pasar por la validación de app (>=1 skill)"
-- para probar que skillsScore da 0 real, no un 1.0 neutral inventado — agregarle
-- skills aquí rompía ese test ya validado. Se documenta como discrepancia real
-- encontrada al re-ejecutar los tests (ver PLANNING_RECONSTRUCCION_SEED.md §1.4).
-- API de Pagos Unificada (91fcacaf)
('b1000010-0000-4000-8000-000000000001','91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88','Node.js',NULL,'framework','intermediate',true),
('b1000010-0000-4000-8000-000000000002','91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88','REST APIs',NULL,'concept','intermediate',true),
-- Sistema de Facturación Electrónica (f86b000b)
('b1000011-0000-4000-8000-000000000001','f86b000b-3aa1-46ea-b04a-f5fff488409e','Java',NULL,'language','intermediate',true),
('b1000011-0000-4000-8000-000000000002','f86b000b-3aa1-46ea-b04a-f5fff488409e','Spring Boot',NULL,'framework','intermediate',true),
-- Rediseño de Experiencia de Usuario (29d645f3)
('b1000012-0000-4000-8000-000000000001','29d645f3-04c3-4b18-9481-f2bf894c219f','Figma',NULL,'tool','advanced',true),
-- Optimización de Base de Datos (ae93ab6c)
('b1000013-0000-4000-8000-000000000001','ae93ab6c-021c-4147-84ce-b0cebc1cc467','SQL',NULL,'language','advanced',true),
('b1000013-0000-4000-8000-000000000002','ae93ab6c-021c-4147-84ce-b0cebc1cc467','PostgreSQL',NULL,'tool','advanced',true),
-- Módulo de Reportes Gerenciales (3fa32d54)
('b1000014-0000-4000-8000-000000000001','3fa32d54-9bb9-43d9-8f32-9648f15f413e','SQL',NULL,'language','intermediate',true),
('b1000014-0000-4000-8000-000000000002','3fa32d54-9bb9-43d9-8f32-9648f15f413e','Análisis de datos',NULL,'concept','intermediate',false),
-- Sistema de Gestión Documental (fa6cd72e, completed)
('b1000015-0000-4000-8000-000000000001','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','React',NULL,'framework','intermediate',true),
('b1000015-0000-4000-8000-000000000002','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','Node.js',NULL,'framework','intermediate',true),
-- Integración con ERP Legado (ad3c358f, cancelled)
('b1000016-0000-4000-8000-000000000001','ad3c358f-282f-46d5-952c-9bd988bd9690','Microservicios',NULL,'concept','intermediate',true),
-- Servicio de Notificaciones Push (d03c3c3b, published)
('b1000017-0000-4000-8000-000000000001','d03c3c3b-9a74-4591-a559-7c54720e87bb','Node.js',NULL,'framework','intermediate',true),
('b1000017-0000-4000-8000-000000000002','d03c3c3b-9a74-4591-a559-7c54720e87bb','Redis',NULL,'tool','beginner',false),
-- Panel de Monitoreo de Servidores (99ee7169)
('b1000018-0000-4000-8000-000000000001','99ee7169-93ad-46aa-ac19-c696bc7edf36','DevOps',NULL,'concept','intermediate',true),
('b1000018-0000-4000-8000-000000000002','99ee7169-93ad-46aa-ac19-c696bc7edf36','AWS',NULL,'tool','beginner',false),
-- Landing Page Corporativa (1b491d8a, draft, empresa no verificada)
('b1000019-0000-4000-8000-000000000001','1b491d8a-2193-4b7c-9196-4bbc038bbba7','JavaScript',NULL,'language','beginner',true)
ON CONFLICT (project_id, name) DO NOTHING;
-- Nota: las skills del proyecto E22 (a3cf1251, "Módulo de Reportes Analíticos")
-- se siembran más adelante, en la sección 13 (E22), DESPUÉS de que exista la fila
-- en "projects" — sembrarlas aquí violaba la FK project_skills->projects porque
-- el proyecto E22 se inserta más abajo en el mismo archivo (bug real encontrado
-- corriendo el seed contra Postgres real, ver PLANNING_RECONSTRUCCION_SEED.md §1.4).

-- =========================================================================
-- 6. ADMIN_DB — periodos, docentes/supervisores, asignaciones, plantillas,
--    requisitos documentales, categorías de rechazo
-- =========================================================================
\c admin_db;
SET client_encoding = 'UTF8';

INSERT INTO "academic_periods" (id, name, description, start_date, end_date, enrollment_start, enrollment_end, status, is_current, max_projects_per_company, max_applications_per_student) VALUES
('a92038ac-ca61-48d7-bd26-40509a5742c8','2026-1','Primer periodo académico 2026','2026-01-15','2026-06-15','2025-12-01','2025-12-20','closed',false,10,5),
('befd9543-14a2-42fb-b9b3-ccca14db6a5f','2026-2','Segundo periodo académico 2026','2026-07-01','2026-12-15','2026-06-01','2026-06-30','active',true,10,5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "supervisors" (id, user_id, employee_code, department, role, specialization, max_students, current_students, is_active, is_onboarding_complete) VALUES
('fecca71e-30aa-464b-9272-8a8b437f9a72','47a3161d-169f-4224-9fb3-fcf74c9796d2','DOC-001','Ingeniería de Sistemas','thesis_advisor','Ingeniería de Software',8,6,true,true),
('19bb3903-d63b-4685-b592-5b73b52e98df','f5c155d1-dc3b-4363-af1d-15e245cede7f','DOC-002','Ingeniería de Sistemas','faculty_supervisor','Bases de Datos',10,4,true,true),
('1e2a9fbc-0314-4752-89c5-029de9ffb7c6','ea61d231-ae8b-46d4-9377-433328ec6215','DOC-003','Ingeniería de Sistemas','faculty_supervisor','Inteligencia Artificial',10,3,true,true),
('63720801-e6e7-45bd-9673-99abf67dc6b7','866b6e22-8676-4557-b37b-178c0c185f50','DOC-004','Ingeniería de Sistemas','academic_director','Gestión de Proyectos',12,5,true,true)
ON CONFLICT (user_id) DO NOTHING;

-- Asesores (role=asesor) y jurados (jurado_anteproyecto / jurado_final)
INSERT INTO "supervisor_assignments" (id, supervisor_id, student_id, project_id, application_id, period_id, assigned_by, role, start_date, end_date, status, decline_reason, accepted_at, notes) VALUES
-- P7: asesor asignado, sin anteproyecto aún
('3985200b-3c76-4cb5-9985-d59538a3d510','fecca71e-30aa-464b-9272-8a8b437f9a72','763c9133-31b0-4c2e-954d-05707b21b33f','5f749e79-d4c3-41cf-af8a-9b1bc0593fee','35ee6c46-d127-4cf7-a853-2ab970b9df4c','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-06-01',NULL,'accepted',NULL,'2026-06-02 10:00:00-05',NULL),
-- P8: asesor, anteproyecto en proceso
('cd39d53e-4e62-42b4-8bd3-73a04e2d4300','fecca71e-30aa-464b-9272-8a8b437f9a72','e476dc18-974c-4563-a2eb-91ecf3ca24e8','73f5388a-21e4-41f3-9410-60c59289adf0','74989e96-1d37-46fd-a385-420ba20b8cd4','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-06-05',NULL,'accepted',NULL,'2026-06-06 10:00:00-05',NULL),
-- P9: asesor + 2 jurados de anteproyecto (voto parcial)
('a89c37ba-913f-4e68-9ab8-4fea0b9c99af','63720801-e6e7-45bd-9673-99abf67dc6b7','8113abaa-14bb-485f-a44a-91602e2d825c','9df36b79-bdfc-4152-84fd-b265ce9c2618','330b01ae-5fbd-40b1-a5e6-b22e304e69e0','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-05-01',NULL,'accepted',NULL,'2026-05-02 10:00:00-05',NULL),
('c675854d-c8cc-4b1f-97ae-c1cf65586feb','19bb3903-d63b-4685-b592-5b73b52e98df','8113abaa-14bb-485f-a44a-91602e2d825c','9df36b79-bdfc-4152-84fd-b265ce9c2618','330b01ae-5fbd-40b1-a5e6-b22e304e69e0','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-05-01',NULL,'accepted',NULL,'2026-05-02 11:00:00-05',NULL),
('c6de3e5e-47b7-48f8-bad8-6b0590ed2172','1e2a9fbc-0314-4752-89c5-029de9ffb7c6','8113abaa-14bb-485f-a44a-91602e2d825c','9df36b79-bdfc-4152-84fd-b265ce9c2618','330b01ae-5fbd-40b1-a5e6-b22e304e69e0','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-05-01',NULL,'accepted',NULL,'2026-05-02 11:05:00-05',NULL),
-- P10: asesor + 1 jurado (correcciones)
('8c392f22-0c10-4ee0-9a14-560d440ca1be','fecca71e-30aa-464b-9272-8a8b437f9a72','d1a97678-5d09-4145-99cd-d341fa57b96f','91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88','6767484d-7d67-4766-ab35-d2f1413d8312','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-04-28',NULL,'accepted',NULL,'2026-04-29 10:00:00-05',NULL),
('b6132d8c-86ae-4ae9-8ca8-ec670f23f656','19bb3903-d63b-4685-b592-5b73b52e98df','d1a97678-5d09-4145-99cd-d341fa57b96f','91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88','6767484d-7d67-4766-ab35-d2f1413d8312','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-04-28',NULL,'accepted',NULL,'2026-04-29 11:00:00-05',NULL),
-- P11: asesor + 2 jurados (anteproyecto aprobado)
('c4056eb6-d138-432c-be96-34302eea37cb','fecca71e-30aa-464b-9272-8a8b437f9a72','525229cc-c47f-493e-bb06-185cd9df0a7b','f86b000b-3aa1-46ea-b04a-f5fff488409e','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-04-01',NULL,'accepted',NULL,'2026-04-02 10:00:00-05',NULL),
('f96d12a0-7e6e-464f-b841-41879ed46cf8','19bb3903-d63b-4685-b592-5b73b52e98df','525229cc-c47f-493e-bb06-185cd9df0a7b','f86b000b-3aa1-46ea-b04a-f5fff488409e','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-04-01',NULL,'accepted',NULL,'2026-04-02 11:00:00-05',NULL),
('8b183577-2721-4f37-9c64-4a47bbe549f9','1e2a9fbc-0314-4752-89c5-029de9ffb7c6','525229cc-c47f-493e-bb06-185cd9df0a7b','f86b000b-3aa1-46ea-b04a-f5fff488409e','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-04-01',NULL,'accepted',NULL,'2026-04-02 11:10:00-05',NULL),
-- P12: asesor (proyecto iniciado)
('0f0ae052-7a52-4ac1-9e9c-801764d85ca6','fecca71e-30aa-464b-9272-8a8b437f9a72','2618e6fe-414d-4e5a-8f7e-603b9688af33','29d645f3-04c3-4b18-9481-f2bf894c219f','6c019047-f361-41b6-bf77-c74918fc1fec','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-03-01',NULL,'accepted',NULL,'2026-03-02 10:00:00-05',NULL),
-- P13: asesor (en desarrollo)
('5221e2b4-474a-42b5-b6fa-61cf1dfe65c1','fecca71e-30aa-464b-9272-8a8b437f9a72','19377bc1-51c0-485a-9474-919fce518a34','ae93ab6c-021c-4147-84ce-b0cebc1cc467','97f41eee-f796-446e-8e59-ed896aa6f3c0','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-02-01',NULL,'accepted',NULL,'2026-02-02 10:00:00-05',NULL),
-- P14: asesor (próximo a finalizar)
('31a726e1-7c53-467a-873c-955ed511464c','63720801-e6e7-45bd-9673-99abf67dc6b7','4868659b-8b42-4522-8f93-903c370e84b1','3fa32d54-9bb9-43d9-8f32-9648f15f413e','b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-01-05',NULL,'accepted',NULL,'2026-01-06 10:00:00-05',NULL),
-- P15 (finalizado): asesor + 2 jurados anteproyecto + jurado final, todos completados
('5aac9cb4-878a-4de8-896a-5448070a59f4','fecca71e-30aa-464b-9272-8a8b437f9a72','978be3f3-1bef-4b92-aa20-eb62f64402e6','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','59cbc405-1c87-4652-a111-9b1f59131def','a92038ac-ca61-48d7-bd26-40509a5742c8','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-01-15','2026-07-30','completed',NULL,'2026-01-16 10:00:00-05',NULL),
('4608d265-8431-4805-9a3f-57ad15693e4a','19bb3903-d63b-4685-b592-5b73b52e98df','978be3f3-1bef-4b92-aa20-eb62f64402e6','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','59cbc405-1c87-4652-a111-9b1f59131def','a92038ac-ca61-48d7-bd26-40509a5742c8','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-01-15','2026-07-30','completed',NULL,'2026-01-16 11:00:00-05',NULL),
('ccd62a66-c5d9-4eda-9ab5-6a5ca4de46e0','1e2a9fbc-0314-4752-89c5-029de9ffb7c6','978be3f3-1bef-4b92-aa20-eb62f64402e6','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','59cbc405-1c87-4652-a111-9b1f59131def','a92038ac-ca61-48d7-bd26-40509a5742c8','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-01-15','2026-07-30','completed',NULL,'2026-01-16 11:10:00-05',NULL),
('1de457e9-e54f-48d6-9d37-1a9b5abf3ae4','63720801-e6e7-45bd-9673-99abf67dc6b7','978be3f3-1bef-4b92-aa20-eb62f64402e6','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','59cbc405-1c87-4652-a111-9b1f59131def','a92038ac-ca61-48d7-bd26-40509a5742c8','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_final','2026-06-01','2026-07-30','completed',NULL,'2026-06-02 10:00:00-05',NULL),
-- P17: asesor invitado, aún NO ha aceptado (pending_acceptance) — application queda en pending_supervisor
('ec64f0c8-bb9e-4cfe-ba9a-79fd60a8f5cd','1e2a9fbc-0314-4752-89c5-029de9ffb7c6','bf1bf33b-0300-4530-b89d-8965ed809db5','d03c3c3b-9a74-4591-a559-7c54720e87bb','41437046-452a-44fb-b7fc-624a865d61b2','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-08-06',NULL,'pending_acceptance',NULL,NULL,'Invitación enviada, pendiente de respuesta del docente.'),
-- P18: asesor + jurado (anteproyecto vencido)
('18c2863c-3788-419f-ab0e-cf9b08930afd','fecca71e-30aa-464b-9272-8a8b437f9a72','de1c95f3-f5f1-4b34-ab19-e67ea2648129','99ee7169-93ad-46aa-ac19-c696bc7edf36','6bd54ad3-2dd9-49c6-ab08-e54097f53848','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-04-05',NULL,'accepted',NULL,'2026-04-06 10:00:00-05',NULL),
('89b3e948-b147-4145-852c-94223fa9fa0a','19bb3903-d63b-4685-b592-5b73b52e98df','de1c95f3-f5f1-4b34-ab19-e67ea2648129','99ee7169-93ad-46aa-ac19-c696bc7edf36','6bd54ad3-2dd9-49c6-ab08-e54097f53848','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-04-05',NULL,'accepted',NULL,'2026-04-06 11:00:00-05',NULL),
-- P4: asesor + jurado — anteproyecto rechazado tras 2 correcciones (student17 en un segundo proyecto)
('c9010001-0000-4000-8000-000000000002','19bb3903-d63b-4685-b592-5b73b52e98df','22915994-9802-4475-82da-50b5c1b20acc','9f8ace78-f0a6-4a8b-8d69-536340f84415','c9010001-0000-4000-8000-000000000001','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-06-15',NULL,'accepted',NULL,'2026-06-16 10:00:00-05',NULL),
('c9010001-0000-4000-8000-000000000006','fecca71e-30aa-464b-9272-8a8b437f9a72','22915994-9802-4475-82da-50b5c1b20acc','9f8ace78-f0a6-4a8b-8d69-536340f84415','c9010001-0000-4000-8000-000000000001','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','jurado_anteproyecto','2026-06-15',NULL,'accepted',NULL,'2026-06-16 11:00:00-05',NULL)
ON CONFLICT (student_id, project_id, role, supervisor_id) DO NOTHING;

INSERT INTO "supervisor_assignment_history" (id, assignment_id, action, performed_by, reason) VALUES
('949b475e-d0ae-46de-ac6a-9546bca94fb7','ec64f0c8-bb9e-4cfe-ba9a-79fd60a8f5cd','created','951e948d-e811-4403-bf33-a0ced78a17b1','Invitación inicial de asesoría enviada tras selección del estudiante.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "academic_templates" (id, program_code, type, name, file_id, is_active, created_by) VALUES
('2b4a3e7d-3c0a-416b-a97c-47d0b11f6a2e','ING-SIS','anteproyecto','Plantilla de Anteproyecto — Ingeniería de Sistemas','ec11bb91-c6cd-46c4-b59a-505c4e097942',true,'951e948d-e811-4403-bf33-a0ced78a17b1'),
('a6b949f7-5602-49cf-b142-9cfe3bbdcb8b','ING-SIS','acta_inicio','Acta de Inicio de Práctica','22da06b2-44a6-42ab-ba56-c5fa2430261d',true,'951e948d-e811-4403-bf33-a0ced78a17b1'),
('f3b2bdd5-9d49-4281-b57e-5f0a05d65af5','ING-SIS','proyecto_final','Plantilla de Informe Final','66edebb0-bda5-44fc-9603-baa6937dd922',true,'951e948d-e811-4403-bf33-a0ced78a17b1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "document_requirements" (id, name, description, actor_type, required_at_stage, project_types, is_mandatory, is_active, display_order, created_by) VALUES
('7f28740f-1450-4b9a-8be5-fa2e9a926f20','Carta de aceptación de práctica','Carta firmada por la empresa aceptando al estudiante.','company','pre_initiation','{all}',true,true,1,'951e948d-e811-4403-bf33-a0ced78a17b1'),
('5c20f049-3ab5-4b5f-b09c-4a2208b51731','Póliza de seguro estudiantil','Póliza vigente durante el periodo de práctica.','student','pre_initiation','{all}',true,true,2,'951e948d-e811-4403-bf33-a0ced78a17b1'),
('da559b67-8f03-4546-9d8b-b45b473ceac6','Certificado de notas actualizado','Certificado académico con el promedio actualizado.','student','post_initiation','{all}',false,true,3,'951e948d-e811-4403-bf33-a0ced78a17b1')
ON CONFLICT (id) DO NOTHING;

-- 6c. Documento formal de solicitud de cada proyecto ya enviado a revisión
-- (project_db.projects.request_document_file_id) — requerido por la regla 12
-- del planning para todo proyecto publicado o más avanzado. Los archivos
-- físicos correspondientes se siembran en la sección STORAGE_DB (ids
-- d1000002.. a d1000018..); P1 y P19 se quedan en NULL porque aún son
-- borradores nunca enviados a revisión.
\c project_db;
UPDATE "projects" SET request_document_file_id = 'd1000002-0000-4000-8000-000000000001' WHERE id = 'af50e121-4ecb-4cb3-9f13-a60778e4a702' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000003-0000-4000-8000-000000000001' WHERE id = '24cbfde0-8fcd-4610-9ce2-515a016605c8' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000004-0000-4000-8000-000000000001' WHERE id = '9f8ace78-f0a6-4a8b-8d69-536340f84415' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000005-0000-4000-8000-000000000001' WHERE id = 'ea930fea-753f-463f-a9ef-e1c765b448c9' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000006-0000-4000-8000-000000000001' WHERE id = '7753b939-ab07-42b1-860c-8122109cdcee' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000007-0000-4000-8000-000000000001' WHERE id = '5f749e79-d4c3-41cf-af8a-9b1bc0593fee' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000008-0000-4000-8000-000000000001' WHERE id = '73f5388a-21e4-41f3-9410-60c59289adf0' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000009-0000-4000-8000-000000000001' WHERE id = '9df36b79-bdfc-4152-84fd-b265ce9c2618' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000010-0000-4000-8000-000000000001' WHERE id = '91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000011-0000-4000-8000-000000000001' WHERE id = 'f86b000b-3aa1-46ea-b04a-f5fff488409e' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000012-0000-4000-8000-000000000001' WHERE id = '29d645f3-04c3-4b18-9481-f2bf894c219f' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000013-0000-4000-8000-000000000001' WHERE id = 'ae93ab6c-021c-4147-84ce-b0cebc1cc467' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000014-0000-4000-8000-000000000001' WHERE id = '3fa32d54-9bb9-43d9-8f32-9648f15f413e' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000015-0000-4000-8000-000000000001' WHERE id = 'fa6cd72e-83ce-4404-a8bc-a0e294c15f1e' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000016-0000-4000-8000-000000000001' WHERE id = 'ad3c358f-282f-46d5-952c-9bd988bd9690' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000017-0000-4000-8000-000000000001' WHERE id = 'd03c3c3b-9a74-4591-a559-7c54720e87bb' AND request_document_file_id IS NULL;
UPDATE "projects" SET request_document_file_id = 'd1000018-0000-4000-8000-000000000001' WHERE id = '99ee7169-93ad-46aa-ac19-c696bc7edf36' AND request_document_file_id IS NULL;
\c admin_db;
SET client_encoding = 'UTF8';

INSERT INTO "company_verifications" (id, company_id, verified_by, action, previous_status, new_status, reason, notes) VALUES
('c1000001-0000-4000-8000-000000000001','9affc33d-06e1-480f-bf5f-1cd883a86ffe','951e948d-e811-4403-bf33-a0ced78a17b1','approved','pending','verified','Documentos legales y cámara de comercio verificados sin observaciones.',NULL),
('c1000002-0000-4000-8000-000000000001','e648ff94-d683-47f8-8d9d-e34d97dc3abf','951e948d-e811-4403-bf33-a0ced78a17b1','approved','pending','verified','RUT y certificado de existencia y representación legal verificados.',NULL)
ON CONFLICT (id) DO NOTHING;

-- project_rejection_categories: NO se siembra por SQL. admin.service.ts
-- onModuleInit() ya crea DEFAULT_REJECTION_CATEGORIES en runtime (fuente de
-- verdad correcta, en español) — sembrarlas aquí también duplicaba el
-- catálogo y podía divergir. Ver PLANNING_RECONSTRUCCION_SEED.md.

-- =========================================================================
-- 7. APPLICATION_DB — aplicaciones cubriendo los 11 ApplicationStatus reales
-- =========================================================================
\c application_db;
SET client_encoding = 'UTF8';

INSERT INTO "applications" (id, project_id, student_id, status, cover_letter, match_score, applied_at, reviewed_at, reviewed_by, accepted_at, completed_at, rejection_reason, withdrawal_reason) VALUES
('bb6a5ddd-6771-4b1c-a646-b1f25b7d6622','ea930fea-753f-463f-a9ef-e1c765b448c9','b9addbae-f9b5-4577-b700-3b42a13edcd2','pending','Me interesa mucho este proyecto por mi experiencia previa con modelos de recomendación.',NULL,'2026-08-01 09:00:00-05',NULL,NULL,NULL,NULL,NULL,NULL),
('ac040e26-fd3b-48d1-9c75-a455741ef961','ea930fea-753f-463f-a9ef-e1c765b448c9','afb35c03-179f-40ef-8017-39c77723845a','under_review','Tengo experiencia en Python y librerías de ML aplicadas a e-commerce.',NULL,'2026-07-30 09:00:00-05','2026-08-02 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490',NULL,NULL,NULL,NULL),
('f940b34c-faa4-4ab7-874f-2db2687e7901','ea930fea-753f-463f-a9ef-e1c765b448c9','df66d290-4054-47bb-98bc-5b5984a5f03f','rejected','Quisiera aportar mi experiencia en analítica de datos.',NULL,'2026-07-15 09:00:00-05','2026-07-20 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490',NULL,NULL,'El perfil no cumple con el nivel de experiencia en ML requerido.',NULL),
('7e47d5e6-5287-4542-af44-22ca064467e9','ea930fea-753f-463f-a9ef-e1c765b448c9','70e41bcd-c32a-48f2-a3ba-9eb1a1df1d95','withdrawn','Postulación inicial de prueba.',NULL,'2026-07-10 09:00:00-05',NULL,NULL,NULL,NULL,NULL,'El estudiante encontró otra oportunidad y retiró la postulación.'),
('bdf1487b-f288-4d01-8fcb-e3d057a192a5','7753b939-ab07-42b1-860c-8122109cdcee','db4a7f02-d6b7-45ea-a86a-5c945296cb3a','shortlisted','Cuento con experiencia en desarrollo de portales B2B.',NULL,'2026-06-05 09:00:00-05','2026-06-10 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490',NULL,NULL,NULL,NULL),
('2d1db15d-1c1b-41d4-8f74-0c80a6a51c03','7753b939-ab07-42b1-860c-8122109cdcee','e703a961-b7d0-4b71-ab06-dbdd656587e2','interview','Manejo Node.js y bases de datos relacionales.',NULL,'2026-06-03 09:00:00-05','2026-06-08 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490',NULL,NULL,NULL,NULL),
('35ee6c46-d127-4cf7-a853-2ab970b9df4c','5f749e79-d4c3-41cf-af8a-9b1bc0593fee','763c9133-31b0-4c2e-954d-05707b21b33f','accepted','Me apasiona el desarrollo de sistemas en tiempo real.',NULL,'2026-04-16 09:00:00-05','2026-04-18 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-04-20 10:00:00-05',NULL,NULL,NULL),
('74989e96-1d37-46fd-a385-420ba20b8cd4','73f5388a-21e4-41f3-9410-60c59289adf0','e476dc18-974c-4563-a2eb-91ecf3ca24e8','accepted','Tengo experiencia previa en formularios dinámicos y reportería.',NULL,'2026-04-21 09:00:00-05','2026-04-23 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-04-25 10:00:00-05',NULL,NULL,NULL),
('330b01ae-5fbd-40b1-a5e6-b22e304e69e0','9df36b79-bdfc-4152-84fd-b265ce9c2618','8113abaa-14bb-485f-a44a-91602e2d825c','accepted','Interesada en NLP aplicado a atención al cliente.',NULL,'2026-03-26 09:00:00-05','2026-03-28 10:00:00-05','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2026-03-30 10:00:00-05',NULL,NULL,NULL),
('6767484d-7d67-4766-ab35-d2f1413d8312','91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88','d1a97678-5d09-4145-99cd-d341fa57b96f','accepted','Experiencia integrando pasarelas de pago en proyectos personales.',NULL,'2026-03-21 09:00:00-05','2026-03-23 10:00:00-05','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2026-03-25 10:00:00-05',NULL,NULL,NULL),
('e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','f86b000b-3aa1-46ea-b04a-f5fff488409e','525229cc-c47f-493e-bb06-185cd9df0a7b','accepted','Conocimientos en normativa de facturación electrónica colombiana.',NULL,'2026-02-26 09:00:00-05','2026-02-28 10:00:00-05','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2026-03-01 10:00:00-05',NULL,NULL,NULL),
('6c019047-f361-41b6-bf77-c74918fc1fec','29d645f3-04c3-4b18-9481-f2bf894c219f','2618e6fe-414d-4e5a-8f7e-603b9688af33','in_progress','Experiencia en diseño UX/UI con Figma.',NULL,'2026-01-29 09:00:00-05','2026-01-31 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-02-02 10:00:00-05',NULL,NULL,NULL),
('97f41eee-f796-446e-8e59-ed896aa6f3c0','ae93ab6c-021c-4147-84ce-b0cebc1cc467','19377bc1-51c0-485a-9474-919fce518a34','in_progress','Buen manejo de SQL avanzado y tuning de bases de datos.',NULL,'2025-12-29 09:00:00-05','2025-12-31 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-01-02 10:00:00-05',NULL,NULL,NULL),
('b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','3fa32d54-9bb9-43d9-8f32-9648f15f413e','4868659b-8b42-4522-8f93-903c370e84b1','in_progress','Experiencia previa generando reportes con librerías de exportación.',NULL,'2025-11-16 09:00:00-05','2025-11-18 10:00:00-05','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2025-11-20 10:00:00-05',NULL,NULL,NULL),
('59cbc405-1c87-4652-a111-9b1f59131def','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','978be3f3-1bef-4b92-aa20-eb62f64402e6','completed','Interesada en sistemas de gestión documental para el sector público y privado.',NULL,'2025-10-16 09:00:00-05','2025-10-18 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','2025-10-20 10:00:00-05','2026-07-30 17:00:00-05',NULL,NULL),
('9290c2a3-8ebe-4b7f-91a1-4f0dc6e4d8e8','ad3c358f-282f-46d5-952c-9bd988bd9690','22915994-9802-4475-82da-50b5c1b20acc','cancelled','Me interesa la integración con sistemas legados.',NULL,'2026-02-06 09:00:00-05','2026-02-08 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490',NULL,NULL,NULL,'La empresa canceló el proyecto por cambio de prioridades internas.'),
('41437046-452a-44fb-b7fc-624a865d61b2','d03c3c3b-9a74-4591-a559-7c54720e87bb','bf1bf33b-0300-4530-b89d-8965ed809db5','pending_supervisor','Tengo experiencia con arquitecturas de mensajería y notificaciones push.',NULL,'2026-07-11 09:00:00-05','2026-07-13 10:00:00-05','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2026-07-15 10:00:00-05',NULL,NULL,NULL),
('6bd54ad3-2dd9-49c6-ab08-e54097f53848','99ee7169-93ad-46aa-ac19-c696bc7edf36','de1c95f3-f5f1-4b34-ab19-e67ea2648129','accepted','Experiencia en monitoreo de infraestructura con Grafana y Prometheus.',NULL,'2026-03-06 09:00:00-05','2026-03-08 10:00:00-05','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','2026-03-10 10:00:00-05',NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "application_timeline" (id, application_id, from_status, to_status, comment, changed_by_user_id) VALUES
('9f585cb1-2fda-4191-a06b-b806f35e12dd','ac040e26-fd3b-48d1-9c75-a455741ef961','pending','under_review','Revisando perfil académico.','928b7648-201a-4ab8-8bbb-638a2e4f5490'),
('960b9cf0-37d4-4f75-b09b-7b23ca073345','bdf1487b-f288-4d01-8fcb-e3d057a192a5','pending','shortlisted','Perfil preseleccionado para entrevista.','928b7648-201a-4ab8-8bbb-638a2e4f5490'),
('684400c2-2690-499d-89de-cc06a291bc2e','2d1db15d-1c1b-41d4-8f74-0c80a6a51c03','shortlisted','interview','Entrevista técnica agendada.','928b7648-201a-4ab8-8bbb-638a2e4f5490'),
('f16d0078-137a-4da7-bbdf-261fa75614af','35ee6c46-d127-4cf7-a853-2ab970b9df4c','shortlisted','accepted','Estudiante aceptado tras entrevista satisfactoria.','928b7648-201a-4ab8-8bbb-638a2e4f5490')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "interviews" (id, application_id, scheduled_at, duration_minutes, interview_type, location, meeting_link, status, interviewer_id, interviewer_notes, student_feedback, score) VALUES
('a97e0064-119d-4e1e-bc08-418772bd35d1','bdf1487b-f288-4d01-8fcb-e3d057a192a5','2026-08-25 15:00:00-05',45,'video',NULL,'https://meet.example.com/portal-b2b-valentina','scheduled','928b7648-201a-4ab8-8bbb-638a2e4f5490',NULL,NULL,NULL),
('3bb5d2e4-e20b-4200-b6f2-c9383e6b7e49','2d1db15d-1c1b-41d4-8f74-0c80a6a51c03','2026-06-10 10:00:00-05',60,'video',NULL,'https://meet.example.com/portal-b2b-andres','completed','928b7648-201a-4ab8-8bbb-638a2e4f5490','Buen dominio técnico y comunicación clara.',NULL,4.5)
ON CONFLICT (id) DO NOTHING;

UPDATE "interviews" SET company_resolution = 'passed', resolution_comment = 'Candidato aprobado, se procede a aceptar la postulación.'
WHERE id = '3bb5d2e4-e20b-4200-b6f2-c9383e6b7e49';

-- ── Registros académicos (uno por aplicación aceptada que ya inició el
--    proceso académico) — cubre los 10 AcademicRecordStatus reales ────────
INSERT INTO "project_academic_records" (id, application_id, supervisor_assignment_id, anteproyecto_submission_id,
  initiation_agreement_file_id, official_start_date, agreed_duration_weeks, expected_end_date, actual_end_date,
  final_grade_file_id, status, asesor_completion_signal, progress_alert_sent) VALUES
('420d4136-acd2-4853-861b-81cc8b735e98','35ee6c46-d127-4cf7-a853-2ab970b9df4c','3985200b-3c76-4cb5-9985-d59538a3d510',NULL,
  NULL,NULL,NULL,NULL,NULL,NULL,'waiting_anteproyecto',false,false),
('36740383-155a-436b-927b-08408e30869c','74989e96-1d37-46fd-a385-420ba20b8cd4','cd39d53e-4e62-42b4-8bd3-73a04e2d4300','1b19c2a6-fe44-4330-b4c3-b64a4eddf22b',
  NULL,NULL,NULL,NULL,NULL,NULL,'waiting_anteproyecto',false,false),
('a008f9bd-0612-4f0e-9520-11d97f2578f6','330b01ae-5fbd-40b1-a5e6-b22e304e69e0','a89c37ba-913f-4e68-9ab8-4fea0b9c99af','9e2b91e4-99eb-4e50-b20d-53cfbfce2654',
  NULL,NULL,NULL,NULL,NULL,NULL,'waiting_anteproyecto',false,false),
('6da39047-88af-4d81-a4ef-6ddd0347e1a8','6767484d-7d67-4766-ab35-d2f1413d8312','8c392f22-0c10-4ee0-9a14-560d440ca1be','d61fc39c-3c0f-4bac-8ba1-f95314667c23',
  NULL,NULL,NULL,NULL,NULL,NULL,'waiting_anteproyecto',false,false),
('795116a8-2d89-41b2-b7ed-47b011717280','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','c4056eb6-d138-432c-be96-34302eea37cb','c59ec1e9-4696-4bdd-8ab6-e2fcb258b0ba',
  NULL,NULL,NULL,NULL,NULL,NULL,'waiting_documents',false,false),
('75172ed3-9e8f-410b-a931-28253a96c07e','6c019047-f361-41b6-bf77-c74918fc1fec','0f0ae052-7a52-4ac1-9e9c-801764d85ca6','7f1b36f8-eeaf-4f36-a9ea-c5ac1d3dc65a',
  '2cf8acf5-efb9-4874-a827-5af143491b48','2026-03-01',20,'2026-07-19',NULL,NULL,'active',false,false),
('129f0a99-fe2f-4ad9-9317-b7b1851d4e9e','97f41eee-f796-446e-8e59-ed896aa6f3c0','5221e2b4-474a-42b5-b6fa-61cf1dfe65c1','97d76152-cf1c-4c5c-b604-585735ab7887',
  'fbcfdf36-eadf-40c9-b56b-8c61cd1066a9','2026-02-01',20,'2026-06-21',NULL,NULL,'active',false,false),
('6129dc65-88dc-475b-abb9-d8773de8ed9a','b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','31a726e1-7c53-467a-873c-955ed511464c','835f4ae1-bd4d-4d83-a804-2bf17a9984e8',
  'e8b8ccc3-0f2c-4960-8baf-a8c19cec4370','2025-11-20',36,'2026-08-13',NULL,NULL,'waiting_final_docs',true,true),
('b64208b8-c0e9-47fb-bf1b-a80241057a34','59cbc405-1c87-4652-a111-9b1f59131def','5aac9cb4-878a-4de8-896a-5448070a59f4','6e766854-3477-4780-9dfe-0a54c12f2cea',
  'e8bdfe7a-495c-4132-897b-2cae9b0ceb9f','2026-01-15',28,'2026-07-30','2026-07-30','9595aafb-5ccc-4cdf-90b4-7f6a42b17303','completed',true,true),
('f5399fe6-00e7-43c2-94fc-9f66032c2e8a','6bd54ad3-2dd9-49c6-ab08-e54097f53848','18c2863c-3788-419f-ab0e-cf9b08930afd','01f0a770-f336-4732-9197-bdf275bfa91b',
  NULL,NULL,NULL,NULL,NULL,NULL,'waiting_anteproyecto',false,false)
ON CONFLICT (application_id) DO NOTHING;

-- ── Anteproyectos (AcademicSubmission) — cubre los 8 SubmissionStatus reales
INSERT INTO "academic_submissions" (id, application_id, submission_type, status, current_file_id, version_number,
  correction_count, jurado_votes, reviewer_comments, asesor_comments, deadline_for_review, deadline_for_student,
  submitted_at, reviewed_at) VALUES
('1b19c2a6-fe44-4330-b4c3-b64a4eddf22b','74989e96-1d37-46fd-a385-420ba20b8cd4','anteproyecto','submitted','bdc4e5b6-34fa-4681-82e7-903e7ddf1c8b',1,0,NULL,
  NULL,'Adjunto la primera versión del anteproyecto, quedo atento a comentarios.',NULL,NULL,'2026-06-10 09:00:00-05',NULL),
('9e2b91e4-99eb-4e50-b20d-53cfbfce2654','330b01ae-5fbd-40b1-a5e6-b22e304e69e0','anteproyecto','under_review','6f0c8bb5-9170-4db9-ac89-37456ec124e4',1,0,
  '{"f5c155d1-dc3b-4363-af1d-15e245cede7f": "approve"}','Buen planteamiento del problema, falta profundizar el marco teórico de NLP.',
  'Revisado antes de enviar, ajustado alcance con la empresa.','2026-08-18 23:59:00-05',NULL,'2026-05-05 09:00:00-05',NULL),
('d61fc39c-3c0f-4bac-8ba1-f95314667c23','6767484d-7d67-4766-ab35-d2f1413d8312','anteproyecto','revised','9f97ad63-3312-4d4d-84ca-f625d8b2fac7',2,1,NULL,
  'Se corrigieron los objetivos específicos, falta ampliar el cronograma. Puede continuar con la revisión final.',
  'Se realizaron los ajustes solicitados por el jurado en la sección de objetivos y cronograma.','2026-08-10 23:59:00-05','2026-08-09 23:59:00-05',
  '2026-04-25 09:00:00-05',NULL),
('c59ec1e9-4696-4bdd-8ab6-e2fcb258b0ba','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','anteproyecto','approved','1894e72e-50cc-43d0-8280-cc2cd4c8c25a',1,0,
  '{"f5c155d1-dc3b-4363-af1d-15e245cede7f": "approve", "ea61d231-ae8b-46d4-9377-433328ec6215": "approve"}',
  'Aprobado por unanimidad, buen alcance normativo.',NULL,NULL,NULL,'2026-03-05 09:00:00-05','2026-03-10 10:00:00-05'),
('7f1b36f8-eeaf-4f36-a9ea-c5ac1d3dc65a','6c019047-f361-41b6-bf77-c74918fc1fec','anteproyecto','approved','84f45fd9-c3d6-4253-ad5c-0b5c43c16fbc',1,0,
  '{"f5c155d1-dc3b-4363-af1d-15e245cede7f": "approve"}','Aprobado.',NULL,NULL,NULL,'2026-02-05 09:00:00-05','2026-02-10 10:00:00-05'),
('97d76152-cf1c-4c5c-b604-585735ab7887','97f41eee-f796-446e-8e59-ed896aa6f3c0','anteproyecto','approved','62cb6c7d-e3aa-4df1-89ba-62460b11b078',1,0,
  '{"f5c155d1-dc3b-4363-af1d-15e245cede7f": "approve"}','Aprobado.',NULL,NULL,NULL,'2026-01-08 09:00:00-05','2026-01-12 10:00:00-05'),
('835f4ae1-bd4d-4d83-a804-2bf17a9984e8','b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','anteproyecto','approved','51bdec3d-281f-4c5c-b6f4-89d7a94ddfdc',1,0,
  '{"866b6e22-8676-4557-b37b-178c0c185f50": "approve"}','Aprobado.',NULL,NULL,NULL,'2025-11-25 09:00:00-05','2025-11-28 10:00:00-05'),
('6e766854-3477-4780-9dfe-0a54c12f2cea','59cbc405-1c87-4652-a111-9b1f59131def','anteproyecto','approved','0b000b69-d473-407b-81d5-e0510672b8f9',1,0,
  '{"f5c155d1-dc3b-4363-af1d-15e245cede7f": "approve", "ea61d231-ae8b-46d4-9377-433328ec6215": "approve"}',
  'Aprobado, excelente propuesta.',NULL,NULL,NULL,'2026-01-20 09:00:00-05','2026-01-25 10:00:00-05'),
('01f0a770-f336-4732-9197-bdf275bfa91b','6bd54ad3-2dd9-49c6-ab08-e54097f53848','anteproyecto','expired','816b13d9-e692-41ae-969b-ef9fa51e7c6f',1,0,NULL,
  NULL,'Anteproyecto enviado, el jurado no alcanzó a revisarlo dentro del plazo.','2026-07-20 23:59:00-05',NULL,'2026-04-10 09:00:00-05',NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "submission_history" (id, submission_id, action, actor_id, actor_role, comment, version_number) VALUES
('a854fabf-b6c6-4e9e-9efc-17a096b5f523','1b19c2a6-fe44-4330-b4c3-b64a4eddf22b','submitted','e476dc18-974c-4563-a2eb-91ecf3ca24e8','student','Primera versión enviada.',1),
('e5c79f36-054b-472c-9da7-f858b971addf','9e2b91e4-99eb-4e50-b20d-53cfbfce2654','submitted','8113abaa-14bb-485f-a44a-91602e2d825c','student','Primera versión enviada.',1),
('561bf9d5-343c-466d-80c2-aad97fe63138','9e2b91e4-99eb-4e50-b20d-53cfbfce2654','asesor_commented','866b6e22-8676-4557-b37b-178c0c185f50','faculty','Revisado, se puede enviar a jurados.',1),
('74c13316-6098-4b14-b98d-e2bf60e72165','d61fc39c-3c0f-4bac-8ba1-f95314667c23','submitted','d1a97678-5d09-4145-99cd-d341fa57b96f','student','Primera versión enviada.',1),
('8d3b3f27-cee6-4037-ab3d-b10bb413e83f','d61fc39c-3c0f-4bac-8ba1-f95314667c23','correction_requested','f5c155d1-dc3b-4363-af1d-15e245cede7f','faculty','Favor ampliar objetivos específicos y cronograma.',1),
('d5958e7b-49d4-4987-a5c1-86151c35bdd6','d61fc39c-3c0f-4bac-8ba1-f95314667c23','revised','d1a97678-5d09-4145-99cd-d341fa57b96f','student','Correcciones aplicadas.',2),
('6fef3b43-1389-407e-8416-b54e0e4fb4b5','c59ec1e9-4696-4bdd-8ab6-e2fcb258b0ba','submitted','525229cc-c47f-493e-bb06-185cd9df0a7b','student','Primera versión enviada.',1),
('d43b2d68-d562-4a48-a810-edeba892986d','c59ec1e9-4696-4bdd-8ab6-e2fcb258b0ba','approved','f5c155d1-dc3b-4363-af1d-15e245cede7f','faculty','Aprobado.',1),
('192d2f21-1512-43c4-8cf9-fd5c9df23cf6','01f0a770-f336-4732-9197-bdf275bfa91b','submitted','de1c95f3-f5f1-4b34-ab19-e67ea2648129','student','Primera versión enviada.',1),
('f50b6cdd-4ec1-42fc-9938-e62977dde3f6','01f0a770-f336-4732-9197-bdf275bfa91b','expired','951e948d-e811-4403-bf33-a0ced78a17b1','system','Plazo de revisión vencido sin decisión del jurado.',1)
ON CONFLICT (id) DO NOTHING;

-- ── Documentos pendientes (P11 / app11) ────────────────────────────────
INSERT INTO "project_documents" (id, application_id, requirement_id, requirement_name, submitted_by, file_id, status, submitted_at) VALUES
('2808e207-c538-499b-86e4-42bab62d0193','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','7f28740f-1450-4b9a-8be5-fa2e9a926f20','Carta de aceptación de práctica',NULL,NULL,'pending',NULL),
('9c74aa26-7abf-4b1c-b1c4-b37c0598826a','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','5c20f049-3ab5-4b5f-b09c-4a2208b51731','Póliza de seguro estudiantil','525229cc-c47f-493e-bb06-185cd9df0a7b','d06edc1c-0c4b-4fb4-ad1a-3adf99374f9f','submitted','2026-03-12 09:00:00-05')
ON CONFLICT (id) DO NOTHING;

-- ── Selección de documentos por proyecto (Bloque 20) — P11/app11 ya tiene
--    project_documents referenciando el catálogo global; sin este vínculo
--    quedarían huérfanos (DocumentsPanelComponent y getInitiationChecklist
--    solo consideran documentos seleccionados por proyecto, no el catálogo
--    completo).
INSERT INTO "project_document_requirements" (id, application_id, document_requirement_id, added_by) VALUES
('a1c2f9b0-4e2c-4f5e-9b1a-6c8d0e2f4a1b','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','7f28740f-1450-4b9a-8be5-fa2e9a926f20','951e948d-e811-4403-bf33-a0ced78a17b1'),
('b2d3e0c1-5f3d-4a6f-8c2b-7d9e1f3a5b2c','e4eb2640-a5e2-4dce-b2e8-ad6f5abfae63','5c20f049-3ab5-4b5f-b09c-4a2208b51731','951e948d-e811-4403-bf33-a0ced78a17b1')
ON CONFLICT (application_id, document_requirement_id) DO NOTHING;

-- ── Entregables + comentarios (P13 / app13 — en desarrollo) ─────────────
INSERT INTO "student_deliverables" (id, application_id, project_deliverable_id, title, description, type, due_date,
  created_by_user_id, requester_type, submitted_at, file_url, file_type, status, feedback, grade) VALUES
('eb1a8999-d849-49d7-a555-e5ee99df5a47','97f41eee-f796-446e-8e59-ed896aa6f3c0','3284f72d-ce1d-4e79-aac9-2bb6169491fd',
  'Informe de análisis de rendimiento','Diagnóstico de cuellos de botella en consultas actuales.','report','2026-02-15',
  '928b7648-201a-4ab8-8bbb-638a2e4f5490','company','2026-02-14 16:00:00-05','https://storage.collabu.dev/dev/informe-analisis-rendimiento.pdf','application/pdf','approved',
  'Buen diagnóstico, se aprueban las recomendaciones.',4.5),
('aa6cdb2a-1470-4712-963c-f19461c33bb6','97f41eee-f796-446e-8e59-ed896aa6f3c0','171ebb3e-a1e9-42b2-b09e-cb19bb58ebfd',
  'Script de índices optimizados','Entrega del script SQL con los índices propuestos e implementados.','code','2026-03-01',
  '47a3161d-169f-4224-9fb3-fcf74c9796d2','asesor','2026-02-28 18:30:00-05','https://storage.collabu.dev/dev/script-indices-optimizados.sql','application/sql','submitted',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "deliverable_comments" (id, deliverable_id, parent_id, author_id, author_role, content, is_internal) VALUES
('539417fb-594b-4b05-ad15-46fbe1be82bf','aa6cdb2a-1470-4712-963c-f19461c33bb6',NULL,'47a3161d-169f-4224-9fb3-fcf74c9796d2','faculty',
  'Reviso el script antes de que lo vea la empresa, se ve bien pero valida el índice compuesto en la tabla de órdenes.',true),
('79f56cf4-6c4b-4eac-9d54-537eee882642','aa6cdb2a-1470-4712-963c-f19461c33bb6',NULL,'928b7648-201a-4ab8-8bbb-638a2e4f5490','company',
  '¿Cuándo estaría lista la validación en ambiente de pruebas?',false),
('560e1623-0755-4e11-be3f-58b9babc6736','aa6cdb2a-1470-4712-963c-f19461c33bb6','79f56cf4-6c4b-4eac-9d54-537eee882642','19377bc1-51c0-485a-9474-919fce518a34','student',
  'Quedaría listo para pruebas este viernes, ya casi termino de validar el índice compuesto.',false)
ON CONFLICT (id) DO NOTHING;

-- ── 7b. Archivos adjuntos a entregables (hoy sin cobertura) ─────────────
INSERT INTO "deliverable_attachments" (id, deliverable_id, file_url, file_name, file_size_bytes, mime_type, uploaded_by_user_id) VALUES
('e1000001-0000-4000-8000-000000000001','eb1a8999-d849-49d7-a555-e5ee99df5a47','https://storage.collabu.dev/dev/deliverables/informe-analisis-rendimiento-anexo.xlsx','anexo-metricas-consultas.xlsx',184320,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','19377bc1-51c0-485a-9474-919fce518a34'),
('e1000001-0000-4000-8000-000000000002','aa6cdb2a-1470-4712-963c-f19461c33bb6','https://storage.collabu.dev/dev/deliverables/script-indices-explain-analyze.txt','explain-analyze-antes-despues.txt',20480,'text/plain','19377bc1-51c0-485a-9474-919fce518a34')
ON CONFLICT (id) DO NOTHING;

-- ── 7c. Documentos solicitados en etapa de selección (hoy sin cobertura)
--    P6 (Portal de Proveedores B2B): una solicitud aprobada, una pendiente.
INSERT INTO "selection_document_requests" (id, application_id, name, description, is_mandatory, requested_by, status, file_id, submitted_at, reviewer_id, reviewer_comment, reviewed_at) VALUES
('e2000001-0000-4000-8000-000000000001','2d1db15d-1c1b-41d4-8f74-0c80a6a51c03','Prueba técnica — API REST con NestJS','Implementar un CRUD simple de proveedores con NestJS y PostgreSQL en máximo 3 días.',true,'928b7648-201a-4ab8-8bbb-638a2e4f5490','approved','e3000001-0000-4000-8000-000000000001','2026-06-09 20:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','Buena solución, cumple los criterios de evaluación técnica.','2026-06-10 09:30:00-05'),
('e2000001-0000-4000-8000-000000000002','bdf1487b-f288-4d01-8fcb-e3d057a192a5','Certificado de notas actualizado','Se solicita certificado con el promedio acumulado más reciente antes de continuar con la entrevista.',true,'928b7648-201a-4ab8-8bbb-638a2e4f5490','requested',NULL,NULL,NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- ── 7d. Documentos finales ad-hoc (hoy sin cobertura) — P14 en revisión de
--    documentos finales, P12 en etapa de finalización con documentos ya aprobados.
INSERT INTO "final_document_requirements" (id, application_id, name, description, actor_type, is_mandatory, display_order, created_by) VALUES
('e4000001-0000-4000-8000-000000000001','b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','Informe final de práctica','Informe consolidado con resultados, aprendizajes y recomendaciones del módulo de reportes gerenciales.','student',true,1,'47a3161d-169f-4224-9fb3-fcf74c9796d2'),
('e4000001-0000-4000-8000-000000000002','b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','Certificación de finalización de práctica','Carta de la empresa certificando la finalización satisfactoria de la práctica.','company',true,2,'47a3161d-169f-4224-9fb3-fcf74c9796d2'),
('e4000002-0000-4000-8000-000000000001','6c019047-f361-41b6-bf77-c74918fc1fec','Informe final de rediseño UX','Informe final con el sistema de diseño entregado y resultados de las pruebas de usabilidad.','student',true,1,'951e948d-e811-4403-bf33-a0ced78a17b1'),
('e4000002-0000-4000-8000-000000000002','6c019047-f361-41b6-bf77-c74918fc1fec','Acta de cierre de práctica','Acta de cierre firmada por la empresa confirmando el alcance entregado.','company',true,2,'951e948d-e811-4403-bf33-a0ced78a17b1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "project_documents" (id, application_id, requirement_id, requirement_name, stage, actor_type, submitted_by, file_id, status, reviewer_id, reviewer_comment, submitted_at, reviewed_at) VALUES
('e5000001-0000-4000-8000-000000000001','b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','e4000001-0000-4000-8000-000000000001','Informe final de práctica','final','student','4868659b-8b42-4522-8f93-903c370e84b1','e6000001-0000-4000-8000-000000000001','submitted',NULL,NULL,'2026-08-10 17:00:00-05',NULL),
('e5000001-0000-4000-8000-000000000002','b4c2ba18-e23f-4fca-8bab-ff3508f42c3c','e4000001-0000-4000-8000-000000000002','Certificación de finalización de práctica','final','company','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','e6000001-0000-4000-8000-000000000002','approved','47a3161d-169f-4224-9fb3-fcf74c9796d2','Certificación conforme, sin observaciones.','2026-08-08 12:00:00-05','2026-08-09 10:00:00-05'),
('e5000002-0000-4000-8000-000000000001','6c019047-f361-41b6-bf77-c74918fc1fec','e4000002-0000-4000-8000-000000000001','Informe final de rediseño UX','final','student','2618e6fe-414d-4e5a-8f7e-603b9688af33','e6000002-0000-4000-8000-000000000001','approved','951e948d-e811-4403-bf33-a0ced78a17b1','Informe completo, se aprueba.','2026-08-05 16:00:00-05','2026-08-06 09:00:00-05'),
('e5000002-0000-4000-8000-000000000002','6c019047-f361-41b6-bf77-c74918fc1fec','e4000002-0000-4000-8000-000000000002','Acta de cierre de práctica','final','company','928b7648-201a-4ab8-8bbb-638a2e4f5490','e6000002-0000-4000-8000-000000000002','approved','951e948d-e811-4403-bf33-a0ced78a17b1','Acta firmada y conforme.','2026-08-05 16:30:00-05','2026-08-06 09:05:00-05')
ON CONFLICT (id) DO NOTHING;

-- P14: aún falta revisar el informe final del estudiante -> final_docs_review.
UPDATE "project_academic_records" SET status = 'final_docs_review'
  WHERE id = '6129dc65-88dc-475b-abb9-d8773de8ed9a';
-- P12: ambos documentos finales ya aprobados -> finalizing (falta nota final/cierre administrativo).
UPDATE "project_academic_records" SET status = 'finalizing', asesor_completion_signal = true, progress_alert_sent = true
  WHERE id = '75172ed3-9e8f-410b-a931-28253a96c07e';
-- P18: anteproyecto venció sin revisión del jurado -> se cancela el proceso académico.
UPDATE "project_academic_records" SET status = 'cancelled',
  cancellation_reason = 'Anteproyecto vencido sin revisión del jurado dentro del plazo; se cancela el proceso académico por inactividad prolongada del comité evaluador.'
  WHERE id = 'f5399fe6-00e7-43c2-94fc-9f66032c2e8a';

-- ── 7e. Segunda postulación de student17 a P4 (App Móvil de Fidelización):
--    cubre entrevista técnica y un anteproyecto RECHAZADO tras 2 correcciones
--    (hoy sin cobertura ninguno de los dos casos). student17 ya tiene otra
--    postulación (P16, cancelada) — es realista que también postule a P4.
INSERT INTO "applications" (id, project_id, student_id, status, cover_letter, match_score, applied_at, reviewed_at, reviewed_by, accepted_at, completed_at, rejection_reason, withdrawal_reason) VALUES
('c9010001-0000-4000-8000-000000000001','9f8ace78-f0a6-4a8b-8d69-536340f84415','22915994-9802-4475-82da-50b5c1b20acc','accepted','Tengo experiencia con Git y buenas prácticas de control de versiones, me interesa dar el salto a desarrollo móvil.',NULL,'2026-06-01 09:00:00-05','2026-06-05 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-06-12 10:00:00-05',NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "application_timeline" (id, application_id, from_status, to_status, comment, changed_by_user_id) VALUES
('e7000001-0000-4000-8000-000000000001','c9010001-0000-4000-8000-000000000001','pending','shortlisted','Perfil preseleccionado para prueba técnica.','928b7648-201a-4ab8-8bbb-638a2e4f5490'),
('e7000001-0000-4000-8000-000000000002','c9010001-0000-4000-8000-000000000001','shortlisted','interview','Prueba técnica agendada.','928b7648-201a-4ab8-8bbb-638a2e4f5490'),
('e7000001-0000-4000-8000-000000000003','c9010001-0000-4000-8000-000000000001','interview','accepted','Prueba técnica aprobada, estudiante aceptado.','928b7648-201a-4ab8-8bbb-638a2e4f5490')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "interviews" (id, application_id, scheduled_at, duration_minutes, interview_type, location, meeting_link, status, interviewer_id, interviewer_notes, student_feedback, score, company_brief_file_id, technical_task_description, technical_task_due_date, student_solution_file_id, company_resolution, resolution_comment) VALUES
('c9010001-0000-4000-8000-000000000005','c9010001-0000-4000-8000-000000000001','2026-06-03 10:00:00-05',120,'technical',NULL,NULL,'completed','928b7648-201a-4ab8-8bbb-638a2e4f5490','Resolvió correctamente el reto de consumo de API y manejo de estado; buena estructura de código.',NULL,4.0,
  'c9010001-0000-4000-8000-0000000000a1','Construir una pantalla de listado de recompensas consumiendo un endpoint REST de prueba, con manejo de estado de carga y error.','2026-06-05 23:59:00-05','c9010001-0000-4000-8000-0000000000a2','passed','Prueba técnica superada, se recomienda avanzar con la aceptación.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "project_academic_records" (id, application_id, supervisor_assignment_id, anteproyecto_submission_id,
  initiation_agreement_file_id, official_start_date, agreed_duration_weeks, expected_end_date, actual_end_date,
  final_grade_file_id, status, asesor_completion_signal, progress_alert_sent) VALUES
('c9010001-0000-4000-8000-000000000003','c9010001-0000-4000-8000-000000000001','c9010001-0000-4000-8000-000000000002','c9010001-0000-4000-8000-000000000004',
  NULL,NULL,NULL,NULL,NULL,NULL,'waiting_anteproyecto',false,false)
ON CONFLICT (application_id) DO NOTHING;

INSERT INTO "academic_submissions" (id, application_id, submission_type, status, current_file_id, version_number,
  correction_count, jurado_votes, reviewer_comments, asesor_comments, deadline_for_review, deadline_for_student,
  submitted_at, reviewed_at) VALUES
('c9010001-0000-4000-8000-000000000004','c9010001-0000-4000-8000-000000000001','anteproyecto','rejected','c9010001-0000-4000-8000-0000000000a5',3,2,
  '{"fecca71e-30aa-464b-9272-8a8b437f9a72": "reject"}',
  'Tras dos rondas de correcciones, el planteamiento del problema y la justificación siguen sin cumplir el alcance mínimo esperado para el tipo de práctica. Se rechaza el anteproyecto.',
  'Se acompañó al estudiante en las dos correcciones solicitadas, pero no fue posible cerrar a tiempo las observaciones del jurado.',
  NULL,NULL,'2026-06-18 09:00:00-05','2026-08-01 10:00:00-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "submission_history" (id, submission_id, action, actor_id, actor_role, comment, version_number) VALUES
('c9010001-0000-4000-8000-0000000000b1','c9010001-0000-4000-8000-000000000004','submitted','22915994-9802-4475-82da-50b5c1b20acc','student','Primera versión enviada.',1),
('c9010001-0000-4000-8000-0000000000b2','c9010001-0000-4000-8000-000000000004','correction_requested','fecca71e-30aa-464b-9272-8a8b437f9a72','faculty','El planteamiento del problema es muy general, falta delimitar el alcance de la app de fidelización.',1),
('c9010001-0000-4000-8000-0000000000b3','c9010001-0000-4000-8000-000000000004','deadline_extended','19bb3903-d63b-4685-b592-5b73b52e98df','faculty','Se amplía el plazo una semana por solicitud del estudiante.',1),
('c9010001-0000-4000-8000-0000000000b4','c9010001-0000-4000-8000-000000000004','revised','22915994-9802-4475-82da-50b5c1b20acc','student','Se delimitó el alcance y se agregó la justificación del negocio.',2),
('c9010001-0000-4000-8000-0000000000b5','c9010001-0000-4000-8000-000000000004','correction_requested','fecca71e-30aa-464b-9272-8a8b437f9a72','faculty','La justificación mejoró pero el cronograma sigue sin ser realista para 6 meses.',2),
('c9010001-0000-4000-8000-0000000000b6','c9010001-0000-4000-8000-000000000004','revised','22915994-9802-4475-82da-50b5c1b20acc','student','Se ajustó el cronograma a las 6 fases acordadas con la empresa.',3),
('c9010001-0000-4000-8000-0000000000b7','c9010001-0000-4000-8000-000000000004','rejected','fecca71e-30aa-464b-9272-8a8b437f9a72','faculty','Persisten observaciones de fondo tras dos correcciones; se rechaza el anteproyecto.',3)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 8. EVALUATION_DB — evaluaciones del proyecto finalizado (P15 / app15),
--    habilitadas porque el proceso académico ya está 'completed'
-- =========================================================================
\c evaluation_db;
SET client_encoding = 'UTF8';

INSERT INTO "evaluations" (id, application_id, project_id, evaluator_id, evaluated_id, evaluation_type, status,
  overall_score, overall_comment, strengths, areas_for_improvement, completed_at) VALUES
('723fb2e0-fe7a-4556-b760-915728b9db96','59cbc405-1c87-4652-a111-9b1f59131def','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e',
  '928b7648-201a-4ab8-8bbb-638a2e4f5490','978be3f3-1bef-4b92-aa20-eb62f64402e6','company_evaluates_student','completed',
  4.8,'Excelente desempeño, entregó todos los hitos a tiempo y con alta calidad.','Autonomía, comunicación, calidad técnica.','Podría reforzar la documentación técnica.','2026-08-01 10:00:00-05'),
('09fd03d9-d160-465f-807d-4a9d2ff11905','59cbc405-1c87-4652-a111-9b1f59131def','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e',
  '978be3f3-1bef-4b92-aa20-eb62f64402e6','928b7648-201a-4ab8-8bbb-638a2e4f5490','student_evaluates_company','completed',
  4.5,'Buen ambiente de trabajo y acompañamiento constante del equipo.','Acompañamiento, herramientas disponibles.','Podrían mejorar los tiempos de retroalimentación.','2026-08-02 10:00:00-05'),
('e84b7571-17d4-4ebf-9305-28a0465e3bb0','59cbc405-1c87-4652-a111-9b1f59131def','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e',
  '978be3f3-1bef-4b92-aa20-eb62f64402e6','47a3161d-169f-4224-9fb3-fcf74c9796d2','student_evaluates_supervisor','completed',
  4.9,'La asesora estuvo disponible durante todo el proceso y sus observaciones fueron muy valiosas.','Disponibilidad, retroalimentación oportuna.',NULL,'2026-08-03 10:00:00-05')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 9. STORAGE_DB — archivos referenciados por plantillas, anteproyectos,
--    acuerdos de iniciación, nota final y documentos institucionales
-- =========================================================================
\c storage_db;
SET client_encoding = 'UTF8';

INSERT INTO "files" (id, owner_id, original_name, stored_name, mime_type, file_size_bytes, category, entity_type, entity_id, storage_path, status, is_public) VALUES
('ec11bb91-c6cd-46c4-b59a-505c4e097942','951e948d-e811-4403-bf33-a0ced78a17b1','plantilla-anteproyecto-ing-sistemas.docx','tpl-anteproyecto-ing-sis.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',245760,'template','academic_template','2b4a3e7d-3c0a-416b-a97c-47d0b11f6a2e','templates/tpl-anteproyecto-ing-sis.docx','active',true),
('22da06b2-44a6-42ab-ba56-c5fa2430261d','951e948d-e811-4403-bf33-a0ced78a17b1','acta-inicio-practica.docx','tpl-acta-inicio.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',102400,'template','academic_template','a6b949f7-5602-49cf-b142-9cfe3bbdcb8b','templates/tpl-acta-inicio.docx','active',true),
('66edebb0-bda5-44fc-9603-baa6937dd922','951e948d-e811-4403-bf33-a0ced78a17b1','plantilla-informe-final.docx','tpl-informe-final.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',204800,'template','academic_template','f3b2bdd5-9d49-4281-b57e-5f0a05d65af5','templates/tpl-informe-final.docx','active',true),
('2cf8acf5-efb9-4874-a827-5af143491b48','2618e6fe-414d-4e5a-8f7e-603b9688af33','acuerdo-iniciacion-firmado.pdf','ia-app12.pdf','application/pdf',153600,'academic_document','project_academic_record','75172ed3-9e8f-410b-a931-28253a96c07e','academic/ia-app12.pdf','active',false),
('fbcfdf36-eadf-40c9-b56b-8c61cd1066a9','19377bc1-51c0-485a-9474-919fce518a34','acuerdo-iniciacion-firmado.pdf','ia-app13.pdf','application/pdf',153600,'academic_document','project_academic_record','129f0a99-fe2f-4ad9-9317-b7b1851d4e9e','academic/ia-app13.pdf','active',false),
('e8b8ccc3-0f2c-4960-8baf-a8c19cec4370','4868659b-8b42-4522-8f93-903c370e84b1','acuerdo-iniciacion-firmado.pdf','ia-app14.pdf','application/pdf',153600,'academic_document','project_academic_record','6129dc65-88dc-475b-abb9-d8773de8ed9a','academic/ia-app14.pdf','active',false),
('e8bdfe7a-495c-4132-897b-2cae9b0ceb9f','978be3f3-1bef-4b92-aa20-eb62f64402e6','acuerdo-iniciacion-firmado.pdf','ia-app15.pdf','application/pdf',153600,'academic_document','project_academic_record','b64208b8-c0e9-47fb-bf1b-a80241057a34','academic/ia-app15.pdf','active',false),
('9595aafb-5ccc-4cdf-90b4-7f6a42b17303','866b6e22-8676-4557-b37b-178c0c185f50','acta-nota-final.pdf','nota-final-app15.pdf','application/pdf',87040,'academic_document','project_academic_record','b64208b8-c0e9-47fb-bf1b-a80241057a34','academic/nota-final-app15.pdf','active',false),
('bdc4e5b6-34fa-4681-82e7-903e7ddf1c8b','e476dc18-974c-4563-a2eb-91ecf3ca24e8','anteproyecto-v1.pdf','anteproyecto-app08-v1.pdf','application/pdf',307200,'academic_document','academic_submission','1b19c2a6-fe44-4330-b4c3-b64a4eddf22b','academic/anteproyecto-app08-v1.pdf','active',false),
('6f0c8bb5-9170-4db9-ac89-37456ec124e4','8113abaa-14bb-485f-a44a-91602e2d825c','anteproyecto-v1.pdf','anteproyecto-app09-v1.pdf','application/pdf',307200,'academic_document','academic_submission','9e2b91e4-99eb-4e50-b20d-53cfbfce2654','academic/anteproyecto-app09-v1.pdf','active',false),
('9f97ad63-3312-4d4d-84ca-f625d8b2fac7','d1a97678-5d09-4145-99cd-d341fa57b96f','anteproyecto-v2.pdf','anteproyecto-app10-v2.pdf','application/pdf',307200,'academic_document','academic_submission','d61fc39c-3c0f-4bac-8ba1-f95314667c23','academic/anteproyecto-app10-v2.pdf','active',false),
('1894e72e-50cc-43d0-8280-cc2cd4c8c25a','525229cc-c47f-493e-bb06-185cd9df0a7b','anteproyecto-v1.pdf','anteproyecto-app11-v1.pdf','application/pdf',307200,'academic_document','academic_submission','c59ec1e9-4696-4bdd-8ab6-e2fcb258b0ba','academic/anteproyecto-app11-v1.pdf','active',false),
('84f45fd9-c3d6-4253-ad5c-0b5c43c16fbc','2618e6fe-414d-4e5a-8f7e-603b9688af33','anteproyecto-v1.pdf','anteproyecto-app12-v1.pdf','application/pdf',307200,'academic_document','academic_submission','7f1b36f8-eeaf-4f36-a9ea-c5ac1d3dc65a','academic/anteproyecto-app12-v1.pdf','active',false),
('62cb6c7d-e3aa-4df1-89ba-62460b11b078','19377bc1-51c0-485a-9474-919fce518a34','anteproyecto-v1.pdf','anteproyecto-app13-v1.pdf','application/pdf',307200,'academic_document','academic_submission','97d76152-cf1c-4c5c-b604-585735ab7887','academic/anteproyecto-app13-v1.pdf','active',false),
('51bdec3d-281f-4c5c-b6f4-89d7a94ddfdc','4868659b-8b42-4522-8f93-903c370e84b1','anteproyecto-v1.pdf','anteproyecto-app14-v1.pdf','application/pdf',307200,'academic_document','academic_submission','835f4ae1-bd4d-4d83-a804-2bf17a9984e8','academic/anteproyecto-app14-v1.pdf','active',false),
('0b000b69-d473-407b-81d5-e0510672b8f9','978be3f3-1bef-4b92-aa20-eb62f64402e6','anteproyecto-v1.pdf','anteproyecto-app15-v1.pdf','application/pdf',307200,'academic_document','academic_submission','6e766854-3477-4780-9dfe-0a54c12f2cea','academic/anteproyecto-app15-v1.pdf','active',false),
('816b13d9-e692-41ae-969b-ef9fa51e7c6f','de1c95f3-f5f1-4b34-ab19-e67ea2648129','anteproyecto-v1.pdf','anteproyecto-app18-v1.pdf','application/pdf',307200,'academic_document','academic_submission','01f0a770-f336-4732-9197-bdf275bfa91b','academic/anteproyecto-app18-v1.pdf','active',false),
('d06edc1c-0c4b-4fb4-ad1a-3adf99374f9f','525229cc-c47f-493e-bb06-185cd9df0a7b','poliza-seguro-estudiantil.pdf','poliza-app11.pdf','application/pdf',102400,'academic_document','project_document','9c74aa26-7abf-4b1c-b1c4-b37c0598826a','academic/poliza-app11.pdf','active',false),
-- ── 9b. Documento formal de solicitud por proyecto (regla 12 del planning) ──
('d1000002-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-automatizacion-pruebas-qa.pdf','solicitud-p02.pdf','application/pdf',122880,'project_document','project','af50e121-4ecb-4cb3-9f13-a60778e4a702','projects/solicitud-p02.pdf','active',true),
('d1000003-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-migracion-microservicios.pdf','solicitud-p03.pdf','application/pdf',122880,'project_document','project','24cbfde0-8fcd-4610-9ce2-515a016605c8','projects/solicitud-p03.pdf','active',true),
('d1000004-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-app-movil-fidelizacion.pdf','solicitud-p04.pdf','application/pdf',122880,'project_document','project','9f8ace78-f0a6-4a8b-8d69-536340f84415','projects/solicitud-p04.pdf','active',true),
('d1000005-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-motor-recomendacion-ia.pdf','solicitud-p05.pdf','application/pdf',122880,'project_document','project','ea930fea-753f-463f-a9ef-e1c765b448c9','projects/solicitud-p05.pdf','active',true),
('d1000006-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-portal-proveedores-b2b.pdf','solicitud-p06.pdf','application/pdf',122880,'project_document','project','7753b939-ab07-42b1-860c-8122109cdcee','projects/solicitud-p06.pdf','active',true),
('d1000007-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-sistema-inventario.pdf','solicitud-p07.pdf','application/pdf',122880,'project_document','project','5f749e79-d4c3-41cf-af8a-9b1bc0593fee','projects/solicitud-p07.pdf','active',true),
('d1000008-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-plataforma-encuestas.pdf','solicitud-p08.pdf','application/pdf',122880,'project_document','project','73f5388a-21e4-41f3-9410-60c59289adf0','projects/solicitud-p08.pdf','active',true),
('d1000009-0000-4000-8000-000000000001','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','solicitud-formal-chatbot-nlp.pdf','solicitud-p09.pdf','application/pdf',122880,'project_document','project','9df36b79-bdfc-4152-84fd-b265ce9c2618','projects/solicitud-p09.pdf','active',true),
('d1000010-0000-4000-8000-000000000001','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','solicitud-formal-api-pagos-unificada.pdf','solicitud-p10.pdf','application/pdf',122880,'project_document','project','91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88','projects/solicitud-p10.pdf','active',true),
('d1000011-0000-4000-8000-000000000001','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','solicitud-formal-facturacion-electronica.pdf','solicitud-p11.pdf','application/pdf',122880,'project_document','project','f86b000b-3aa1-46ea-b04a-f5fff488409e','projects/solicitud-p11.pdf','active',true),
('d1000012-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-rediseno-ux.pdf','solicitud-p12.pdf','application/pdf',122880,'project_document','project','29d645f3-04c3-4b18-9481-f2bf894c219f','projects/solicitud-p12.pdf','active',true),
('d1000013-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-optimizacion-bd.pdf','solicitud-p13.pdf','application/pdf',122880,'project_document','project','ae93ab6c-021c-4147-84ce-b0cebc1cc467','projects/solicitud-p13.pdf','active',true),
('d1000014-0000-4000-8000-000000000001','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','solicitud-formal-reportes-gerenciales.pdf','solicitud-p14.pdf','application/pdf',122880,'project_document','project','3fa32d54-9bb9-43d9-8f32-9648f15f413e','projects/solicitud-p14.pdf','active',true),
('d1000015-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-gestion-documental.pdf','solicitud-p15.pdf','application/pdf',122880,'project_document','project','fa6cd72e-83ce-4404-a8bc-a0e294c15f1e','projects/solicitud-p15.pdf','active',true),
('d1000016-0000-4000-8000-000000000001','928b7648-201a-4ab8-8bbb-638a2e4f5490','solicitud-formal-integracion-erp.pdf','solicitud-p16.pdf','application/pdf',122880,'project_document','project','ad3c358f-282f-46d5-952c-9bd988bd9690','projects/solicitud-p16.pdf','active',true),
('d1000017-0000-4000-8000-000000000001','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','solicitud-formal-notificaciones-push.pdf','solicitud-p17.pdf','application/pdf',122880,'project_document','project','d03c3c3b-9a74-4591-a559-7c54720e87bb','projects/solicitud-p17.pdf','active',true),
('d1000018-0000-4000-8000-000000000001','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','solicitud-formal-monitoreo-servidores.pdf','solicitud-p18.pdf','application/pdf',122880,'project_document','project','99ee7169-93ad-46aa-ac19-c696bc7edf36','projects/solicitud-p18.pdf','active',true),
-- ── 9c. Documento de la prueba técnica de selección aprobada (P6) ──
('e3000001-0000-4000-8000-000000000001','db4a7f02-d6b7-45ea-a86a-5c945296cb3a','prueba-tecnica-solucion.zip','prueba-tecnica-app-portal-b2b.zip','application/zip',512000,'other','selection_document_request','e2000001-0000-4000-8000-000000000001','selection/prueba-tecnica-app-portal-b2b.zip','active',false),
-- ── 9d. Documentos finales ad-hoc (P14 en revisión, P12 aprobados) ──
('e6000001-0000-4000-8000-000000000001','4868659b-8b42-4522-8f93-903c370e84b1','informe-final-practica.pdf','informe-final-app14.pdf','application/pdf',276480,'academic_document','project_document','e5000001-0000-4000-8000-000000000001','academic/informe-final-app14.pdf','active',false),
('e6000001-0000-4000-8000-000000000002','7e1cc874-aa38-4c57-8660-fbf182bfdbc7','certificacion-finalizacion-practica.pdf','certificacion-app14.pdf','application/pdf',102400,'academic_document','project_document','e5000001-0000-4000-8000-000000000002','academic/certificacion-app14.pdf','active',false),
('e6000002-0000-4000-8000-000000000001','2618e6fe-414d-4e5a-8f7e-603b9688af33','informe-final-rediseno-ux.pdf','informe-final-app12.pdf','application/pdf',307200,'academic_document','project_document','e5000002-0000-4000-8000-000000000001','academic/informe-final-app12.pdf','active',false),
('e6000002-0000-4000-8000-000000000002','928b7648-201a-4ab8-8bbb-638a2e4f5490','acta-cierre-practica.pdf','acta-cierre-app12.pdf','application/pdf',92160,'academic_document','project_document','e5000002-0000-4000-8000-000000000002','academic/acta-cierre-app12.pdf','active',false),
-- ── 9e. Prueba técnica + anteproyecto (v1/v2/v3) del hilo P4/student17 ──
('c9010001-0000-4000-8000-0000000000a1','928b7648-201a-4ab8-8bbb-638a2e4f5490','brief-prueba-tecnica-app-movil.pdf','brief-tecnico-app-p4.pdf','application/pdf',153600,'interview_attachment','interview','c9010001-0000-4000-8000-000000000005','interviews/brief-tecnico-app-p4.pdf','active',false),
('c9010001-0000-4000-8000-0000000000a2','22915994-9802-4475-82da-50b5c1b20acc','solucion-prueba-tecnica.zip','solucion-tecnica-app-p4.zip','application/zip',409600,'interview_attachment','interview','c9010001-0000-4000-8000-000000000005','interviews/solucion-tecnica-app-p4.zip','active',false),
('c9010001-0000-4000-8000-0000000000a3','22915994-9802-4475-82da-50b5c1b20acc','anteproyecto-v1.pdf','anteproyecto-app-p4-v1.pdf','application/pdf',307200,'academic_document','academic_submission','c9010001-0000-4000-8000-000000000004','academic/anteproyecto-app-p4-v1.pdf','active',false),
('c9010001-0000-4000-8000-0000000000a4','22915994-9802-4475-82da-50b5c1b20acc','anteproyecto-v2.pdf','anteproyecto-app-p4-v2.pdf','application/pdf',307200,'academic_document','academic_submission','c9010001-0000-4000-8000-000000000004','academic/anteproyecto-app-p4-v2.pdf','active',false),
('c9010001-0000-4000-8000-0000000000a5','22915994-9802-4475-82da-50b5c1b20acc','anteproyecto-v3.pdf','anteproyecto-app-p4-v3.pdf','application/pdf',307200,'academic_document','academic_submission','c9010001-0000-4000-8000-000000000004','academic/anteproyecto-app-p4-v3.pdf','active',false),
-- ── 9f. E22 (cuenta real jesusdavidgd200425@gmail.com) — movidas aquí desde el
-- bloque E22 al final del archivo: generate-seed-files.mjs solo interpreta la
-- PRIMERA sentencia "INSERT INTO \"files\"" del archivo (bug real encontrado
-- en esta auditoría, ver PLANNING_RECONSTRUCCION_SEED.md §1.4) — una segunda
-- sentencia separada nunca generaba los bytes físicos ni el storage_path real.
('af758b3d-fafe-4d23-bee2-f63267e7d92e','d955c8da-018e-48b6-9698-a18ae8f78e93','acuerdo-iniciacion-firmado.pdf','ia-e22.pdf','application/pdf',153600,'academic_document','project_academic_record','5509a145-10a7-4056-ab59-f0b2d7986529','academic/ia-e22.pdf','active',false),
('73c7ad99-e063-4d84-b1e7-29bee4f95b87','d955c8da-018e-48b6-9698-a18ae8f78e93','anteproyecto-e22.pdf','anteproyecto-e22-v1.pdf','application/pdf',307200,'academic_document','academic_submission','a6cb0641-1122-4252-99bc-95c4864ca074','academic/anteproyecto-e22-v1.pdf','active',false)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 10. CHAT_DB — canales de ejemplo para dos proyectos activos
-- =========================================================================
-- 11.5. NOTIFICATION_DB — notificaciones sembradas para probar centro/deep-links
--       Se cubren categorías: applications, academic, chat, evaluations, projects,
--       system. Mezcla de leídas/no leídas por usuario.
-- =========================================================================
\c notification_db;
SET client_encoding = 'UTF8';

INSERT INTO "notifications"
  (id, user_id, type, title, message, data, channel, priority, is_read, read_at, action_url, group_key, created_at)
VALUES
-- ─── student11 (Manuela Duarte, app 97f41eee — P13 Optimización de Base de Datos, en desarrollo)
('f2fd3b74-a378-4458-a741-e65ea9bc0bf5','19377bc1-51c0-485a-9474-919fce518a34',
 'application_accepted','Tu postulación fue aceptada',
 'La empresa aceptó tu postulación para "Optimización de Base de Datos".',
 '{"applicationId":"97f41eee-f796-446e-8e59-ed896aa6f3c0","projectId":"ae93ab6c-021c-4147-84ce-b0cebc1cc467","projectTitle":"Optimización de Base de Datos"}',
 'in_app','normal',true,'2025-12-31 11:00:00-05',
 '/workspace/97f41eee-f796-446e-8e59-ed896aa6f3c0','project:ae93ab6c-021c-4147-84ce-b0cebc1cc467',
 '2025-12-31 10:00:00-05'),

('99cabf1b-8c84-4571-be15-165101fdb740','19377bc1-51c0-485a-9474-919fce518a34',
 'deliverable_assigned','Nuevo entregable asignado',
 'Se te asignó el entregable "Informe de análisis de rendimiento".',
 '{"applicationId":"97f41eee-f796-446e-8e59-ed896aa6f3c0","projectTitle":"Optimización de Base de Datos","deliverableId":"eb1a8999-d849-49d7-a555-e5ee99df5a47"}',
 'in_app','normal',false,NULL,
 '/workspace/97f41eee-f796-446e-8e59-ed896aa6f3c0?tab=deliverables','project:ae93ab6c-021c-4147-84ce-b0cebc1cc467',
 '2026-02-01 09:00:00-05'),

('f95eb1b0-06b5-4e11-81c7-09933ead36d8','19377bc1-51c0-485a-9474-919fce518a34',
 'message_received','Nuevo mensaje',
 'Carlos Gómez te envió un mensaje.',
 '{"conversationId":"1c52f60d-7060-44cd-a723-f4f2b61fa39b"}',
 'in_app','normal',false,NULL,
 '/chat/1c52f60d-7060-44cd-a723-f4f2b61fa39b','chat',
 '2026-08-03 09:06:00-05'),

-- ─── student08 (d1a97678, app 6767484d — P10 API de Pagos Unificada, anteproyecto con corrección)
('a5dc4758-3d04-48d4-9d2e-7382428b33f7','d1a97678-5d09-4145-99cd-d341fa57b96f',
 'anteproyecto_correction_requested','Corrección solicitada en anteproyecto',
 'El jurado pidió correcciones en tu anteproyecto de "API de Pagos Unificada".',
 '{"applicationId":"6767484d-7d67-4766-ab35-d2f1413d8312","projectTitle":"API de Pagos Unificada"}',
 'in_app','high',false,NULL,
 '/workspace/6767484d-7d67-4766-ab35-d2f1413d8312?tab=academic&anchor=anteproyecto','project:91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88',
 '2026-04-27 11:20:00-05'),

('1b53b399-aa77-447e-b556-e23600d62d4c','d1a97678-5d09-4145-99cd-d341fa57b96f',
 'deadline_extended','Plazo extendido',
 'El plazo de revisión de tu anteproyecto se extendió.',
 '{"applicationId":"6767484d-7d67-4766-ab35-d2f1413d8312","projectTitle":"API de Pagos Unificada"}',
 'in_app','low',false,NULL,
 '/workspace/6767484d-7d67-4766-ab35-d2f1413d8312?tab=academic&anchor=anteproyecto','project:91fcacaf-4ee1-4a1c-9527-70ddd6c6ce88',
 '2026-08-05 12:00:00-05'),

-- ─── student01 (Sofía Martínez, b9addbae): recién postulada, todavía pending
('8a0af470-d3f8-4d16-9d55-712cbeb0e62f','b9addbae-f9b5-4577-b700-3b42a13edcd2',
 'match_recommendation','Nueva recomendación',
 'El proyecto "App Móvil de Fidelización" coincide con tu perfil.',
 '{"projectId":"9f8ace78-f0a6-4a8b-8d69-536340f84415"}',
 'in_app','low',true,'2026-08-01 10:00:00-05',
 '/projects/9f8ace78-f0a6-4a8b-8d69-536340f84415','projects',
 '2026-08-01 09:00:00-05'),

-- ─── (db4a7f02, app bdf1487b — P6 Portal de Proveedores B2B): entrevista agendada
('75ed2a15-184b-4069-b4bb-9fef4c5c7712','db4a7f02-d6b7-45ea-a86a-5c945296cb3a',
 'interview_scheduled','Entrevista programada',
 'Tu entrevista para "Portal de Proveedores B2B" está confirmada.',
 '{"applicationId":"bdf1487b-f288-4d01-8fcb-e3d057a192a5","projectTitle":"Portal de Proveedores B2B"}',
 'in_app','high',false,NULL,
 '/workspace/bdf1487b-f288-4d01-8fcb-e3d057a192a5?tab=interviews','project:7753b939-ab07-42b1-860c-8122109cdcee',
 '2026-08-20 08:30:00-05'),

-- ─── company01 (Carlos Gómez, Tech Solutions Latam): recibe postulaciones + revisa entregas
('b8c045ba-f8a2-481f-8fa0-a507c7704021','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'application_received','Nueva postulación recibida',
 'Un estudiante postuló a "Portal de Proveedores B2B".',
 '{"applicationId":"bdf1487b-f288-4d01-8fcb-e3d057a192a5","projectTitle":"Portal de Proveedores B2B"}',
 'in_app','normal',true,'2026-06-05 12:00:00-05',
 '/workspace/bdf1487b-f288-4d01-8fcb-e3d057a192a5','project:7753b939-ab07-42b1-860c-8122109cdcee',
 '2026-06-05 09:30:00-05'),

('44d4cfd5-8701-47e1-a1ad-eb838011dec1','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'deliverable_submitted','Entregable enviado',
 'Manuela Duarte entregó "Script de índices optimizados".',
 '{"applicationId":"97f41eee-f796-446e-8e59-ed896aa6f3c0","projectTitle":"Optimización de Base de Datos","deliverableId":"aa6cdb2a-1470-4712-963c-f19461c33bb6"}',
 'in_app','normal',false,NULL,
 '/workspace/97f41eee-f796-446e-8e59-ed896aa6f3c0?tab=deliverables','project:ae93ab6c-021c-4147-84ce-b0cebc1cc467',
 '2026-02-28 18:35:00-05'),

('a15f7d63-e957-4fc4-ac4d-631e1084692b','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'project_needs_changes','Proyecto requiere cambios',
 'La Facultad pidió ajustes en "Migración a Microservicios".',
 '{"projectId":"24cbfde0-8fcd-4610-9ce2-515a016605c8"}',
 'in_app','high',false,NULL,
 '/projects/24cbfde0-8fcd-4610-9ce2-515a016605c8','projects',
 '2026-08-03 10:00:00-05'),

-- ─── faculty01 (Ana Ruiz): asesor de student11 en P13
('1919a842-a884-4a82-9321-245cf4f86750','47a3161d-169f-4224-9fb3-fcf74c9796d2',
 'supervisor_assigned','Nueva asignación',
 'Se te asignó como asesor del proyecto "Optimización de Base de Datos".',
 '{"applicationId":"97f41eee-f796-446e-8e59-ed896aa6f3c0","projectTitle":"Optimización de Base de Datos"}',
 'in_app','normal',true,'2026-02-02 11:00:00-05',
 '/workspace/97f41eee-f796-446e-8e59-ed896aa6f3c0','project:ae93ab6c-021c-4147-84ce-b0cebc1cc467',
 '2026-02-02 10:00:00-05'),

('e3cda2bd-f0c3-44a2-98fa-70e7fe9d029c','47a3161d-169f-4224-9fb3-fcf74c9796d2',
 'anteproyecto_submitted','Anteproyecto entregado',
 'Manuela Duarte entregó su anteproyecto para revisión.',
 '{"applicationId":"97f41eee-f796-446e-8e59-ed896aa6f3c0","projectTitle":"Optimización de Base de Datos"}',
 'in_app','normal',false,NULL,
 '/workspace/97f41eee-f796-446e-8e59-ed896aa6f3c0?tab=academic&anchor=anteproyecto','project:ae93ab6c-021c-4147-84ce-b0cebc1cc467',
 '2026-01-08 09:05:00-05'),

('90d5deeb-7545-4663-a521-c861648936af','47a3161d-169f-4224-9fb3-fcf74c9796d2',
 'evaluation_pending','Evaluación pendiente',
 'Tienes evaluaciones de desempeño pendientes por completar en el periodo actual.',
 '{}',
 'in_app','normal',false,NULL,
 '/my-evaluations','evaluations',
 '2026-08-11 16:00:00-05'),

-- ─── faculty04 (Jorge Salas): asesor asignado en P9 (Chatbot de Soporte con NLP)
('a5fdf1fc-838b-4286-9f08-30b1f11e79fd','866b6e22-8676-4557-b37b-178c0c185f50',
 'supervisor_assigned','Asignación como asesor',
 'Se te asignó como asesor del proyecto "Chatbot de Soporte con NLP".',
 '{"applicationId":"330b01ae-5fbd-40b1-a5e6-b22e304e69e0","projectTitle":"Chatbot de Soporte con NLP"}',
 'in_app','normal',false,NULL,
 '/workspace/330b01ae-5fbd-40b1-a5e6-b22e304e69e0','project:9df36b79-bdfc-4152-84fd-b265ce9c2618',
 '2026-05-02 10:05:00-05'),

-- ─── admin01: notificaciones administrativas
('1a3c0d0b-d902-4479-ad0a-4b718fbf45b3','951e948d-e811-4403-bf33-a0ced78a17b1',
 'project_submitted_for_review','Proyecto enviado a revisión',
 'Tech Solutions Latam envió "Automatización de Pruebas QA" para aprobación institucional.',
 '{"projectId":"af50e121-4ecb-4cb3-9f13-a60778e4a702"}',
 'in_app','normal',false,NULL,
 '/projects/af50e121-4ecb-4cb3-9f13-a60778e4a702','projects',
 '2026-08-05 10:00:00-05'),

('fab9d3b8-cee3-4e97-84f8-4a7e757c6f5e','951e948d-e811-4403-bf33-a0ced78a17b1',
 'company_verified','Empresa verificada',
 'La empresa InnovaSoft SAS completó su verificación.',
 '{}',
 'in_app','low',true,'2026-07-15 09:00:00-05',
 '/admin/verifications','system',
 '2026-07-15 08:30:00-05'),

('cb74e23e-0864-40f5-be6d-ce95773e90f7','951e948d-e811-4403-bf33-a0ced78a17b1',
 'system_announcement','Mantenimiento programado',
 'El sistema estará en mantenimiento el próximo domingo entre 02:00 y 04:00.',
 '{}',
 'in_app','low',false,NULL,
 NULL,'system',
 '2026-08-09 15:00:00-05'),

-- ─── (df66d290, app f940b34c — P5 rechazada) y (978be3f3, app 59cbc405 — P15 completado)
('5fee9d06-c1f7-4688-8f9b-cba380a22ec7','df66d290-4054-47bb-98bc-5b5984a5f03f',
 'application_rejected','Postulación rechazada',
 'Tu postulación para "Motor de Recomendación con IA" fue rechazada.',
 '{"applicationId":"f940b34c-faa4-4ab7-874f-2db2687e7901","projectTitle":"Motor de Recomendación con IA"}',
 'in_app','normal',true,'2026-07-20 10:00:00-05',
 '/workspace/f940b34c-faa4-4ab7-874f-2db2687e7901','project:ea930fea-753f-463f-a9ef-e1c765b448c9',
 '2026-07-20 09:00:00-05'),

('e017fcff-64ec-4092-8cd5-3eab9d4bf5fd','978be3f3-1bef-4b92-aa20-eb62f64402e6',
 'academic_completed','Proyecto completado',
 'Tu proyecto académico "Sistema de Gestión Documental" fue finalizado.',
 '{"applicationId":"59cbc405-1c87-4652-a111-9b1f59131def","projectTitle":"Sistema de Gestión Documental"}',
 'in_app','normal',false,NULL,
 '/workspace/59cbc405-1c87-4652-a111-9b1f59131def','project:fa6cd72e-83ce-4404-a8bc-a0e294c15f1e',
 '2026-07-30 14:00:00-05')

ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 12. CHAT_DB — conversaciones y mensajes de ejemplo
-- =========================================================================
\c chat_db;
SET client_encoding = 'UTF8';

INSERT INTO "conversations" (id, type, name, project_id, is_active, last_message_at, last_message_preview, created_by) VALUES
('1c52f60d-7060-44cd-a723-f4f2b61fa39b','group','Equipo del proyecto','ae93ab6c-021c-4147-84ce-b0cebc1cc467',true,'2026-08-03 09:05:00-05','¿Cuándo estaría lista la validación en ambiente de pruebas?','928b7648-201a-4ab8-8bbb-638a2e4f5490'),
('6eeae35d-c0d4-47df-bcf2-3553de12c6f2','group','Asesor y jurado — anteproyecto','9df36b79-bdfc-4152-84fd-b265ce9c2618',true,'2026-05-05 09:10:00-05','Primera versión enviada.','866b6e22-8676-4557-b37b-178c0c185f50')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "conversation_participants" (id, conversation_id, user_id, role, unread_count) VALUES
('3672b0da-e2ed-47f1-8639-6694e5c76c81','1c52f60d-7060-44cd-a723-f4f2b61fa39b','19377bc1-51c0-485a-9474-919fce518a34','owner',0),
('552d70e7-18b7-4e04-898a-132e3eae784d','1c52f60d-7060-44cd-a723-f4f2b61fa39b','928b7648-201a-4ab8-8bbb-638a2e4f5490','member',1),
('8138ebb2-0291-471f-b009-26c119f1e556','1c52f60d-7060-44cd-a723-f4f2b61fa39b','47a3161d-169f-4224-9fb3-fcf74c9796d2','member',0),
('5f5328c3-9ea7-460c-8242-60d31b844c34','6eeae35d-c0d4-47df-bcf2-3553de12c6f2','866b6e22-8676-4557-b37b-178c0c185f50','owner',0),
('04ec31d6-9568-4e3e-97c3-7b71a91f2bb4','6eeae35d-c0d4-47df-bcf2-3553de12c6f2','f5c155d1-dc3b-4363-af1d-15e245cede7f','member',0),
('8ab65e40-79cb-4b16-aba4-2f561a21b70a','6eeae35d-c0d4-47df-bcf2-3553de12c6f2','ea61d231-ae8b-46d4-9377-433328ec6215','member',0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "messages" (id, conversation_id, sender_id, type, content, created_at) VALUES
('05563294-833e-4af1-a6cd-37e78f008d8b','1c52f60d-7060-44cd-a723-f4f2b61fa39b','928b7648-201a-4ab8-8bbb-638a2e4f5490','text','¿Cuándo estaría lista la validación en ambiente de pruebas?','2026-08-03 09:05:00-05'),
('df6e2cad-45a9-4722-81ae-ea413acf4dc9','6eeae35d-c0d4-47df-bcf2-3553de12c6f2','866b6e22-8676-4557-b37b-178c0c185f50','text','Estudiante envió la primera versión del anteproyecto, quedamos atentos.','2026-05-05 09:10:00-05')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 13. E22 — Cuenta real para probar correos al finalizar proyecto
--     Estudiante student20 con email jesusdavidgd200425@gmail.com,
--     asignado al proyecto P20 (Tech Solutions), asesor faculty01,
--     anteproyecto aprobado, acuerdo firmado, todos los entregables
--     aprobados y récord académico en 'active'. Requires_sustentation=false
--     para reducir el flujo a: iniciar finalización → subir docs finales →
--     avanzar → subir nota → COMPLETED → correo real.
-- =========================================================================
\c auth_db;
SET client_encoding = 'UTF8';
INSERT INTO "users" (id, email, password_hash, role, is_verified, is_active) VALUES
('d955c8da-018e-48b6-9698-a18ae8f78e93','jesusdavidgd200425@gmail.com','$2b$10$56r5RfbzapJt9fks1NI9O.McAzC4xKyrU/3zrVpwF5UK.7EgZfO32','student',true,true)
ON CONFLICT (id) DO NOTHING;

\c user_db;
SET client_encoding = 'UTF8';
INSERT INTO "user_profiles" (id, user_id, role, first_name, last_name, is_onboarding_complete) VALUES
('bcee9012-8c7d-43ac-8bc1-49e69bc2b255','d955c8da-018e-48b6-9698-a18ae8f78e93','student','Jesús David','González',true)
ON CONFLICT (user_id) DO NOTHING;

UPDATE "user_profiles" SET phone='+57 300 123 4567', city='Pasto', department='Nariño', bio='Cuenta real de prueba, usada para validar el envío de correos y notificaciones al finalizar un proyecto.', linkedin_url=NULL, date_of_birth='2001-04-25', gender='male' WHERE user_id='d955c8da-018e-48b6-9698-a18ae8f78e93';

\c student_db;
SET client_encoding = 'UTF8';
INSERT INTO "student_profiles" (id, user_id, program, faculty, semester, student_code) VALUES
('307e03a6-20ce-44ee-982a-c09ebb500ecc','d955c8da-018e-48b6-9698-a18ae8f78e93','Ingeniería de Sistemas','Facultad de Ingeniería',9,'202010120')
ON CONFLICT (user_id) DO NOTHING;

UPDATE "student_profiles" SET bio = 'Cuenta real de prueba para validar notificaciones y flujos de finalización de proyecto.' WHERE user_id = 'd955c8da-018e-48b6-9698-a18ae8f78e93';

INSERT INTO "skills" (id, student_id, name, catalog_skill_id, category, proficiency_level) VALUES
('a1000020-0000-4000-8000-000000000001','307e03a6-20ce-44ee-982a-c09ebb500ecc','Análisis de datos',NULL,'concept','intermediate'),
('a1000020-0000-4000-8000-000000000002','307e03a6-20ce-44ee-982a-c09ebb500ecc','SQL',NULL,'language','intermediate')
ON CONFLICT (student_id, name) DO NOTHING;

\c project_db;
SET client_encoding = 'UTF8';
INSERT INTO "projects" (id, company_id, created_by_user_id, title, slug, description, project_type, status,
  duration_months, location_type, positions_available, application_deadline, start_date, end_date,
  faculty_review_notes, faculty_rejection_categories,
  faculty_reviewer_id, faculty_reviewed_at, submitted_for_review_at) VALUES
('a3cf1251-2362-4217-a7cf-27c05cd43296','928b7648-201a-4ab8-8bbb-638a2e4f5490','928b7648-201a-4ab8-8bbb-638a2e4f5490',
 'Módulo de Reportes Analíticos','modulo-reportes-analiticos-tsl-e22',
 'Desarrollo de módulo de generación de reportes analíticos con exportación a PDF/Excel. Proyecto de práctica profesional listo para finalizar (E22).',
 'internship','in_progress',5,'remote',1,'2026-02-15','2026-03-01',NULL,'Aprobado.',NULL,
 '951e948d-e811-4403-bf33-a0ced78a17b1','2026-02-01 09:00:00-05','2026-01-28 08:00:00-05')
ON CONFLICT (id) DO NOTHING;

UPDATE "projects" SET academic_programs = 'Ingeniería de Sistemas', minimum_semester = 6
  WHERE id = 'a3cf1251-2362-4217-a7cf-27c05cd43296' AND (academic_programs IS NULL OR academic_programs !~ '^[0-9a-f]{8}-');

INSERT INTO "project_deliverables" (id, project_id, title, description, due_date, weight_percentage, display_order, is_mandatory) VALUES
('f9e41e79-4a7a-40c0-ba20-8548ad0a4a3e','a3cf1251-2362-4217-a7cf-27c05cd43296','Diseño técnico del módulo','Documento con arquitectura y modelo de datos del módulo de reportes.','2026-04-01',30,1,true),
('dfc530c7-b84b-46e8-93d5-a8e097744654','a3cf1251-2362-4217-a7cf-27c05cd43296','Prototipo funcional','Prototipo funcional con exportación a PDF y Excel de al menos 2 reportes.','2026-06-01',40,2,true),
('c3790f2b-d210-4656-ad8a-c6f2dda18838','a3cf1251-2362-4217-a7cf-27c05cd43296','Informe final del proyecto','Informe final con resultados, métricas y aprendizajes.','2026-07-30',30,3,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "project_skills" (id, project_id, name, catalog_skill_id, category, proficiency_level, is_mandatory) VALUES
('b1000020-0000-4000-8000-000000000001','a3cf1251-2362-4217-a7cf-27c05cd43296','Análisis de datos',NULL,'concept','intermediate',true),
('b1000020-0000-4000-8000-000000000002','a3cf1251-2362-4217-a7cf-27c05cd43296','SQL',NULL,'language','intermediate',true)
ON CONFLICT (project_id, name) DO NOTHING;

\c admin_db;
SET client_encoding = 'UTF8';
INSERT INTO "supervisor_assignments" (id, supervisor_id, student_id, project_id, application_id, period_id, assigned_by, role, start_date, end_date, status, decline_reason, accepted_at, notes) VALUES
('81ad0930-0cac-4a45-a9f5-53d3f448583c','fecca71e-30aa-464b-9272-8a8b437f9a72','d955c8da-018e-48b6-9698-a18ae8f78e93','a3cf1251-2362-4217-a7cf-27c05cd43296','bef45d2d-16c4-4c9e-87bf-5f954335f071','befd9543-14a2-42fb-b9b3-ccca14db6a5f','951e948d-e811-4403-bf33-a0ced78a17b1','asesor','2026-03-01',NULL,'accepted',NULL,'2026-03-02 10:00:00-05','Asesoría E22 — probar emails al finalizar.')
ON CONFLICT (student_id, project_id, role, supervisor_id) DO NOTHING;

\c application_db;
SET client_encoding = 'UTF8';
INSERT INTO "applications" (id, project_id, student_id, status, cover_letter, match_score, applied_at, reviewed_at, reviewed_by, accepted_at, completed_at, rejection_reason, withdrawal_reason) VALUES
('bef45d2d-16c4-4c9e-87bf-5f954335f071','a3cf1251-2362-4217-a7cf-27c05cd43296','d955c8da-018e-48b6-9698-a18ae8f78e93','in_progress','Cuento con experiencia en reportería y visualización de datos. Interesado en aportar al módulo analítico.',NULL,'2026-02-08 09:00:00-05','2026-02-10 10:00:00-05','928b7648-201a-4ab8-8bbb-638a2e4f5490','2026-02-15 10:00:00-05',NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "application_timeline" (id, application_id, from_status, to_status, comment, changed_by_user_id) VALUES
('a50fbe40-3b68-44ac-acdd-dcc9db5e67e0','bef45d2d-16c4-4c9e-87bf-5f954335f071','accepted','in_progress','Proyecto iniciado tras aceptación del asesor.','951e948d-e811-4403-bf33-a0ced78a17b1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "project_academic_records" (id, application_id, supervisor_assignment_id, anteproyecto_submission_id,
  initiation_agreement_file_id, official_start_date, agreed_duration_weeks, expected_end_date, actual_end_date,
  final_grade_file_id, status, asesor_completion_signal, progress_alert_sent) VALUES
('5509a145-10a7-4056-ab59-f0b2d7986529','bef45d2d-16c4-4c9e-87bf-5f954335f071','81ad0930-0cac-4a45-a9f5-53d3f448583c','a6cb0641-1122-4252-99bc-95c4864ca074',
  'af758b3d-fafe-4d23-bee2-f63267e7d92e','2026-03-01',22,'2026-08-02',NULL,NULL,'active',true,true)
ON CONFLICT (application_id) DO NOTHING;

INSERT INTO "academic_submissions" (id, application_id, submission_type, status, current_file_id, version_number,
  correction_count, jurado_votes, reviewer_comments, asesor_comments, deadline_for_review, deadline_for_student,
  submitted_at, reviewed_at) VALUES
('a6cb0641-1122-4252-99bc-95c4864ca074','bef45d2d-16c4-4c9e-87bf-5f954335f071','anteproyecto','approved','73c7ad99-e063-4d84-b1e7-29bee4f95b87',1,0,
  '{"f5c155d1-dc3b-4363-af1d-15e245cede7f": "approve"}','Aprobado por unanimidad.','Adjunto anteproyecto para revisión.',NULL,NULL,'2026-03-10 09:00:00-05','2026-03-18 10:00:00-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "submission_history" (id, submission_id, action, actor_id, actor_role, comment, version_number) VALUES
('ec207be6-cddb-4a5f-8634-1735f4c98779','a6cb0641-1122-4252-99bc-95c4864ca074','submitted','d955c8da-018e-48b6-9698-a18ae8f78e93','student','Primera versión enviada.',1),
('d146f70b-c990-469e-9768-551887aa917a','a6cb0641-1122-4252-99bc-95c4864ca074','approved','f5c155d1-dc3b-4363-af1d-15e245cede7f','faculty','Aprobado.',1)
ON CONFLICT (id) DO NOTHING;

-- Entregables: los 3 aprobados (proyecto listo para iniciar finalización)
INSERT INTO "student_deliverables" (id, application_id, project_deliverable_id, title, description, type, due_date,
  created_by_user_id, requester_type, submitted_at, file_url, file_type, status, feedback, grade) VALUES
('64d2735d-fa7b-4e6e-af62-54db637a3ab3','bef45d2d-16c4-4c9e-87bf-5f954335f071','f9e41e79-4a7a-40c0-ba20-8548ad0a4a3e',
  'Diseño técnico del módulo','Documento con arquitectura y modelo de datos del módulo de reportes.','report','2026-04-01',
  '928b7648-201a-4ab8-8bbb-638a2e4f5490','company','2026-03-30 16:00:00-05','https://storage.collabu.dev/dev/diseno-tecnico-reportes.pdf','application/pdf','approved',
  'Diseño claro y bien estructurado, se aprueba.',4.7),
('34f9f9e1-f92e-4776-addc-8a645ca359c5','bef45d2d-16c4-4c9e-87bf-5f954335f071','dfc530c7-b84b-46e8-93d5-a8e097744654',
  'Prototipo funcional','Prototipo funcional con exportación a PDF y Excel de al menos 2 reportes.','code','2026-06-01',
  '928b7648-201a-4ab8-8bbb-638a2e4f5490','company','2026-05-28 18:00:00-05','https://storage.collabu.dev/dev/prototipo-reportes.zip','application/zip','approved',
  'Prototipo funciona correctamente y cubre los reportes solicitados.',4.6),
('f88c0c5b-be31-4dbe-a30a-a42fe4457ca4','bef45d2d-16c4-4c9e-87bf-5f954335f071','c3790f2b-d210-4656-ad8a-c6f2dda18838',
  'Informe final del proyecto','Informe final con resultados, métricas y aprendizajes.','report','2026-07-30',
  '928b7648-201a-4ab8-8bbb-638a2e4f5490','company','2026-07-28 15:00:00-05','https://storage.collabu.dev/dev/informe-final-reportes.pdf','application/pdf','approved',
  'Informe excelente, recomiendo iniciar cierre académico.',4.8)
ON CONFLICT (id) DO NOTHING;

-- Los archivos físicos de la cuenta E22 (acuerdo de iniciación + anteproyecto)
-- se sembraron arriba, en la sección 9f — junto al único INSERT de "files"
-- que generate-seed-files.mjs sabe interpretar.

-- =========================================================================
-- FIN DEL SEED
-- =========================================================================

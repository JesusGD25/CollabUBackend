-- =========================================================================
-- COLLAB-U DATA SEED UP (Demostración)
-- Población inicial para las bases de datos de microservicios
-- =========================================================================

-- 1. AUTH_DB (Usuarios: Estudiante y Empresa)
\c auth_db;

-- Insertar un Estudiante y una Empresa (Contraseña: Password123!)
INSERT INTO "users" (id, email, password_hash, role, is_verified, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'student@demo.com', '$2b$10$EPD/p1b2d.u0y.U9jYhO3u.4yI25fD5XqY/c5aE5o5M01v9rB2hL2', 'student', true, true),
('22222222-2222-2222-2222-222222222222', 'company@demo.com', '$2b$10$EPD/p1b2d.u0y.U9jYhO3u.4yI25fD5XqY/c5aE5o5M01v9rB2hL2', 'company', true, true)
ON CONFLICT (id) DO NOTHING;

-- 2. USER_DB (Perfiles Core)
\c user_db;

INSERT INTO "user_profiles" (id, user_id, role, first_name, last_name) VALUES
('11111111-1111-1111-2222-111111111111', '11111111-1111-1111-1111-111111111111', 'student', 'Sofia', 'Martínez'),
('22222222-2222-2222-3333-222222222222', '22222222-2222-2222-2222-222222222222', 'company', 'Carlos', 'Gómez')
ON CONFLICT (user_id) DO NOTHING;

-- 3. STUDENT_DB (Perfil específico de Estudiante)
\c student_db;

INSERT INTO "student_profiles" (id, user_id, program, faculty, semester, student_code) VALUES
('11111111-1111-1111-4444-111111111111', '11111111-1111-1111-1111-111111111111', 'Ingeniería de Sistemas', 'Facultad de Ingeniería', 8, '202010101')
ON CONFLICT (user_id) DO NOTHING;

-- 4. COMPANY_DB (Perfil específico de Empresa)
\c company_db;

INSERT INTO "companies" (id, user_id, company_name) VALUES
('22222222-2222-2222-5555-222222222222', '22222222-2222-2222-2222-222222222222', 'Tech Solutions Latam')
ON CONFLICT (user_id) DO NOTHING;

-- 5. PROJECT_DB (Proyecto publicado por la Empresa)
\c project_db;

INSERT INTO "projects" (id, company_id, created_by_user_id, title, slug, description, project_type, status, duration_months, location_type, positions_available) VALUES
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Implementación de IA en E-commerce', 'implementacion-ia-ecommerce-tech-solutions', 'Buscamos un estudiante para implementar modelos de IA y ML en nuestra plataforma de E-commerce. Se requiere conocimiento en Python, TensorFlow, y APIs.', 'internship', 'published', 6, 'remote', 2)
ON CONFLICT (id) DO NOTHING;

-- 6. APPLICATION_DB (Aplicación del Estudiante al Proyecto)
\c application_db;

INSERT INTO "applications" (id, project_id, student_id, status, cover_letter, match_score) VALUES
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'pending', 'Me encantaría participar en este proyecto porque me especializo en IA y considero que puedo aportar gran valor implementando el motor de recomendación.', 85.50)
ON CONFLICT (id) DO NOTHING;

-- 7. EVALUATION_DB (Evaluación de ejemplo en curso)
\c evaluation_db;

INSERT INTO "evaluations" (id, application_id, project_id, evaluator_id, evaluated_id, evaluation_type, status, overall_score, overall_comment) VALUES
('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'company_evaluates_student', 'completed', 4.8, 'Excelente aportación, el estudiante mostró gran profesionalismo y conocimiento técnico.')
ON CONFLICT (id) DO NOTHING;

-- NOTA: Se agregaron datos consistentes que vinculan todas las entidades entre sí simulando el ciclo completo.

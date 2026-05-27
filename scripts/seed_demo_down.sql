-- =========================================================================
-- COLLAB-U DATA SEED DOWN (Rollback de Demostración)
-- Limpia exactamente los registros creados durante el Seed usando sus IDs
-- =========================================================================

\c evaluation_db;
DELETE FROM "evaluations" WHERE id = '55555555-5555-5555-5555-555555555555';

\c application_db;
DELETE FROM "applications" WHERE id = '44444444-4444-4444-4444-444444444444';

\c project_db;
DELETE FROM "projects" WHERE id = '33333333-3333-3333-3333-333333333333';

\c company_db;
DELETE FROM "companies" WHERE user_id = '22222222-2222-2222-2222-222222222222';

\c student_db;
DELETE FROM "student_profiles" WHERE user_id = '11111111-1111-1111-1111-111111111111';

\c user_db;
DELETE FROM "user_profiles" WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

\c auth_db;
DELETE FROM "users" WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

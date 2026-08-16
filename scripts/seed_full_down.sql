-- =========================================================================
-- COLLAB-U — ROLLBACK DEL SEED COMPLETO
-- Elimina únicamente las filas creadas por seed_full_up.sql (por prefijo de
-- UUID determinístico), en orden inverso para respetar dependencias lógicas.
-- Las columnas "id" son de tipo uuid, por eso se castean a ::text para LIKE.
-- =========================================================================

\c notification_db;
SET client_encoding = 'UTF8';
DELETE FROM "notifications" WHERE id::text LIKE 'a1000000-%';

\c chat_db;
SET client_encoding = 'UTF8';
DELETE FROM "messages" WHERE id::text LIKE '94000000-%';
DELETE FROM "conversation_participants" WHERE id::text LIKE '93000000-%';
DELETE FROM "conversations" WHERE id::text LIKE '92000000-%';

\c storage_db;
SET client_encoding = 'UTF8';
DELETE FROM "files" WHERE id::text LIKE '80000000-%';

\c evaluation_db;
SET client_encoding = 'UTF8';
DELETE FROM "evaluations" WHERE id::text LIKE '91000000-%';

\c application_db;
SET client_encoding = 'UTF8';
DELETE FROM "deliverable_comments" WHERE id::text LIKE '75000000-%';
DELETE FROM "student_deliverables" WHERE id::text LIKE '74000000-%';
DELETE FROM "project_documents" WHERE id::text LIKE '73000000-%';
DELETE FROM "submission_history" WHERE id::text LIKE '71000000-%';
DELETE FROM "academic_submissions" WHERE id::text LIKE '70000000-%';
DELETE FROM "project_academic_records" WHERE id::text LIKE '72000000-%';
DELETE FROM "interviews" WHERE id::text LIKE '61000000-%';
DELETE FROM "application_timeline" WHERE id::text LIKE '62000000-%';
DELETE FROM "applications" WHERE id::text LIKE '60000000-%';

\c admin_db;
SET client_encoding = 'UTF8';
DELETE FROM "project_rejection_categories" WHERE id::text LIKE '46000000-%';
DELETE FROM "document_requirements" WHERE id::text LIKE '44000000-%';
DELETE FROM "academic_templates" WHERE id::text LIKE '45000000-%';
DELETE FROM "supervisor_assignment_history" WHERE id::text LIKE '43100000-%';
DELETE FROM "supervisor_assignments" WHERE id::text LIKE '43000000-%';
DELETE FROM "supervisors" WHERE id::text LIKE '42000000-%';
DELETE FROM "academic_periods" WHERE id::text LIKE '90000000-%';

\c project_db;
SET client_encoding = 'UTF8';
DELETE FROM "project_deliverables" WHERE id::text LIKE '51000000-%';
DELETE FROM "projects" WHERE id::text LIKE '50000000-%';

\c company_db;
SET client_encoding = 'UTF8';
DELETE FROM "companies" WHERE id::text LIKE '22000000-%';

\c student_db;
SET client_encoding = 'UTF8';
DELETE FROM "student_profiles" WHERE id::text LIKE '12000000-%';

\c user_db;
SET client_encoding = 'UTF8';
DELETE FROM "user_profiles" WHERE id::text LIKE '11000000-%' OR id::text LIKE '21000000-%' OR id::text LIKE '31000000-%' OR id::text LIKE '41000000-%';

\c auth_db;
SET client_encoding = 'UTF8';
DELETE FROM "users" WHERE id::text LIKE '10000000-%' OR id::text LIKE '20000000-%' OR id::text LIKE '30000000-%' OR id::text LIKE '40000000-%';

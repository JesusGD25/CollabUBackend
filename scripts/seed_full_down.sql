-- =========================================================================
-- COLLAB-U — ROLLBACK DEL SEED COMPLETO
--
-- Reescrito (ver PLANNING_RECONSTRUCCION_SEED.md): la versión anterior
-- borraba por prefijo de UUID determinístico, pero el seed real nunca usó
-- esos prefijos — el rollback no borraba prácticamente nada. Esta versión
-- usa TRUNCATE ... CASCADE sobre exactamente las tablas que seed_full_up.sql
-- puebla, base de datos por base de datos (cada microservicio tiene su
-- propia base — no hay FKs reales entre bases, así que no hace falta un
-- orden global; CASCADE resuelve las FKs internas de cada base).
--
-- No trunca tablas de catálogos dinámicos (skill_catalog, academic_programs,
-- skill_program_mapping) — esas las siembra admin-service en runtime
-- (onModuleInit) y no dependen de este script.
-- =========================================================================

\c chat_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE "messages", "conversation_participants", "conversations" RESTART IDENTITY CASCADE;

\c notification_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE "notifications" RESTART IDENTITY CASCADE;

\c storage_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE "files" RESTART IDENTITY CASCADE;

\c evaluation_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE "evaluations" RESTART IDENTITY CASCADE;

\c application_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE
  "deliverable_attachments",
  "deliverable_comments",
  "student_deliverables",
  "final_document_requirements",
  "selection_document_requests",
  "project_document_requirements",
  "project_documents",
  "submission_history",
  "academic_submissions",
  "project_academic_records",
  "interviews",
  "application_timeline",
  "applications"
RESTART IDENTITY CASCADE;

\c admin_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE
  "company_verifications",
  "document_requirements",
  "academic_templates",
  "supervisor_assignment_history",
  "supervisor_assignments",
  "supervisors",
  "academic_periods"
RESTART IDENTITY CASCADE;

\c project_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE
  "project_requirements",
  "project_skills",
  "project_deliverables",
  "projects"
RESTART IDENTITY CASCADE;

\c company_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE
  "business_areas",
  "company_contacts",
  "company_locations",
  "companies"
RESTART IDENTITY CASCADE;

\c student_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE "languages", "skills", "student_profiles" RESTART IDENTITY CASCADE;

\c user_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE "user_settings", "user_profiles" RESTART IDENTITY CASCADE;

\c auth_db;
SET client_encoding = 'UTF8';
TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;

-- =========================================================================
-- FIN DEL ROLLBACK
-- =========================================================================

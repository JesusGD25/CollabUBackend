-- =========================================================================
-- COLLAB-U — REFRESCO DE FECHAS DEL SEED BASE (independiente de IDs)
--
-- Reemplaza a seed_shift_dates.sql, que quedó obsoleto: filtraba por prefijos de
-- ID que ya no existen (el seed usa UUIDs aleatorios desde regenerate-uuids) y
-- actualizaba una columna `decided_at` que no existe, por lo que no hacía nada
-- (o fallaba).
--
-- El seed base está anclado al 2026-08-12. Con el paso del tiempo, las
-- convocatorias PUBLICADAS quedan con cierre en el pasado y se ven como vencidas.
-- Este script reubica esos cierres hacia el futuro respecto a CURRENT_DATE, de forma
-- determinística por proyecto (varía entre 21 y 60 días) y sin tocar nada más.
--
-- Es IDEMPOTENTE: solo afecta a proyectos publicados cuyo cierre ya pasó; ejecutarlo
-- dos veces no mueve de nuevo los que ya quedaron en el futuro.
-- Seguro de ejecutar con o sin el seed showcase (sus convocatorias ya vienen vigentes).
-- =========================================================================

\c project_db;
SET client_encoding = 'UTF8';

UPDATE "projects"
   SET application_deadline = CURRENT_DATE + 21 + (abs(hashtext(id::text)) % 40),
       updated_at = now()
 WHERE status = 'published'
   AND is_active = true
   AND application_deadline IS NOT NULL
   AND application_deadline < CURRENT_DATE;

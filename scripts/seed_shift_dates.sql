-- =========================================================================
-- COLLAB-U — SHIFT DE FECHAS DEL SEED
--
-- El seed principal (seed_full_up.sql) está anclado al 2026-08-12. Cuando se
-- ejecuta mucho después de esa fecha, deadlines vencidos dejan de reflejar
-- el flujo activo. Este script desplaza las fechas
-- críticas para que el "hoy" del seed coincida con CURRENT_DATE.
--
-- Es IDEMPOTENTE: guarda la fecha de referencia en `application_db.seed_meta`
-- y aplica solo el delta necesario; ejecutarlo dos veces no dobla el shift.
--
-- Uso opcional. Solo necesario si la fecha del sistema difiere del ancla en
-- más de ~30 días. Ejecutar TRAS seed_full_up.sql.
-- =========================================================================

\c application_db;
SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS "seed_meta" (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  anchor_date date := DATE '2026-08-12';
  last_shift date;
  effective_anchor date;
  delta int;
BEGIN
  SELECT value::date INTO last_shift
    FROM seed_meta WHERE key = 'last_shift_target';

  -- Si ya se aplicó un shift previo, el ancla efectiva es esa fecha, no la
  -- original. Así, un segundo run solo mueve el diferencial nuevo.
  effective_anchor := COALESCE(last_shift, anchor_date);
  delta := (CURRENT_DATE - effective_anchor);

  IF delta = 0 THEN
    RAISE NOTICE 'Sin cambios: ancla ya coincide con CURRENT_DATE.';
    RETURN;
  END IF;

  RAISE NOTICE 'Desplazando fechas del seed en % días', delta;

  -- ── application_db ──
  UPDATE applications         SET applied_at = applied_at + (delta || ' days')::interval,
                                  decided_at = decided_at + (delta || ' days')::interval WHERE id::text LIKE '70000000-%';
  UPDATE interviews           SET scheduled_at = scheduled_at + (delta || ' days')::interval WHERE id::text LIKE '61000000-%';
  UPDATE academic_submissions SET deadline_for_review = deadline_for_review + (delta || ' days')::interval,
                                  deadline_for_student = deadline_for_student + (delta || ' days')::interval WHERE id::text LIKE '70000000-%';
  UPDATE project_academic_records
     SET official_start_date = official_start_date + delta,
         expected_end_date   = expected_end_date + delta,
         actual_end_date     = actual_end_date + delta
   WHERE id::text LIKE '72000000-%';
  UPDATE student_deliverables SET due_date = due_date + delta,
                                  submitted_at = submitted_at + (delta || ' days')::interval,
                                  reviewed_at = reviewed_at + (delta || ' days')::interval WHERE id::text LIKE '74000000-%';

  -- ── project_db ──
  PERFORM 1 FROM information_schema.tables WHERE table_name='projects';
  IF FOUND THEN
    -- No estamos conectados a project_db; para hacerlo hay que ejecutar
    -- el UPDATE dentro de su propio bloque \c. Se marca como pendiente.
    NULL;
  END IF;

  -- Persistir el destino del shift para próximas ejecuciones.
  INSERT INTO seed_meta (key, value)
       VALUES ('last_shift_target', CURRENT_DATE::text)
  ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value,
         updated_at = now();
END $$;

-- ── project_db ──
\c project_db;
SET client_encoding = 'UTF8';

DO $$
DECLARE
  anchor_date date := DATE '2026-08-12';
  last_shift date;
  effective_anchor date;
  delta int;
BEGIN
  BEGIN
    SELECT value::date INTO last_shift FROM application_db.seed_meta WHERE key = 'last_shift_target';
  EXCEPTION WHEN OTHERS THEN
    last_shift := NULL;
  END;
  effective_anchor := COALESCE(last_shift, anchor_date);
  delta := (CURRENT_DATE - effective_anchor);
  IF delta = 0 THEN RETURN; END IF;

  UPDATE projects SET application_deadline = application_deadline + delta,
                      created_at = created_at + (delta || ' days')::interval
                WHERE id::text LIKE '50000000-%';
END $$;

-- ── chat_db ──
\c chat_db;
SET client_encoding = 'UTF8';
UPDATE messages SET created_at = created_at + (CURRENT_DATE - DATE '2026-08-12') * INTERVAL '1 day'
              WHERE id::text LIKE '94000000-%'
                AND created_at < CURRENT_DATE - INTERVAL '30 days';

-- ── notification_db ──
\c notification_db;
SET client_encoding = 'UTF8';
UPDATE notifications SET created_at = created_at + (CURRENT_DATE - DATE '2026-08-12') * INTERVAL '1 day'
                   WHERE id::text LIKE 'a1000000-%'
                     AND created_at < CURRENT_DATE - INTERVAL '30 days';

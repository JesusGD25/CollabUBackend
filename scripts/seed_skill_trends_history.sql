-- =========================================================================
-- COLLAB-U — HISTORIA MÍNIMA DE TENDENCIAS DE SKILLS (para demo)
--
-- La dirección de la tendencia (en alza / estable / a la baja) se calcula comparando el
-- gap de HOY con el snapshot de AYER. En una base recién sembrada solo existe el
-- snapshot de hoy (la agregación se acaba de ejecutar), así que toda la columna
-- "Tendencia" quedaría como "Sin datos" hasta el cron del día siguiente.
--
-- Este script crea un snapshot "de ayer" con una variación determinística de ±1 en la
-- demanda y marca la tendencia de hoy según corresponda. Se ejecuta DESPUÉS de la
-- agregación de analítica (Run-Seed-Showcase.ps1, paso 7).
--
-- IDEMPOTENTE: no duplica el snapshot de ayer y solo rellena tendencias nulas.
-- Usa max(snapshot_date) como "hoy" para no depender del huso horario del contenedor.
-- =========================================================================

\c analytics_db;
SET client_encoding = 'UTF8';

WITH latest AS (SELECT max(snapshot_date) AS d FROM skill_trends)
INSERT INTO skill_trends (skill_name, catalog_skill_id, demand_count, supply_count, gap_index, avg_proficiency_level, snapshot_date)
SELECT t.skill_name,
       t.catalog_skill_id,
       GREATEST(0, t.demand_count + x.delta),
       t.supply_count,
       GREATEST(0, t.demand_count + x.delta) - t.supply_count,
       t.avg_proficiency_level,
       l.d - 1
  FROM skill_trends t
  JOIN latest l ON t.snapshot_date = l.d
 CROSS JOIN LATERAL (SELECT (abs(hashtext(t.skill_name)) % 3) - 1 AS delta) x
 WHERE NOT EXISTS (
         SELECT 1 FROM skill_trends y
          WHERE y.skill_name = t.skill_name AND y.snapshot_date = l.d - 1);

WITH latest AS (SELECT max(snapshot_date) AS d FROM skill_trends)
UPDATE skill_trends t
   SET trend_direction = CASE
         WHEN t.gap_index > y.gap_index THEN 'rising'
         WHEN t.gap_index < y.gap_index THEN 'declining'
         ELSE 'stable' END
  FROM skill_trends y, latest l
 WHERE t.snapshot_date = l.d
   AND y.snapshot_date = l.d - 1
   AND y.skill_name = t.skill_name
   AND t.trend_direction IS NULL;

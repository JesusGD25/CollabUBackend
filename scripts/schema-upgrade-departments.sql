-- Actualizacion de esquema para produccion: departamentos / subroles de admin (F0-F5).
-- En produccion TypeORM corre con synchronize=false (salvo notification-service), asi que estas columnas
-- hay que crearlas a mano en una base creada antes de F2. Es idempotente: se puede ejecutar varias veces.
--
-- Uso (desde Backend/docker, con el contenedor de Postgres arriba y COPIA de seguridad hecha):
--   Get-Content ..\scripts\schema-upgrade-departments.sql -Raw | docker exec -i collab-u-postgres psql -U collabu_admin -d postgres -v ON_ERROR_STOP=1
-- (el script hace \connect a cada base).

\connect auth_db
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id uuid;
-- Los admins existentes pasan a superadmin (Facultad); los de departamento se crean desde la UI.
UPDATE users SET admin_level = 'super' WHERE role = 'admin' AND admin_level IS NULL;

\connect company_db
ALTER TABLE companies ADD COLUMN IF NOT EXISTS program_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

\connect application_db
ALTER TABLE applications ADD COLUMN IF NOT EXISTS program_id uuid;
CREATE INDEX IF NOT EXISTS idx_applications_program ON applications (program_id);

\connect admin_db
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS program_id uuid;
ALTER TABLE supervisor_assignments ADD COLUMN IF NOT EXISTS program_id uuid;
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS program_id uuid;

\connect analytics_db
ALTER TABLE platform_metrics ADD COLUMN IF NOT EXISTS program_id uuid;
ALTER TABLE skill_trends ADD COLUMN IF NOT EXISTS program_id uuid;
ALTER TABLE skill_trends ADD COLUMN IF NOT EXISTS category varchar(30);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS program_id uuid;
-- Un snapshot por (fecha, departamento); program_id NULL = total de la Facultad.
ALTER TABLE platform_metrics DROP CONSTRAINT IF EXISTS "UQ_platform_metrics_snapshot_date";
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_platform_metrics_date_program"
  ON platform_metrics (snapshot_date, COALESCE(program_id, '00000000-0000-0000-0000-000000000000'::uuid));

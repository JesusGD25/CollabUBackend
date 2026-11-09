import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración inicial — refleja el schema que hasta ahora `synchronize: true` creaba
 * automáticamente en desarrollo (mismas 6 tablas, mismos tipos/columnas que las entidades
 * en src/analytics/entities/). Escrita a mano y NO verificada contra una base de datos viva
 * en esta sesión (no había Docker/Postgres corriendo) — antes de desactivar `synchronize` en
 * database.config.ts, correr esta migración contra una base de datos de desarrollo real
 * (`npm run migration:run`) y confirmar que el schema resultante coincide con el que
 * `synchronize: true` generaba, incluyendo índices y el UNIQUE de platform_metrics.snapshot_date.
 */
export class InitialSchema1758470400000 implements MigrationInterface {
  name = 'InitialSchema1758470400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "project_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" character varying NOT NULL,
        "period_id" uuid,
        "total_applications" integer NOT NULL DEFAULT 0,
        "accepted_applications" integer NOT NULL DEFAULT 0,
        "rejected_applications" integer NOT NULL DEFAULT 0,
        "avg_match_score" numeric(5,2),
        "avg_time_to_fill_days" integer,
        "completion_rate" numeric(5,2),
        "avg_evaluation_score" numeric(5,2),
        "total_views" integer NOT NULL DEFAULT 0,
        "conversion_rate" numeric(5,2),
        "snapshot_date" date NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_metrics" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_project_metrics_project_id" ON "project_metrics" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_project_metrics_snapshot_date" ON "project_metrics" ("snapshot_date")`);

    await queryRunner.query(`
      CREATE TABLE "student_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "student_id" character varying NOT NULL,
        "total_applications" integer NOT NULL DEFAULT 0,
        "accepted_count" integer NOT NULL DEFAULT 0,
        "rejected_count" integer NOT NULL DEFAULT 0,
        "avg_match_score" numeric(5,2),
        "profile_completeness" integer NOT NULL DEFAULT 0,
        "avg_evaluation_score" numeric(5,2),
        "total_projects_completed" integer NOT NULL DEFAULT 0,
        "skills_count" integer NOT NULL DEFAULT 0,
        "response_rate" numeric(5,2),
        "snapshot_date" date NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_metrics" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_student_metrics_student_id" ON "student_metrics" ("student_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_student_metrics_snapshot_date" ON "student_metrics" ("snapshot_date")`);

    await queryRunner.query(`
      CREATE TABLE "company_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" character varying NOT NULL,
        "total_projects" integer NOT NULL DEFAULT 0,
        "active_projects" integer NOT NULL DEFAULT 0,
        "total_applications_received" integer NOT NULL DEFAULT 0,
        "avg_time_to_respond_hours" integer,
        "avg_evaluation_given" numeric(5,2),
        "avg_evaluation_received" numeric(5,2),
        "total_students_hired" integer NOT NULL DEFAULT 0,
        "completion_rate" numeric(5,2),
        "snapshot_date" date NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_metrics" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_company_metrics_company_id" ON "company_metrics" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_company_metrics_snapshot_date" ON "company_metrics" ("snapshot_date")`);

    await queryRunner.query(`
      CREATE TABLE "platform_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "total_users" integer NOT NULL DEFAULT 0,
        "total_students" integer NOT NULL DEFAULT 0,
        "total_companies" integer NOT NULL DEFAULT 0,
        "total_projects" integer NOT NULL DEFAULT 0,
        "total_applications" integer NOT NULL DEFAULT 0,
        "active_projects" integer NOT NULL DEFAULT 0,
        "avg_match_score" numeric(5,2),
        "avg_time_to_fill_days" integer,
        "new_users_period" integer NOT NULL DEFAULT 0,
        "new_projects_period" integer NOT NULL DEFAULT 0,
        "snapshot_date" date NOT NULL,
        "period_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_platform_metrics_snapshot_date" UNIQUE ("snapshot_date"),
        CONSTRAINT "PK_platform_metrics" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "skill_trends" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "skill_name" character varying(100) NOT NULL,
        "catalog_skill_id" uuid,
        "demand_count" integer NOT NULL DEFAULT 0,
        "supply_count" integer NOT NULL DEFAULT 0,
        "gap_index" numeric(5,2),
        "avg_proficiency_level" numeric(3,2),
        "trend_direction" character varying(20),
        "snapshot_date" date NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_skill_trends" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_skill_trends_skill_name" ON "skill_trends" ("skill_name")`);
    await queryRunner.query(`CREATE INDEX "IDX_skill_trends_snapshot_date" ON "skill_trends" ("snapshot_date")`);

    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "report_type" character varying(50) NOT NULL,
        "generated_by" character varying NOT NULL,
        "period_id" uuid,
        "parameters" jsonb,
        "data" jsonb NOT NULL,
        "file_url" character varying,
        "status" character varying(20) NOT NULL DEFAULT 'completed',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_reports_created_at" ON "reports" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TABLE "skill_trends"`);
    await queryRunner.query(`DROP TABLE "platform_metrics"`);
    await queryRunner.query(`DROP TABLE "company_metrics"`);
    await queryRunner.query(`DROP TABLE "student_metrics"`);
    await queryRunner.query(`DROP TABLE "project_metrics"`);
  }
}

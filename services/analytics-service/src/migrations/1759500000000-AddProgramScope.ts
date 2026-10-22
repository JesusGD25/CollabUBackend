import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Alcance por departamento: `program_id` en platform_metrics, skill_trends y reports
 * (null = total de la Facultad), `category` en skill_trends y snapshot único por (fecha, departamento).
 */
export class AddProgramScope1759500000000 implements MigrationInterface {
  name = 'AddProgramScope1759500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "platform_metrics" ADD COLUMN "program_id" uuid`);
    await queryRunner.query(`ALTER TABLE "platform_metrics" DROP CONSTRAINT "UQ_platform_metrics_snapshot_date"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_platform_metrics_date_program" ON "platform_metrics" ("snapshot_date", COALESCE("program_id", '00000000-0000-0000-0000-000000000000'::uuid))`,
    );
    await queryRunner.query(`ALTER TABLE "skill_trends" ADD COLUMN "program_id" uuid`);
    await queryRunner.query(`ALTER TABLE "skill_trends" ADD COLUMN "category" varchar(30)`);
    await queryRunner.query(`ALTER TABLE "reports" ADD COLUMN "program_id" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "program_id"`);
    await queryRunner.query(`ALTER TABLE "skill_trends" DROP COLUMN "category"`);
    await queryRunner.query(`ALTER TABLE "skill_trends" DROP COLUMN "program_id"`);
    await queryRunner.query(`DROP INDEX "UQ_platform_metrics_date_program"`);
    await queryRunner.query(`DELETE FROM "platform_metrics" WHERE "program_id" IS NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "platform_metrics" ADD CONSTRAINT "UQ_platform_metrics_snapshot_date" UNIQUE ("snapshot_date")`,
    );
    await queryRunner.query(`ALTER TABLE "platform_metrics" DROP COLUMN "program_id"`);
  }
}

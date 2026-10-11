import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega `reports.entity_id` — soporta reportes sobre UNA empresa/estudiante/docente puntual
 * (company_performance/student_outcomes/supervisor_report), no solo agregados de plataforma.
 * Ver rediseño de reportes en PLANNING_ANALYTICS_SERVICE.md.
 */
export class AddEntityIdToReports1758980000000 implements MigrationInterface {
  name = 'AddEntityIdToReports1758980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reports" ADD COLUMN "entity_id" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "entity_id"`);
  }
}

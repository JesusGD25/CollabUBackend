import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTermsAndDataTreatmentToUsers1760100000000 implements MigrationInterface {
  name = 'AddTermsAndDataTreatmentToUsers1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_version" character varying(20) NOT NULL DEFAULT 'v1.0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "data_treatment_accepted" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "data_treatment_accepted"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_version"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMissingAgentAmbassadorDocuments1791620300000
  implements MigrationInterface
{
  name = 'AllowMissingAgentAmbassadorDocuments1791620300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "identityDocument" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_ambassadors" ALTER COLUMN "idCardUrl" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "identityDocumentFormat" character varying, ADD COLUMN IF NOT EXISTS "identityDocumentResourceType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_ambassadors" ADD COLUMN IF NOT EXISTS "idCardPublicId" character varying, ADD COLUMN IF NOT EXISTS "idCardFormat" character varying, ADD COLUMN IF NOT EXISTS "idCardResourceType" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "agent" SET "identityDocument" = '' WHERE "identityDocument" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "student_ambassadors" SET "idCardUrl" = '' WHERE "idCardUrl" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "identityDocument" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_ambassadors" ALTER COLUMN "idCardUrl" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN IF EXISTS "identityDocumentFormat", DROP COLUMN IF EXISTS "identityDocumentResourceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_ambassadors" DROP COLUMN IF EXISTS "idCardPublicId", DROP COLUMN IF EXISTS "idCardFormat", DROP COLUMN IF EXISTS "idCardResourceType"`,
    );
  }
}

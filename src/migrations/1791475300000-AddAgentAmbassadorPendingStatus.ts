import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentAmbassadorPendingStatus1791475300000
  implements MigrationInterface
{
  name = 'AddAgentAmbassadorPendingStatus1791475300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent" (
        "id" SERIAL NOT NULL,
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "state" character varying NOT NULL,
        "occupation" character varying NOT NULL,
        "socialMediaHandles" jsonb NOT NULL,
        "promotionPlan" character varying NOT NULL,
        "promotionNotes" character varying NOT NULL,
        "nin" character varying NOT NULL,
        "motivation" character varying NOT NULL,
        "coverageAreas" character varying NOT NULL,
        "identityDocument" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "referralCode" character varying,
        "referralLink" text,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agent_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "agent"
      ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "referralCode" character varying,
      ADD COLUMN IF NOT EXISTS "referralLink" text
    `);
    await queryRunner.query(`
      ALTER TABLE "student_ambassadors"
      ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'pending'
    `);
    await queryRunner.query(`
      ALTER TABLE "student_ambassadors"
      ADD COLUMN IF NOT EXISTS "referralCode" character varying,
      ADD COLUMN IF NOT EXISTS "referralLink" text,
      ADD COLUMN IF NOT EXISTS "promotionNotes" text NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_referralCode"
      ON "agent" ("referralCode") WHERE "referralCode" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_student_ambassadors_referralCode"
      ON "student_ambassadors" ("referralCode") WHERE "referralCode" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "student_ambassadors" DROP COLUMN IF EXISTS "status"',
    );
    await queryRunner.query(
      'ALTER TABLE "student_ambassadors" DROP COLUMN IF EXISTS "referralCode", DROP COLUMN IF EXISTS "referralLink"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "agent"');
  }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillKycApproved1781000000000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kycApproved" boolean`
    );
    await queryRunner.query(
      `UPDATE "users" SET "kycApproved" = false WHERE "kycApproved" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "kycApproved" SET DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "kycApproved" SET NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "kycApproved" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "kycApproved" DROP DEFAULT`
    );
  }

}

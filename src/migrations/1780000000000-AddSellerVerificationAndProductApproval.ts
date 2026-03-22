import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSellerVerificationAndProductApproval1780000000000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isVerified" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isApproved" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "isApproved"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isVerified"`);
  }

}

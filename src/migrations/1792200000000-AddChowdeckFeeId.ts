import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChowdeckFeeId1792200000000 implements MigrationInterface {
  name = 'AddChowdeckFeeId1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckFeeId" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckFeeId"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChowdeckDeliveryFields1792000000000 implements MigrationInterface {
  name = 'AddChowdeckDeliveryFields1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "businessLatitude" double precision`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "businessLongitude" double precision`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckDeliveryAmount" numeric(10,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckDeliveryAmount"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "businessLongitude"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "businessLatitude"`);
  }
}

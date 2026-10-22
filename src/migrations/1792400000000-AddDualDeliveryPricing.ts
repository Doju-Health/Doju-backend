import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDualDeliveryPricing1792400000000 implements MigrationInterface {
  name = 'AddDualDeliveryPricing1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckTotalPrice" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckBulkDeliveryFee" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckBulkTotalPrice" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryProvider" character varying`);
    await queryRunner.query(`ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "deliveryProvider" character varying`);
    await queryRunner.query(`ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "platformCharges" numeric(10,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "deliveryProvider"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "platformCharges"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "deliveryProvider"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckBulkTotalPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckBulkDeliveryFee"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckTotalPrice"`);
  }
}

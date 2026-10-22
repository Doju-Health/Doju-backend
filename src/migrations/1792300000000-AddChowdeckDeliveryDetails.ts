import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChowdeckDeliveryDetails1792300000000 implements MigrationInterface {
  name = 'AddChowdeckDeliveryDetails1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckDeliveryId" integer`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckReference" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckDeliveryStatus" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckTrackingUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckDeliveryPin" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckDeliveryPin"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckTrackingUrl"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckDeliveryStatus"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckReference"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckDeliveryId"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChowdeckDeliveryPrice1792500000000 implements MigrationInterface {
  name = 'AddChowdeckDeliveryPrice1792500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "chowdeckDeliveryPrice" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "chowdeckDeliveryPrice"`);
  }
}

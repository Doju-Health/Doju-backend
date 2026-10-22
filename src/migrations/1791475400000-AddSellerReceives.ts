import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerReceives1791475400000 implements MigrationInterface {
  name = 'AddSellerReceives1791475400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sellerReceives" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "sellerReceives" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "sellerReceives"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "sellerReceives"`,
    );
  }
}

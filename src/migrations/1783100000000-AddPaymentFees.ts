import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentFees1783100000000 implements MigrationInterface {
  name = 'AddPaymentFees1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "platformFee" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "sellerAmount" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "sellerAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "platformFee"`,
    );
  }
}

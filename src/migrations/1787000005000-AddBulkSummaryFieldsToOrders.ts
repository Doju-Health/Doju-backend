import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBulkSummaryFieldsToOrders1787000005000
  implements MigrationInterface
{
  name = 'AddBulkSummaryFieldsToOrders1787000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "bulkDeliveryFee" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "bulkEstimatedPlatformFee" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "bulkEstimatedSellerAmount" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "bulkEstimatedSellerAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "bulkEstimatedPlatformFee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "bulkDeliveryFee"`,
    );
  }
}

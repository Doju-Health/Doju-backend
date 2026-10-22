import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformChargesToOrders1787000010000
  implements MigrationInterface
{
  name = 'AddPlatformChargesToOrders1787000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "platformCharges" numeric(10,2) NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "bulkPlatformCharges" numeric(10,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "bulkPlatformCharges"`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "platformCharges"`,
    );
  }
}

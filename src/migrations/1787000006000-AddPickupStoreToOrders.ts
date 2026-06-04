import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPickupStoreToOrders1787000006000
  implements MigrationInterface
{
  name = 'AddPickupStoreToOrders1787000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickupStore" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "pickupStore"`,
    );
  }
}

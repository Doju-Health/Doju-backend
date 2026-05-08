import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentDeliveryFee1785000000000 implements MigrationInterface {
  name = 'AddPaymentDeliveryFee1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "deliveryFee" numeric(10,2)`,
    );

    await queryRunner.query(
      `UPDATE "payment" p
       SET "deliveryFee" = COALESCE(o."deliveryFee", 0)
       FROM "orders" o
       WHERE p."orderId" = o.id
         AND p."deliveryFee" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "deliveryFee"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstimatedPayoutFields1785000002000
  implements MigrationInterface
{
  name = 'AddEstimatedPayoutFields1785000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "estimatedPlatformFee" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "estimatedSellerAmount" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "estimatedPlatformFee" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "estimatedSellerAmount" numeric(10,2)`,
    );

    await queryRunner.query(
      `UPDATE "orders"
       SET "estimatedPlatformFee" = FLOOR((COALESCE("totalPrice", 0) - COALESCE("deliveryFee", 0)) * 0.12),
           "estimatedSellerAmount" = FLOOR((COALESCE("totalPrice", 0) - COALESCE("deliveryFee", 0)) - FLOOR((COALESCE("totalPrice", 0) - COALESCE("deliveryFee", 0)) * 0.12))
       WHERE "estimatedPlatformFee" IS NULL OR "estimatedSellerAmount" IS NULL`,
    );

    await queryRunner.query(
      `UPDATE "payment" p
       SET "estimatedPlatformFee" = FLOOR((COALESCE(p."amount", 0) - COALESCE(o."deliveryFee", 0)) * 0.12),
           "estimatedSellerAmount" = FLOOR((COALESCE(p."amount", 0) - COALESCE(o."deliveryFee", 0)) - FLOOR((COALESCE(p."amount", 0) - COALESCE(o."deliveryFee", 0)) * 0.12))
       FROM "orders" o
       WHERE p."orderId" = o.id
         AND (p."estimatedPlatformFee" IS NULL OR p."estimatedSellerAmount" IS NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "estimatedSellerAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "estimatedPlatformFee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "estimatedSellerAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "estimatedPlatformFee"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeparateProductSizeAndWeight1792700000000
  implements MigrationInterface
{
  name = 'SeparateProductSizeAndWeight1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('products');
    if (!table) return;

    const hasWeight = !!table.findColumnByName('weight');
    if (!hasWeight) {
      await queryRunner.query(`
        ALTER TABLE "products"
        ADD COLUMN "weight" numeric(10,2) NOT NULL DEFAULT 2
      `);
    }

    await queryRunner.query(`
      CREATE TYPE "products_size_enum_v2" AS ENUM
        ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')
    `);
    await queryRunner.query(`
      ALTER TABLE "products" ALTER COLUMN "size" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "size" TYPE "products_size_enum_v2"
      USING CASE "size"::text
        WHEN 'small' THEN 'S'
        WHEN 'medium' THEN 'M'
        WHEN 'large' THEN 'L'
        WHEN 'XS' THEN 'XS'
        WHEN 'S' THEN 'S'
        WHEN 'M' THEN 'M'
        WHEN 'L' THEN 'L'
        WHEN 'XL' THEN 'XL'
        WHEN 'XXL' THEN 'XXL'
        WHEN 'XXXL' THEN 'XXXL'
        ELSE 'M'
      END::"products_size_enum_v2"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_size_enum"`);
    await queryRunner.query(
      `ALTER TYPE "products_size_enum_v2" RENAME TO "products_size_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "size" SET DEFAULT 'M'::"products_size_enum"`,
    );

    await queryRunner.query(`
      UPDATE "products"
      SET "weight" = CASE
        WHEN "weight" IS NULL OR "weight" < 0.01 THEN 2
        WHEN "weight" > 50 THEN 50
        ELSE "weight"
      END
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_products_weight_range'
            AND conrelid = 'products'::regclass
        ) THEN
          ALTER TABLE "products"
          ADD CONSTRAINT "CHK_products_weight_range"
          CHECK ("weight" >= 0.01 AND "weight" <= 50);
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "CHK_products_weight_range"`,
    );
    await queryRunner.query(`
      CREATE TYPE "products_size_enum_v1" AS ENUM ('small', 'medium', 'large')
    `);
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "size" DROP DEFAULT`);
    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "size" TYPE "products_size_enum_v1"
      USING CASE "size"::text
        WHEN 'XS' THEN 'small'
        WHEN 'S' THEN 'small'
        WHEN 'M' THEN 'medium'
        WHEN 'L' THEN 'large'
        WHEN 'XL' THEN 'large'
        WHEN 'XXL' THEN 'large'
        WHEN 'XXXL' THEN 'large'
        ELSE 'medium'
      END::"products_size_enum_v1"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_size_enum"`);
    await queryRunner.query(
      `ALTER TYPE "products_size_enum_v1" RENAME TO "products_size_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "size" SET DEFAULT 'medium'::"products_size_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "weight"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProductSizeColumnType1786000000000
  implements MigrationInterface
{
  name = 'FixProductSizeColumnType1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const productsTable = await queryRunner.getTable('products');
    const hasWeight = !!productsTable?.findColumnByName('weight');
    const hasSize = !!productsTable?.findColumnByName('size');

    // Keep old databases working: rename the legacy numeric column first.
    if (hasWeight && !hasSize) {
      await queryRunner.query(
        `ALTER TABLE "products" RENAME COLUMN "weight" TO "size"`,
      );
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'products_size_enum'
        ) THEN
          CREATE TYPE "products_size_enum" AS ENUM ('small', 'medium', 'large');
        END IF;
      END
      $$;
    `);

    const refreshedTable = await queryRunner.getTable('products');
    const sizeColumn = refreshedTable?.findColumnByName('size');

    if (sizeColumn && sizeColumn.type !== 'enum') {
      await queryRunner.query(
        `ALTER TABLE "products" ALTER COLUMN "size" DROP DEFAULT`,
      );
      await queryRunner.query(`
        ALTER TABLE "products"
        ALTER COLUMN "size"
        TYPE "products_size_enum"
        USING CASE
          WHEN "size"::text IN ('small', 'medium', 'large')
            THEN "size"::text::"products_size_enum"
          ELSE 'small'::"products_size_enum"
        END
      `);
      await queryRunner.query(
        `ALTER TABLE "products" ALTER COLUMN "size" SET DEFAULT 'small'::"products_size_enum"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const productsTable = await queryRunner.getTable('products');
    const hasWeight = !!productsTable?.findColumnByName('weight');
    const hasSize = !!productsTable?.findColumnByName('size');

    if (hasSize) {
      await queryRunner.query(
        `ALTER TABLE "products" ALTER COLUMN "size" DROP DEFAULT`,
      );
      await queryRunner.query(`
        ALTER TABLE "products"
        ALTER COLUMN "size"
        TYPE numeric(10,2)
        USING 0
      `);
      await queryRunner.query(
        `ALTER TABLE "products" ALTER COLUMN "size" SET DEFAULT 0`,
      );
    }

    if (!hasWeight && hasSize) {
      await queryRunner.query(
        `ALTER TABLE "products" RENAME COLUMN "size" TO "weight"`,
      );
    }

    await queryRunner.query(
      `DROP TYPE IF EXISTS "products_size_enum"`,
    );
  }
}

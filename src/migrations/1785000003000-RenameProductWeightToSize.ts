import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameProductWeightToSize1785000003000
  implements MigrationInterface
{
  name = 'RenameProductWeightToSize1785000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const productsTable = await queryRunner.getTable('products');
    const hasWeight = !!productsTable?.findColumnByName('weight');
    const hasSize = !!productsTable?.findColumnByName('size');

    // Fresh installs may already be on `size`, so only rename the legacy column when needed.
    if (hasWeight && !hasSize) {
      await queryRunner.query(
        `ALTER TABLE "products" RENAME COLUMN "weight" TO "size"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const productsTable = await queryRunner.getTable('products');
    const hasWeight = !!productsTable?.findColumnByName('weight');
    const hasSize = !!productsTable?.findColumnByName('size');

    if (hasSize && !hasWeight) {
      await queryRunner.query(
        `ALTER TABLE "products" RENAME COLUMN "size" TO "weight"`,
      );
    }
  }
}

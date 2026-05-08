import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductWeight1784000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const productsTable = await queryRunner.getTable('products');
    const hasWeight = !!productsTable?.findColumnByName('weight');
    const hasSize = !!productsTable?.findColumnByName('size');

    // Only add the legacy column when neither version exists yet.
    if (!hasWeight && !hasSize) {
      await queryRunner.query(`
        ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "weight" numeric(10,2) NOT NULL DEFAULT 0
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const productsTable = await queryRunner.getTable('products');
    const hasWeight = !!productsTable?.findColumnByName('weight');

    if (hasWeight) {
      await queryRunner.query(`
        ALTER TABLE "products"
        DROP COLUMN IF EXISTS "weight"
      `);
    }
  }
}

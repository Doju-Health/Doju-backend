import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletedToOrderStatusEnum1786000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if COMPLETED already exists in the enum
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'orders_orderstatus_enum'::regtype 
        AND enumlabel = 'COMPLETED'
      ) as exists
    `);

    // Only add if it doesn't exist
    if (!result[0]?.exists) {
      await queryRunner.query(`
        ALTER TYPE "orders_orderstatus_enum" ADD VALUE 'COMPLETED' AFTER 'DELIVERED'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing values from enums directly
    // This migration cannot be safely reversed
    console.log('Down migration: Cannot remove COMPLETED from enum. Manual intervention required.');
  }
}

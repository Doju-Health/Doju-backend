import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendPaymentStatusEnum1786000002000
  implements MigrationInterface
{
  name = 'ExtendPaymentStatusEnum1786000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "orders_paymentstatus_enum"
      ADD VALUE IF NOT EXISTS 'REFUNDED'
    `);

    await queryRunner.query(`
      ALTER TYPE "orders_paymentstatus_enum"
      ADD VALUE IF NOT EXISTS 'PENDING_REFUND'
    `);

    await queryRunner.query(`
      ALTER TYPE "payment_status_enum"
      ADD VALUE IF NOT EXISTS 'REFUNDED'
    `);

    await queryRunner.query(`
      ALTER TYPE "payment_status_enum"
      ADD VALUE IF NOT EXISTS 'PENDING_REFUND'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot drop enum values cleanly without rebuilding the type.
    // If we ever need to revert this, we'll need a dedicated rebuild migration.
  }
}

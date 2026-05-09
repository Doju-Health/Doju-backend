import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPaymentStatusEnum1786000001000
  implements MigrationInterface
{
  name = 'FixPaymentStatusEnum1786000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'orders_paymentstatus_enum'
            AND e.enumlabel = 'COMPLETED'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'orders_paymentstatus_enum'
            AND e.enumlabel = 'PAID'
        ) THEN
          ALTER TYPE "orders_paymentstatus_enum" RENAME VALUE 'COMPLETED' TO 'PAID';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'payment_status_enum'
            AND e.enumlabel = 'COMPLETED'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'payment_status_enum'
            AND e.enumlabel = 'PAID'
        ) THEN
          ALTER TYPE "payment_status_enum" RENAME VALUE 'COMPLETED' TO 'PAID';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'orders_paymentstatus_enum'
            AND e.enumlabel = 'PAID'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'orders_paymentstatus_enum'
            AND e.enumlabel = 'COMPLETED'
        ) THEN
          ALTER TYPE "orders_paymentstatus_enum" RENAME VALUE 'PAID' TO 'COMPLETED';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'payment_status_enum'
            AND e.enumlabel = 'PAID'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'payment_status_enum'
            AND e.enumlabel = 'COMPLETED'
        ) THEN
          ALTER TYPE "payment_status_enum" RENAME VALUE 'PAID' TO 'COMPLETED';
        END IF;
      END
      $$;
    `);
  }
}

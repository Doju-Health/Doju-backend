import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserBankFieldsAndPaymentFlutterwave1783000000000
  implements MigrationInterface
{
  name = 'AddUserBankFieldsAndPaymentFlutterwave1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bankCode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accountNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accountName" character varying`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "provider" character varying DEFAULT 'FLUTTERWAVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "flutterwaveResponse" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "flutterwaveResponse"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN IF EXISTS "provider"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "accountName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "accountNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "bankCode"`,
    );
  }
}

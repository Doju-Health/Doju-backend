import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductRejectionReason1787000012000
  implements MigrationInterface
{
  name = 'AddProductRejectionReason1787000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rejectionReason" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "rejectionReason"`,
    );
  }
}

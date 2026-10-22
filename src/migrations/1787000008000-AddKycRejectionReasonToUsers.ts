import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKycRejectionReasonToUsers1787000008000
  implements MigrationInterface
{
  name = 'AddKycRejectionReasonToUsers1787000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "kycRejectionReason" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "kycRejectionReason"`,
    );
  }
}

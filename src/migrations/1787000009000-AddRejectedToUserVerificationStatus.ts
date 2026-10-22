import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedToUserVerificationStatus1787000009000
  implements MigrationInterface
{
  name = 'AddRejectedToUserVerificationStatus1787000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "user_verification_status" ADD VALUE IF NOT EXISTS 'rejected'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // Leave the enum value in place on rollback.
  }
}

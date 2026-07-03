import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperAdminToUserRoleEnum1787000011000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin';
        ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
          ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'super_admin';
        END IF;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // Leave the enum value in place on rollback.
  }
}

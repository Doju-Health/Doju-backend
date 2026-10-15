import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentAmbassadorUserRoles1792600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'agent';
          ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'ambassador';
        ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
          ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'agent';
          ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'ambassador';
        END IF;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
  }
}

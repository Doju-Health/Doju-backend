import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperAdminFlagToUsers1787000007000
  implements MigrationInterface
{
  name = 'AddSuperAdminFlagToUsers1787000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "isSuperAdmin" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_single_super_admin" ON "users" ("isSuperAdmin") WHERE "isSuperAdmin" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_single_super_admin"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "isSuperAdmin"`,
    );
  }
}

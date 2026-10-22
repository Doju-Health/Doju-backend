import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertUserVerificationToStatus1781000001001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "user_verification_status" AS ENUM ('unverified', 'pending', 'verified');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "isVerified" DROP DEFAULT`,
    );

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "isVerified"
      TYPE "user_verification_status"
      USING CASE
        WHEN "isVerified" IS TRUE THEN 'verified'
        ELSE 'unverified'
      END::"user_verification_status"
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "isVerified" SET DEFAULT 'unverified'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "isVerified" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "isVerified" DROP DEFAULT`,
    );

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "isVerified"
      TYPE boolean
      USING CASE
        WHEN "isVerified" = 'verified' THEN true
        ELSE false
      END
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "isVerified" SET DEFAULT false`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "user_verification_status"`,
    );
  }
}

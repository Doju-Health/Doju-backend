import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1769092082692 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for user role if it doesn't exist
    await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
                    CREATE TYPE "user_role_enum" AS ENUM('buyer', 'seller', 'admin');
                END IF;
            END $$;
        `);

    // Create users table if it doesn't exist
    const tableExists = await queryRunner.hasTable('users');
    if (!tableExists) {
      await queryRunner.query(`
                CREATE TABLE "users" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "fullName" character varying NOT NULL,
                    "email" character varying NOT NULL,
                    "password" character varying,
                    "phoneNumber" character varying,
                    "role" "user_role_enum" NOT NULL DEFAULT 'buyer',
                    "googleId" character varying,
                    "emailVerified" boolean NOT NULL DEFAULT false,
                    "verificationOtp" character varying,
                    "verificationOtpExpires" TIMESTAMP,
                    "passwordResetOtp" character varying,
                    "passwordResetOtpExpires" TIMESTAMP,
                    "companyName" character varying,
                    "address" character varying,
                    "licenseNumber" character varying,
                    "isActive" boolean NOT NULL DEFAULT true,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
                    CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")
                )
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop users table
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}

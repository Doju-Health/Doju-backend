import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerType1791620000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_type_enum') THEN
          CREATE TYPE "seller_type_enum" AS ENUM ('manufacturer', 'supplier', 'vendor');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "sellerType" "seller_type_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "sellerType"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "seller_type_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalAddressCoordinates1792100000000 implements MigrationInterface {
  name = 'AddPersonalAddressCoordinates1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "addressLatitude" double precision`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "addressLongitude" double precision`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "addressLongitude"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "addressLatitude"`);
  }
}

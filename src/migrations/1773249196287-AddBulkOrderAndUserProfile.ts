import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBulkOrderAndUserProfile1773249196287 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "bulkOrderId" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profileImageUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profileImageUrl"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "bulkOrderId"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessAddressToUsers1778232280475 implements MigrationInterface {
    name = 'AddBusinessAddressToUsers1778232280475'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "businessAddress" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "businessAddress"`);
    }

}

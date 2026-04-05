import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWaitlistTable1784000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const waitlistExists = await queryRunner.hasTable('waitlist');
    if (!waitlistExists) {
      await queryRunner.query(`
        CREATE TABLE "waitlist" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "email" character varying NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_waitlist_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_waitlist_email" UNIQUE ("email")
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "waitlist"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseFiveDigitAgentIds1791475400000 implements MigrationInterface {
  name = 'UseFiveDigitAgentIds1791475400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "agent" ALTER COLUMN "id" DROP DEFAULT');
    await queryRunner.query('UPDATE "agent" SET "id" = -"id"');
    await queryRunner.query(`
      WITH numbered AS (
        SELECT "id", ROW_NUMBER() OVER (ORDER BY ABS("id")) + 9999 AS "newId"
        FROM "agent"
      )
      UPDATE "agent" AS agent
      SET "id" = numbered."newId"
      FROM numbered
      WHERE agent."id" = numbered."id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent"
      ALTER COLUMN "id" SET DEFAULT nextval('"agent_id_seq"')
    `);
    await queryRunner.query(`
      SELECT setval('"agent_id_seq"', COALESCE((SELECT MAX("id") FROM "agent"), 1))
    `);
  }
}

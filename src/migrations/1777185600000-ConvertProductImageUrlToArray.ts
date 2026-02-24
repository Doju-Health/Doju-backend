import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertProductImageUrlToArray1777185600000
  implements MigrationInterface
{
  name = 'ConvertProductImageUrlToArray1777185600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products"
       ALTER COLUMN "imageUrl"
       TYPE text[]
       USING CASE
         WHEN "imageUrl" IS NULL THEN NULL
         ELSE ARRAY["imageUrl"]
       END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products"
       ALTER COLUMN "imageUrl"
       TYPE text
       USING CASE
         WHEN "imageUrl" IS NULL THEN NULL
         ELSE "imageUrl"[1]
       END`,
    );
  }
}

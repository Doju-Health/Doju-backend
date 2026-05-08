import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameProductWeightToSize1785000003000
  implements MigrationInterface
{
  name = 'RenameProductWeightToSize1785000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" RENAME COLUMN "weight" TO "size"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" RENAME COLUMN "size" TO "weight"`,
    );
  }
}

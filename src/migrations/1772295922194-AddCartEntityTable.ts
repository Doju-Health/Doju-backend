import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartEntityTable1772295922194 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const cartItemsExists = await queryRunner.hasTable('cart_items');
    if (!cartItemsExists) {
      await queryRunner.query(`
        CREATE TABLE "cart_items" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "userId" uuid NOT NULL,
          "productId" uuid NOT NULL,
          "quantity" integer NOT NULL,
          "selected" boolean NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_cart_items_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_cart_items_user_product" UNIQUE ("userId", "productId"),
          CONSTRAINT "FK_cart_items_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "FK_cart_items_productId" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_cart_items_userId" ON "cart_items" ("userId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_cart_items_productId" ON "cart_items" ("productId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cart_items_productId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cart_items_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_items"`);
  }
}

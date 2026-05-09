import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductOrderPaymentTables1770806112880 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types with existence check
    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_orderstatus_enum') THEN
              CREATE TYPE "orders_orderstatus_enum" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
          END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_paymentstatus_enum') THEN
              CREATE TYPE "orders_paymentstatus_enum" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PENDING_REFUND');
          END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
              CREATE TYPE "payment_status_enum" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PENDING_REFUND');
          END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_escrowstatus_enum') THEN
              CREATE TYPE "payment_escrowstatus_enum" AS ENUM ('HELD', 'RELEASED', 'REFUNDED');
          END IF;
      END $$;
    `);

    // Create product_categories table if it doesn't exist
    const productCategoriesExists = await queryRunner.hasTable('product_categories');
    if (!productCategoriesExists) {
      await queryRunner.query(`
        CREATE TABLE "product_categories" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" text NOT NULL,
            "imageUrl" text,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_product_categories_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_product_categories_name" UNIQUE ("name")
        )
      `);
    }

    // Create products table if it doesn't exist
    const productsExists = await queryRunner.hasTable('products');
    if (!productsExists) {
      await queryRunner.query(`
        CREATE TABLE "products" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" text NOT NULL,
            "price" numeric NOT NULL,
            "stock" integer NOT NULL,
            "imageUrl" text,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "sellerId" uuid,
            "categoryId" uuid,
            CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_products_sellerId" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_products_categoryId" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )
      `);

      // Create indexes for products
      await queryRunner.query(`CREATE INDEX "IDX_products_sellerId" ON "products" ("sellerId")`);
      await queryRunner.query(`CREATE INDEX "IDX_products_categoryId" ON "products" ("categoryId")`);
    }

    // Create orders table if it doesn't exist
    const ordersExists = await queryRunner.hasTable('orders');
    if (!ordersExists) {
      await queryRunner.query(`
        CREATE TABLE "orders" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "quantity" integer NOT NULL,
            "unitPrice" numeric(10,2) NOT NULL,
            "totalPrice" numeric(10,2) NOT NULL,
            "orderStatus" "orders_orderstatus_enum" NOT NULL DEFAULT 'PENDING',
            "paymentStatus" "orders_paymentstatus_enum" NOT NULL DEFAULT 'PENDING',
            "deliveryAddress" text,
            "notes" text,
            "transactionId" text,
            "trackingNumber" character varying,
            "shippedAt" TIMESTAMP,
            "deliveredAt" TIMESTAMP,
            "completedAt" TIMESTAMP,
            "cancelledAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "buyerId" uuid,
            "productId" uuid,
            CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_orders_buyerId" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_orders_productId" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )
      `);

      // Create indexes for orders
      await queryRunner.query(`CREATE INDEX "IDX_orders_buyerId" ON "orders" ("buyerId")`);
      await queryRunner.query(`CREATE INDEX "IDX_orders_productId" ON "orders" ("productId")`);
    }

    // Create payment table if it doesn't exist
    const paymentExists = await queryRunner.hasTable('payment');
    if (!paymentExists) {
      await queryRunner.query(`
        CREATE TABLE "payment" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "orderId" uuid NOT NULL,
            "buyerId" uuid NOT NULL,
            "amount" numeric(10,2) NOT NULL,
            "reference" character varying NOT NULL,
            "accessCode" character varying,
            "status" "payment_status_enum" NOT NULL DEFAULT 'PENDING',
            "escrowStatus" "payment_escrowstatus_enum" NOT NULL DEFAULT 'HELD',
            "provider" character varying NOT NULL DEFAULT 'PAYSTACK',
            "channel" character varying,
            "paystackResponse" jsonb,
            "paidAt" TIMESTAMP,
            "escrowHeldAt" TIMESTAMP,
            "escrowReleasedAt" TIMESTAMP,
            "refundedAt" TIMESTAMP,
            "transferReference" character varying,
            "transferredAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_payment_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_payment_reference" UNIQUE ("reference"),
            CONSTRAINT "FK_payment_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_payment_buyerId" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )
      `);

      // Create indexes for payment
      await queryRunner.query(`CREATE INDEX "IDX_payment_orderId" ON "payment" ("orderId")`);
      await queryRunner.query(`CREATE INDEX "IDX_payment_buyerId" ON "payment" ("buyerId")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_buyerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_orderId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_productId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_buyerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_categoryId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_sellerId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "payment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_categories"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_escrowstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_orderstatus_enum"`);
  }
}

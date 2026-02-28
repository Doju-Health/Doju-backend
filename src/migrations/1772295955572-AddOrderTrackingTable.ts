import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderTrackingTable1772295955572 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_tracking_currentstatus_enum') THEN
              CREATE TYPE "order_tracking_currentstatus_enum" AS ENUM (
                'ORDER_PLACED',
                'ORDER_CONFIRMED',
                'PROCESSING',
                'PACKED',
                'PICKED_UP',
                'IN_TRANSIT',
                'AT_SORTING_CENTER',
                'OUT_FOR_DELIVERY',
                'DELIVERY_ATTEMPTED',
                'DELIVERED',
                'FAILED',
                'RETURNED',
                'CANCELLED'
              );
          END IF;
      END $$;
    `);

    const orderTrackingExists = await queryRunner.hasTable('order_tracking');
    if (!orderTrackingExists) {
      await queryRunner.query(`
        CREATE TABLE "order_tracking" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "orderId" uuid NOT NULL,
          "currentStatus" "order_tracking_currentstatus_enum" NOT NULL DEFAULT 'ORDER_PLACED',
          "trackingHistory" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "estimatedDeliveryDate" TIMESTAMP,
          "actualDeliveryDate" TIMESTAMP,
          "lastUpdated" TIMESTAMP,
          "publicTrackingToken" character varying NOT NULL,
          "deliveryNotes" text,
          "receiverName" character varying,
          "receiverSignatureUrl" character varying,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_order_tracking_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_order_tracking_orderId" UNIQUE ("orderId"),
          CONSTRAINT "UQ_order_tracking_publicTrackingToken" UNIQUE ("publicTrackingToken"),
          CONSTRAINT "FK_order_tracking_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_order_tracking_orderId" ON "order_tracking" ("orderId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_order_tracking_publicTrackingToken" ON "order_tracking" ("publicTrackingToken")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_order_tracking_publicTrackingToken"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_tracking_orderId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_tracking"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_tracking_currentstatus_enum"`);
  }
}

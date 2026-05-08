import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddDeliveryFeatureToOrderAndProduct1777600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update products table - change weight from decimal to varchar (enum)
    await queryRunner.changeColumn(
      'products',
      'weight',
      new TableColumn({
        name: 'weight',
        type: 'varchar',
        enum: ['small', 'medium', 'large'],
        default: "'small'",
      }),
    );

    // Update orders table - add delivery columns
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'departureZone',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'arrivalZone',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'deliveryFee',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'estimatedDeliveryDays',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert products table
    await queryRunner.changeColumn(
      'products',
      'weight',
      new TableColumn({
        name: 'weight',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
      }),
    );

    // Revert orders table
    await queryRunner.dropColumn('orders', 'departureZone');
    await queryRunner.dropColumn('orders', 'arrivalZone');
    await queryRunner.dropColumn('orders', 'deliveryFee');
    await queryRunner.dropColumn('orders', 'estimatedDeliveryDays');
  }
}

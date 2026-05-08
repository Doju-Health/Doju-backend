import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCityStateFieldsToUserAndOrder1777700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add city and state columns to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'city',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'state',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'businessCity',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'businessState',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add delivery city and state columns to orders table
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'deliveryCity',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'deliveryState',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert users table
    await queryRunner.dropColumn('users', 'city');
    await queryRunner.dropColumn('users', 'state');
    await queryRunner.dropColumn('users', 'businessCity');
    await queryRunner.dropColumn('users', 'businessState');

    // Revert orders table
    await queryRunner.dropColumn('orders', 'deliveryCity');
    await queryRunner.dropColumn('orders', 'deliveryState');
  }
}

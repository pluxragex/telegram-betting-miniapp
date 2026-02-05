import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddBonusCodes1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bonus codes table
    await queryRunner.createTable(
      new Table({
        name: 'bonus_codes',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'value',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'max_uses',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'used_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'bonus_codes',
      new TableIndex({
        name: 'IDX_bonus_codes_code',
        columnNames: ['code'],
      }),
    );

    // Bonus code usages table
    await queryRunner.createTable(
      new Table({
        name: 'bonus_code_usages',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'bonus_code_id',
            type: 'integer',
          },
          {
            name: 'user_id',
            type: 'integer',
          },
          {
            name: 'used_at',
            type: 'datetime',
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'bonus_code_usages',
      new TableIndex({
        name: 'IDX_bonus_code_usages_bonus_code_id',
        columnNames: ['bonus_code_id'],
      }),
    );

    await queryRunner.createIndex(
      'bonus_code_usages',
      new TableIndex({
        name: 'IDX_bonus_code_usages_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'bonus_code_usages',
      new TableIndex({
        name: 'IDX_bonus_code_usages_used_at',
        columnNames: ['used_at'],
      }),
    );

    await queryRunner.createForeignKey(
      'bonus_code_usages',
      new TableForeignKey({
        columnNames: ['bonus_code_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bonus_codes',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'bonus_code_usages',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bonus_code_usages');
    await queryRunner.dropTable('bonus_codes');
  }
}

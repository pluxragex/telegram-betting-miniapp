import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddPrizesTable1705152000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Prizes table
    await queryRunner.createTable(
      new Table({
        name: 'prizes',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'position',
            type: 'integer',
          },
          {
            name: 'image_url',
            type: 'text',
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
      'prizes',
      new TableIndex({
        name: 'IDX_prizes_position',
        columnNames: ['position'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('prizes', 'IDX_prizes_position');
    await queryRunner.dropTable('prizes');
  }
}

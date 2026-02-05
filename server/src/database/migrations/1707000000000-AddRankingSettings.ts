import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddRankingSettings1707000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ranking_settings',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'ranking_limit',
            type: 'integer',
            isNullable: false,
            default: 15,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ranking_settings');
  }
}


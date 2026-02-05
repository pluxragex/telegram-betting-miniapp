import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddPerformanceIndexes1717000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Составной индекс для оптимизации запросов ставок по матчу и статусу
    // Критичен для setResult и refundMatch при большом количестве ставок
    await queryRunner.createIndex(
      'bets',
      new TableIndex({
        name: 'IDX_bets_match_id_status',
        columnNames: ['match_id', 'status'],
      }),
    );

    // Индекс для оптимизации запросов баланса пользователей (для рейтинга)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_balance',
        columnNames: ['balance'],
      }),
    );

    // Составной индекс для оптимизации запросов матчей по группе и результату
    await queryRunner.createIndex(
      'matches',
      new TableIndex({
        name: 'IDX_matches_group_id_result',
        columnNames: ['group_id', 'result'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('matches', 'IDX_matches_group_id_result');
    await queryRunner.dropIndex('users', 'IDX_users_balance');
    await queryRunner.dropIndex('bets', 'IDX_bets_match_id_status');
  }
}

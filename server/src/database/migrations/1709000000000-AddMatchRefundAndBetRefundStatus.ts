import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchRefundAndBetRefundStatus1709000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем флаг возврата по матчу
    await queryRunner.query(
      `ALTER TABLE matches ADD COLUMN refund_processed boolean NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_matches_refund_processed ON matches(refund_processed)`,
    );

    // Обновляем триггер проверки статуса ставки, чтобы разрешить refunded
    await queryRunner.query(`DROP TRIGGER IF EXISTS check_bet_status`);
    await queryRunner.query(`
      CREATE TRIGGER check_bet_status
      BEFORE INSERT ON bets
      BEGIN
        SELECT CASE
          WHEN NEW.status NOT IN ('pending', 'win', 'lose', 'refunded') THEN
            RAISE(ABORT, 'status must be pending, win, lose, or refunded')
        END;
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем триггер к исходному состоянию
    await queryRunner.query(`DROP TRIGGER IF EXISTS check_bet_status`);
    await queryRunner.query(`
      CREATE TRIGGER check_bet_status
      BEFORE INSERT ON bets
      BEGIN
        SELECT CASE
          WHEN NEW.status NOT IN ('pending', 'win', 'lose') THEN
            RAISE(ABORT, 'status must be pending, win, or lose')
        END;
      END;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS IDX_matches_refund_processed`);
    // Удалить столбец в SQLite сложно без перестроения таблицы, поэтому оставляем его.
  }
}

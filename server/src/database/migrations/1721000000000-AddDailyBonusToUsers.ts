import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyBonusToUsers1721000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN last_daily_bonus_at datetime`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_users_last_daily_bonus_at ON users(last_daily_bonus_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_users_last_daily_bonus_at`);
    // SQLite не поддерживает удаление столбцов напрямую, поэтому оставляем его
  }
}

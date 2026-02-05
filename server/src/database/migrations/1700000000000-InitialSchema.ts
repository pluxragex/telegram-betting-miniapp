import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableCheck } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Groups table
    await queryRunner.createTable(
      new Table({
        name: 'groups',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
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
      'groups',
      new TableIndex({
        name: 'IDX_groups_name',
        columnNames: ['name'],
      }),
    );

    // Users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'telegram_id',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'username',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'participation',
            type: 'boolean',
            default: false,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 1000,
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
      'users',
      new TableIndex({
        name: 'IDX_users_telegram_id',
        columnNames: ['telegram_id'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_participation',
        columnNames: ['participation'],
      }),
    );

    // Teams table
    await queryRunner.createTable(
      new Table({
        name: 'teams',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'group_id',
            type: 'integer',
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

    await queryRunner.createForeignKey(
      'teams',
      new TableForeignKey({
        columnNames: ['group_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'IDX_teams_group_id',
        columnNames: ['group_id'],
      }),
    );

    // Matches table
    await queryRunner.createTable(
      new Table({
        name: 'matches',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'team1_id',
            type: 'integer',
          },
          {
            name: 'team2_id',
            type: 'integer',
          },
          {
            name: 'group_id',
            type: 'integer',
          },
          {
            name: 'start_time',
            type: 'datetime',
          },
          {
            name: 'result',
            type: 'varchar',
            isNullable: true,
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

    await queryRunner.createForeignKey(
      'matches',
      new TableForeignKey({
        columnNames: ['team1_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teams',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'matches',
      new TableForeignKey({
        columnNames: ['team2_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teams',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'matches',
      new TableForeignKey({
        columnNames: ['group_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'matches',
      new TableIndex({
        name: 'IDX_matches_group_id',
        columnNames: ['group_id'],
      }),
    );

    await queryRunner.createIndex(
      'matches',
      new TableIndex({
        name: 'IDX_matches_team1_id',
        columnNames: ['team1_id'],
      }),
    );

    await queryRunner.createIndex(
      'matches',
      new TableIndex({
        name: 'IDX_matches_team2_id',
        columnNames: ['team2_id'],
      }),
    );

    await queryRunner.createIndex(
      'matches',
      new TableIndex({
        name: 'IDX_matches_result',
        columnNames: ['result'],
      }),
    );

    // Check constraint for team1_id != team2_id
    await queryRunner.query(`
      CREATE TRIGGER check_teams_different
      BEFORE INSERT ON matches
      BEGIN
        SELECT CASE
          WHEN NEW.team1_id = NEW.team2_id THEN
            RAISE(ABORT, 'team1_id and team2_id must be different')
        END;
      END;
    `);

    // Bets table
    await queryRunner.createTable(
      new Table({
        name: 'bets',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'integer',
          },
          {
            name: 'match_id',
            type: 'integer',
          },
          {
            name: 'side',
            type: 'varchar',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'coefficient',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
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

    await queryRunner.createForeignKey(
      'bets',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'bets',
      new TableForeignKey({
        columnNames: ['match_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'matches',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'bets',
      new TableIndex({
        name: 'IDX_bets_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'bets',
      new TableIndex({
        name: 'IDX_bets_match_id',
        columnNames: ['match_id'],
      }),
    );

    await queryRunner.createIndex(
      'bets',
      new TableIndex({
        name: 'IDX_bets_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'bets',
      new TableIndex({
        name: 'IDX_bets_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Check constraints for bets
    await queryRunner.query(`
      CREATE TRIGGER check_bet_side
      BEFORE INSERT ON bets
      BEGIN
        SELECT CASE
          WHEN NEW.side NOT IN ('P1', 'P2') THEN
            RAISE(ABORT, 'side must be P1 or P2')
        END;
      END;
    `);

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

    await queryRunner.query(`
      CREATE TRIGGER check_bet_amount
      BEFORE INSERT ON bets
      BEGIN
        SELECT CASE
          WHEN NEW.amount <= 0 THEN
            RAISE(ABORT, 'amount must be greater than 0')
        END;
      END;
    `);

    // AdminUsers table
    await queryRunner.createTable(
      new Table({
        name: 'admin_users',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'telegram_id',
            type: 'varchar',
            isUnique: true,
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
      'admin_users',
      new TableIndex({
        name: 'IDX_admin_users_telegram_id',
        columnNames: ['telegram_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bets');
    await queryRunner.dropTable('matches');
    await queryRunner.dropTable('teams');
    await queryRunner.dropTable('admin_users');
    await queryRunner.dropTable('users');
    await queryRunner.dropTable('groups');
  }
}


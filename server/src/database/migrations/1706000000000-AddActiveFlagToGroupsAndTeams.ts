import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddActiveFlagToGroupsAndTeams1706000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_active to groups
    await queryRunner.addColumn(
      'groups',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        isNullable: false,
        default: '1',
      }),
    );

    await queryRunner.createIndex(
      'groups',
      new TableIndex({
        name: 'IDX_groups_is_active',
        columnNames: ['is_active'],
      }),
    );

    // Add is_active to teams
    await queryRunner.addColumn(
      'teams',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        isNullable: false,
        default: '1',
      }),
    );

    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'IDX_teams_is_active',
        columnNames: ['is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('teams', 'IDX_teams_is_active');
    await queryRunner.dropColumn('teams', 'is_active');

    await queryRunner.dropIndex('groups', 'IDX_groups_is_active');
    await queryRunner.dropColumn('groups', 'is_active');
  }
}


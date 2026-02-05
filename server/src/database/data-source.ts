import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Group } from './entities/group.entity';
import { Team } from './entities/team.entity';
import { Match } from './entities/match.entity';
import { Bet } from './entities/bet.entity';
import { AdminUser } from './entities/admin-user.entity';
import { Prize } from './entities/prize.entity';
import { RankingSettings } from './entities/ranking-settings.entity';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DATABASE_PATH || 'database.sqlite',
  entities: [User, Group, Team, Match, Bet, AdminUser, Prize, RankingSettings],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  migrations: ['src/database/migrations/**/*.ts'],
});


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Group } from './entities/group.entity';
import { Team } from './entities/team.entity';
import { Match } from './entities/match.entity';
import { Bet } from './entities/bet.entity';
import { AdminUser } from './entities/admin-user.entity';
import { Prize } from './entities/prize.entity';
import { RankingSettings } from './entities/ranking-settings.entity';
import { BonusCode } from './entities/bonus-code.entity';
import { BonusCodeUsage } from './entities/bonus-code-usage.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || 'database.sqlite',
      entities: [User, Group, Team, Match, Bet, AdminUser, Prize, RankingSettings, BonusCode, BonusCodeUsage],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      extra: {
        connectionLimit: 1,
      },
    }),
    TypeOrmModule.forFeature([User, Group, Team, Match, Bet, AdminUser, Prize, RankingSettings, BonusCode, BonusCodeUsage]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}


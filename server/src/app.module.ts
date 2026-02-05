import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TelegramThrottlerGuard } from './common/guards/telegram-throttler.guard';
import { TelegramUserMiddleware } from './common/middleware/telegram-user.middleware';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GroupsModule } from './modules/groups/groups.module';
import { TeamsModule } from './modules/teams/teams.module';
import { MatchesModule } from './modules/matches/matches.module';
import { BetsModule } from './modules/bets/bets.module';
import { HistoryModule } from './modules/history/history.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrizesModule } from './modules/prizes/prizes.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { BotModule } from './modules/bot/bot.module';
import { BonusCodesModule } from './modules/bonus-codes/bonus-codes.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 1000,
      },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    TeamsModule,
    MatchesModule,
    BetsModule,
    HistoryModule,
    AdminModule,
    PrizesModule,
    RealtimeModule,
    BotModule,
    BonusCodesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TelegramThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TelegramUserMiddleware)
      .forRoutes('*');
  }
}


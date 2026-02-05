import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AuthModule } from '../../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { TeamsModule } from '../teams/teams.module';
import { MatchesModule } from '../matches/matches.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    AuthModule,
    GroupsModule,
    TeamsModule,
    MatchesModule,
    forwardRef(() => UsersModule),
    RealtimeModule,
    BotModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminGuard],
})
export class AdminModule {}


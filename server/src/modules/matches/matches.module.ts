import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesController, AllMatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { Match, Bet } from '../../database/entities';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Bet]), AuthModule, UsersModule, RealtimeModule],
  controllers: [MatchesController, AllMatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}


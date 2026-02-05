import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BetsModule } from '../bets/bets.module';

@Module({
  imports: [AuthModule, UsersModule, BetsModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsService } from './teams.service';
import { Team } from '../../database/entities';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [TypeOrmModule.forFeature([Team]), MatchesModule],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}


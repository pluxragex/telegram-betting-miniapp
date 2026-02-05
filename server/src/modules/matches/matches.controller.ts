import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';

@Controller('groups/:groupId/matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @UseGuards(TelegramAuthGuard)
  async findByGroup(@Param('groupId') groupId: string) {
    const matches = await this.matchesService.findByGroupId(+groupId);
    
    const matchesWithCoefficients = await Promise.all(
      matches.map(async (match) => {
        const coefficients = await this.matchesService.calculateCoefficients(match.id);
        return {
          id: match.id,
          team1: {
            id: match.team1.id,
            name: match.team1.name,
            logo_url: (match.team1 as any).logo_url || null,
          },
          team2: {
            id: match.team2.id,
            name: match.team2.name,
            logo_url: (match.team2 as any).logo_url || null,
          },
          start_time: match.start_time,
          result: match.result,
          coefficients,
        };
      }),
    );

    return matchesWithCoefficients;
  }
}

@Controller('matches')
export class AllMatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('history')
  @UseGuards(TelegramAuthGuard)
  async getHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.matchesService.findAllWithResults(+page, +limit);
  }
}


import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BetsService } from './bets.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';
import { TelegramUser } from '../../common/decorators/telegram-user.decorator';
import { UsersService } from '../users/users.service';
import { BetSide } from '../../database/entities';

@Controller('bets')
export class BetsController {
  constructor(
    private readonly betsService: BetsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseGuards(TelegramAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async create(
    @TelegramUser() telegramUser: any,
    @Body() body: { match_id: number; side: BetSide; amount: number },
  ) {
    const user = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);

    const bet = await this.betsService.create(
      user.id,
      body.match_id,
      body.side,
      body.amount,
    );

    return {
      id: bet.id,
      match_id: bet.match_id,
      side: bet.side,
      amount: bet.amount,
      coefficient: bet.coefficient,
      status: bet.status,
    };
  }
}


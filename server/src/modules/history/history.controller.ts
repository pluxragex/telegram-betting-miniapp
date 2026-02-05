import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';
import { TelegramUser } from '../../common/decorators/telegram-user.decorator';
import { UsersService } from '../users/users.service';

@Controller('users/me/history')
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @UseGuards(TelegramAuthGuard)
  async getHistory(
    @TelegramUser() telegramUser: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const user = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);

    return this.historyService.getHistory(user.id, +page, +limit);
  }
}


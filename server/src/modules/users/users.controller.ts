import { Controller, Get, Post, Put, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';
import { TelegramUser } from '../../common/decorators/telegram-user.decorator';
import { TelegramAuthService } from '../../auth/telegram-auth.service';
import { PrizesService } from '../prizes/prizes.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly telegramAuthService: TelegramAuthService,
    private readonly prizesService: PrizesService,
  ) {}

  @Post('auth/telegram')
  async authTelegram(@Body() body: { initData: string }) {
    return { message: 'Use /auth/telegram endpoint' };
  }

  @Get('me')
  @UseGuards(TelegramAuthGuard)
  async getMe(@TelegramUser() telegramUser: any) {
    const user = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);

    return {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      display_name: user.display_name,
      participation: user.participation,
      balance: user.balance,
      created_at: user.created_at,
      last_daily_bonus_at: user.last_daily_bonus_at,
    };
  }

  @Post('participate')
  @UseGuards(TelegramAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  async participate(@TelegramUser() telegramUser: any) {
    const isSubscribed = await this.telegramAuthService.checkChannelSubscription(telegramUser.id);
    if (!isSubscribed) {
      throw new BadRequestException('Необходимо подписаться на канал для участия');
    }

    const user = await this.usersService.setParticipation(telegramUser.id);
    return {
      success: true,
      participation: user.participation,
    };
  }

  @Get('check-subscription')
  @UseGuards(TelegramAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async checkSubscription(@TelegramUser() telegramUser: any) {
    const isSubscribed = await this.telegramAuthService.checkChannelSubscription(telegramUser.id);
    const channelId = process.env.TELEGRAM_CHANNEL_ID || '';
    const cleanChannelId = channelId.replace('@', '');
    return {
      isSubscribed,
      channelId: cleanChannelId,
    };
  }

  @Get('ranking')
  @UseGuards(TelegramAuthGuard)
  async getRanking(@TelegramUser() telegramUser: any) {
    const limit = await this.prizesService.getRankingLimit();

    const currentUser = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);

    const users = await this.usersService.getTopUsers(limit);
    const prizes = await this.prizesService.findAll();
    const prizesMap = new Map(prizes.map((p) => [p.position, p.image_url]));

    const ranking = users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.display_name || user.username || `User ${user.id}`,
      balance: user.balance,
      prizeImage: prizesMap.get(index + 1) || null,
      isCurrentUser: user.id === currentUser.id,
    }));

    const myRank = await this.usersService.getUserRank(currentUser.id);

    let myEntry =
      ranking.find((item) => item.id === currentUser.id) || null;

    if (!myEntry && myRank !== null) {
      myEntry = {
        rank: myRank,
        id: currentUser.id,
        username: currentUser.display_name || currentUser.username || `User ${currentUser.id}`,
        balance: currentUser.balance,
        prizeImage: prizesMap.get(myRank) || null,
        isCurrentUser: true,
      };
    }

    return {
      users: ranking,
      my: myEntry,
    };
  }

  @Get('me/is-admin')
  @UseGuards(TelegramAuthGuard)
  async checkIsAdmin(@TelegramUser() telegramUser: any) {
    const isAdmin = await this.usersService.isAdmin(telegramUser.id);
    return { isAdmin };
  }

  @Put('me/display-name')
  @UseGuards(TelegramAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async updateDisplayName(
    @TelegramUser() telegramUser: any,
    @Body() body: { display_name: string | null },
  ) {
    const user = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);

    const updatedUser = await this.usersService.updateDisplayName(user.id, body.display_name);
    return {
      id: updatedUser.id,
      display_name: updatedUser.display_name,
    };
  }

  @Get('me/daily-bonus/check')
  @UseGuards(TelegramAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async checkDailyBonus(@TelegramUser() telegramUser: any) {
    const user = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);
    return this.usersService.canClaimDailyBonusCheck(user.id);
  }

  @Post('me/daily-bonus/claim')
  @UseGuards(TelegramAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async claimDailyBonus(@TelegramUser() telegramUser: any) {
    const user = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);
    return this.usersService.claimDailyBonus(user.id);
  }
}

